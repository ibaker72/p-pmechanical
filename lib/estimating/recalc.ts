// Turning stored rows into money.
//
// One function maps takeoff rows to calculation inputs, and one function
// persists the result. Both the estimate pages and every mutation go through
// here, so the numbers on screen and the numbers in the `estimates` cached
// columns are produced by the same code path and cannot disagree.

import { calculateEstimate, type EstimateTotals, type LineInput, type LineTotals } from './calc';
import { totalsToColumns } from './calc';
import { estimatingDb } from './db';
import { getEstimate, listLaborConditions, listTakeoffItems } from './queries';
import type { Estimate, EstimateLaborCondition, TakeoffItem } from './types';

/** Map a stored takeoff row onto the calculation engine's input shape. */
export function itemToLineInput(item: TakeoffItem): LineInput {
  return {
    id: item.id,
    lineType: item.line_type,
    disposition: item.disposition,
    quantity: item.quantity,
    unitMaterialCost: item.unit_material_cost,
    materialWastePercent: item.material_waste_percent,
    laborHoursPerUnit: item.labor_hours_per_unit,
    laborRate: item.labor_rate_snapshot,
    laborModifierFactor: item.labor_modifier_factor,
    applyEstimateConditions: item.apply_estimate_conditions,
    equipmentCost: item.equipment_cost,
    subcontractCost: item.subcontract_cost,
    otherCost: item.other_cost,
    isTaxable: item.is_taxable,
  };
}

/**
 * Compute an estimate's totals from rows already in memory.
 *
 * An assembly group row carries no cost of its own — its children do — so it
 * is passed through the engine like any other line and simply contributes
 * zero. Nothing is double counted.
 */
export function computeEstimateTotals(
  estimate: Pick<
    Estimate,
    | 'overhead_percent'
    | 'contingency_percent'
    | 'pricing_mode'
    | 'markup_percent'
    | 'target_margin_percent'
    | 'fixed_sell_price'
    | 'other_direct_cost'
    | 'sales_tax_percent'
  >,
  items: readonly TakeoffItem[],
  conditions: readonly EstimateLaborCondition[],
): { totals: EstimateTotals; lines: LineTotals[]; byId: Map<string, LineTotals> } {
  const { totals, lines } = calculateEstimate(
    items.map(itemToLineInput),
    {
      overheadPercent: estimate.overhead_percent,
      contingencyPercent: estimate.contingency_percent,
      pricingMode: estimate.pricing_mode,
      markupPercent: estimate.markup_percent,
      targetMarginPercent: estimate.target_margin_percent,
      fixedSellPrice: estimate.fixed_sell_price,
      otherDirectCost: estimate.other_direct_cost,
      salesTaxPercent: estimate.sales_tax_percent,
    },
    conditions.map((condition) => ({
      code: condition.code,
      name: condition.name,
      factor: condition.factor,
    })),
  );

  const byId = new Map<string, LineTotals>();
  for (const line of lines) {
    if (line.id) byId.set(line.id, line);
  }
  return { totals, lines, byId };
}

/**
 * Recompute an estimate from its current rows and persist the cached totals.
 *
 * Called after every mutation that can change a number. The client never sends
 * a total; the server derives it. Returns the fresh totals so a caller can use
 * them without re-reading.
 */
export async function recalculateEstimate(estimateId: string): Promise<EstimateTotals | null> {
  const estimate = await getEstimate(estimateId);
  if (!estimate) return null;

  const [items, conditions] = await Promise.all([
    listTakeoffItems(estimateId),
    listLaborConditions(estimateId),
  ]);

  const { totals } = computeEstimateTotals(estimate, items, conditions);

  const { error } = await estimatingDb()
    .from('estimates')
    .update(totalsToColumns(totals))
    .eq('id', estimateId);
  if (error) throw error;

  return totals;
}

/**
 * Roll a takeoff up by scope category, for the scope and overview screens.
 * Group rows are folded into their own scope so an assembly's children appear
 * under the scope the assembly was filed under.
 */
export function rollUpByScope(
  items: readonly TakeoffItem[],
  lineTotals: Map<string, LineTotals>,
): {
  scopeCode: string | null;
  scopeName: string;
  material: bigint;
  labor: bigint;
  laborHours: bigint;
  equipment: bigint;
  subcontract: bigint;
  other: bigint;
  total: bigint;
  lineCount: number;
}[] {
  const groups = new Map<
    string,
    {
      scopeCode: string | null;
      scopeName: string;
      material: bigint;
      labor: bigint;
      laborHours: bigint;
      equipment: bigint;
      subcontract: bigint;
      other: bigint;
      total: bigint;
      lineCount: number;
    }
  >();

  for (const item of items) {
    const totals = lineTotals.get(item.id);
    if (!totals || !totals.inBaseBid) continue;
    const key = item.scope_category_id ?? item.scope_code ?? '__unassigned__';
    let group = groups.get(key);
    if (!group) {
      group = {
        scopeCode: item.scope_code,
        scopeName: item.scope_name ?? 'Unassigned',
        material: 0n,
        labor: 0n,
        laborHours: 0n,
        equipment: 0n,
        subcontract: 0n,
        other: 0n,
        total: 0n,
        lineCount: 0,
      };
      groups.set(key, group);
    }
    group.material += totals.materialCost;
    group.labor += totals.laborCost;
    group.laborHours += totals.laborHours;
    group.equipment += totals.equipmentCost;
    group.subcontract += totals.subcontractCost;
    group.other += totals.otherCost;
    group.total += totals.totalCost;
    group.lineCount += 1;
  }

  return [...groups.values()].sort((a, b) => (b.total > a.total ? 1 : b.total < a.total ? -1 : 0));
}
