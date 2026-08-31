import type { Metadata } from 'next';
import { nextProjectNumber } from '@/lib/estimating/numbering';
import { createProjectAction } from '@/lib/estimating/actions/projects';
import { PageHeader, Panel, PanelBody } from '@/components/admin/ui';
import { ProjectForm } from '@/components/admin/ProjectForm';
import { describeThrown, SetupNotice } from '@/components/admin/SetupNotice';

export const metadata: Metadata = { title: 'New project' };
export const dynamic = 'force-dynamic';

export default async function NewProjectPage() {
  let suggested = '';
  try {
    suggested = await nextProjectNumber();
  } catch (error) {
    return (
      <>
        <PageHeader title="New project" />
        <SetupNotice error={describeThrown(error)} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="New project"
        subtitle="Only a name is required — everything else can be filled in as the bid develops."
        breadcrumb={[{ label: 'Projects', href: '/admin/projects' }, { label: 'New' }]}
      />
      <Panel>
        <PanelBody>
          <ProjectForm
            action={createProjectAction}
            suggestedNumber={suggested}
            submitLabel="Create project"
          />
        </PanelBody>
      </Panel>
    </>
  );
}
