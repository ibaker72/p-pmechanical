'use server';

import { revalidatePath } from 'next/cache';
import { estimatingDb } from '../db';
import {
  getScopeItem,
  listChecklistItems,
  listLaborConditions,
  listScopeCategories,
  listScopeItems,
} from '../queries';
import { recalculateEstimate } from '../recalc';
import {
  checklistUpdateSchema,
  laborConditionAddSchema,
  laborConditionIdSchema,
  laborConditionUpdateSchema,
  parseForm,
  scopeItemIdSchema,
  scopeItemSchema,
  scopeItemUpdateSchema,
  scopeReorderSchema,
} from '../validation';
import { actionError, actionOk, type ActionResult } from '../types';
import { assertEditable, createdBy, nextSortOrder, throwIf, updatedBy, withAdmin } from './shared';

// ---------------------------------------------------------------------------
// Scope / inclusions / exclusions / clarifications / assumptions / alternates
// ---------------------------------------------------------------------------

export async function createScopeItemAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin('Adding the scope item', async (session) => {
    const parsed = parseForm(scopeItemSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const locked = await assertEditable(parsed.data.estimate_id);
    if (locked) return locked;

    const categories = await listScopeCategories(true);
    const category = categories.find((c) => c.id === parsed.data.scope_category_id);

    const existing = (await listScopeItems(parsed.data.estimate_id)).filter(
      (item) => item.disposition === parsed.data.disposition,
    );

    const { data, error } = await estimatingDb()
      .from('estimate_scope_items')
      .insert({
        ...parsed.data,
        scope_category_id: category?.id ?? null,
        scope_code: category?.code ?? null,
        scope_name: category?.name ?? null,
        sort_order: nextSortOrder(existing),
        ...createdBy(session),
      })
      .select('id')
      .single();
    throwIf(error);
    if (!data) return actionError('The scope item could not be added.');

    revalidatePath(`/admin/estimates/${parsed.data.estimate_id}`, 'layout');
    return actionOk({ id: data.id as string });
  });
}

export async function updateScopeItemAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Saving the scope item', async (session) => {
    const parsed = parseForm(scopeItemUpdateSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const item = await getScopeItem(parsed.data.scope_item_id);
    if (!item) return actionError('That scope item no longer exists.');

    const locked = await assertEditable(item.estimate_id);
    if (locked) return locked;

    const categories = await listScopeCategories(true);
    const category = categories.find((c) => c.id === parsed.data.scope_category_id);
    const { scope_item_id, ...fields } = parsed.data;

    const { error } = await estimatingDb()
      .from('estimate_scope_items')
      .update({
        ...fields,
        scope_category_id: category?.id ?? null,
        scope_code: category?.code ?? null,
        scope_name: category?.name ?? null,
        ...updatedBy(session),
      })
      .eq('id', scope_item_id);
    throwIf(error);

    revalidatePath(`/admin/estimates/${item.estimate_id}`, 'layout');
    return actionOk();
  });
}

export async function deleteScopeItemAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Deleting the scope item', async () => {
    const parsed = parseForm(scopeItemIdSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const item = await getScopeItem(parsed.data.scope_item_id);
    if (!item) return actionError('That scope item no longer exists.');

    const locked = await assertEditable(item.estimate_id);
    if (locked) return locked;

    const { error } = await estimatingDb()
      .from('estimate_scope_items')
      .delete()
      .eq('id', parsed.data.scope_item_id);
    throwIf(error);

    revalidatePath(`/admin/estimates/${item.estimate_id}`, 'layout');
    return actionOk();
  });
}

/** Simple up/down ordering — the proposal reads in this order. */
export async function reorderScopeItemAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Reordering the scope item', async () => {
    const parsed = parseForm(scopeReorderSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const item = await getScopeItem(parsed.data.scope_item_id);
    if (!item) return actionError('That scope item no longer exists.');

    const locked = await assertEditable(item.estimate_id);
    if (locked) return locked;

    const siblings = (await listScopeItems(item.estimate_id))
      .filter((row) => row.disposition === item.disposition)
      .sort((a, b) => a.sort_order - b.sort_order);
    const index = siblings.findIndex((row) => row.id === item.id);
    const swapWith = parsed.data.direction === 'up' ? siblings[index - 1] : siblings[index + 1];
    if (!swapWith) return actionOk();

    const db = estimatingDb();
    const { error: firstError } = await db
      .from('estimate_scope_items')
      .update({ sort_order: swapWith.sort_order })
      .eq('id', item.id);
    throwIf(firstError);
    const { error: secondError } = await db
      .from('estimate_scope_items')
      .update({ sort_order: item.sort_order })
      .eq('id', swapWith.id);
    throwIf(secondError);

    revalidatePath(`/admin/estimates/${item.estimate_id}`, 'layout');
    return actionOk();
  });
}

// ---------------------------------------------------------------------------
// Bid review checklist
// ---------------------------------------------------------------------------

export async function updateChecklistItemAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Saving the checklist answer', async (session) => {
    const parsed = parseForm(checklistUpdateSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const db = estimatingDb();
    const { data: item, error: readError } = await db
      .from('estimate_checklist_items')
      .select('estimate_id')
      .eq('id', parsed.data.checklist_item_id)
      .maybeSingle();
    throwIf(readError);
    if (!item) return actionError('That checklist item no longer exists.');

    const estimateId = (item as { estimate_id: string }).estimate_id;
    const locked = await assertEditable(estimateId);
    if (locked) return locked;

    const { error } = await db
      .from('estimate_checklist_items')
      .update({
        answer: parsed.data.answer,
        note: parsed.data.note,
        updated_by: session.sub,
      })
      .eq('id', parsed.data.checklist_item_id);
    throwIf(error);

    revalidatePath(`/admin/estimates/${estimateId}`, 'layout');
    return actionOk();
  });
}

/** Mark every remaining "needs review" item as N/A in one pass. */
export async function resolveRemainingChecklistAction(
  _prev: ActionResult<{ resolved: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ resolved: number }>> {
  return withAdmin('Resolving the checklist', async (session) => {
    const estimateId = String(formData.get('estimate_id') ?? '');
    if (!estimateId) return actionError('No estimate was specified.');

    const locked = await assertEditable(estimateId);
    if (locked) return locked;

    const items = await listChecklistItems(estimateId);
    // Critical items are deliberately excluded: a bid-losing question should be
    // answered deliberately, never cleared in bulk.
    const targets = items.filter((item) => item.answer === 'needs_review' && !item.is_critical);
    if (targets.length === 0) return actionOk({ resolved: 0 });

    const { error } = await estimatingDb()
      .from('estimate_checklist_items')
      .update({ answer: 'na', updated_by: session.sub })
      .in(
        'id',
        targets.map((item) => item.id),
      );
    throwIf(error);

    revalidatePath(`/admin/estimates/${estimateId}`, 'layout');
    return actionOk({ resolved: targets.length });
  });
}

// ---------------------------------------------------------------------------
// Labor productivity conditions
// ---------------------------------------------------------------------------

export async function addLaborConditionAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Adding the labor condition', async () => {
    const parsed = parseForm(laborConditionAddSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const locked = await assertEditable(parsed.data.estimate_id);
    if (locked) return locked;

    const db = estimatingDb();
    const { data: modifier, error: modifierError } = await db
      .from('labor_modifiers')
      .select('id, code, name, factor')
      .eq('id', parsed.data.labor_modifier_id)
      .maybeSingle();
    throwIf(modifierError);
    if (!modifier) {
      return actionError('That labor modifier could not be added because it no longer exists.');
    }

    const existing = await listLaborConditions(parsed.data.estimate_id);
    if (existing.some((row) => row.code === (modifier as { code: string }).code)) {
      return actionError('That condition is already applied to this estimate.');
    }

    // The factor is SNAPSHOTTED here. Editing the master modifier later never
    // reprices a bid that has already been built.
    const { error } = await db.from('estimate_labor_conditions').insert({
      estimate_id: parsed.data.estimate_id,
      labor_modifier_id: (modifier as { id: string }).id,
      code: (modifier as { code: string }).code,
      name: (modifier as { name: string }).name,
      factor: parsed.data.factor,
      note: parsed.data.note,
      sort_order: nextSortOrder(existing),
    });
    throwIf(error);

    await recalculateEstimate(parsed.data.estimate_id);
    revalidatePath(`/admin/estimates/${parsed.data.estimate_id}`, 'layout');
    return actionOk();
  });
}

export async function updateLaborConditionAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Saving the labor condition', async () => {
    const parsed = parseForm(laborConditionUpdateSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const db = estimatingDb();
    const { data: condition, error: readError } = await db
      .from('estimate_labor_conditions')
      .select('estimate_id')
      .eq('id', parsed.data.condition_id)
      .maybeSingle();
    throwIf(readError);
    if (!condition) return actionError('That condition no longer exists.');

    const estimateId = (condition as { estimate_id: string }).estimate_id;
    const locked = await assertEditable(estimateId);
    if (locked) return locked;

    const { error } = await db
      .from('estimate_labor_conditions')
      .update({ factor: parsed.data.factor, note: parsed.data.note })
      .eq('id', parsed.data.condition_id);
    throwIf(error);

    await recalculateEstimate(estimateId);
    revalidatePath(`/admin/estimates/${estimateId}`, 'layout');
    return actionOk();
  });
}

export async function removeLaborConditionAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Removing the labor condition', async () => {
    const parsed = parseForm(laborConditionIdSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const db = estimatingDb();
    const { data: condition, error: readError } = await db
      .from('estimate_labor_conditions')
      .select('estimate_id')
      .eq('id', parsed.data.condition_id)
      .maybeSingle();
    throwIf(readError);
    if (!condition) return actionError('That condition no longer exists.');

    const estimateId = (condition as { estimate_id: string }).estimate_id;
    const locked = await assertEditable(estimateId);
    if (locked) return locked;

    const { error } = await db
      .from('estimate_labor_conditions')
      .delete()
      .eq('id', parsed.data.condition_id);
    throwIf(error);

    await recalculateEstimate(estimateId);
    revalidatePath(`/admin/estimates/${estimateId}`, 'layout');
    return actionOk();
  });
}
