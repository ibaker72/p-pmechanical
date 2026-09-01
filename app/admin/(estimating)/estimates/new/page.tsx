import Link from 'next/link';
import type { Metadata } from 'next';
import { listProjects } from '@/lib/estimating/queries';
import { EmptyState, PageHeader, Panel, PanelBody } from '@/components/admin/ui';
import { NewEstimateProjectPicker } from '@/components/admin/NewEstimateProjectPicker';
import { describeThrown, SetupNotice } from '@/components/admin/SetupNotice';

export const metadata: Metadata = { title: 'New estimate' };
export const dynamic = 'force-dynamic';

export default async function NewEstimatePage({
  searchParams,
}: {
  searchParams: { project?: string };
}) {
  let projects;
  try {
    projects = await listProjects();
  } catch (error) {
    return (
      <>
        <PageHeader title="New estimate" />
        <SetupNotice error={describeThrown(error, 'listProjectsForNewEstimate')} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="New estimate"
        subtitle="An estimate belongs to a project. The revision number is assigned automatically."
        breadcrumb={[{ label: 'Estimates', href: '/admin/estimates' }, { label: 'New' }]}
      />
      <Panel>
        {projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Create a project first — an estimate always belongs to one."
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
          <PanelBody>
            <NewEstimateProjectPicker
              projects={projects.map((project) => ({
                id: project.id,
                name: project.name,
                number: project.project_number,
                customer: project.customer_company,
                estimator: project.estimator,
              }))}
              defaultProjectId={searchParams.project}
            />
          </PanelBody>
        )}
      </Panel>
    </>
  );
}
