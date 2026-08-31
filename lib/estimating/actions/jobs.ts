'use server';

import { revalidatePath } from 'next/cache';
import { estimatingDb } from '../db';
import { nextJobNumber } from '../numbering';
import { getEstimateWithProject, getJob } from '../queries';
import { recalculateEstimate } from '../recalc';
import { convertToJobSchema, jobStatusSchema, parseForm } from '../validation';
import { actionError, actionOk, type ActionResult } from '../types';
import { createdBy, throwIf, updatedBy, withAdmin } from './shared';

/**
 * Convert an awarded estimate into a job with a budget snapshot.
 *
 * The budget is a POINT-IN-TIME COPY of the estimate's totals, not a live view
 * of them. Later edits to the estimate (or a later revision) never move a
 * budget that a job is already being run against. Re-running the conversion on
 * a job adds a new budget version rather than editing version 1.
 *
 * job_cost_entries.source_takeoff_item_id (migration 005) is what will later
 * let actual costs be traced back to the exact estimate line that budgeted
 * them — that is the estimated-vs-actual foundation.
 */
export async function convertEstimateToJobAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin('Converting the estimate to a job', async (session) => {
    const parsed = parseForm(convertToJobSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const estimate = await getEstimateWithProject(parsed.data.estimate_id);
    if (!estimate) return actionError('That estimate no longer exists.');
    if (estimate.status !== 'awarded') {
      return actionError(
        'Only an awarded estimate can become a job. Set this estimate to Awarded first.',
      );
    }

    // Recalculate before snapshotting so the budget can never be built from
    // stale cached totals.
    const totals = await recalculateEstimate(estimate.id);
    if (!totals) return actionError('That estimate no longer exists.');

    const db = estimatingDb();
    const job_number = parsed.data.job_number || (await nextJobNumber());

    const { data: job, error: jobError } = await db
      .from('jobs')
      .insert({
        project_id: estimate.project_id,
        source_estimate_id: estimate.id,
        job_number,
        name: parsed.data.name ?? estimate.project.name,
        status: 'planning',
        contract_value: Number(estimate.sell_price) || 0,
        start_date: parsed.data.start_date,
        notes: parsed.data.notes,
        ...createdBy(session),
      })
      .select('id')
      .single();
    throwIf(jobError);
    if (!job) return actionError('The job could not be created.');

    const jobId = job.id as string;
    const contractValue = Number(estimate.sell_price) || 0;
    const totalCost = Number(estimate.direct_cost) || 0;
    const expectedProfit = contractValue - totalCost;

    const { error: budgetError } = await db.from('job_budgets').insert({
      job_id: jobId,
      source_estimate_id: estimate.id,
      version: 1,
      material_budget: Number(estimate.material_cost) || 0,
      labor_hours_budget: Number(estimate.total_labor_hours) || 0,
      labor_cost_budget: Number(estimate.labor_cost) || 0,
      equipment_budget: Number(estimate.equipment_cost) || 0,
      subcontract_budget: Number(estimate.subcontractor_cost) || 0,
      other_budget: (Number(estimate.other_cost) || 0) + (Number(estimate.sales_tax_amount) || 0),
      total_cost_budget: totalCost,
      contract_value: contractValue,
      expected_gross_profit: expectedProfit,
      expected_gross_margin_percent:
        contractValue > 0 ? Number(((expectedProfit / contractValue) * 100).toFixed(4)) : 0,
      notes: `Snapshot of ${estimate.estimate_number} revision ${estimate.revision}.`,
      created_by: session.sub,
    });
    throwIf(budgetError);

    revalidatePath('/admin/jobs');
    revalidatePath(`/admin/estimates/${estimate.id}`, 'layout');
    revalidatePath(`/admin/projects/${estimate.project_id}`);
    return actionOk({ id: jobId });
  });
}

export async function updateJobStatusAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Updating the job status', async (session) => {
    const parsed = parseForm(jobStatusSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const { error } = await estimatingDb()
      .from('jobs')
      .update({ status: parsed.data.status, ...updatedBy(session) })
      .eq('id', parsed.data.job_id);
    throwIf(error);

    revalidatePath('/admin/jobs');
    revalidatePath(`/admin/jobs/${parsed.data.job_id}`);
    return actionOk();
  });
}

/** Re-snapshot the budget from the source estimate as a new version. */
export async function refreshJobBudgetAction(
  _prev: ActionResult<{ version: number }> | null,
  formData: FormData,
): Promise<ActionResult<{ version: number }>> {
  return withAdmin('Refreshing the job budget', async (session) => {
    const jobId = String(formData.get('job_id') ?? '');
    if (!jobId) return actionError('No job was specified.');

    const job = await getJob(jobId);
    if (!job) return actionError('That job no longer exists.');
    if (!job.source_estimate_id) {
      return actionError(
        'This job was not created from an estimate, so there is nothing to refresh.',
      );
    }

    const estimate = await getEstimateWithProject(job.source_estimate_id);
    if (!estimate) return actionError('The source estimate no longer exists.');

    await recalculateEstimate(estimate.id);
    const refreshed = await getEstimateWithProject(estimate.id);
    if (!refreshed) return actionError('The source estimate no longer exists.');

    const version = (job.budgets[0]?.version ?? 0) + 1;
    const contractValue = Number(refreshed.sell_price) || 0;
    const totalCost = Number(refreshed.direct_cost) || 0;
    const expectedProfit = contractValue - totalCost;

    const { error } = await estimatingDb()
      .from('job_budgets')
      .insert({
        job_id: jobId,
        source_estimate_id: refreshed.id,
        version,
        material_budget: Number(refreshed.material_cost) || 0,
        labor_hours_budget: Number(refreshed.total_labor_hours) || 0,
        labor_cost_budget: Number(refreshed.labor_cost) || 0,
        equipment_budget: Number(refreshed.equipment_cost) || 0,
        subcontract_budget: Number(refreshed.subcontractor_cost) || 0,
        other_budget:
          (Number(refreshed.other_cost) || 0) + (Number(refreshed.sales_tax_amount) || 0),
        total_cost_budget: totalCost,
        contract_value: contractValue,
        expected_gross_profit: expectedProfit,
        expected_gross_margin_percent:
          contractValue > 0 ? Number(((expectedProfit / contractValue) * 100).toFixed(4)) : 0,
        notes: `Re-snapshot of ${refreshed.estimate_number} revision ${refreshed.revision}.`,
        created_by: session.sub,
      });
    throwIf(error);

    revalidatePath(`/admin/jobs/${jobId}`);
    return actionOk({ version });
  });
}
