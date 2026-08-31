#!/usr/bin/env tsx
// Unit tests for the estimating engine.
//
// Run with:
//   npm run test:estimating
//
// Exits 0 if all tests pass, 1 otherwise. Follows the same tsx-based harness as
// scripts/test-geo-sanitize.ts so the @/* path alias resolves and no test
// framework has to be added to the project.
//
// These cover the money: if one of these breaks, PP Mechanical bids the wrong
// number on a seven-figure job.

import {
  add,
  dec,
  div,
  fromString,
  mul,
  percentOf,
  roundMoney,
  roundTo,
  sub,
  toFixed,
  toMoneyNumber,
  toRateNumber,
  DecimalError,
} from '@/lib/estimating/decimal';
import {
  calculateEstimate,
  calculateLine,
  CalculationError,
  combineConditionFactors,
  explainLaborFactor,
  marginToMarkup,
  markupToMargin,
  normalizeLaborUnit,
  sellPriceFromMargin,
  sellPriceFromMarkup,
  type LineInput,
} from '@/lib/estimating/calc';
import { assemblyUnitCost, explodeAssembly, resolveLaborRate } from '@/lib/estimating/assembly';
import { cloneTakeoffItems } from '@/lib/estimating/revision';
import type {
  AssemblyItem,
  AssemblyWithItems,
  LaborRate,
  TakeoffItem,
} from '@/lib/estimating/types';

type TestCase = { name: string; run: () => boolean | string };

const tests: TestCase[] = [];
function test(name: string, run: () => boolean | string) {
  tests.push({ name, run });
}

/** Compare a Dec against an expected dollar figure. */
function eqMoney(actual: bigint, expected: number, label = ''): boolean | string {
  const got = toMoneyNumber(actual);
  return got === expected ? true : `${label}expected ${expected}, got ${got}`;
}

function eqRate(actual: bigint, expected: number, label = ''): boolean | string {
  const got = toRateNumber(actual);
  return got === expected ? true : `${label}expected ${expected}, got ${got}`;
}

function throws(fn: () => unknown, ErrorType: new (...args: never[]) => Error): boolean | string {
  try {
    fn();
  } catch (error) {
    return error instanceof ErrorType
      ? true
      : `threw ${String(error)} instead of ${ErrorType.name}`;
  }
  return 'did not throw';
}

// ---------------------------------------------------------------------------
// Decimal arithmetic
// ---------------------------------------------------------------------------

test('decimal: 0.1 + 0.2 is exactly 0.3', () =>
  toFixed(add(dec('0.1'), dec('0.2')), 6) === '0.300000' ||
  `got ${toFixed(add(dec('0.1'), dec('0.2')), 6)}`);

test('decimal: float 0.1 + 0.2 would NOT be 0.3 (guards the reason this module exists)', () =>
  0.1 + 0.2 !== 0.3);

test('decimal: parses currency formatting', () =>
  toFixed(fromString('$1,234.56'), 2) === '1234.56');

test('decimal: rounds half up away from zero', () => {
  if (toFixed(roundTo(dec('2.005'), 2), 2) !== '2.01') return 'positive half did not round up';
  if (toFixed(roundTo(dec('-2.005'), 2), 2) !== '-2.01') return 'negative half did not round away';
  return true;
});

test('decimal: multiplication keeps sub-cent precision before rounding', () =>
  toFixed(mul(dec('8.4'), dec('1234.5')), 2) === '10369.80' ||
  `got ${toFixed(mul(dec('8.4'), dec('1234.5')), 2)}`);

test('decimal: division by zero throws', () => throws(() => div(dec(1), dec(0)), DecimalError));

test('decimal: percentOf', () => eqMoney(percentOf(dec(100_000), dec(20)), 20_000));

test('decimal: rejects non-finite numbers', () =>
  throws(() => dec(Number.POSITIVE_INFINITY), DecimalError));

test('decimal: sums 2,000 lines without drift', () => {
  // 2,000 x $0.07 is exactly $140.00 in fixed point; in float it drifts.
  let total = 0n;
  for (let i = 0; i < 2000; i += 1) total = add(total, dec('0.07'));
  return eqMoney(total, 140);
});

// ---------------------------------------------------------------------------
// Line calculation
// ---------------------------------------------------------------------------

test('line: material = qty x unit cost', () => {
  const line = calculateLine({ quantity: 100, unitMaterialCost: '8.40' });
  return eqMoney(line.materialCost, 840);
});

test('line: waste is added on top of material', () => {
  const line = calculateLine({
    quantity: 100,
    unitMaterialCost: '8.40',
    materialWastePercent: 10,
  });
  if (eqMoney(line.materialWasteCost, 84, 'waste: ') !== true)
    return eqMoney(line.materialWasteCost, 84, 'waste: ');
  return eqMoney(line.materialCost, 924);
});

test('line: labor = qty x hrs/unit x rate', () => {
  const line = calculateLine({
    quantity: 100,
    laborHoursPerUnit: '0.15',
    laborRate: '82.50',
  });
  if (eqRate(line.baseLaborHours, 15, 'hours: ') !== true) {
    return eqRate(line.baseLaborHours, 15, 'hours: ');
  }
  return eqMoney(line.laborCost, 1237.5);
});

test('line: a single condition factor scales the hours', () => {
  const factor = combineConditionFactors([{ code: 'occ', name: 'Occupied', factor: '1.15' }]);
  const line = calculateLine({ quantity: 100, laborHoursPerUnit: 1, laborRate: 100 }, factor);
  return eqRate(line.laborHours, 115);
});

test('line: multiple condition factors multiply', () => {
  const factor = combineConditionFactors([
    { code: 'occ', name: 'Occupied building', factor: '1.15' },
    { code: 'high', name: 'High ceiling', factor: '1.10' },
  ]);
  // 1,400 base hours x 1.15 x 1.10 = 1,771 exactly.
  const line = calculateLine({ quantity: 1400, laborHoursPerUnit: 1, laborRate: 1 }, factor);
  return eqRate(line.laborHours, 1771);
});

test('line: a line can opt out of estimate conditions', () => {
  const factor = combineConditionFactors([{ code: 'x', name: 'X', factor: '2' }]);
  const line = calculateLine(
    { quantity: 10, laborHoursPerUnit: 1, laborRate: 1, applyEstimateConditions: false },
    factor,
  );
  return eqRate(line.laborHours, 10);
});

test('line: a line factor stacks on top of estimate conditions', () => {
  const factor = combineConditionFactors([{ code: 'x', name: 'X', factor: '1.5' }]);
  const line = calculateLine(
    { quantity: 10, laborHoursPerUnit: 1, laborRate: 1, laborModifierFactor: 2 },
    factor,
  );
  return eqRate(line.laborHours, 30);
});

test('line: equipment cost passes through', () => {
  const line = calculateLine({ quantity: 1, equipmentCost: '1250.75' });
  return eqMoney(line.totalCost, 1250.75);
});

test('line: subcontract cost passes through', () => {
  const line = calculateLine({ quantity: 1, subcontractCost: 48_500 });
  return eqMoney(line.subcontractCost, 48_500);
});

test('line: other cost may be negative (deduct / credit)', () => {
  const line = calculateLine({ quantity: 1, otherCost: -500 });
  return eqMoney(line.totalCost, -500);
});

test('line: zero quantity produces zero cost, not an error', () => {
  const line = calculateLine({
    quantity: 0,
    unitMaterialCost: 999,
    laborHoursPerUnit: 5,
    laborRate: 100,
  });
  return eqMoney(line.totalCost, 0);
});

test('line: negative quantity is rejected', () =>
  throws(() => calculateLine({ quantity: -1 }), CalculationError));

test('line: negative unit cost is rejected', () =>
  throws(() => calculateLine({ quantity: 1, unitMaterialCost: -5 }), CalculationError));

test('line: negative labor hours are rejected', () =>
  throws(() => calculateLine({ quantity: 1, laborHoursPerUnit: -1 }), CalculationError));

test('line: waste above 100% is rejected', () =>
  throws(
    () => calculateLine({ quantity: 1, unitMaterialCost: 1, materialWastePercent: 101 }),
    CalculationError,
  ));

test('line: a zero labor factor is rejected', () =>
  throws(() => calculateLine({ quantity: 1, laborModifierFactor: 0 }), CalculationError));

test('line: non-taxable line contributes no taxable material', () => {
  const line = calculateLine({ quantity: 10, unitMaterialCost: 100, isTaxable: false });
  return eqMoney(line.taxableMaterialCost, 0);
});

// ---------------------------------------------------------------------------
// Labor unit normalization
// ---------------------------------------------------------------------------

test('labor units: hours per 100 units normalizes', () =>
  eqRate(normalizeLaborUnit(25, 'hours_per_100_units'), 0.25));

test('labor units: hours per 1000 units normalizes', () =>
  eqRate(normalizeLaborUnit(25, 'hours_per_1000_units'), 0.025));

test('labor units: hours per unit passes through', () =>
  eqRate(normalizeLaborUnit('0.15', 'hours_per_unit'), 0.15));

// ---------------------------------------------------------------------------
// Labor math transparency
// ---------------------------------------------------------------------------

test('explainLaborFactor: shows every step of 1,400 -> 1,771', () => {
  const result = explainLaborFactor(dec(1400), [
    { code: 'occ', name: 'Occupied building', factor: '1.15' },
    { code: 'high', name: 'High ceiling', factor: '1.10' },
  ]);
  if (result.steps.length !== 2) return `expected 2 steps, got ${result.steps.length}`;
  if (toRateNumber(result.steps[0].runningHours) !== 1610) {
    return `step 1 expected 1610, got ${toRateNumber(result.steps[0].runningHours)}`;
  }
  return eqRate(result.adjustedHours, 1771);
});

test('conditions: an invalid factor is rejected', () =>
  throws(
    () => combineConditionFactors([{ code: 'bad', name: 'Bad', factor: 0 }]),
    CalculationError,
  ));

// ---------------------------------------------------------------------------
// Markup vs margin — the formulas this system must never get wrong
// ---------------------------------------------------------------------------

test('margin: $100,000 at 20% gross margin sells for $125,000', () =>
  eqMoney(sellPriceFromMargin(dec(100_000), dec(20)), 125_000));

test('markup: $100,000 at 20% markup sells for $120,000', () =>
  eqMoney(sellPriceFromMarkup(dec(100_000), dec(20)), 120_000));

test('margin and markup are NOT the same number', () =>
  toMoneyNumber(sellPriceFromMargin(dec(100_000), dec(20))) !==
  toMoneyNumber(sellPriceFromMarkup(dec(100_000), dec(20))));

test('markupToMargin: 25% markup is a 20% margin', () => eqRate(markupToMargin(dec(25)), 20));

test('marginToMarkup: 20% margin requires a 25% markup', () => eqRate(marginToMarkup(dec(20)), 25));

test('margin: 100% is rejected as unreachable', () =>
  throws(() => sellPriceFromMargin(dec(1000), dec(100)), CalculationError));

test('margin: a negative target is rejected', () =>
  throws(() => sellPriceFromMargin(dec(1000), dec(-5)), CalculationError));

test('margin: 0% sells at cost', () => eqMoney(sellPriceFromMargin(dec(1000), dec(0)), 1000));

// ---------------------------------------------------------------------------
// Estimate roll-up
// ---------------------------------------------------------------------------

const sampleLines: LineInput[] = [
  // Material with waste
  { quantity: 500, unitMaterialCost: '12.00', materialWastePercent: 5, isTaxable: true },
  // Labor
  { quantity: 200, laborHoursPerUnit: 1, laborRate: '80.00' },
  // Equipment
  { quantity: 1, equipmentCost: '2500.00' },
  // Subcontract
  { quantity: 1, subcontractCost: '15000.00' },
  // Other
  { quantity: 1, otherCost: '1000.00' },
];

test('estimate: direct cost sums every category', () => {
  const { totals } = calculateEstimate(sampleLines);
  // material 500x12 = 6,000 + 5% = 6,300
  if (eqMoney(totals.materialCost, 6300, 'material: ') !== true) {
    return eqMoney(totals.materialCost, 6300, 'material: ');
  }
  if (eqMoney(totals.laborCost, 16_000, 'labor: ') !== true) {
    return eqMoney(totals.laborCost, 16_000, 'labor: ');
  }
  return eqMoney(totals.directCost, 6300 + 16_000 + 2500 + 15_000 + 1000);
});

test('estimate: overhead and contingency are both taken on direct cost', () => {
  const { totals } = calculateEstimate(sampleLines, {
    overheadPercent: 10,
    contingencyPercent: 5,
  });
  const direct = toMoneyNumber(totals.directCost);
  if (eqMoney(totals.overheadAmount, Math.round(direct * 0.1 * 100) / 100, 'overhead: ') !== true) {
    return eqMoney(totals.overheadAmount, Math.round(direct * 0.1 * 100) / 100, 'overhead: ');
  }
  return eqMoney(totals.contingencyAmount, Math.round(direct * 0.05 * 100) / 100);
});

test('estimate: sales tax applies to taxable material only', () => {
  const { totals } = calculateEstimate(
    [
      { quantity: 1, unitMaterialCost: 1000, isTaxable: true },
      { quantity: 1, unitMaterialCost: 1000, isTaxable: false },
      { quantity: 1, laborHoursPerUnit: 10, laborRate: 100 },
    ],
    { salesTaxPercent: 6.625 },
  );
  return eqMoney(totals.salesTaxAmount, 66.25);
});

test('estimate: excluded lines are documented but never priced', () => {
  const { totals } = calculateEstimate([
    { quantity: 1, unitMaterialCost: 1000, disposition: 'included' },
    { quantity: 1, unitMaterialCost: 5000, disposition: 'excluded' },
  ]);
  if (eqMoney(totals.directCost, 1000, 'direct: ') !== true) {
    return eqMoney(totals.directCost, 1000, 'direct: ');
  }
  return eqMoney(totals.excludedCost, 5000);
});

test('estimate: alternates are totalled separately from the base bid', () => {
  const { totals } = calculateEstimate([
    { quantity: 1, unitMaterialCost: 1000, disposition: 'included' },
    { quantity: 1, unitMaterialCost: 2500, disposition: 'alternate' },
  ]);
  if (eqMoney(totals.directCost, 1000, 'direct: ') !== true) {
    return eqMoney(totals.directCost, 1000, 'direct: ');
  }
  return eqMoney(totals.alternatesCost, 2500);
});

test('estimate: allowances ARE carried in the base bid', () => {
  const { totals } = calculateEstimate([
    { quantity: 1, unitMaterialCost: 1000, disposition: 'included' },
    { quantity: 1, otherCost: 2500, disposition: 'allowance' },
  ]);
  if (eqMoney(totals.directCost, 3500, 'direct: ') !== true) {
    return eqMoney(totals.directCost, 3500, 'direct: ');
  }
  return eqMoney(totals.allowancesCost, 2500);
});

test('estimate: desired-margin sell price and reported margin agree', () => {
  const { totals } = calculateEstimate([{ quantity: 1, unitMaterialCost: 100_000 }], {
    pricingMode: 'margin',
    targetMarginPercent: 20,
  });
  if (eqMoney(totals.sellPrice, 125_000, 'sell: ') !== true) {
    return eqMoney(totals.sellPrice, 125_000, 'sell: ');
  }
  if (eqMoney(totals.profitAmount, 25_000, 'profit: ') !== true) {
    return eqMoney(totals.profitAmount, 25_000, 'profit: ');
  }
  if (eqRate(totals.grossMarginPercent, 20, 'margin: ') !== true) {
    return eqRate(totals.grossMarginPercent, 20, 'margin: ');
  }
  return eqRate(totals.effectiveMarkupPercent, 25);
});

test('estimate: fixed price mode derives profit from what is left', () => {
  const { totals } = calculateEstimate([{ quantity: 1, unitMaterialCost: 90_000 }], {
    pricingMode: 'fixed',
    fixedSellPrice: 100_000,
  });
  if (eqMoney(totals.profitAmount, 10_000, 'profit: ') !== true) {
    return eqMoney(totals.profitAmount, 10_000, 'profit: ');
  }
  return eqRate(totals.grossMarginPercent, 10);
});

test('estimate: a fixed price below cost reports a negative margin, it does not hide it', () => {
  const { totals } = calculateEstimate([{ quantity: 1, unitMaterialCost: 100_000 }], {
    pricingMode: 'fixed',
    fixedSellPrice: 90_000,
  });
  return toMoneyNumber(totals.profitAmount) === -10_000 &&
    toRateNumber(totals.grossMarginPercent) < 0
    ? true
    : `profit ${toMoneyNumber(totals.profitAmount)}, margin ${toRateNumber(totals.grossMarginPercent)}`;
});

test('estimate: an empty estimate is zero everywhere, not NaN', () => {
  const { totals } = calculateEstimate([], { pricingMode: 'margin', targetMarginPercent: 20 });
  return (
    toMoneyNumber(totals.directCost) === 0 &&
    toMoneyNumber(totals.sellPrice) === 0 &&
    toRateNumber(totals.grossMarginPercent) === 0
  );
});

test('estimate: a seven-figure bid stays exact', () => {
  // 12,500 LF of pipe at $87.35, plus 9,800 hours at $94.75.
  const { totals } = calculateEstimate(
    [
      { quantity: 12_500, unitMaterialCost: '87.35' },
      { quantity: 9800, laborHoursPerUnit: 1, laborRate: '94.75' },
    ],
    { overheadPercent: 12, contingencyPercent: 3, pricingMode: 'margin', targetMarginPercent: 18 },
  );
  const material = 12_500 * 87.35; // 1,091,875
  const labor = 9800 * 94.75; // 928,550
  const direct = material + labor; // 2,020,425
  if (eqMoney(totals.directCost, direct, 'direct: ') !== true) {
    return eqMoney(totals.directCost, direct, 'direct: ');
  }
  const basis = direct + direct * 0.12 + direct * 0.03;
  if (eqMoney(totals.costBasis, Math.round(basis * 100) / 100, 'basis: ') !== true) {
    return eqMoney(totals.costBasis, Math.round(basis * 100) / 100, 'basis: ');
  }
  return eqRate(totals.grossMarginPercent, 18);
});

test('estimate: negative overhead is rejected', () =>
  throws(() => calculateEstimate(sampleLines, { overheadPercent: -1 }), CalculationError));

test('estimate: negative other direct cost is rejected', () =>
  throws(() => calculateEstimate(sampleLines, { otherDirectCost: -1 }), CalculationError));

test('estimate: sales tax above 100% is rejected', () =>
  throws(() => calculateEstimate(sampleLines, { salesTaxPercent: 101 }), CalculationError));

// ---------------------------------------------------------------------------
// Assemblies
// ---------------------------------------------------------------------------

const RTU_RATE: LaborRate = {
  id: 'rate-sm',
  code: 'sm_journeyman',
  name: 'Sheet Metal Journeyman',
  description: null,
  base_hourly_rate: '80.00',
  overtime_multiplier: 1.5,
  doubletime_multiplier: 2,
  prevailing_wage_hourly_rate: '110.00',
  notes: null,
  is_active: true,
  sort_order: 0,
  created_at: '',
  updated_at: '',
  created_by: null,
  updated_by: null,
};

function assemblyItem(overrides: Partial<AssemblyItem>): AssemblyItem {
  return {
    id: `item-${Math.random().toString(36).slice(2)}`,
    assembly_id: 'asm-1',
    sort_order: 0,
    item_type: 'material',
    material_id: null,
    labor_rate_id: null,
    equipment_rate_id: null,
    vendor_id: null,
    description: 'component',
    quantity_per_unit: 1,
    unit: 'EA',
    unit_cost: 0,
    waste_percent: 0,
    labor_hours_per_unit: 0,
    notes: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

const rtuAssembly: AssemblyWithItems = {
  id: 'asm-1',
  code: 'rtu_5t_std',
  name: '5 Ton RTU – Standard Installation',
  description: 'Test fixture, not real pricing.',
  scope_category_id: 'scope-1',
  unit: 'EA',
  version: 3,
  notes: null,
  is_active: true,
  created_at: '',
  updated_at: '',
  created_by: null,
  updated_by: null,
  scope_category: { id: 'scope-1', name: 'HVAC Equipment', code: 'hvac_equipment' },
  items: [
    assemblyItem({
      id: 'i1',
      sort_order: 0,
      item_type: 'material',
      description: '5 ton rooftop unit',
      quantity_per_unit: 1,
      unit_cost: '6000.00',
    }),
    assemblyItem({
      id: 'i2',
      sort_order: 1,
      item_type: 'material',
      description: 'Roof curb',
      quantity_per_unit: 1,
      unit_cost: '900.00',
      waste_percent: 0,
    }),
    assemblyItem({
      id: 'i3',
      sort_order: 2,
      item_type: 'labor',
      description: 'Set and connect',
      quantity_per_unit: 1,
      unit_cost: 0,
      labor_hours_per_unit: 16,
      labor_rate_id: 'rate-sm',
    }),
    assemblyItem({
      id: 'i4',
      sort_order: 3,
      item_type: 'equipment',
      description: 'Crane allowance',
      quantity_per_unit: 1,
      unit_cost: '1200.00',
    }),
    assemblyItem({
      id: 'i5',
      sort_order: 4,
      item_type: 'subcontract',
      description: 'Electrical hookup allowance',
      quantity_per_unit: 1,
      unit_cost: '850.00',
    }),
  ],
};

const rateMap = new Map([['rate-sm', RTU_RATE]]);

test('assembly: unit cost rolls up every component type', () => {
  const cost = assemblyUnitCost(rtuAssembly.items, rateMap);
  if (cost.material !== 6900) return `material expected 6900, got ${cost.material}`;
  if (cost.laborHours !== 16) return `hours expected 16, got ${cost.laborHours}`;
  if (cost.labor !== 1280) return `labor expected 1280, got ${cost.labor}`;
  if (cost.equipment !== 1200) return `equipment expected 1200, got ${cost.equipment}`;
  if (cost.subcontract !== 850) return `sub expected 850, got ${cost.subcontract}`;
  if (cost.total !== 10_230) return `total expected 10230, got ${cost.total}`;
  return true;
});

test('assembly: explosion produces one group row plus one row per component', () => {
  const result = explodeAssembly(rtuAssembly, 6, {
    laborRates: rateMap,
    usePrevailingWage: false,
  });
  if (result.components.length !== 5)
    return `expected 5 components, got ${result.components.length}`;
  if (result.group.line_type !== 'assembly') return 'group row has the wrong line type';
  return true;
});

test('assembly: the group row carries NO cost, so nothing is double counted', () => {
  const { group } = explodeAssembly(rtuAssembly, 6, {
    laborRates: rateMap,
    usePrevailingWage: false,
  });
  return (
    group.unit_material_cost === 0 &&
    group.equipment_cost === 0 &&
    group.subcontract_cost === 0 &&
    group.other_cost === 0 &&
    group.labor_hours_per_unit === 0
  );
});

test('assembly: component quantities are extended by the assembly count', () => {
  const { components } = explodeAssembly(rtuAssembly, 6, {
    laborRates: rateMap,
    usePrevailingWage: false,
  });
  const rtu = components.find((c) => c.description === '5 ton rooftop unit');
  return rtu?.quantity === 6 ? true : `expected qty 6, got ${rtu?.quantity}`;
});

test('assembly: exploded x6 costs exactly 6x the unit cost', () => {
  const { components } = explodeAssembly(rtuAssembly, 6, {
    laborRates: rateMap,
    usePrevailingWage: false,
  });
  const { totals } = calculateEstimate(
    components.map((component) => ({
      quantity: component.quantity,
      unitMaterialCost: component.unit_material_cost,
      materialWastePercent: component.material_waste_percent,
      laborHoursPerUnit: component.labor_hours_per_unit,
      laborRate: component.labor_rate_snapshot,
      equipmentCost: component.equipment_cost,
      subcontractCost: component.subcontract_cost,
      otherCost: component.other_cost,
    })),
  );
  return eqMoney(totals.directCost, 10_230 * 6);
});

test('assembly: labor rate is SNAPSHOTTED onto the exploded rows', () => {
  const { components } = explodeAssembly(rtuAssembly, 1, {
    laborRates: rateMap,
    usePrevailingWage: false,
  });
  const labor = components.find((c) => c.description === 'Set and connect');
  return labor?.labor_rate_snapshot === 80 && labor.labor_rate_name === 'Sheet Metal Journeyman'
    ? true
    : `got ${labor?.labor_rate_snapshot} / ${labor?.labor_rate_name}`;
});

test('assembly: a prevailing-wage project snapshots the prevailing-wage rate', () => {
  const { components } = explodeAssembly(rtuAssembly, 1, {
    laborRates: rateMap,
    usePrevailingWage: true,
  });
  const labor = components.find((c) => c.description === 'Set and connect');
  return labor?.labor_rate_snapshot === 110 ? true : `got ${labor?.labor_rate_snapshot}`;
});

test('assembly: prevailing wage falls back to the standard rate when none is set', () => {
  const noPw = { ...RTU_RATE, prevailing_wage_hourly_rate: null };
  return Number(resolveLaborRate(noPw, true)) === 80;
});

test('assembly: the exploded rows record the assembly version they came from', () => {
  const { group, components } = explodeAssembly(rtuAssembly, 1, {
    laborRates: rateMap,
    usePrevailingWage: false,
  });
  return group.source_assembly_version === 3 && components[0].source_assembly_version === 3;
});

test('HISTORICAL INTEGRITY: editing the master assembly does not move an exploded bid', () => {
  const { components } = explodeAssembly(rtuAssembly, 6, {
    laborRates: rateMap,
    usePrevailingWage: false,
  });
  const priceLines = () =>
    calculateEstimate(
      components.map((component) => ({
        quantity: component.quantity,
        unitMaterialCost: component.unit_material_cost,
        laborHoursPerUnit: component.labor_hours_per_unit,
        laborRate: component.labor_rate_snapshot,
        equipmentCost: component.equipment_cost,
        subcontractCost: component.subcontract_cost,
        otherCost: component.other_cost,
      })),
    ).totals.directCost;

  const before = toMoneyNumber(priceLines());

  // The master assembly and the master labor rate both change afterwards.
  rtuAssembly.items[0].unit_cost = '9999.00';
  rtuAssembly.version = 4;
  rateMap.set('rate-sm', { ...RTU_RATE, base_hourly_rate: '200.00' });

  const after = toMoneyNumber(priceLines());

  // Restore the fixture for any later test.
  rtuAssembly.items[0].unit_cost = '6000.00';
  rtuAssembly.version = 3;
  rateMap.set('rate-sm', RTU_RATE);

  return before === after ? true : `bid moved from ${before} to ${after}`;
});

test('assembly: a negative quantity is rejected', () => {
  try {
    explodeAssembly(rtuAssembly, -1, { laborRates: rateMap, usePrevailingWage: false });
  } catch {
    return true;
  }
  return 'did not throw';
});

// ---------------------------------------------------------------------------
// Revision cloning
// ---------------------------------------------------------------------------

function takeoffItem(overrides: Partial<TakeoffItem>): TakeoffItem {
  return {
    id: 'x',
    estimate_id: 'est-1',
    scope_category_id: null,
    scope_code: null,
    scope_name: null,
    line_type: 'material',
    source_material_id: null,
    source_assembly_id: null,
    source_assembly_item_id: null,
    source_assembly_version: null,
    parent_item_id: null,
    labor_rate_id: null,
    equipment_rate_id: null,
    vendor_id: null,
    description: 'line',
    customer_description: null,
    quantity: 1,
    unit: 'EA',
    unit_material_cost: 0,
    material_waste_percent: 0,
    labor_hours_per_unit: 0,
    labor_rate_snapshot: 0,
    labor_rate_name: null,
    labor_modifier_factor: 1,
    apply_estimate_conditions: true,
    equipment_cost: 0,
    subcontract_cost: 0,
    other_cost: 0,
    original_unit_material_cost: null,
    is_cost_overridden: false,
    override_reason: null,
    disposition: 'included',
    is_taxable: true,
    internal_notes: null,
    sort_order: 0,
    created_at: '',
    updated_at: '',
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

const revisionSource: TakeoffItem[] = [
  takeoffItem({ id: 'group-1', line_type: 'assembly', description: 'RTU assembly' }),
  takeoffItem({
    id: 'child-1',
    line_type: 'assembly_component',
    parent_item_id: 'group-1',
    description: 'RTU',
    unit_material_cost: '6000.00',
  }),
  takeoffItem({
    id: 'child-2',
    line_type: 'assembly_component',
    parent_item_id: 'group-1',
    description: 'Curb',
    unit_material_cost: '900.00',
  }),
  takeoffItem({ id: 'flat-1', description: 'Standalone line', unit_material_cost: '55.00' }),
];

test('revision: every row is cloned', () => {
  let counter = 0;
  const cloned = cloneTakeoffItems(revisionSource, 'est-2', 'owner', () => `new-${counter++}`);
  return cloned.length === 4 ? true : `expected 4, got ${cloned.length}`;
});

test('revision: parent/child links are remapped to the NEW ids', () => {
  let counter = 0;
  const cloned = cloneTakeoffItems(revisionSource, 'est-2', 'owner', () => `new-${counter++}`);
  const group = cloned.find((row) => row.description === 'RTU assembly')!;
  const children = cloned.filter((row) => row.parent_item_id !== null);
  if (children.length !== 2) return `expected 2 children, got ${children.length}`;
  return children.every((child) => child.parent_item_id === group.id)
    ? true
    : 'a child still points at the old parent id';
});

test('revision: no cloned row keeps an original id', () => {
  let counter = 0;
  const cloned = cloneTakeoffItems(revisionSource, 'est-2', 'owner', () => `new-${counter++}`);
  const originalIds = new Set(revisionSource.map((row) => row.id));
  return cloned.every((row) => !originalIds.has(row.id));
});

test('revision: every row points at the new estimate', () => {
  const cloned = cloneTakeoffItems(revisionSource, 'est-2', 'owner', () => crypto.randomUUID());
  return cloned.every((row) => row.estimate_id === 'est-2');
});

test('revision: snapshotted prices are carried over unchanged', () => {
  const cloned = cloneTakeoffItems(revisionSource, 'est-2', 'owner', () => crypto.randomUUID());
  const rtu = cloned.find((row) => row.description === 'RTU')!;
  return rtu.unit_material_cost === '6000.00'
    ? true
    : `expected 6000.00, got ${rtu.unit_material_cost}`;
});

test('revision: the source rows are not mutated', () => {
  cloneTakeoffItems(revisionSource, 'est-2', 'owner', () => crypto.randomUUID());
  return (
    revisionSource[1].parent_item_id === 'group-1' && revisionSource[0].estimate_id === 'est-1'
  );
});

test('revision: cloning twice produces two independent sets', () => {
  const a = cloneTakeoffItems(revisionSource, 'est-2', 'owner', () => crypto.randomUUID());
  const b = cloneTakeoffItems(revisionSource, 'est-3', 'owner', () => crypto.randomUUID());
  const aIds = new Set(a.map((row) => row.id));
  return b.every((row) => !aIds.has(row.id));
});

// ---------------------------------------------------------------------------
// Currency rounding at the estimate level
// ---------------------------------------------------------------------------

test('rounding: a third-of-a-cent unit price rounds cleanly at the line', () => {
  const line = calculateLine({ quantity: 3, unitMaterialCost: '0.3333' });
  return eqMoney(line.materialCost, 1);
});

test('rounding: totals are always exact cents', () => {
  const { totals } = calculateEstimate([
    { quantity: 7, unitMaterialCost: '1.111' },
    { quantity: 13, unitMaterialCost: '2.222' },
  ]);
  const asString = toFixed(totals.directCost, 6);
  return asString.endsWith('0000') ? true : `total is not a whole cent: ${asString}`;
});

test('rounding: roundMoney and sub round-trip', () =>
  eqMoney(roundMoney(sub(dec('100.005'), dec('0.005'))), 100));

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

let passed = 0;
const failures: string[] = [];

for (const testCase of tests) {
  let result: boolean | string;
  try {
    result = testCase.run();
  } catch (error) {
    result = `threw ${error instanceof Error ? error.message : String(error)}`;
  }
  if (result === true) {
    passed += 1;
  } else {
    failures.push(`  ✗ ${testCase.name}${typeof result === 'string' ? `\n      ${result}` : ''}`);
  }
}

console.log(`\n[test-estimating-calc] ${passed}/${tests.length} passed`);
if (failures.length > 0) {
  console.error(`\n${failures.join('\n')}\n`);
  process.exit(1);
}
process.exit(0);
