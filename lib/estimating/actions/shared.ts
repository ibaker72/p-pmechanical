// Shared plumbing for estimating server actions.
//
// NOT a 'use server' module — it exports helpers, not actions. Files under
// this directory that are marked 'use server' import from here.
//
// Every mutation in the estimating system is wrapped by `withAdmin`, which
// guarantees three things:
//   1. an authenticated admin session, checked server-side on every call;
//   2. a typed ActionResult instead of a thrown exception reaching the UI;
//   3. database errors translated into sentences the estimator can act on,
//      while the raw error is logged server-side.

import type { PostgrestError } from '@supabase/supabase-js';
import { requireAdminForAction } from '@/lib/auth/server';
import type { AdminSession } from '@/lib/auth/admin-session';
import { LOCKED_ESTIMATE_STATUSES } from '../constants';
import { describeDbError, EstimatingConfigError, logDbError } from '../db';
import { getEstimate } from '../queries';
import { CalculationError } from '../calc';
import { DecimalError } from '../decimal';
import { actionError, type ActionResult } from '../types';

function isPostgrestError(error: unknown): error is PostgrestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'code' in error &&
    'details' in error
  );
}

/**
 * Run a mutation behind the admin session check with uniform error handling.
 * `context` names the operation for the server log and shapes the fallback
 * message the estimator sees.
 */
export async function withAdmin<T>(
  context: string,
  fn: (session: AdminSession) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  const session = await requireAdminForAction();
  if (!session) {
    return actionError('Your session has expired. Sign in again to continue.');
  }

  try {
    return await fn(session);
  } catch (error) {
    logDbError(context, error);

    if (error instanceof EstimatingConfigError) return actionError(error.message);
    // Calculation and decimal errors are already written for an estimator.
    if (error instanceof CalculationError) return actionError(error.message);
    if (error instanceof DecimalError) {
      return actionError('One of the submitted values is not a valid number.');
    }
    if (isPostgrestError(error)) {
      return actionError(describeDbError(error, `${context} failed. Please try again.`));
    }
    return actionError(`${context} failed. Please try again.`);
  }
}

/** Throw a PostgrestError so `withAdmin` can translate it. */
export function throwIf(error: PostgrestError | null): void {
  if (error) throw error;
}

/** Audit stamp for a newly created row. */
export function createdBy(session: AdminSession) {
  return { created_by: session.sub, updated_by: session.sub };
}

/** Audit stamp for an update. */
export function updatedBy(session: AdminSession) {
  return { updated_by: session.sub };
}

/** Next sort_order for a child collection, so new rows land at the bottom. */
export function nextSortOrder(rows: readonly { sort_order: number }[]): number {
  return rows.reduce((max, row) => Math.max(max, row.sort_order), -1) + 1;
}

/**
 * Guard against editing a finished revision. Returns a failure to hand back, or
 * null when the estimate is editable.
 *
 * Lives here rather than in a 'use server' module so it never becomes a
 * separately callable endpoint — it performs no authorization of its own and
 * is always reached from inside `withAdmin`.
 */
export async function assertEditable(estimateId: string): Promise<ActionResult<never> | null> {
  const estimate = await getEstimate(estimateId);
  if (!estimate) return actionError('That estimate no longer exists.');
  if (LOCKED_ESTIMATE_STATUSES.includes(estimate.status)) {
    return actionError(
      'This revision is superseded and is kept read-only so the bid history stays accurate. Open the current revision to make changes.',
    );
  }
  return null;
}
