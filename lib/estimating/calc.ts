// The estimating engine.
//
// Every dollar and every labor hour PP Mechanical bids is produced here. The
// module is pure: no database, no React, no I/O. That is deliberate — it makes
// the financial math unit-testable (scripts/test-estimating-calc.ts) and means
// a UI component can never quietly invent a different number than the server
// stores.
//
// Cost flow:
//
//   material  = qty x unit cost x (1 + waste%)
//   labor     = qty x hours/unit x conditions factor x line factor x burdened rate
//   equipment = rental + mobilization + delivery (already extended per line)
//   sub       = quoted subcontract amount
//   other     = permits, freight, consumables, bonds, ...
//
//   direct cost      = material + labor + equipment + sub + other + sales tax
//   cost basis       = direct cost + overhead + contingency
//   sell price       = f(cost basis, pricing mode)
//   profit           = sell price - cost basis
//   gross margin %   = profit / sell price          <- NOT profit / cost
//   markup %         = profit / cost basis
//
// MARKUP IS NOT MARGIN. A 20% target gross margin on $100,000 of cost sells for
// $125,000 (cost / (1 - 0.20)), not $120,000. Both figures are always reported
// so the estimator can see the difference.

import {
  add,
  dec,
  div,
  HUNDRED,
  isZero,
  mul,
  ONE,
  percentOf,
  roundMoney,
  roundRate,
  sub,
  sum,
  toMoneyNumber,
  toRateNumber,
  ZERO,
  type Dec,
} from './decimal';
import {
  BASE_BID_DISPOSITIONS,
  LABOR_UNIT_DIVISOR,
  type LaborUnitType,
  type PricingMode,
  type TakeoffDisposition,
  type TakeoffLineType,
} from './constants';

export class CalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CalculationError';
  }
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

/** The pricing-relevant fields of one takeoff line. Accepts numbers or strings. */
export type LineInput = {
  id?: string;
  lineType?: TakeoffLineType;
  disposition?: TakeoffDisposition;
  quantity: Dec | number | string | null;
  unitMaterialCost?: Dec | number | string | null;
  materialWastePercent?: Dec | number | string | null;
  laborHoursPerUnit?: Dec | number | string | null;
  laborRate?: Dec | number | string | null;
  /** Extra line-specific productivity factor. 1 = none. */
  laborModifierFactor?: Dec | number | string | null;
  /** When false, estimate-wide conditions do not apply to this line. */
  applyEstimateConditions?: boolean;
  equipmentCost?: Dec | number | string | null;
  subcontractCost?: Dec | number | string | null;
  otherCost?: Dec | number | string | null;
  isTaxable?: boolean;
};

export type PricingConfig = {
  overheadPercent?: Dec | number | string | null;
  contingencyPercent?: Dec | number | string | null;
  pricingMode?: PricingMode;
  markupPercent?: Dec | number | string | null;
  targetMarginPercent?: Dec | number | string | null;
  fixedSellPrice?: Dec | number | string | null;
  /** Estimate-level direct costs not attached to any line (permits, bonds). */
  otherDirectCost?: Dec | number | string | null;
  /** Applied to taxable material cost only. 0 when the project is tax exempt. */
  salesTaxPercent?: Dec | number | string | null;
};

/** One snapshotted productivity condition applied estimate-wide. */
export type LaborConditionInput = {
  code: string;
  name: string;
  factor: Dec | number | string;
};

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

export type LineTotals = {
  id?: string;
  disposition: TakeoffDisposition;
  /** Counts toward the base bid (included + allowance). */
  inBaseBid: boolean;
  quantity: Dec;
  /** qty x unit cost, before waste. */
  materialBaseCost: Dec;
  materialWasteCost: Dec;
  materialCost: Dec;
  baseLaborHours: Dec;
  /** conditions factor x line factor, as actually applied to this line. */
  effectiveLaborFactor: Dec;
  laborHours: Dec;
  laborCost: Dec;
  equipmentCost: Dec;
  subcontractCost: Dec;
  otherCost: Dec;
  /** Material cost that sales tax applies to (0 when the line is not taxable). */
  taxableMaterialCost: Dec;
  totalCost: Dec;
};

export type EstimateTotals = {
  materialCost: Dec;
  laborCost: Dec;
  equipmentCost: Dec;
  subcontractorCost: Dec;
  /** Line-level other costs plus the estimate-level other direct cost. */
  otherCost: Dec;
  salesTaxAmount: Dec;
  directCost: Dec;
  overheadAmount: Dec;
  contingencyAmount: Dec;
  /** direct + overhead + contingency. The basis margin and markup are taken on. */
  costBasis: Dec;
  profitAmount: Dec;
  sellPrice: Dec;
  grossMarginPercent: Dec;
  effectiveMarkupPercent: Dec;
  baseLaborHours: Dec;
  totalLaborHours: Dec;
  /** Sum of alternate-disposition line totals. Not part of the base bid. */
  alternatesCost: Dec;
  /** Sum of excluded-disposition line totals. Documented, never priced. */
  excludedCost: Dec;
  /** Sum of allowance-disposition line totals. Carried inside the base bid. */
  allowancesCost: Dec;
  lineCount: number;
  conditionsFactor: Dec;
};

// ---------------------------------------------------------------------------
// Labor productivity
// ---------------------------------------------------------------------------

/**
 * Product of every estimate-wide condition factor.
 * Shown to the estimator step by step — see `explainLaborFactor`.
 */
export function combineConditionFactors(conditions: readonly LaborConditionInput[]): Dec {
  let factor = ONE;
  for (const condition of conditions) {
    const f = dec(condition.factor);
    if (f <= ZERO) {
      throw new CalculationError(
        `Labor condition "${condition.name}" has a factor of ${toRateNumber(f)}. Factors must be greater than zero.`,
      );
    }
    factor = mul(factor, f);
  }
  return roundRate(factor);
}

export type LaborFactorStep = {
  label: string;
  factor: Dec;
  runningHours: Dec;
};

/**
 * Transparent breakdown of how base hours become adjusted hours, so the
 * estimator can audit every modifier instead of trusting one number.
 */
export function explainLaborFactor(
  baseHours: Dec,
  conditions: readonly LaborConditionInput[],
  lineFactor: Dec = ONE,
): { steps: LaborFactorStep[]; totalFactor: Dec; adjustedHours: Dec } {
  const steps: LaborFactorStep[] = [];
  let running = baseHours;
  let totalFactor = ONE;

  for (const condition of conditions) {
    const f = dec(condition.factor);
    totalFactor = mul(totalFactor, f);
    running = roundRate(mul(running, f));
    steps.push({ label: condition.name, factor: f, runningHours: running });
  }

  if (lineFactor !== ONE) {
    totalFactor = mul(totalFactor, lineFactor);
    running = roundRate(mul(running, lineFactor));
    steps.push({ label: 'Line adjustment', factor: lineFactor, runningHours: running });
  }

  return {
    steps,
    totalFactor: roundRate(totalFactor),
    adjustedHours: roundRate(mul(baseHours, totalFactor)),
  };
}

/** Normalize a price-book labor unit into plain hours per one unit. */
export function normalizeLaborUnit(
  value: Dec | number | string | null | undefined,
  unitType: LaborUnitType,
): Dec {
  const divisor = LABOR_UNIT_DIVISOR[unitType];
  if (!divisor) throw new CalculationError(`Unknown labor unit type: ${unitType}`);
  const hours = dec(value);
  return divisor === 1 ? hours : roundRate(div(hours, dec(divisor)));
}

// ---------------------------------------------------------------------------
// Line-level calculation
// ---------------------------------------------------------------------------

export function calculateLine(line: LineInput, conditionsFactor: Dec = ONE): LineTotals {
  const quantity = dec(line.quantity);
  if (quantity < ZERO) {
    throw new CalculationError('Quantity cannot be negative.');
  }

  const unitCost = dec(line.unitMaterialCost);
  if (unitCost < ZERO) throw new CalculationError('Unit material cost cannot be negative.');

  const wastePercent = dec(line.materialWastePercent);
  if (wastePercent < ZERO || wastePercent > HUNDRED) {
    throw new CalculationError('Material waste must be between 0% and 100%.');
  }

  const hoursPerUnit = dec(line.laborHoursPerUnit);
  if (hoursPerUnit < ZERO) throw new CalculationError('Labor hours per unit cannot be negative.');

  const laborRate = dec(line.laborRate);
  if (laborRate < ZERO) throw new CalculationError('Labor rate cannot be negative.');

  const lineFactor = line.laborModifierFactor == null ? ONE : dec(line.laborModifierFactor);
  if (lineFactor <= ZERO)
    throw new CalculationError('Line labor factor must be greater than zero.');

  const equipmentCost = roundMoney(dec(line.equipmentCost));
  if (equipmentCost < ZERO) throw new CalculationError('Equipment cost cannot be negative.');

  const subcontractCost = roundMoney(dec(line.subcontractCost));
  if (subcontractCost < ZERO) throw new CalculationError('Subcontract cost cannot be negative.');

  // other_cost may be negative: deduct alternates and vendor credits are real.
  const otherCost = roundMoney(dec(line.otherCost));

  // ---- Material ----
  const materialBaseCost = roundMoney(mul(quantity, unitCost));
  const materialWasteCost = roundMoney(percentOf(materialBaseCost, wastePercent));
  const materialCost = add(materialBaseCost, materialWasteCost);

  // ---- Labor ----
  const applyConditions = line.applyEstimateConditions !== false;
  const effectiveLaborFactor = roundRate(mul(applyConditions ? conditionsFactor : ONE, lineFactor));
  const baseLaborHours = roundRate(mul(quantity, hoursPerUnit));
  const laborHours = roundRate(mul(baseLaborHours, effectiveLaborFactor));
  const laborCost = roundMoney(mul(laborHours, laborRate));

  const disposition: TakeoffDisposition = line.disposition ?? 'included';
  const inBaseBid = BASE_BID_DISPOSITIONS.includes(disposition);

  const totalCost = sum([materialCost, laborCost, equipmentCost, subcontractCost, otherCost]);

  return {
    id: line.id,
    disposition,
    inBaseBid,
    quantity,
    materialBaseCost,
    materialWasteCost,
    materialCost,
    baseLaborHours,
    effectiveLaborFactor,
    laborHours,
    laborCost,
    equipmentCost,
    subcontractCost,
    otherCost,
    taxableMaterialCost: line.isTaxable === false ? ZERO : materialCost,
    totalCost,
  };
}

// ---------------------------------------------------------------------------
// Pricing (markup vs margin)
// ---------------------------------------------------------------------------

export type PricedResult = {
  costBasis: Dec;
  sellPrice: Dec;
  profitAmount: Dec;
  grossMarginPercent: Dec;
  effectiveMarkupPercent: Dec;
};

/**
 * Sell price from a target GROSS MARGIN: sell = cost / (1 - margin).
 * $100,000 at 20% margin sells for $125,000.
 */
export function sellPriceFromMargin(costBasis: Dec, marginPercent: Dec): Dec {
  if (marginPercent < ZERO) throw new CalculationError('Gross margin cannot be negative.');
  if (marginPercent >= HUNDRED) {
    throw new CalculationError(
      'A gross margin of 100% or more is not achievable — the sell price would be infinite.',
    );
  }
  const divisor = sub(ONE, div(marginPercent, HUNDRED));
  return roundMoney(div(costBasis, divisor));
}

/** Sell price from a MARKUP on cost: sell = cost x (1 + markup). */
export function sellPriceFromMarkup(costBasis: Dec, markupPercent: Dec): Dec {
  if (markupPercent < ZERO) throw new CalculationError('Markup cannot be negative.');
  return roundMoney(add(costBasis, percentOf(costBasis, markupPercent)));
}

/** Convert a markup percentage to the gross margin it produces. */
export function markupToMargin(markupPercent: Dec): Dec {
  const denominator = add(HUNDRED, markupPercent);
  if (isZero(denominator)) return ZERO;
  return roundRate(div(mul(markupPercent, HUNDRED), denominator));
}

/** Convert a gross margin percentage to the markup it requires. */
export function marginToMarkup(marginPercent: Dec): Dec {
  const denominator = sub(HUNDRED, marginPercent);
  if (denominator <= ZERO) {
    throw new CalculationError('A gross margin of 100% or more has no finite markup.');
  }
  return roundRate(div(mul(marginPercent, HUNDRED), denominator));
}

export function priceFromCost(costBasis: Dec, config: PricingConfig): PricedResult {
  const mode: PricingMode = config.pricingMode ?? 'margin';

  let sellPrice: Dec;
  if (mode === 'fixed') {
    sellPrice = roundMoney(dec(config.fixedSellPrice));
    if (sellPrice < ZERO) throw new CalculationError('Fixed sell price cannot be negative.');
  } else if (mode === 'markup') {
    sellPrice = sellPriceFromMarkup(costBasis, dec(config.markupPercent));
  } else {
    sellPrice = sellPriceFromMargin(costBasis, dec(config.targetMarginPercent));
  }

  const profitAmount = sub(sellPrice, costBasis);
  const grossMarginPercent = isZero(sellPrice)
    ? ZERO
    : roundRate(div(mul(profitAmount, HUNDRED), sellPrice));
  const effectiveMarkupPercent = isZero(costBasis)
    ? ZERO
    : roundRate(div(mul(profitAmount, HUNDRED), costBasis));

  return { costBasis, sellPrice, profitAmount, grossMarginPercent, effectiveMarkupPercent };
}

// ---------------------------------------------------------------------------
// Estimate roll-up
// ---------------------------------------------------------------------------

export function calculateEstimate(
  lines: readonly LineInput[],
  config: PricingConfig = {},
  conditions: readonly LaborConditionInput[] = [],
): { totals: EstimateTotals; lines: LineTotals[] } {
  const conditionsFactor = combineConditionFactors(conditions);
  const lineTotals = lines.map((line) => calculateLine(line, conditionsFactor));

  const base = lineTotals.filter((l) => l.inBaseBid);

  const materialCost = roundMoney(sum(base.map((l) => l.materialCost)));
  const laborCost = roundMoney(sum(base.map((l) => l.laborCost)));
  const equipmentCost = roundMoney(sum(base.map((l) => l.equipmentCost)));
  const subcontractorCost = roundMoney(sum(base.map((l) => l.subcontractCost)));
  const lineOtherCost = roundMoney(sum(base.map((l) => l.otherCost)));

  const estimateOtherCost = roundMoney(dec(config.otherDirectCost));
  if (estimateOtherCost < ZERO) {
    throw new CalculationError('Other direct cost cannot be negative.');
  }
  const otherCost = add(lineOtherCost, estimateOtherCost);

  const salesTaxPercent = dec(config.salesTaxPercent);
  if (salesTaxPercent < ZERO || salesTaxPercent > HUNDRED) {
    throw new CalculationError('Sales tax must be between 0% and 100%.');
  }
  // Sales tax applies to taxable material only — labor and subcontracts are
  // handled by the subcontractor's own quote.
  const taxableMaterial = roundMoney(sum(base.map((l) => l.taxableMaterialCost)));
  const salesTaxAmount = roundMoney(percentOf(taxableMaterial, salesTaxPercent));

  const directCost = sum([
    materialCost,
    laborCost,
    equipmentCost,
    subcontractorCost,
    otherCost,
    salesTaxAmount,
  ]);

  const overheadPercent = dec(config.overheadPercent);
  if (overheadPercent < ZERO) throw new CalculationError('Overhead percentage cannot be negative.');
  const contingencyPercent = dec(config.contingencyPercent);
  if (contingencyPercent < ZERO) {
    throw new CalculationError('Contingency percentage cannot be negative.');
  }

  const overheadAmount = roundMoney(percentOf(directCost, overheadPercent));
  const contingencyAmount = roundMoney(percentOf(directCost, contingencyPercent));
  const costBasis = sum([directCost, overheadAmount, contingencyAmount]);

  const priced = priceFromCost(costBasis, config);

  const baseLaborHours = roundRate(sum(base.map((l) => l.baseLaborHours)));
  const totalLaborHours = roundRate(sum(base.map((l) => l.laborHours)));

  const alternatesCost = roundMoney(
    sum(lineTotals.filter((l) => l.disposition === 'alternate').map((l) => l.totalCost)),
  );
  const excludedCost = roundMoney(
    sum(lineTotals.filter((l) => l.disposition === 'excluded').map((l) => l.totalCost)),
  );
  const allowancesCost = roundMoney(
    sum(lineTotals.filter((l) => l.disposition === 'allowance').map((l) => l.totalCost)),
  );

  return {
    lines: lineTotals,
    totals: {
      materialCost,
      laborCost,
      equipmentCost,
      subcontractorCost,
      otherCost,
      salesTaxAmount,
      directCost,
      overheadAmount,
      contingencyAmount,
      costBasis,
      profitAmount: priced.profitAmount,
      sellPrice: priced.sellPrice,
      grossMarginPercent: priced.grossMarginPercent,
      effectiveMarkupPercent: priced.effectiveMarkupPercent,
      baseLaborHours,
      totalLaborHours,
      alternatesCost,
      excludedCost,
      allowancesCost,
      lineCount: lineTotals.length,
      conditionsFactor,
    },
  };
}

/**
 * Shape the totals for the `estimates` cached-total columns.
 * Numbers only — this is what gets written to Postgres.
 */
export function totalsToColumns(totals: EstimateTotals) {
  return {
    material_cost: toMoneyNumber(totals.materialCost),
    labor_cost: toMoneyNumber(totals.laborCost),
    equipment_cost: toMoneyNumber(totals.equipmentCost),
    subcontractor_cost: toMoneyNumber(totals.subcontractorCost),
    other_cost: toMoneyNumber(totals.otherCost),
    sales_tax_amount: toMoneyNumber(totals.salesTaxAmount),
    direct_cost: toMoneyNumber(totals.directCost),
    overhead_amount: toMoneyNumber(totals.overheadAmount),
    contingency_amount: toMoneyNumber(totals.contingencyAmount),
    profit_amount: toMoneyNumber(totals.profitAmount),
    sell_price: toMoneyNumber(totals.sellPrice),
    gross_margin_percent: toRateNumber(totals.grossMarginPercent),
    effective_markup_percent: toRateNumber(totals.effectiveMarkupPercent),
    base_labor_hours: toRateNumber(totals.baseLaborHours),
    total_labor_hours: toRateNumber(totals.totalLaborHours),
    totals_calculated_at: new Date().toISOString(),
  };
}
