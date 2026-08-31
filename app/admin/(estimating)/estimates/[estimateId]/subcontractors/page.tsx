import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadEstimateWorkspace } from '@/lib/estimating/page-data';
import { listVendors } from '@/lib/estimating/queries';
import { toMoneyNumber } from '@/lib/estimating/decimal';
import { money } from '@/lib/estimating/format';
import { Panel, PanelBody, PanelHeader, StatTile } from '@/components/admin/ui';
import { TakeoffTable } from '@/components/admin/takeoff/TakeoffTable';
import { AddSubcontractForm } from '@/components/admin/takeoff/AddSubcontractForm';

export const metadata: Metadata = { title: 'Subcontractors' };
export const dynamic = 'force-dynamic';

export default async function EstimateSubcontractorsPage({
  params,
  searchParams,
}: {
  params: { estimateId: string };
  searchParams: { edit?: string };
}) {
  const workspace = await loadEstimateWorkspace(params.estimateId);
  if (!workspace) notFound();

  const { estimate, items, lineTotals, totals, scopeCategories, laborRates, locked } = workspace;
  const vendors = locked ? [] : await listVendors({ subcontractorsOnly: true });
  const activeScopes = scopeCategories.filter((category) => category.is_active);

  const subItems = items.filter((item) => {
    const line = lineTotals.get(item.id);
    return line ? line.subcontractCost !== 0n : false;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Subcontract total"
          value={money(toMoneyNumber(totals.subcontractorCost))}
          emphasis
        />
        <StatTile label="Quotes carried" value={subItems.length} />
      </div>

      <Panel>
        <PanelHeader
          title="Subcontractor costs"
          description="Quoted amounts as received. Sales tax is not added — a sub's quote carries their own."
        />
        <TakeoffTable
          items={subItems}
          lineTotals={lineTotals}
          scopeCategories={activeScopes}
          laborRates={laborRates.filter((rate) => rate.is_active)}
          basePath={`/admin/estimates/${estimate.id}/subcontractors`}
          editingId={searchParams.edit}
          locked={locked}
          emptyMessage="Enter controls, electrical, TAB, insulation and rigging quotes here."
        />
      </Panel>

      {!locked && (
        <Panel>
          <PanelHeader
            title="Add a subcontractor cost"
            description="Vendors marked as subcontractors in the directory appear in the list."
          />
          <PanelBody>
            <AddSubcontractForm
              estimateId={estimate.id}
              vendors={vendors}
              scopeCategories={activeScopes}
            />
          </PanelBody>
        </Panel>
      )}
    </div>
  );
}
