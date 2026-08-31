import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProject } from '@/lib/estimating/queries';
import { updateProjectAction } from '@/lib/estimating/actions/projects';
import { PageHeader, Panel, PanelBody } from '@/components/admin/ui';
import { ProjectForm } from '@/components/admin/ProjectForm';

export const metadata: Metadata = { title: 'Edit project' };
export const dynamic = 'force-dynamic';

export default async function EditProjectPage({ params }: { params: { projectId: string } }) {
  const project = await getProject(params.projectId);
  if (!project) notFound();

  return (
    <>
      <PageHeader
        title={`Edit ${project.name}`}
        breadcrumb={[
          { label: 'Projects', href: '/admin/projects' },
          { label: project.project_number, href: `/admin/projects/${project.id}` },
          { label: 'Edit' },
        ]}
      />
      <Panel>
        <PanelBody>
          <ProjectForm action={updateProjectAction} project={project} submitLabel="Save project" />
        </PanelBody>
      </Panel>
    </>
  );
}
