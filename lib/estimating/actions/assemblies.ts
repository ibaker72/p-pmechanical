'use server';

import { revalidatePath } from 'next/cache';
import { estimatingDb } from '../db';
import { getAssemblyItem, getAssemblyWithItems, getMaterial } from '../queries';
import { normalizeLaborUnit } from '../calc';
import { toRateNumber } from '../decimal';
import {
  assemblyIdSchema,
  assemblyItemIdSchema,
  assemblyItemSchema,
  assemblyItemUpdateSchema,
  assemblySchema,
  assemblyUpdateSchema,
  parseForm,
} from '../validation';
import { actionError, actionOk, type ActionResult } from '../types';
import { createdBy, nextSortOrder, throwIf, updatedBy, withAdmin } from './shared';

export async function createAssemblyAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin('Creating the assembly', async (session) => {
    const parsed = parseForm(assemblySchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const { data, error } = await estimatingDb()
      .from('assemblies')
      .insert({ ...parsed.data, version: 1, ...createdBy(session) })
      .select('id')
      .single();
    throwIf(error);
    if (!data) return actionError('The assembly could not be created.');

    revalidatePath('/admin/assemblies');
    return actionOk({ id: data.id as string });
  });
}

// Returns the assembly id so the create and update actions share one result
// shape and can back the same form component.
export async function updateAssemblyAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin('Saving the assembly', async (session) => {
    const parsed = parseForm(assemblyUpdateSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const { assembly_id, ...fields } = parsed.data;
    const { error } = await estimatingDb()
      .from('assemblies')
      .update({ ...fields, ...updatedBy(session) })
      .eq('id', assembly_id);
    throwIf(error);

    revalidatePath('/admin/assemblies');
    revalidatePath(`/admin/assemblies/${assembly_id}`);
    return actionOk({ id: assembly_id });
  });
}

export async function deleteAssemblyAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Deleting the assembly', async () => {
    const parsed = parseForm(assemblyIdSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    // Estimates keep their exploded lines and their snapshotted prices:
    // estimate_takeoff_items.source_assembly_id is ON DELETE SET NULL.
    const { error } = await estimatingDb()
      .from('assemblies')
      .delete()
      .eq('id', parsed.data.assembly_id);
    throwIf(error);

    revalidatePath('/admin/assemblies');
    return actionOk();
  });
}

export async function duplicateAssemblyAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin('Duplicating the assembly', async (session) => {
    const parsed = parseForm(assemblyIdSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const source = await getAssemblyWithItems(parsed.data.assembly_id);
    if (!source) return actionError('That assembly no longer exists.');

    const db = estimatingDb();
    const { data, error } = await db
      .from('assemblies')
      .insert({
        // The code is left blank: codes are unique, and a copy needs its own.
        code: null,
        name: `${source.name} (copy)`,
        description: source.description,
        scope_category_id: source.scope_category_id,
        unit: source.unit,
        version: 1,
        notes: source.notes,
        is_active: source.is_active,
        ...createdBy(session),
      })
      .select('id')
      .single();
    throwIf(error);
    if (!data) return actionError('The assembly could not be duplicated.');

    const newId = data.id as string;
    if (source.items.length > 0) {
      const { error: itemsError } = await db.from('assembly_items').insert(
        source.items.map((item) => {
          const { id: _id, assembly_id: _a, created_at: _c, updated_at: _u, ...rest } = item;
          return { ...rest, assembly_id: newId };
        }),
      );
      throwIf(itemsError);
    }

    revalidatePath('/admin/assemblies');
    return actionOk({ id: newId });
  });
}

/**
 * Bump the assembly's version whenever its components change.
 * Estimates record the version they were exploded from, so a bid can always be
 * traced to the generation of the assembly that produced it.
 */
async function bumpAssemblyVersion(assemblyId: string, updatedByName: string): Promise<void> {
  const db = estimatingDb();
  const { data, error: readError } = await db
    .from('assemblies')
    .select('version')
    .eq('id', assemblyId)
    .maybeSingle();
  throwIf(readError);
  if (!data) return;

  const { error } = await db
    .from('assemblies')
    .update({ version: (data as { version: number }).version + 1, updated_by: updatedByName })
    .eq('id', assemblyId);
  throwIf(error);
}

export async function createAssemblyItemAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Adding the component', async (session) => {
    const parsed = parseForm(assemblyItemSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const assembly = await getAssemblyWithItems(parsed.data.assembly_id);
    if (!assembly) return actionError('That assembly no longer exists.');

    if (parsed.data.item_type === 'labor' && !parsed.data.labor_rate_id) {
      return actionError('A labor component needs a labor classification to price its hours.', {
        labor_rate_id: 'Choose the classification that will do this work.',
      });
    }

    const { error } = await estimatingDb()
      .from('assembly_items')
      .insert({ ...parsed.data, sort_order: nextSortOrder(assembly.items) });
    throwIf(error);

    await bumpAssemblyVersion(parsed.data.assembly_id, session.sub);
    revalidatePath(`/admin/assemblies/${parsed.data.assembly_id}`);
    return actionOk();
  });
}

/** Pull a component's description, unit, cost, waste and productivity from the price book. */
export async function addMaterialToAssemblyAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Adding the material', async (session) => {
    const assemblyId = String(formData.get('assembly_id') ?? '');
    const materialId = String(formData.get('material_id') ?? '');
    const rawQuantity = String(formData.get('quantity_per_unit') ?? '1');
    const quantity = Number(rawQuantity.replace(/[,\s]/g, ''));

    if (!assemblyId || !materialId) return actionError('Choose a material to add.');
    if (!Number.isFinite(quantity) || quantity < 0) {
      return actionError('Quantity per unit must be zero or greater.', {
        quantity_per_unit: 'Enter a number of zero or more.',
      });
    }

    const assembly = await getAssemblyWithItems(assemblyId);
    if (!assembly) return actionError('That assembly no longer exists.');

    const material = await getMaterial(materialId);
    if (!material) {
      return actionError('That material could not be added because it no longer exists.');
    }

    const hoursPerUnit = normalizeLaborUnit(material.default_labor_unit, material.labor_unit_type);

    const { error } = await estimatingDb()
      .from('assembly_items')
      .insert({
        assembly_id: assemblyId,
        item_type: 'material',
        material_id: material.id,
        labor_rate_id: material.default_labor_rate_id,
        vendor_id: material.preferred_vendor_id,
        description: material.name,
        quantity_per_unit: quantity,
        unit: material.unit_of_measure,
        unit_cost: material.unit_cost,
        waste_percent: material.waste_percent,
        labor_hours_per_unit: toRateNumber(hoursPerUnit),
        sort_order: nextSortOrder(assembly.items),
      });
    throwIf(error);

    await bumpAssemblyVersion(assemblyId, session.sub);
    revalidatePath(`/admin/assemblies/${assemblyId}`);
    return actionOk();
  });
}

export async function updateAssemblyItemAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Saving the component', async (session) => {
    const parsed = parseForm(assemblyItemUpdateSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const item = await getAssemblyItem(parsed.data.assembly_item_id);
    if (!item) return actionError('That component no longer exists.');

    const { assembly_item_id, ...fields } = parsed.data;
    const { error } = await estimatingDb()
      .from('assembly_items')
      .update(fields)
      .eq('id', assembly_item_id);
    throwIf(error);

    await bumpAssemblyVersion(item.assembly_id, session.sub);
    revalidatePath(`/admin/assemblies/${item.assembly_id}`);
    return actionOk();
  });
}

export async function deleteAssemblyItemAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Removing the component', async (session) => {
    const parsed = parseForm(assemblyItemIdSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const item = await getAssemblyItem(parsed.data.assembly_item_id);
    if (!item) return actionError('That component no longer exists.');

    const { error } = await estimatingDb()
      .from('assembly_items')
      .delete()
      .eq('id', parsed.data.assembly_item_id);
    throwIf(error);

    await bumpAssemblyVersion(item.assembly_id, session.sub);
    revalidatePath(`/admin/assemblies/${item.assembly_id}`);
    return actionOk();
  });
}
