import Link from 'next/link';
import { reportDbFailure, type DbFailure } from '@/lib/estimating/db';
import { Callout } from './ui';

/**
 * Shown when the estimating tables cannot be reached. The remediation list is
 * driven by the classified failure rather than by matching on the message, so
 * "the key was refused", "the query was refused" and "the tables are missing"
 * each point at their own fix instead of all blaming the key.
 */
export function SetupNotice({ error }: { error: DbFailure }) {
  return (
    <Callout tone="warning" title="The estimating database is not ready">
      <p>{error.message}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {error.kind === 'missing-relation' ? (
          <li>
            Apply <code className="rounded bg-ink-900 px-1">003_estimating_catalog.sql</code>,{' '}
            <code className="rounded bg-ink-900 px-1">004_estimating_projects.sql</code> and{' '}
            <code className="rounded bg-ink-900 px-1">005_estimating_documents_jobs.sql</code> from{' '}
            <code className="rounded bg-ink-900 px-1">supabase/migrations</code>, in that order.
          </li>
        ) : null}
        {error.kind === 'not-configured' || error.kind === 'invalid-credentials' ? (
          <li>
            Set <code className="rounded bg-ink-900 px-1">SUPABASE_URL</code> and{' '}
            <code className="rounded bg-ink-900 px-1">SUPABASE_SERVICE_ROLE_KEY</code> in the server
            environment, then redeploy.
          </li>
        ) : null}
        {error.kind === 'insufficient-privileges' ? (
          <li>
            Confirm the key is the project&apos;s service-role key, then check that{' '}
            <code className="rounded bg-ink-900 px-1">service_role</code> still holds{' '}
            <code className="rounded bg-ink-900 px-1">select</code>,{' '}
            <code className="rounded bg-ink-900 px-1">insert</code>,{' '}
            <code className="rounded bg-ink-900 px-1">update</code> and{' '}
            <code className="rounded bg-ink-900 px-1">delete</code> on the estimating tables.
          </li>
        ) : null}
        {error.kind === 'network' ? (
          <li>
            Check that the Supabase project is running and not paused, and that{' '}
            <code className="rounded bg-ink-900 px-1">SUPABASE_URL</code> is the project&apos;s API
            URL.
          </li>
        ) : null}
        <li>
          The exact database error is in the server logs, tagged{' '}
          <code className="rounded bg-ink-900 px-1">[estimating-db]</code>. Run{' '}
          <code className="rounded bg-ink-900 px-1">npm run diagnose:db</code> to reproduce it.
        </li>
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

/**
 * Classify a thrown value for display AND write the real error to the server
 * log. Every admin page funnels its catch block through here, so a production
 * failure can never again render a fallback without leaving a trace.
 *
 * `context` names the operation that failed, e.g. "listProjects".
 */
export function describeThrown(error: unknown, context: string): DbFailure {
  return reportDbFailure(context, error);
}
