import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadEstimateWorkspace } from '@/lib/estimating/page-data';
import { searchMaterialsForPicker } from '@/lib/estimating/queries';
import { normalizeLaborUnit } from '@/lib/estimating/calc';
import { toRateNumber } from '@/lib/estimating/decimal';
import { money } from '@/lib/estimating/format';
import {
  Callout,
  EmptyState,
  Panel,
  PanelBody,
  PanelHeader,
  Table,
  TableWrap,
  TD,
  TH,
} from '@/components/admin/ui';
import { TakeoffTable } from '@/components/admin/takeoff/TakeoffTable';
import { AddMaterialLineForm } from '@/components/admin/takeoff/AddMaterialLineForm';

export const metadata: Metadata = { title: 'Materials' };
export const dynamic = 'force-dynamic';

export default async function EstimateMaterialsPage({
  params,
  searchParams,
}: {
  params: { estimateId: string };
  searchParams: { q?: string; edit?: string };
}) {
  const workspace = await loadEstimateWorkspace(params.estimateId);
  if (!workspace) notFound();

  const { estimate, items, lineTotals, scopeCategories, laborRates, locked } = workspace;
  const activeScopes = scopeCategories.filter((category) => category.is_active);
  const basePath = `/admin/estimates/${estimate.id}/materials`;

  // Material lines, plus any assembly group whose components carry material so
  // the assembly's material cost is visible here too.
  const assembliesWithMaterial = new Set(
    items
      .filter(
        (item) =>
          item.line_type === 'assembly_component' &&
          item.parent_item_id !== null &&
          Number(item.unit_material_cost) > 0,
      )
      .map((item) => item.parent_item_id as string),
  );
  const materialItems = items.filter(
    (item) =>
      item.line_type === 'material' ||
      assembliesWithMaterial.has(item.id) ||
      (item.parent_item_id !== null && assembliesWithMaterial.has(item.parent_item_id)),
  );

  const query = searchParams.q ?? '';
  const results = locked || !query.trim() ? [] : await searchMaterialsForPicker(query);

  return (
    <div className="space-y-6">
      {!locked && (
        <Panel>
          <PanelHeader
            title="Add from the price book"
            description="Prices and productivity values are copied onto the estimate at the moment you add them."
          />
          <PanelBody className="border-b border-white/10">
            <form method="get" className="flex flex-wrap items-end gap-2">
              <div className="min-w-[240px] flex-1">
                <label
                  htmlFor="q"
                  className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-steel-400"
                >
                  Search materials
                </label>
                <input
                  id="q"
                  name="q"
                  defaultValue={query}
                  placeholder="Name, SKU or model"
                  className="w-full rounded border border-white/15 bg-ink-950/60 px-2.5 py-1.5 text-sm text-white placeholder:text-steel-500 focus:border-ember-400/60 focus:outline-none focus:ring-1 focus:ring-ember-400"
                />
              </div>
              <button
                type="submit"
                className="h-[34px] rounded border border-white/20 bg-white/5 px-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Search
              </button>
              <Link
                href="/admin/materials"
                className="flex h-[34px] items-center px-2 text-sm text-steel-400 hover:text-white"
              >
                Manage price book
              </Link>
            </form>
          </PanelBody>

          {query.trim() && results.length === 0 ? (
            <EmptyState
              title="No matching materials"
              description={
                <>
                  Nothing in the price book matches &ldquo;{query}&rdquo;.{' '}
                  <Link href="/admin/materials" className="underline underline-offset-4">
                    Add it to the price book
                  </Link>{' '}
                  or use a manual line on the Takeoff tab.
                </>
              }
            />
          ) : results.length > 0 ? (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <TH>Material</TH>
                    <TH>SKU</TH>
                    <TH>Unit</TH>
                    <TH align="right">Unit cost</TH>
                    <TH align="right">Waste</TH>
                    <TH align="right">Hrs/unit</TH>
                    <TH align="right">Add to estimate</TH>
                  </tr>
                </thead>
                <tbody>
                  {results.map((material) => (
                    <tr key={material.id}>
                      <TD>
                        <div className="font-medium text-steel-100">{material.name}</div>
                        {material.manufacturer && (
                          <div className="text-[11px] text-steel-500">
                            {material.manufacturer}
                            {material.model ? ` · ${material.model}` : ''}
                          </div>
                        )}
                      </TD>
                      <TD className="font-mono text-xs text-steel-400">{material.sku ?? '—'}</TD>
                      <TD className="text-xs text-steel-400">{material.unit_of_measure}</TD>
                      <TD align="right" numeric>
                        {money(material.unit_cost)}
                      </TD>
                      <TD align="right" numeric className="text-steel-400">
                        {Number(material.waste_percent).toFixed(1)}%
                      </TD>
                      <TD align="right" numeric className="text-steel-400">
                        {toRateNumber(
                          normalizeLaborUnit(material.default_labor_unit, material.labor_unit_type),
                        ).toFixed(4)}
                      </TD>
                      <TD align="right">
                        <AddMaterialLineForm
                          estimateId={estimate.id}
                          materialId={material.id}
                          scopeCategories={activeScopes}
                        />
                      </TD>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          ) : (
            <EmptyState
              title="Search the price book"
              description="Type a material name, SKU or model above to add priced lines quickly."
            />
          )}
        </Panel>
      )}

      <Panel>
        <PanelHeader
          title="Material lines on this estimate"
          description="Every line keeps the price it was created with. Use Sync to pull the current price book value."
        />
        {materialItems.length === 0 ? (
          <EmptyState
            title="No material lines yet"
            description="Search the price book above, or add a manual line on the Takeoff tab."
          />
        ) : (
          <TakeoffTable
            items={materialItems}
            lineTotals={lineTotals}
            scopeCategories={activeScopes}
            laborRates={laborRates.filter((rate) => rate.is_active)}
            basePath={basePath}
            editingId={searchParams.edit}
            locked={locked}
          />
        )}
      </Panel>

      <Callout tone="info" title="Overrides are tracked">
        Changing a line&rsquo;s unit cost records the original price and the reason, so a bid can
        always show &ldquo;price book $8.40 &rarr; this bid $9.15&rdquo;.
      </Callout>
    </div>
  );
}
