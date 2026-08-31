'use server';

import { revalidatePath } from 'next/cache';
import { estimatingDb } from '../db';
import { nextProjectNumber } from '../numbering';
import { parseForm, projectSchema } from '../validation';
import { actionError, actionOk, type ActionResult, type Project } from '../types';
import { createdBy, throwIf, updatedBy, withAdmin } from './shared';

export async function createProjectAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin('Creating the project', async (session) => {
    const parsed = parseForm(projectSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    // A blank project number gets the next one in sequence, so creating a
    // project stays a two-field job.
    const project_number = parsed.data.project_number || (await nextProjectNumber());

    const { data, error } = await estimatingDb()
      .from('projects')
      .insert({ ...parsed.data, project_number, ...createdBy(session) })
      .select('id')
      .single();
    throwIf(error);
    if (!data) return actionError('The project could not be created.');

    revalidatePath('/admin/projects');
    revalidatePath('/admin');
    return actionOk({ id: data.id as string });
  });
}

export async function updateProjectAction(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return withAdmin('Saving the project', async (session) => {
    const projectId = String(formData.get('project_id') ?? '');
    if (!projectId) return actionError('No project was specified.');

    const parsed = parseForm(projectSchema, formData);
    if (!parsed.ok) return actionError(parsed.error, parsed.fieldErrors);

    const { error } = await estimatingDb()
      .from('projects')
      .update({ ...parsed.data, ...updatedBy(session) })
      .eq('id', projectId);
    throwIf(error);

    revalidatePath('/admin/projects');
    revalidatePath(`/admin/projects/${projectId}`);
    return actionOk({ id: projectId });
  });
}

export async function deleteProjectAction(
  _prev: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  return withAdmin('Deleting the project', async () => {
    const projectId = String(formData.get('project_id') ?? '');
    if (!projectId) return actionError('No project was specified.');

    // A project that produced a job is deliberately undeletable: jobs.project_id
    // is ON DELETE RESTRICT, so historical cost data can never be orphaned.
    const db = estimatingDb();
    const { count, error: jobError } = await db
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);
    throwIf(jobError);
    if ((count ?? 0) > 0) {
      return actionError(
        'This project has a job attached, so it cannot be deleted. Cancel the project instead to keep its history.',
      );
    }

    const { error } = await db.from('projects').delete().eq('id', projectId);
    throwIf(error);

    revalidatePath('/admin/projects');
    revalidatePath('/admin');
    return actionOk();
  });
}

export async function suggestProjectNumberAction(): Promise<ActionResult<{ number: string }>> {
  return withAdmin('Generating a project number', async () => {
    return actionOk({ number: await nextProjectNumber() });
  });
}

export type ProjectRow = Project;
