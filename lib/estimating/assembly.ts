// Assembly explosion.
//
// An assembly ("5 Ton RTU - Standard Installation") is a reusable template of
// material, labor, equipment, subcontract and miscellaneous components. Adding
// `5 Ton RTU Installation x 6` to an estimate explodes it into:
//
//   * one group row  (line_type 'assembly')      - carries NO cost of its own
//   * one child row  (line_type 'assembly_component') per component
//
// The group row's own cost columns stay at zero so nothing is double counted;
// its displayed total is the sum of its children.
//
// HISTORICAL INTEGRITY IS THE POINT OF THIS MODULE. Every price and
// productivity value is COPIED into the takeoff rows at explosion time.
// Editing the master assembly or a master material afterwards can never move
// a bid that was already built. The rows keep source_assembly_id /
// source_material_id / source_assembly_version purely for traceability.

import { calculateEstimate, type LineInput } from './calc';
import { dec, mul, roundMoney, roundRate, toMoneyNumber, toRateNumber } from './decimal';
import type { AssemblyItem, AssemblyWithItems, LaborRate, Numeric } from './types';

/** Master data the explosion needs, resolved by the caller in one batch. */
export type ExplosionContext = {
  /** Burdened labor rates keyed by id, used to snapshot labor_rate_snapshot. */
  laborRates: Map<
    string,
    Pick<LaborRate, 'id' | 'name' | 'base_hourly_rate' | 'prevailing_wage_hourly_rate'>
  >;
  /** Use the prevailing-wage rate where a classification defines one. */
  usePrevailingWage: boolean;
};

export type ExplodedGroupRow = {
  line_type: 'assembly';
  scope_category_id: string | null;
  scope_code: string | null;
  scope_name: string | null;
  source_assembly_id: string;
  source_assembly_version: number;
  description: string;
  customer_description: string | null;
  quantity: number;
  unit: string;
  unit_material_cost: 0;
  material_waste_percent: 0;
  labor_hours_per_unit: 0;
  labor_rate_snapshot: 0;
  equipment_cost: 0;
  subcontract_cost: 0;
  other_cost: 0;
  disposition: string;
  sort_order: number;
};

export type ExplodedComponentRow = {
  line_type: 'assembly_component';
  scope_category_id: string | null;
  scope_code: string | null;
  scope_name: string | null;
  source_assembly_id: string;
  source_assembly_item_id: string;
  source_assembly_version: number;
  source_material_id: string | null;
  labor_rate_id: string | null;
  equipment_rate_id: string | null;
  vendor_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_material_cost: number;
  material_waste_percent: number;
  labor_hours_per_unit: number;
  labor_rate_snapshot: number;
  labor_rate_name: string | null;
  equipment_cost: number;
  subcontract_cost: number;
  other_cost: number;
  is_taxable: boolean;
  disposition: string;
  sort_order: number;
  internal_notes: string | null;
};

export type ExplosionResult = {
  group: ExplodedGroupRow;
  components: ExplodedComponentRow[];
};

/**
 * Resolve the burdened hourly rate to snapshot for a component.
 * Falls back to the standard rate when no prevailing-wage rate is configured,
 * rather than silently pricing prevailing-wage work at zero.
 */
export function resolveLaborRate(
  rate: Pick<LaborRate, 'base_hourly_rate' | 'prevailing_wage_hourly_rate'> | undefined,
  usePrevailingWage: boolean,
): Numeric {
  if (!rate) return 0;
  if (usePrevailingWage && rate.prevailing_wage_hourly_rate != null) {
    return rate.prevailing_wage_hourly_rate;
  }
  return rate.base_hourly_rate;
}

/**
 * Explode one assembly at a given quantity into takeoff-row shapes.
 * Returns plain objects; the caller adds estimate_id / parent_item_id and
 * performs the insert.
 */
export function explodeAssembly(
  assembly: AssemblyWithItems,
  quantity: number | string,
  context: ExplosionContext,
  options: {
    scopeCategoryId?: string | null;
    scopeCode?: string | null;
    scopeName?: string | null;
    disposition?: string;
    startSortOrder?: number;
    customerDescription?: string | null;
  } = {},
): ExplosionResult {
  const qty = dec(quantity);
  if (qty < 0n) {
    throw new Error('Assembly quantity cannot be negative.');
  }

  const scopeCategoryId =
    options.scopeCategoryId !== undefined
      ? options.scopeCategoryId
      : (assembly.scope_category_id ?? null);
  const scopeCode = options.scopeCode ?? assembly.scope_category?.code ?? null;
  const scopeName = options.scopeName ?? assembly.scope_category?.name ?? null;
  const disposition = options.disposition ?? 'included';
  const startSortOrder = options.startSortOrder ?? 0;

  const group: ExplodedGroupRow = {
    line_type: 'assembly',
    scope_category_id: scopeCategoryId,
    scope_code: scopeCode,
    scope_name: scopeName,
    source_assembly_id: assembly.id,
    source_assembly_version: assembly.version,
    description: assembly.name,
    customer_description: options.customerDescription ?? assembly.description ?? null,
    quantity: toRateNumber(qty),
    unit: assembly.unit,
    // Zero by design: the group row is a header, its children carry the cost.
    unit_material_cost: 0,
    material_waste_percent: 0,
    labor_hours_per_unit: 0,
    labor_rate_snapshot: 0,
    equipment_cost: 0,
    subcontract_cost: 0,
    other_cost: 0,
    disposition,
    sort_order: startSortOrder,
  };

  const components = assembly.items
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item, index) =>
      explodeComponent(item, assembly, qty, context, {
        scopeCategoryId,
        scopeCode,
        scopeName,
        disposition,
        sortOrder: startSortOrder + index + 1,
      }),
    );

  return { group, components };
}

function explodeComponent(
  item: AssemblyItem,
  assembly: AssemblyWithItems,
  assemblyQty: bigint,
  context: ExplosionContext,
  opts: {
    scopeCategoryId: string | null;
    scopeCode: string | null;
    scopeName: string | null;
    disposition: string;
    sortOrder: number;
  },
): ExplodedComponentRow {
  // Extended component quantity = per-assembly-unit quantity x assembly count.
  const extendedQty = roundRate(mul(dec(item.quantity_per_unit), assemblyQty));
  const unitCost = dec(item.unit_cost);

  const laborRate = item.labor_rate_id ? context.laborRates.get(item.labor_rate_id) : undefined;
  const laborRateSnapshot = dec(resolveLaborRate(laborRate, context.usePrevailingWage));

  // Where the component's unit_cost lands depends on what kind of cost it is.
  // Material cost stays per-unit (so waste and quantity math stay visible);
  // equipment / subcontract / other are extended here into a line amount.
  const isMaterial = item.item_type === 'material';
  const extendedCost = roundMoney(mul(extendedQty, unitCost));

  return {
    line_type: 'assembly_component',
    scope_category_id: opts.scopeCategoryId,
    scope_code: opts.scopeCode,
    scope_name: opts.scopeName,
    source_assembly_id: assembly.id,
    source_assembly_item_id: item.id,
    source_assembly_version: assembly.version,
    source_material_id: item.material_id,
    labor_rate_id: item.labor_rate_id,
    equipment_rate_id: item.equipment_rate_id,
    vendor_id: item.vendor_id,
    description: item.description,
    quantity: toRateNumber(extendedQty),
    unit: item.unit,
    unit_material_cost: isMaterial ? toRateNumber(unitCost) : 0,
    material_waste_percent: isMaterial ? toRateNumber(dec(item.waste_percent)) : 0,
    labor_hours_per_unit: toRateNumber(dec(item.labor_hours_per_unit)),
    labor_rate_snapshot: toRateNumber(laborRateSnapshot),
    labor_rate_name: laborRate?.name ?? null,
    equipment_cost: item.item_type === 'equipment' ? toMoneyNumber(extendedCost) : 0,
    subcontract_cost: item.item_type === 'subcontract' ? toMoneyNumber(extendedCost) : 0,
    other_cost: item.item_type === 'other' ? toMoneyNumber(extendedCost) : 0,
    is_taxable: isMaterial,
    disposition: opts.disposition,
    sort_order: opts.sortOrder,
    internal_notes: item.notes,
  };
}

/**
 * Cost of ONE unit of an assembly, for previewing it in the assembly editor.
 *
 * Routed through the same `calculateEstimate` engine the real takeoff uses, so
 * the preview can never drift from what the estimate will actually compute.
 * Estimate-wide conditions are not applied — those only exist inside an
 * estimate.
 */
export function assemblyUnitCost(
  items: readonly AssemblyItem[],
  laborRates: Map<string, Pick<LaborRate, 'base_hourly_rate' | 'prevailing_wage_hourly_rate'>>,
): {
  material: number;
  laborHours: number;
  labor: number;
  equipment: number;
  subcontract: number;
  other: number;
  total: number;
} {
  const lines: LineInput[] = items.map((item) => {
    const qty = dec(item.quantity_per_unit);
    const extended = roundMoney(mul(qty, dec(item.unit_cost)));
    const isMaterial = item.item_type === 'material';
    const rate = item.labor_rate_id ? laborRates.get(item.labor_rate_id) : undefined;
    return {
      quantity: qty,
      unitMaterialCost: isMaterial ? item.unit_cost : 0,
      materialWastePercent: isMaterial ? item.waste_percent : 0,
      laborHoursPerUnit: item.labor_hours_per_unit,
      laborRate: resolveLaborRate(rate, false),
      equipmentCost: item.item_type === 'equipment' ? extended : 0,
      subcontractCost: item.item_type === 'subcontract' ? extended : 0,
      otherCost: item.item_type === 'other' ? extended : 0,
      isTaxable: isMaterial,
    };
  });

  const { totals } = calculateEstimate(lines);
  return {
    material: toMoneyNumber(totals.materialCost),
    laborHours: toRateNumber(totals.totalLaborHours),
    labor: toMoneyNumber(totals.laborCost),
    equipment: toMoneyNumber(totals.equipmentCost),
    subcontract: toMoneyNumber(totals.subcontractorCost),
    other: toMoneyNumber(totals.otherCost),
    total: toMoneyNumber(totals.directCost),
  };
}
