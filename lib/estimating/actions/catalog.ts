'use server';

import { revalidatePath } from 'next/cache';
import { estimatingDb } from '../db';
import {
  equipmentRateIdSchema,
  equipmentRateSchema,
  equipmentRateUpdateSchema,
  laborModifierIdSchema,
  laborModifierSchema,
  laborModifierUpdateSchema,
  laborRateIdSchema,
  laborRateSchema,
  laborRateUpdateSchema,
  materialCategorySchema,
  materialCostUpdateSchema,
  materialIdSchema,
  materialSchema,
  materialUpdateSchema,
  parseForm,
  scopeCategorySchema,
  scopeCategoryUpdateSchema,
  vendorIdSchema,
  vendorSchema,
  vendorUpdateSchema,
} from '../validation';
import { actionError, actionOk, type ActionResult } from '../types';
import { createdBy, throwIf, updatedBy, withAdmin } from './shared';

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

export async function createMaterialAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Adding the material', async (session) => {
    const parsed = parseForm(materialSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const { error } = await estimatingDb()
      .from('materials')
      .insert({
        ...parsed.data,
        last_cost_update_at: new Date().toISOString(),
        ...createdBy(session),
      });
    throwIf(error);

    revalidatePath('/admin/materials');
    return actionOk();
  });
}

export async function updateMaterialAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Saving the material', async (session) => {
    const parsed = parseForm(materialUpdateSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const { material_id, ...fields } = parsed.data;
    const db = estimatingDb();

    // Only stamp last_cost_update_at when the cost actually moved, so the
    // column stays a meaningful "when did this price last change".
    const { data: current, error: readError } = await db
      .from('materials')
      .select('unit_cost')
      .eq('id', material_id)
      .maybeSingle();
    throwIf(readError);
    if (!current) return actionError('That material no longer exists.');

    const costChanged =
      Math.abs(Number((current as { unit_cost: number }).unit_cost) - fields.unit_cost) >= 0.00005;

    const { error } = await db
      .from('materials')
      .update({
        ...fields,
        ...(costChanged ? { last_cost_update_at: new Date().toISOString() } : {}),
        ...updatedBy(session),
      })
      .eq('id', material_id);
    throwIf(error);

    // Estimates are NOT touched: their snapshotted prices are historical record.
    revalidatePath('/admin/materials');
    return actionOk();
  });
}

/** Inline cost edit from the price-book table. */
export async function updateMaterialCostAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Updating the cost', async (session) => {
    const parsed = parseForm(materialCostUpdateSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const { error } = await estimatingDb()
      .from('materials')
      .update({
        unit_cost: parsed.data.unit_cost,
        last_cost_update_at: new Date().toISOString(),
        ...updatedBy(session),
      })
      .eq('id', parsed.data.material_id);
    throwIf(error);

    revalidatePath('/admin/materials');
    return actionOk();
  });
}

export async function toggleMaterialActiveAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Updating the material', async (session) => {
    const parsed = parseForm(materialIdSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const db = estimatingDb();
    const { data, error: readError } = await db
      .from('materials')
      .select('is_active')
      .eq('id', parsed.data.material_id)
      .maybeSingle();
    throwIf(readError);
    if (!data) return actionError('That material no longer exists.');

    const { error } = await db
      .from('materials')
      .update({ is_active: !(data as { is_active: boolean }).is_active, ...updatedBy(session) })
      .eq('id', parsed.data.material_id);
    throwIf(error);

    revalidatePath('/admin/materials');
    return actionOk();
  });
}

export async function deleteMaterialAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Deleting the material', async () => {
    const parsed = parseForm(materialIdSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    // Deleting is safe for history: estimate lines reference materials with
    // ON DELETE SET NULL and keep their own snapshotted price. Deactivating is
    // still the better habit, which the UI recommends.
    const { error } = await estimatingDb()
      .from('materials')
      .delete()
      .eq('id', parsed.data.material_id);
    throwIf(error);

    revalidatePath('/admin/materials');
    return actionOk();
  });
}

export async function createMaterialCategoryAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Adding the category', async (session) => {
    const parsed = parseForm(materialCategorySchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const { error } = await estimatingDb()
      .from('material_categories')
      .insert({ ...parsed.data, ...createdBy(session) });
    throwIf(error);

    revalidatePath('/admin/materials');
    return actionOk();
  });
}

// ---------------------------------------------------------------------------
// Labor rates
// ---------------------------------------------------------------------------

export async function createLaborRateAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Adding the labor classification', async (session) => {
    const parsed = parseForm(laborRateSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const { error } = await estimatingDb()
      .from('labor_rates')
      .insert({ ...parsed.data, ...createdBy(session) });
    throwIf(error);

    revalidatePath('/admin/labor-rates');
    return actionOk();
  });
}

export async function updateLaborRateAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Saving the labor classification', async (session) => {
    const parsed = parseForm(laborRateUpdateSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const { labor_rate_id, ...fields } = parsed.data;
    const { error } = await estimatingDb()
      .from('labor_rates')
      .update({ ...fields, ...updatedBy(session) })
      .eq('id', labor_rate_id);
    throwIf(error);

    revalidatePath('/admin/labor-rates');
    return actionOk();
  });
}

export async function deleteLaborRateAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Deleting the labor classification', async () => {
    const parsed = parseForm(laborRateIdSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const { error } = await estimatingDb()
      .from('labor_rates')
      .delete()
      .eq('id', parsed.data.labor_rate_id);
    throwIf(error);

    revalidatePath('/admin/labor-rates');
    return actionOk();
  });
}

// ---------------------------------------------------------------------------
// Labor modifiers
// ---------------------------------------------------------------------------

export async function createLaborModifierAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Adding the labor modifier', async (session) => {
    const parsed = parseForm(laborModifierSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const { error } = await estimatingDb()
      .from('labor_modifiers')
      .insert({ ...parsed.data, ...createdBy(session) });
    throwIf(error);

    revalidatePath('/admin/labor-modifiers');
    return actionOk();
  });
}

export async function updateLaborModifierAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Saving the labor modifier', async (session) => {
    const parsed = parseForm(laborModifierUpdateSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const { labor_modifier_id, ...fields } = parsed.data;
    const { error } = await estimatingDb()
      .from('labor_modifiers')
      .update({ ...fields, ...updatedBy(session) })
      .eq('id', labor_modifier_id);
    throwIf(error);

    // Estimates that already snapshotted this factor are intentionally
    // untouched — see estimate_labor_conditions.
    revalidatePath('/admin/labor-modifiers');
    return actionOk();
  });
}

export async function deleteLaborModifierAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Deleting the labor modifier', async () => {
    const parsed = parseForm(laborModifierIdSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const { error } = await estimatingDb()
      .from('labor_modifiers')
      .delete()
      .eq('id', parsed.data.labor_modifier_id);
    throwIf(error);

    revalidatePath('/admin/labor-modifiers');
    return actionOk();
  });
}

// ---------------------------------------------------------------------------
// Equipment rates
// ---------------------------------------------------------------------------

export async function createEquipmentRateAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Adding the equipment rate', async (session) => {
    const parsed = parseForm(equipmentRateSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const { error } = await estimatingDb()
      .from('equipment_rates')
      .insert({ ...parsed.data, ...createdBy(session) });
    throwIf(error);

    revalidatePath('/admin/equipment-rates');
    return actionOk();
  });
}

export async function updateEquipmentRateAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Saving the equipment rate', async (session) => {
    const parsed = parseForm(equipmentRateUpdateSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const { equipment_rate_id, ...fields } = parsed.data;
    const { error } = await estimatingDb()
      .from('equipment_rates')
      .update({ ...fields, ...updatedBy(session) })
      .eq('id', equipment_rate_id);
    throwIf(error);

    revalidatePath('/admin/equipment-rates');
    return actionOk();
  });
}

export async function deleteEquipmentRateAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Deleting the equipment rate', async () => {
    const parsed = parseForm(equipmentRateIdSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const { error } = await estimatingDb()
      .from('equipment_rates')
      .delete()
      .eq('id', parsed.data.equipment_rate_id);
    throwIf(error);

    revalidatePath('/admin/equipment-rates');
    return actionOk();
  });
}

// ---------------------------------------------------------------------------
// Vendors & subcontractors
// ---------------------------------------------------------------------------

export async function createVendorAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Adding the vendor', async (session) => {
    const parsed = parseForm(vendorSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const { error } = await estimatingDb()
      .from('vendors')
      .insert({ ...parsed.data, ...createdBy(session) });
    throwIf(error);

    revalidatePath('/admin/vendors');
    return actionOk();
  });
}

export async function updateVendorAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Saving the vendor', async (session) => {
    const parsed = parseForm(vendorUpdateSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const { vendor_id, ...fields } = parsed.data;
    const { error } = await estimatingDb()
      .from('vendors')
      .update({ ...fields, ...updatedBy(session) })
      .eq('id', vendor_id);
    throwIf(error);

    revalidatePath('/admin/vendors');
    return actionOk();
  });
}

export async function deleteVendorAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Deleting the vendor', async () => {
    const parsed = parseForm(vendorIdSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const { error } = await estimatingDb().from('vendors').delete().eq('id', parsed.data.vendor_id);
    throwIf(error);

    revalidatePath('/admin/vendors');
    return actionOk();
  });
}

// ---------------------------------------------------------------------------
// Scope categories
// ---------------------------------------------------------------------------

export async function createScopeCategoryAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Adding the scope category', async (session) => {
    const parsed = parseForm(scopeCategorySchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const { error } = await estimatingDb()
      .from('scope_categories')
      .insert({ ...parsed.data, ...createdBy(session) });
    throwIf(error);

    revalidatePath('/admin/scope-categories');
    return actionOk();
  });
}

export async function updateScopeCategoryAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Saving the scope category', async (session) => {
    const parsed = parseForm(scopeCategoryUpdateSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const { scope_category_id, ...fields } = parsed.data;
    const { error } = await estimatingDb()
      .from('scope_categories')
      .update({ ...fields, ...updatedBy(session) })
      .eq('id', scope_category_id);
    throwIf(error);

    revalidatePath('/admin/scope-categories');
    return actionOk();
  });
}
