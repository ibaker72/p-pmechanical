import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadEstimateWorkspace } from '@/lib/estimating/page-data';
import { listAssemblies } from '@/lib/estimating/queries';
import { Panel, PanelBody, PanelHeader } from '@/components/admin/ui';
import { TakeoffTable } from '@/components/admin/takeoff/TakeoffTable';
import { AddLineForm } from '@/components/admin/takeoff/AddLineForm';
import { AddAssemblyForm } from '@/components/admin/takeoff/AddAssemblyForm';

export const metadata: Metadata = { title: 'Takeoff' };
export const dynamic = 'force-dynamic';

export default async function TakeoffPage({
  params,
  searchParams,
}: {
  params: { estimateId: string };
  searchParams: { edit?: string };
}) {
  const workspace = await loadEstimateWorkspace(params.estimateId);
  if (!workspace) notFound();

  const { estimate, items, lineTotals, scopeCategories, laborRates, locked } = workspace;
  const assemblies = locked ? [] : await listAssemblies();
  const basePath = `/admin/estimates/${estimate.id}/takeoff`;
  const activeScopes = scopeCategories.filter((category) => category.is_active);

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeader
          title="Takeoff"
          description={`${items.length} line${items.length === 1 ? '' : 's'}. Assembly components are shown indented under their group row.`}
        />
        <TakeoffTable
          items={items}
          lineTotals={lineTotals}
          scopeCategories={activeScopes}
          laborRates={laborRates.filter((rate) => rate.is_active)}
          basePath={basePath}
          editingId={searchParams.edit}
          locked={locked}
          emptyMessage="Add a material, an assembly, labor, equipment or a subcontractor cost to start pricing this bid."
        />
      </Panel>

      {!locked && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Panel>
            <PanelHeader
              title="Add an assembly"
              description="Explode a repeatable installed system into priced lines."
            />
            <PanelBody>
              <AddAssemblyForm
                estimateId={estimate.id}
                scopeCategories={activeScopes}
                assemblies={assemblies.map((assembly) => ({
                  id: assembly.id,
                  name: assembly.name,
                  unit: assembly.unit,
                  itemCount: assembly.item_count,
                }))}
              />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Add a line"
              description="Manual entry for anything not in the price book."
            />
            <PanelBody>
              <AddLineForm
                estimateId={estimate.id}
                scopeCategories={activeScopes}
                laborRates={laborRates.filter((rate) => rate.is_active)}
              />
            </PanelBody>
          </Panel>
        </div>
      )}
    </div>
  );
}
