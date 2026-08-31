'use server';

import { revalidatePath } from 'next/cache';
import { estimatingDb } from '../db';
import { BID_CHECKLIST_TEMPLATE } from '../constants';
import { nextRevisionNumber } from '../numbering';
import {
  countUnresolvedChecklistItems,
  getEstimate,
  getProject,
  listChecklistItems,
  listLaborConditions,
  listScopeItems,
  listTakeoffItems,
} from '../queries';
import { recalculateEstimate } from '../recalc';
import { cloneChildRows, cloneTakeoffItems } from '../revision';
import {
  estimateCreateSchema,
  estimateDetailsSchema,
  estimatePricingSchema,
  estimateRevisionSchema,
  estimateStatusSchema,
  parseForm,
} from '../validation';
import { actionError, actionOk, type ActionResult } from '../types';
import { assertEditable, createdBy, throwIf, updatedBy, withAdmin } from './shared';

/** Project condition flags that should seed a matching labor condition. */
const PROJECT_CONDITION_MODIFIERS: {
  flag: 'occupied_building' | 'after_hours_work' | 'prevailing_wage';
  code: string;
}[] = [
  { flag: 'occupied_building', code: 'occupied_building' },
  { flag: 'after_hours_work', code: 'night_work' },
  { flag: 'prevailing_wage', code: 'prevailing_wage' },
];

/**
 * Seed a new estimate's bid checklist and its labor conditions.
 *
 * Conditions are snapshotted from the master modifier at seed time — the
 * estimate keeps the factor it was created with even if the master changes.
 */
async function seedEstimate(estimateId: string, projectId: string): Promise<void> {
  const db = estimatingDb();
  const project = await getProject(projectId);

  const checklistRows = BID_CHECKLIST_TEMPLATE.map((item, index) => ({
    estimate_id: estimateId,
    code: item.code,
    prompt: item.prompt,
    category: item.category,
    is_critical: item.critical,
    answer: 'needs_review' as const,
    sort_order: index,
  }));
  const { error: checklistError } = await db.from('estimate_checklist_items').insert(checklistRows);
  throwIf(checklistError);

  if (!project) return;

  const wantedCodes = PROJECT_CONDITION_MODIFIERS.filter(({ flag }) => project[flag]).map(
    ({ code }) => code,
  );
  if (wantedCodes.length === 0) return;

  const { data: modifiers, error: modifierError } = await db
    .from('labor_modifiers')
    .select('id, code, name, factor')
    .in('code', wantedCodes)
    .eq('is_active', true);
  throwIf(modifierError);
  if (!modifiers || modifiers.length === 0) return;

  const { error: conditionError } = await db.from('estimate_labor_conditions').insert(
    modifiers.map((modifier, index) => ({
      estimate_id: estimateId,
      labor_modifier_id: modifier.id as string,
      code: modifier.code as string,
      name: modifier.name as string,
      factor: modifier.factor as number,
      note: 'Added automatically from the project conditions.',
      sort_order: index,
    })),
  );
  throwIf(conditionError);
}

export async function createEstimateAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin('Creating the estimate', async (session) => {
    const parsed = parseForm(estimateCreateSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const project = await getProject(parsed.data.project_id);
    if (!project) return actionError('That project no longer exists.');

    const revision = await nextRevisionNumber(project.id);
    const estimate_number = parsed.data.estimate_number || project.project_number;

    const { data, error } = await estimatingDb()
      .from('estimates')
      .insert({
        project_id: project.id,
        estimate_number,
        revision,
        revision_label: parsed.data.revision_label,
        estimator: parsed.data.estimator ?? project.estimator,
        bid_date: parsed.data.bid_date,
        expiration_date: parsed.data.expiration_date,
        internal_notes: parsed.data.internal_notes,
        // A tax-exempt project starts at 0% sales tax rather than silently
        // carrying a rate the estimator would have to remember to clear.
        sales_tax_percent: 0,
        status: 'draft',
        ...createdBy(session),
      })
      .select('id')
      .single();
    throwIf(error);
    if (!data) return actionError('The estimate could not be created.');

    await seedEstimate(data.id as string, project.id);

    revalidatePath('/admin/estimates');
    revalidatePath(`/admin/projects/${project.id}`);
    return actionOk({ id: data.id as string });
  });
}

export async function updateEstimateDetailsAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Saving the estimate', async (session) => {
    const parsed = parseForm(estimateDetailsSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const locked = await assertEditable(parsed.data.estimate_id);
    if (locked) return locked;

    const { estimate_id, ...fields } = parsed.data;
    const { error } = await estimatingDb()
      .from('estimates')
      .update({ ...fields, ...updatedBy(session) })
      .eq('id', estimate_id);
    throwIf(error);

    revalidatePath(`/admin/estimates/${estimate_id}`, 'layout');
    return actionOk();
  });
}

export async function updateEstimatePricingAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Saving the pricing', async (session) => {
    const parsed = parseForm(estimatePricingSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const locked = await assertEditable(parsed.data.estimate_id);
    if (locked) return locked;

    const { estimate_id, ...fields } = parsed.data;
    if (fields.pricing_mode === 'fixed' && fields.fixed_sell_price === null) {
      return actionError('Enter a fixed sell price, or choose margin or markup pricing.', {
        fixed_sell_price: 'A fixed sell price is required in fixed-price mode.',
      });
    }

    const { error } = await estimatingDb()
      .from('estimates')
      .update({ ...fields, ...updatedBy(session) })
      .eq('id', estimate_id);
    throwIf(error);

    await recalculateEstimate(estimate_id);
    revalidatePath(`/admin/estimates/${estimate_id}`, 'layout');
    return actionOk();
  });
}

export async function updateEstimateStatusAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Updating the estimate status', async (session) => {
    const parsed = parseForm(estimateStatusSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const { estimate_id, status, acknowledge_unresolved } = parsed.data;
    const estimate = await getEstimate(estimate_id);
    if (!estimate) return actionError('That estimate no longer exists.');
    if (estimate.status === 'superseded') {
      return actionError(
        'A superseded revision cannot change status. Work on the current revision.',
      );
    }

    // Advancing past draft asks the estimator to confirm the critical review
    // items. Saving a draft is never blocked.
    const advancing = status !== 'draft' && status !== 'lost';
    if (advancing && !acknowledge_unresolved) {
      const unresolved = await countUnresolvedChecklistItems(estimate_id);
      if (unresolved.critical > 0) {
        return actionError(
          `${unresolved.critical} critical bid review ${
            unresolved.critical === 1 ? 'item is' : 'items are'
          } still unresolved. Resolve them on the Bid review tab, or confirm to proceed anyway.`,
          { acknowledge_unresolved: 'Confirm to proceed with unresolved critical items.' },
        );
      }
    }

    const { error } = await estimatingDb()
      .from('estimates')
      .update({ status, ...updatedBy(session) })
      .eq('id', estimate_id);
    throwIf(error);

    // Winning a bid moves the project along with it — the two statuses drifting
    // apart is a common source of confusion on a real bid board.
    if (status === 'awarded' || status === 'submitted' || status === 'lost') {
      const projectStatus =
        status === 'awarded' ? 'awarded' : status === 'lost' ? 'lost' : 'submitted';
      const { error: projectError } = await estimatingDb()
        .from('projects')
        .update({ status: projectStatus, ...updatedBy(session) })
        .eq('id', estimate.project_id);
      throwIf(projectError);
    }

    revalidatePath(`/admin/estimates/${estimate_id}`, 'layout');
    revalidatePath(`/admin/projects/${estimate.project_id}`);
    revalidatePath('/admin/estimates');
    return actionOk();
  });
}

/**
 * Clone an estimate into a new revision.
 *
 * The source revision is never modified apart from an optional status change to
 * `superseded`. Every takeoff line, scope item, checklist answer and labor
 * condition is copied WITH ITS SNAPSHOTTED VALUES, so the new revision starts
 * as an exact commercial copy of the old one and the old one stays exactly as
 * it was submitted.
 *
 * New primary keys are generated up front so parent/child links between
 * assembly group rows and their components can be remapped deterministically
 * rather than inferred from insert ordering.
 */
export async function createRevisionAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin('Creating the revision', async (session) => {
    const parsed = parseForm(estimateRevisionSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const db = estimatingDb();
    const source = await getEstimate(parsed.data.estimate_id);
    if (!source) return actionError('That estimate no longer exists.');

    const revision = await nextRevisionNumber(source.project_id);

    const { data: created, error: createError } = await db
      .from('estimates')
      .insert({
        project_id: source.project_id,
        parent_estimate_id: source.id,
        estimate_number: source.estimate_number,
        revision,
        revision_label: parsed.data.revision_label,
        status: 'draft',
        estimator: source.estimator,
        bid_date: source.bid_date,
        expiration_date: source.expiration_date,
        internal_notes: source.internal_notes,
        customer_notes: source.customer_notes,
        overhead_percent: source.overhead_percent,
        contingency_percent: source.contingency_percent,
        pricing_mode: source.pricing_mode,
        markup_percent: source.markup_percent,
        target_margin_percent: source.target_margin_percent,
        fixed_sell_price: source.fixed_sell_price,
        other_direct_cost: source.other_direct_cost,
        other_direct_cost_notes: source.other_direct_cost_notes,
        sales_tax_percent: source.sales_tax_percent,
        ...createdBy(session),
      })
      .select('id')
      .single();
    throwIf(createError);
    if (!created) return actionError('The revision could not be created.');

    const newEstimateId = created.id as string;

    const [items, scopeItems, checklist, conditions] = await Promise.all([
      listTakeoffItems(source.id),
      listScopeItems(source.id),
      listChecklistItems(source.id),
      listLaborConditions(source.id),
    ]);

    if (items.length > 0) {
      const clonedItems = cloneTakeoffItems(items, newEstimateId, session.sub);
      // Chunked so a very large takeoff stays inside PostgREST's payload limits.
      for (let offset = 0; offset < clonedItems.length; offset += 500) {
        const { error } = await db
          .from('estimate_takeoff_items')
          .insert(clonedItems.slice(offset, offset + 500));
        throwIf(error);
      }
    }

    if (scopeItems.length > 0) {
      const { error } = await db.from('estimate_scope_items').insert(
        cloneChildRows(scopeItems, newEstimateId).map((row) => ({
          ...row,
          created_by: session.sub,
          updated_by: session.sub,
        })),
      );
      throwIf(error);
    }

    if (checklist.length > 0) {
      const { error } = await db
        .from('estimate_checklist_items')
        .insert(cloneChildRows(checklist, newEstimateId));
      throwIf(error);
    }

    if (conditions.length > 0) {
      const { error } = await db
        .from('estimate_labor_conditions')
        .insert(cloneChildRows(conditions, newEstimateId));
      throwIf(error);
    }

    if (parsed.data.supersede_source) {
      const { error } = await db
        .from('estimates')
        .update({ status: 'superseded', ...updatedBy(session) })
        .eq('id', source.id);
      throwIf(error);
    }

    await recalculateEstimate(newEstimateId);

    revalidatePath('/admin/estimates');
    revalidatePath(`/admin/projects/${source.project_id}`);
    return actionOk({ id: newEstimateId });
  });
}

export async function deleteEstimateAction(
  _prev: ActionResult<{ projectId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ projectId: string }>> {
  return withAdmin('Deleting the estimate', async () => {
    const estimateId = String(formData.get('estimate_id') ?? '');
    if (!estimateId) return actionError('No estimate was specified.');

    const estimate = await getEstimate(estimateId);
    if (!estimate) return actionError('That estimate no longer exists.');

    const db = estimatingDb();
    const { count, error: jobError } = await db
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('source_estimate_id', estimateId);
    throwIf(jobError);
    if ((count ?? 0) > 0) {
      return actionError(
        'This estimate has been converted to a job, so it cannot be deleted. Its numbers are the job budget of record.',
      );
    }

    const { count: childCount, error: childError } = await db
      .from('estimates')
      .select('id', { count: 'exact', head: true })
      .eq('parent_estimate_id', estimateId);
    throwIf(childError);
    if ((childCount ?? 0) > 0) {
      return actionError(
        'A later revision was created from this one, so it cannot be deleted. Keeping it preserves the bid history.',
      );
    }

    const { error } = await db.from('estimates').delete().eq('id', estimateId);
    throwIf(error);

    revalidatePath('/admin/estimates');
    revalidatePath(`/admin/projects/${estimate.project_id}`);
    return actionOk({ projectId: estimate.project_id });
  });
}

export async function recalculateEstimateAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Recalculating the estimate', async () => {
    const estimateId = String(formData.get('estimate_id') ?? '');
    if (!estimateId) return actionError('No estimate was specified.');
    const totals = await recalculateEstimate(estimateId);
    if (!totals) return actionError('That estimate no longer exists.');
    revalidatePath(`/admin/estimates/${estimateId}`, 'layout');
    return actionOk();
  });
}
