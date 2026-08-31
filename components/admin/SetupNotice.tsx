import Link from 'next/link';
import { Callout } from './ui';

/**
 * Shown when the estimating tables cannot be reached. Distinguishes "not
 * configured" from "configured but the migrations have not been applied", since
 * those need different fixes.
 */
export function SetupNotice({ error }: { error: string }) {
  const missingTables = /migrations 003-005|tables are missing/i.test(error);
  return (
    <Callout tone="warning" title="The estimating database is not ready">
      <p>{error}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {missingTables ? (
          <li>
            Apply <code className="rounded bg-ink-900 px-1">003_estimating_catalog.sql</code>,{' '}
            <code className="rounded bg-ink-900 px-1">004_estimating_projects.sql</code> and{' '}
            <code className="rounded bg-ink-900 px-1">005_estimating_documents_jobs.sql</code> from{' '}
            <code className="rounded bg-ink-900 px-1">supabase/migrations</code>, in that order.
          </li>
        ) : (
          <li>
            Set <code className="rounded bg-ink-900 px-1">SUPABASE_URL</code> and{' '}
            <code className="rounded bg-ink-900 px-1">SUPABASE_SERVICE_ROLE_KEY</code> in the server
            environment, then redeploy.
          </li>
        )}
        <li>
          See <code className="rounded bg-ink-900 px-1">supabase/README.md</code> for the full
          procedure.
        </li>
      </ul>
      <p className="mt-2">
        <Link href="/admin" className="underline underline-offset-4">
          Back to the dashboard
        </Link>
      </p>
    </Callout>
  );
}

/** Normalize an unknown thrown value into a message safe to display. */
export function describeThrown(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: string }).message ?? '');
    if (/relation .* does not exist/i.test(message) || /42P01/.test(message)) {
      return 'The estimating tables are missing. Apply migrations 003-005 in supabase/migrations.';
    }
    if (/permission denied/i.test(message)) {
      return 'The database rejected the request. Check that SUPABASE_SERVICE_ROLE_KEY is the project service-role key.';
    }
    return message || 'The estimating data could not be loaded.';
  }
  return 'The estimating data could not be loaded.';
}
