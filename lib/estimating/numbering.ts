// Document numbering.
//
// Numbers are suggestions, not locks: every form lets the estimator type their
// own. The generator only has to produce a sensible next value and never
// collide with what is already stored, so a unique-violation is handled by
// retrying with the next sequence rather than failing the save.

import { estimatingDb } from './db';

function currentYear(): number {
  return new Date().getFullYear();
}

/**
 * Highest numeric suffix currently used for `prefix` in `column`, or 0.
 * Matches "<prefix><n>" where n is the trailing integer.
 */
async function highestSuffix(
  table: 'projects' | 'jobs',
  column: 'project_number' | 'job_number',
  prefix: string,
): Promise<number> {
  const { data, error } = await estimatingDb()
    .from(table)
    .select(column)
    .ilike(column, `${prefix}%`);
  if (error) throw error;

  let highest = 0;
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`, 'i');
  for (const row of (data ?? []) as Record<string, string>[]) {
    const value = row[column];
    if (typeof value !== 'string') continue;
    const match = pattern.exec(value.trim());
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return highest;
}

/** e.g. PPM-2026-018 */
export async function nextProjectNumber(): Promise<string> {
  const prefix = `PPM-${currentYear()}-`;
  const next = (await highestSuffix('projects', 'project_number', prefix)) + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

/** e.g. J-2026-004 */
export async function nextJobNumber(): Promise<string> {
  const prefix = `J-${currentYear()}-`;
  const next = (await highestSuffix('jobs', 'job_number', prefix)) + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

/**
 * Next revision number for a project. Revisions are per-project and strictly
 * increasing, so a deleted revision number is never reused.
 */
export async function nextRevisionNumber(projectId: string): Promise<number> {
  const { data, error } = await estimatingDb()
    .from('estimates')
    .select('revision')
    .eq('project_id', projectId)
    .order('revision', { ascending: false })
    .limit(1);
  if (error) throw error;
  const highest = (data ?? [])[0]?.revision;
  return typeof highest === 'number' ? highest + 1 : 1;
}
