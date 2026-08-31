import Link from 'next/link';
import type { Metadata } from 'next';
import { listProjects } from '@/lib/estimating/queries';
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from '@/lib/estimating/constants';
import { formatDateTime } from '@/lib/estimating/format';
import {
  EmptyState,
  PageHeader,
  Panel,
  ProjectStatusBadge,
  Table,
  TableWrap,
  TD,
  TH,
} from '@/components/admin/ui';
import { describeThrown, SetupNotice } from '@/components/admin/SetupNotice';

export const metadata: Metadata = { title: 'Projects' };
export const dynamic = 'force-dynamic';

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const status = PROJECT_STATUSES.includes(searchParams.status as never)
    ? searchParams.status
    : undefined;

  let projects;
  try {
    projects = await listProjects({ status, search: searchParams.q });
  } catch (error) {
    return (
      <>
        <PageHeader title="Projects" />
        <SetupNotice error={describeThrown(error)} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} project${projects.length === 1 ? '' : 's'}`}
        actions={
          <Link
            href="/admin/projects/new"
            className="inline-flex h-9 items-center rounded bg-ember-500 px-3.5 text-sm font-semibold text-ink-950 hover:bg-ember-400"
          >
            New project
          </Link>
        }
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <label
            htmlFor="q"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-steel-400"
          >
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="Name, number, customer or city"
            className="w-full rounded border border-white/15 bg-ink-950/60 px-2.5 py-1.5 text-sm text-white placeholder:text-steel-500 focus:border-ember-400/60 focus:outline-none focus:ring-1 focus:ring-ember-400"
          />
        </div>
        <div>
          <label
            htmlFor="status"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-steel-400"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ''}
            className="rounded border border-white/15 bg-ink-950/60 px-2.5 py-1.5 text-sm text-white focus:border-ember-400/60 focus:outline-none focus:ring-1 focus:ring-ember-400"
          >
            <option value="">All</option>
            {PROJECT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {PROJECT_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="h-[34px] rounded border border-white/20 bg-white/5 px-3 text-sm font-semibold text-white hover:bg-white/10"
        >
          Filter
        </button>
        {(searchParams.q || status) && (
          <Link
            href="/admin/projects"
            className="flex h-[34px] items-center px-2 text-sm text-steel-400 hover:text-white"
          >
            Clear
          </Link>
        )}
      </form>

      <Panel>
        {projects.length === 0 ? (
          <EmptyState
            title="No projects found"
            description={
              searchParams.q || status
                ? 'Try a different search or clear the filters.'
                : 'Create the first commercial project to start bidding.'
            }
            action={
              <Link
                href="/admin/projects/new"
                className="inline-flex h-9 items-center rounded bg-ember-500 px-3.5 text-sm font-semibold text-ink-950 hover:bg-ember-400"
              >
                New project
              </Link>
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <TH>Number</TH>
                  <TH>Project</TH>
                  <TH>Customer</TH>
                  <TH>Location</TH>
                  <TH>Status</TH>
                  <TH align="right">Estimates</TH>
                  <TH>Updated</TH>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-white/[0.02]">
                    <TD className="whitespace-nowrap font-mono text-xs text-steel-300">
                      {project.project_number}
                    </TD>
                    <TD>
                      <Link
                        href={`/admin/projects/${project.id}`}
                        className="font-medium text-white hover:text-ember-300"
                      >
                        {project.name}
                      </Link>
                    </TD>
                    <TD className="max-w-[200px] truncate">{project.customer_company ?? '—'}</TD>
                    <TD className="whitespace-nowrap text-steel-300">
                      {[project.city, project.state].filter(Boolean).join(', ') || '—'}
                    </TD>
                    <TD>
                      <ProjectStatusBadge status={project.status} />
                    </TD>
                    <TD align="right" numeric>
                      {project.estimate_count}
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-steel-400">
                      {formatDateTime(project.updated_at)}
                    </TD>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Panel>
    </>
  );
}
