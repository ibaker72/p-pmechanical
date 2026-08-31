'use server';

import { revalidatePath } from 'next/cache';
import { estimatingDb } from '../db';
import { explodeAssembly, resolveLaborRate } from '../assembly';
import { normalizeLaborUnit } from '../calc';
import { dec, mul, roundMoney, toMoneyNumber, toRateNumber } from '../decimal';
import {
  getAssemblyWithItems,
  getMaterial,
  getTakeoffItem,
  listLaborRates,
  listScopeCategories,
  listTakeoffItems,
} from '../queries';
import { recalculateEstimate } from '../recalc';
import {
  addAssemblySchema,
  addEquipmentLineSchema,
  addMaterialLineSchema,
  addSubcontractLineSchema,
  parseForm,
  takeoffCreateSchema,
  takeoffIdSchema,
  takeoffQuickEditSchema,
  takeoffUpdateSchema,
} from '../validation';
import { actionError, actionOk, type ActionResult, type LaborRate } from '../types';
import { assertEditable, createdBy, nextSortOrder, throwIf, updatedBy, withAdmin } from './shared';

/** Resolve a scope category id to the code/name snapshot stored on the line. */
async function scopeSnapshot(scopeCategoryId: string | null): Promise<{
  scope_category_id: string | null;
  scope_code: string | null;
  scope_name: string | null;
}> {
  if (!scopeCategoryId) return { scope_category_id: null, scope_code: null, scope_name: null };
  const categories = await listScopeCategories(true);
  const match = categories.find((category) => category.id === scopeCategoryId);
  if (!match) return { scope_category_id: null, scope_code: null, scope_name: null };
  return { scope_category_id: match.id, scope_code: match.code, scope_name: match.name };
}

async function laborRateSnapshot(
  laborRateId: string | null,
  usePrevailingWage: boolean,
): Promise<{
  labor_rate_id: string | null;
  labor_rate_snapshot: number;
  labor_rate_name: string | null;
}> {
  if (!laborRateId) return { labor_rate_id: null, labor_rate_snapshot: 0, labor_rate_name: null };
  const rates = await listLaborRates(true);
  const rate = rates.find((r) => r.id === laborRateId);
  if (!rate) {
    // Surfaced by the caller as a field error rather than silently zeroing the
    // labor cost of the line.
    return { labor_rate_id: null, labor_rate_snapshot: 0, labor_rate_name: null };
  }
  return {
    labor_rate_id: rate.id,
    labor_rate_snapshot: Number(resolveLaborRate(rate, usePrevailingWage)) || 0,
    labor_rate_name: rate.name,
  };
}

async function estimateContext(
  estimateId: string,
): Promise<{ usePrevailingWage: boolean; taxExempt: boolean; projectId: string } | null> {
  const db = estimatingDb();
  const { data, error } = await db
    .from('estimates')
    .select('project_id, project:projects(prevailing_wage, tax_exempt)')
    .eq('id', estimateId)
    .maybeSingle();
  throwIf(error);
  if (!data) return null;

  // PostgREST types a to-one embed as an array in the generated shape; at
  // runtime a single row comes back as an object.
  const row = data as unknown as {
    project_id: string;
    project: { prevailing_wage: boolean; tax_exempt: boolean } | null;
  };
  return {
    projectId: row.project_id,
    usePrevailingWage: row.project?.prevailing_wage ?? false,
    taxExempt: row.project?.tax_exempt ?? false,
  };
}

// ---------------------------------------------------------------------------
// Manual lines
// ---------------------------------------------------------------------------

export async function createTakeoffItemAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin('Adding the line', async (session) => {
    const parsed = parseForm(takeoffCreateSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const locked = await assertEditable(parsed.data.estimate_id);
    if (locked) return locked;

    const context = await estimateContext(parsed.data.estimate_id);
    if (!context) return actionError('That estimate no longer exists.');

    const { estimate_id, scope_category_id, labor_rate_id, override_reason, ...fields } =
      parsed.data;

    const labor = await laborRateSnapshot(labor_rate_id, context.usePrevailingWage);
    if (labor_rate_id && !labor.labor_rate_id) {
      return actionError(
        'The line could not be added because the selected labor classification no longer exists.',
        { labor_rate_id: 'Pick a current labor classification.' },
      );
    }
    if (fields.labor_hours_per_unit > 0 && !labor.labor_rate_id) {
      return actionError('Labor hours were entered without a labor classification to price them.', {
        labor_rate_id: 'Choose the classification that will do this work.',
      });
    }

    const existing = await listTakeoffItems(estimate_id);

    const { data, error } = await estimatingDb()
      .from('estimate_takeoff_items')
      .insert({
        estimate_id,
        ...(await scopeSnapshot(scope_category_id)),
        ...labor,
        ...fields,
        is_taxable: context.taxExempt ? false : fields.is_taxable,
        override_reason,
        sort_order: nextSortOrder(existing),
        ...createdBy(session),
      })
      .select('id')
      .single();
    throwIf(error);
    if (!data) return actionError('The line could not be added.');

    await recalculateEstimate(estimate_id);
    revalidatePath(`/admin/estimates/${estimate_id}`, 'layout');
    return actionOk({ id: data.id as string });
  });
}

export async function updateTakeoffItemAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Saving the line', async (session) => {
    const parsed = parseForm(takeoffUpdateSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const item = await getTakeoffItem(parsed.data.item_id);
    if (!item) return actionError('That line no longer exists.');

    const locked = await assertEditable(item.estimate_id);
    if (locked) return locked;

    const context = await estimateContext(item.estimate_id);
    if (!context) return actionError('That estimate no longer exists.');

    const { item_id, scope_category_id, labor_rate_id, ...fields } = parsed.data;
    const labor = await laborRateSnapshot(labor_rate_id, context.usePrevailingWage);
    if (labor_rate_id && !labor.labor_rate_id) {
      return actionError(
        'The line could not be saved because the selected labor classification no longer exists.',
        { labor_rate_id: 'Pick a current labor classification.' },
      );
    }

    const override = trackOverride(item, fields.unit_material_cost, fields.override_reason);

    const { error } = await estimatingDb()
      .from('estimate_takeoff_items')
      .update({
        ...(await scopeSnapshot(scope_category_id)),
        ...labor,
        ...fields,
        is_taxable: context.taxExempt ? false : fields.is_taxable,
        ...override,
        ...updatedBy(session),
      })
      .eq('id', item_id);
    throwIf(error);

    await recalculateEstimate(item.estimate_id);
    revalidatePath(`/admin/estimates/${item.estimate_id}`, 'layout');
    return actionOk();
  });
}

/**
 * Record that a bid-level price differs from the price the line was created
 * with, so the estimate can show "master $8.40 -> this bid $9.15" later.
 * The original is captured once and never overwritten by a second edit.
 */
function trackOverride(
  item: {
    unit_material_cost: number | string;
    original_unit_material_cost: number | string | null;
    is_cost_overridden: boolean;
  },
  newUnitCost: number,
  reason: string | null,
): {
  original_unit_material_cost: number | null;
  is_cost_overridden: boolean;
  override_reason: string | null;
} {
  const current = Number(item.unit_material_cost) || 0;
  const alreadyTracked = item.is_cost_overridden && item.original_unit_material_cost != null;

  if (alreadyTracked) {
    return {
      original_unit_material_cost: Number(item.original_unit_material_cost),
      is_cost_overridden: true,
      override_reason: reason,
    };
  }
  if (Math.abs(newUnitCost - current) < 0.00005) {
    return {
      original_unit_material_cost: null,
      is_cost_overridden: false,
      override_reason: reason,
    };
  }
  return {
    original_unit_material_cost: current,
    is_cost_overridden: true,
    override_reason: reason,
  };
}

/** Inline grid edit: quantity and unit cost only, for fast takeoff work. */
export async function quickEditTakeoffItemAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Saving the line', async (session) => {
    const parsed = parseForm(takeoffQuickEditSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const item = await getTakeoffItem(parsed.data.item_id);
    if (!item) return actionError('That line no longer exists.');

    const locked = await assertEditable(item.estimate_id);
    if (locked) return locked;

    const override = trackOverride(
      item,
      parsed.data.unit_material_cost,
      parsed.data.override_reason ?? item.override_reason,
    );

    const { error } = await estimatingDb()
      .from('estimate_takeoff_items')
      .update({
        quantity: parsed.data.quantity,
        unit_material_cost: parsed.data.unit_material_cost,
        ...override,
        ...updatedBy(session),
      })
      .eq('id', parsed.data.item_id);
    throwIf(error);

    await recalculateEstimate(item.estimate_id);
    revalidatePath(`/admin/estimates/${item.estimate_id}`, 'layout');
    return actionOk();
  });
}

export async function duplicateTakeoffItemAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin('Duplicating the line', async (session) => {
    const parsed = parseForm(takeoffIdSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const item = await getTakeoffItem(parsed.data.item_id);
    if (!item) return actionError('That line no longer exists.');

    const locked = await assertEditable(item.estimate_id);
    if (locked) return locked;

    const db = estimatingDb();
    const existing = await listTakeoffItems(item.estimate_id);

    // Duplicating an assembly group brings its components with it, otherwise
    // the copy would be an empty header carrying no cost.
    const children = existing.filter((row) => row.parent_item_id === item.id);
    const newParentId = crypto.randomUUID();

    const stripped = ({
      id: _id,
      created_at: _c,
      updated_at: _u,
      ...rest
    }: (typeof existing)[number]) => rest;

    const rows: Record<string, unknown>[] = [
      {
        ...stripped(item),
        id: newParentId,
        parent_item_id: null,
        description: `${item.description} (copy)`,
        sort_order: nextSortOrder(existing),
        ...createdBy(session),
      },
      ...children.map((child, index) => ({
        ...stripped(child),
        id: crypto.randomUUID(),
        parent_item_id: newParentId,
        sort_order: nextSortOrder(existing) + index + 1,
        ...createdBy(session),
      })),
    ];

    const { error } = await db.from('estimate_takeoff_items').insert(rows);
    throwIf(error);

    await recalculateEstimate(item.estimate_id);
    revalidatePath(`/admin/estimates/${item.estimate_id}`, 'layout');
    return actionOk({ id: newParentId });
  });
}

export async function deleteTakeoffItemAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Deleting the line', async () => {
    const parsed = parseForm(takeoffIdSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const item = await getTakeoffItem(parsed.data.item_id);
    if (!item) return actionError('That line no longer exists.');

    const locked = await assertEditable(item.estimate_id);
    if (locked) return locked;

    // Assembly components cascade with their group row (FK ON DELETE CASCADE).
    const { error } = await estimatingDb()
      .from('estimate_takeoff_items')
      .delete()
      .eq('id', parsed.data.item_id);
    throwIf(error);

    await recalculateEstimate(item.estimate_id);
    revalidatePath(`/admin/estimates/${item.estimate_id}`, 'layout');
    return actionOk();
  });
}

// ---------------------------------------------------------------------------
// Adding from the catalog
// ---------------------------------------------------------------------------

export async function addMaterialLineAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin('Adding the material', async (session) => {
    const parsed = parseForm(addMaterialLineSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const locked = await assertEditable(parsed.data.estimate_id);
    if (locked) return locked;

    const context = await estimateContext(parsed.data.estimate_id);
    if (!context) return actionError('That estimate no longer exists.');

    const material = await getMaterial(parsed.data.material_id);
    if (!material) {
      return actionError('That material could not be added because it no longer exists.');
    }

    // Snapshot: the price book's current values are COPIED onto the line.
    // Later edits to the material never move this bid.
    const hoursPerUnit = normalizeLaborUnit(material.default_labor_unit, material.labor_unit_type);
    const labor = await laborRateSnapshot(
      material.default_labor_rate_id,
      context.usePrevailingWage,
    );
    const existing = await listTakeoffItems(parsed.data.estimate_id);

    const { data, error } = await estimatingDb()
      .from('estimate_takeoff_items')
      .insert({
        estimate_id: parsed.data.estimate_id,
        line_type: 'material',
        source_material_id: material.id,
        ...(await scopeSnapshot(parsed.data.scope_category_id)),
        ...labor,
        description: material.name,
        customer_description: material.description,
        quantity: parsed.data.quantity,
        unit: material.unit_of_measure,
        unit_material_cost: material.unit_cost,
        material_waste_percent: material.waste_percent,
        labor_hours_per_unit: toRateNumber(hoursPerUnit),
        is_taxable: context.taxExempt ? false : material.is_taxable,
        disposition: parsed.data.disposition,
        sort_order: nextSortOrder(existing),
        ...createdBy(session),
      })
      .select('id')
      .single();
    throwIf(error);
    if (!data) return actionError('The material could not be added.');

    await recalculateEstimate(parsed.data.estimate_id);
    revalidatePath(`/admin/estimates/${parsed.data.estimate_id}`, 'layout');
    return actionOk({ id: data.id as string });
  });
}

/**
 * Explode an assembly into the estimate.
 *
 * Every component's price, waste and productivity value is copied onto the new
 * rows. Editing the master assembly afterwards cannot change this estimate.
 */
export async function addAssemblyAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin('Adding the assembly', async (session) => {
    const parsed = parseForm(addAssemblySchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const locked = await assertEditable(parsed.data.estimate_id);
    if (locked) return locked;

    const context = await estimateContext(parsed.data.estimate_id);
    if (!context) return actionError('That estimate no longer exists.');

    const assembly = await getAssemblyWithItems(parsed.data.assembly_id);
    if (!assembly) {
      return actionError('That assembly could not be added because it no longer exists.');
    }
    if (assembly.items.length === 0) {
      return actionError(
        `"${assembly.name}" has no components yet, so it would add nothing to the estimate. Add components to the assembly first.`,
      );
    }

    const rates = await listLaborRates(true);
    const rateMap = new Map<string, LaborRate>(rates.map((rate) => [rate.id, rate]));
    const existing = await listTakeoffItems(parsed.data.estimate_id);
    const startSortOrder = nextSortOrder(existing);

    const scope = parsed.data.scope_category_id
      ? await scopeSnapshot(parsed.data.scope_category_id)
      : null;

    const { group, components } = explodeAssembly(
      assembly,
      parsed.data.quantity,
      { laborRates: rateMap, usePrevailingWage: context.usePrevailingWage },
      {
        ...(scope
          ? {
              scopeCategoryId: scope.scope_category_id,
              scopeCode: scope.scope_code,
              scopeName: scope.scope_name,
            }
          : {}),
        disposition: parsed.data.disposition,
        startSortOrder,
      },
    );

    const db = estimatingDb();
    const groupId = crypto.randomUUID();

    const { error: groupError } = await db.from('estimate_takeoff_items').insert({
      ...group,
      id: groupId,
      estimate_id: parsed.data.estimate_id,
      ...createdBy(session),
    });
    throwIf(groupError);

    if (components.length > 0) {
      const { error: componentError } = await db.from('estimate_takeoff_items').insert(
        components.map((component) => ({
          ...component,
          estimate_id: parsed.data.estimate_id,
          parent_item_id: groupId,
          is_taxable: context.taxExempt ? false : component.is_taxable,
          ...createdBy(session),
        })),
      );
      throwIf(componentError);
    }

    await recalculateEstimate(parsed.data.estimate_id);
    revalidatePath(`/admin/estimates/${parsed.data.estimate_id}`, 'layout');
    return actionOk({ id: groupId });
  });
}

export async function addEquipmentLineAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin('Adding the equipment', async (session) => {
    const parsed = parseForm(addEquipmentLineSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const locked = await assertEditable(parsed.data.estimate_id);
    if (locked) return locked;

    const db = estimatingDb();
    const { data: rate, error: rateError } = await db
      .from('equipment_rates')
      .select('*')
      .eq('id', parsed.data.equipment_rate_id)
      .maybeSingle();
    throwIf(rateError);
    if (!rate)
      return actionError('That equipment rate could not be added because it no longer exists.');

    const basisRate =
      parsed.data.rate_basis === 'weekly'
        ? rate.weekly_rate
        : parsed.data.rate_basis === 'monthly'
          ? rate.monthly_rate
          : rate.daily_rate;

    // Rental + mobilization + delivery/pickup, snapshotted as one line amount.
    let cost = roundMoney(mul(dec(parsed.data.duration), dec(basisRate)));
    if (parsed.data.include_mobilization) cost += dec(rate.mobilization_cost);
    if (parsed.data.include_delivery) cost += dec(rate.delivery_cost) + dec(rate.pickup_cost);

    const existing = await listTakeoffItems(parsed.data.estimate_id);

    const { data, error } = await db
      .from('estimate_takeoff_items')
      .insert({
        estimate_id: parsed.data.estimate_id,
        line_type: 'equipment',
        equipment_rate_id: rate.id,
        vendor_id: rate.vendor_id,
        ...(await scopeSnapshot(parsed.data.scope_category_id)),
        description: parsed.data.description ?? rate.name,
        quantity: parsed.data.duration,
        // Weeks and months are counted as EA because DAY is the only
        // duration unit in the takeoff vocabulary; the basis is recorded in the
        // line notes below.
        unit: parsed.data.rate_basis === 'daily' ? 'DAY' : 'EA',
        equipment_cost: toMoneyNumber(roundMoney(cost)),
        is_taxable: false,
        disposition: 'included',
        internal_notes: [
          `${parsed.data.rate_basis} rate basis`,
          parsed.data.include_mobilization ? 'includes mobilization' : null,
          parsed.data.include_delivery ? 'includes delivery + pickup' : null,
        ]
          .filter(Boolean)
          .join(' · '),
        sort_order: nextSortOrder(existing),
        ...createdBy(session),
      })
      .select('id')
      .single();
    throwIf(error);
    if (!data) return actionError('The equipment line could not be added.');

    await recalculateEstimate(parsed.data.estimate_id);
    revalidatePath(`/admin/estimates/${parsed.data.estimate_id}`, 'layout');
    return actionOk({ id: data.id as string });
  });
}

export async function addSubcontractLineAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin('Adding the subcontractor cost', async (session) => {
    const parsed = parseForm(addSubcontractLineSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const locked = await assertEditable(parsed.data.estimate_id);
    if (locked) return locked;

    const existing = await listTakeoffItems(parsed.data.estimate_id);
    const { data, error } = await estimatingDb()
      .from('estimate_takeoff_items')
      .insert({
        estimate_id: parsed.data.estimate_id,
        line_type: 'subcontract',
        vendor_id: parsed.data.vendor_id,
        ...(await scopeSnapshot(parsed.data.scope_category_id)),
        description: parsed.data.description,
        quantity: 1,
        unit: 'LOT',
        subcontract_cost: parsed.data.amount,
        // A subcontractor's quote already includes their own tax.
        is_taxable: false,
        disposition: parsed.data.disposition,
        internal_notes: parsed.data.internal_notes,
        sort_order: nextSortOrder(existing),
        ...createdBy(session),
      })
      .select('id')
      .single();
    throwIf(error);
    if (!data) return actionError('The subcontractor cost could not be added.');

    await recalculateEstimate(parsed.data.estimate_id);
    revalidatePath(`/admin/estimates/${parsed.data.estimate_id}`, 'layout');
    return actionOk({ id: data.id as string });
  });
}

/** Re-price a line from the current price book, recording the change. */
export async function syncLineToPriceBookAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Updating the line from the price book', async (session) => {
    const parsed = parseForm(takeoffIdSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const item = await getTakeoffItem(parsed.data.item_id);
    if (!item) return actionError('That line no longer exists.');
    if (!item.source_material_id) {
      return actionError(
        'This line did not come from the price book, so there is nothing to sync.',
      );
    }

    const locked = await assertEditable(item.estimate_id);
    if (locked) return locked;

    const material = await getMaterial(item.source_material_id);
    if (!material) {
      return actionError(
        'The price book entry this line came from has been deleted. The line keeps its original snapshotted price.',
      );
    }

    const { error } = await estimatingDb()
      .from('estimate_takeoff_items')
      .update({
        unit_material_cost: material.unit_cost,
        material_waste_percent: material.waste_percent,
        // Syncing returns the line to the master price, so the override is
        // resolved rather than left dangling.
        original_unit_material_cost: null,
        is_cost_overridden: false,
        override_reason: null,
        ...updatedBy(session),
      })
      .eq('id', item.id);
    throwIf(error);

    await recalculateEstimate(item.estimate_id);
    revalidatePath(`/admin/estimates/${item.estimate_id}`, 'layout');
    return actionOk();
  });
}

export async function moveTakeoffItemAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Reordering the line', async () => {
    const itemId = String(formData.get('item_id') ?? '');
    const direction = String(formData.get('direction') ?? '');
    if (!itemId || (direction !== 'up' && direction !== 'down')) {
      return actionError('That move is not valid.');
    }

    const item = await getTakeoffItem(itemId);
    if (!item) return actionError('That line no longer exists.');

    const locked = await assertEditable(item.estimate_id);
    if (locked) return locked;

    // Only top-level rows reorder; components stay with their assembly.
    const siblings = (await listTakeoffItems(item.estimate_id)).filter(
      (row) => row.parent_item_id === item.parent_item_id,
    );
    const index = siblings.findIndex((row) => row.id === itemId);
    const swapWith = direction === 'up' ? siblings[index - 1] : siblings[index + 1];
    if (!swapWith) return actionOk();

    const db = estimatingDb();
    const { error: firstError } = await db
      .from('estimate_takeoff_items')
      .update({ sort_order: swapWith.sort_order })
      .eq('id', item.id);
    throwIf(firstError);
    const { error: secondError } = await db
      .from('estimate_takeoff_items')
      .update({ sort_order: item.sort_order })
      .eq('id', swapWith.id);
    throwIf(secondError);

    revalidatePath(`/admin/estimates/${item.estimate_id}`, 'layout');
    return actionOk();
  });
}
