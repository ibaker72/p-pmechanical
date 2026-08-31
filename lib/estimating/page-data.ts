// Shared loader for the estimate workspace.
//
// The estimate layout and each of its tabs both need the same estimate, its
// takeoff rows and its computed totals. `cache()` deduplicates that work per
// render pass, so opening a tab is one set of queries, not two.

import { cache } from 'react';
import type { LineTotals } from './calc';
import { computeEstimateTotals } from './recalc';
import { countUnresolvedChecklistItems, getEstimateBundle, listScopeItems } from './queries';
import type {
  EstimateLaborCondition,
  EstimateScopeItem,
  EstimateWithProject,
  LaborRate,
  ScopeCategory,
  TakeoffItem,
} from './types';
import type { EstimateTotals } from './calc';

export type EstimateWorkspace = {
  estimate: EstimateWithProject;
  items: TakeoffItem[];
  conditions: EstimateLaborCondition[];
  scopeCategories: ScopeCategory[];
  laborRates: LaborRate[];
  totals: EstimateTotals;
  lineTotals: Map<string, LineTotals>;
  unresolved: { total: number; critical: number };
  /** True when the revision is read-only (superseded). */
  locked: boolean;
};

export const loadEstimateWorkspace = cache(
  async (estimateId: string): Promise<EstimateWorkspace | null> => {
    const bundle = await getEstimateBundle(estimateId);
    if (!bundle) return null;

    const [unresolved] = await Promise.all([countUnresolvedChecklistItems(estimateId)]);
    const { totals, byId } = computeEstimateTotals(
      bundle.estimate,
      bundle.items,
      bundle.conditions,
    );

    return {
      ...bundle,
      totals,
      lineTotals: byId,
      unresolved,
      locked: bundle.estimate.status === 'superseded',
    };
  },
);

export const loadScopeItems = cache(
  async (estimateId: string): Promise<EstimateScopeItem[]> => listScopeItems(estimateId),
);

/**
 * Group takeoff rows so an assembly's components render underneath their group
 * row, and everything else renders flat. Ordering follows sort_order.
 *
 * `items` is often a FILTERED subset — the Equipment tab passes only lines that
 * carry equipment cost, for instance. A component whose parent is not in the
 * subset is promoted to a top-level row rather than being dropped, so filtering
 * can never silently hide a cost.
 */
export type TakeoffGroup = {
  row: TakeoffItem;
  children: TakeoffItem[];
};

export function groupTakeoffItems(items: readonly TakeoffItem[]): TakeoffGroup[] {
  const present = new Set(items.map((item) => item.id));
  const childrenByParent = new Map<string, TakeoffItem[]>();

  for (const item of items) {
    if (!item.parent_item_id || !present.has(item.parent_item_id)) continue;
    const list = childrenByParent.get(item.parent_item_id);
    if (list) list.push(item);
    else childrenByParent.set(item.parent_item_id, [item]);
  }

  return items
    .filter((item) => !item.parent_item_id || !present.has(item.parent_item_id))
    .map((row) => ({
      row,
      children: (childrenByParent.get(row.id) ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order),
    }));
}

/** Sum a group's children so an assembly header can show its rolled-up cost. */
export function groupTotals(
  group: TakeoffGroup,
  lineTotals: Map<string, LineTotals>,
): {
  material: bigint;
  labor: bigint;
  laborHours: bigint;
  equipment: bigint;
  subcontract: bigint;
  other: bigint;
  total: bigint;
} {
  const rows = [group.row, ...group.children];
  let material = 0n;
  let labor = 0n;
  let laborHours = 0n;
  let equipment = 0n;
  let subcontract = 0n;
  let other = 0n;
  let total = 0n;

  for (const row of rows) {
    const totals = lineTotals.get(row.id);
    if (!totals) continue;
    material += totals.materialCost;
    labor += totals.laborCost;
    laborHours += totals.laborHours;
    equipment += totals.equipmentCost;
    subcontract += totals.subcontractCost;
    other += totals.otherCost;
    total += totals.totalCost;
  }

  return { material, labor, laborHours, equipment, subcontract, other, total };
}
