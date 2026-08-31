import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadEstimateWorkspace } from '@/lib/estimating/page-data';
import { listEquipmentRates } from '@/lib/estimating/queries';
import { toMoneyNumber } from '@/lib/estimating/decimal';
import { money } from '@/lib/estimating/format';
import { Panel, PanelBody, PanelHeader, StatTile } from '@/components/admin/ui';
import { TakeoffTable } from '@/components/admin/takeoff/TakeoffTable';
import { AddEquipmentForm } from '@/components/admin/takeoff/AddEquipmentForm';

export const metadata: Metadata = { title: 'Equipment' };
export const dynamic = 'force-dynamic';

export default async function EstimateEquipmentPage({
  params,
  searchParams,
}: {
  params: { estimateId: string };
  searchParams: { edit?: string };
}) {
  const workspace = await loadEstimateWorkspace(params.estimateId);
  if (!workspace) notFound();

  const { estimate, items, lineTotals, totals, scopeCategories, laborRates, locked } = workspace;
  const rates = locked ? [] : await listEquipmentRates();
  const activeScopes = scopeCategories.filter((category) => category.is_active);

  const equipmentItems = items.filter((item) => {
    const line = lineTotals.get(item.id);
    return line ? line.equipmentCost !== 0n : false;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Equipment & rental"
          value={money(toMoneyNumber(totals.equipmentCost))}
          emphasis
        />
        <StatTile label="Lines" value={equipmentItems.length} />
      </div>

      <Panel>
        <PanelHeader
          title="Equipment lines"
          description="Rental, mobilization and delivery are snapshotted into one line amount."
        />
        <TakeoffTable
          items={equipmentItems}
          lineTotals={lineTotals}
          scopeCategories={activeScopes}
          laborRates={laborRates.filter((rate) => rate.is_active)}
          basePath={`/admin/estimates/${estimate.id}/equipment`}
          editingId={searchParams.edit}
          locked={locked}
          emptyMessage="Add a lift, crane or rental below. Costs can be overridden per bid after they are added."
        />
      </Panel>

      {!locked && (
        <Panel>
          <PanelHeader title="Add equipment or rental" />
          <PanelBody>
            <AddEquipmentForm
              estimateId={estimate.id}
              rates={rates}
              scopeCategories={activeScopes}
            />
          </PanelBody>
        </Panel>
      )}
    </div>
  );
}
