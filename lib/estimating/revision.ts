// Revision cloning.
//
// Pulled out of the server action so the part that is easy to get wrong — the
// parent/child remapping between an assembly group row and its components — is
// a pure function with unit tests behind it.
//
// New primary keys are generated up front and the map is applied to
// parent_item_id, so the relationship survives a bulk insert without depending
// on the order rows come back in.

import type { TakeoffItem } from './types';

export type ClonedTakeoffRow = Omit<TakeoffItem, 'created_at' | 'updated_at'>;

export function cloneTakeoffItems(
  items: readonly TakeoffItem[],
  newEstimateId: string,
  author: string,
  generateId: () => string = () => crypto.randomUUID(),
): ClonedTakeoffRow[] {
  const idMap = new Map<string, string>();
  for (const item of items) idMap.set(item.id, generateId());

  return items.map((item) => {
    const { created_at: _createdAt, updated_at: _updatedAt, ...rest } = item;
    return {
      ...rest,
      id: idMap.get(item.id)!,
      estimate_id: newEstimateId,
      // A component whose parent is not in the set becomes a top-level row
      // rather than pointing at a row in the old estimate.
      parent_item_id: item.parent_item_id ? (idMap.get(item.parent_item_id) ?? null) : null,
      created_by: author,
      updated_by: author,
    };
  });
}

/** Strip server-managed columns from a child row before re-inserting it. */
export function cloneChildRows<
  T extends { id: string; estimate_id: string; created_at: string; updated_at: string },
>(rows: readonly T[], newEstimateId: string): Omit<T, 'id' | 'created_at' | 'updated_at'>[] {
  return rows.map((row) => {
    const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...rest } = row;
    return { ...rest, estimate_id: newEstimateId };
  });
}
