import type { Metadata } from 'next';
import { listScopeCategories } from '@/lib/estimating/queries';
import { PageHeader, Panel, PanelBody } from '@/components/admin/ui';
import { AssemblyForm } from '@/components/admin/catalog/AssemblyForms';
import { describeThrown, SetupNotice } from '@/components/admin/SetupNotice';

export const metadata: Metadata = { title: 'New assembly' };
export const dynamic = 'force-dynamic';

export default async function NewAssemblyPage() {
  let scopeCategories;
  try {
    scopeCategories = await listScopeCategories();
  } catch (error) {
    return (
      <>
        <PageHeader title="New assembly" />
        <SetupNotice error={describeThrown(error, 'listScopeCategories')} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="New assembly"
        subtitle="Name it first, then add components on the next screen."
        breadcrumb={[{ label: 'Assemblies', href: '/admin/assemblies' }, { label: 'New' }]}
      />
      <Panel>
        <PanelBody>
          <AssemblyForm scopeCategories={scopeCategories} redirectAfterCreate />
        </PanelBody>
      </Panel>
    </>
  );
}
