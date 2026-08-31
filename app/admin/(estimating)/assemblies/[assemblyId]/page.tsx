import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  getAssemblyWithItems,
  listLaborRates,
  listScopeCategories,
  listVendors,
  searchMaterialsForPicker,
} from '@/lib/estimating/queries';
import { assemblyUnitCost } from '@/lib/estimating/assembly';
import { money, quantity as formatQuantity } from '@/lib/estimating/format';
import {
  Callout,
  EmptyState,
  PageHeader,
  Panel,
  PanelBody,
  PanelHeader,
  StatTile,
  Table,
  TableWrap,
  TD,
  TH,
} from '@/components/admin/ui';
import {
  AddMaterialToAssemblyForm,
  AssemblyForm,
  AssemblyItemForm,
  DeleteAssemblyItemButton,
} from '@/components/admin/catalog/AssemblyForms';
import { describeThrown, SetupNotice } from '@/components/admin/SetupNotice';
import type { LaborRate } from '@/lib/estimating/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { assemblyId: string };
}): Promise<Metadata> {
  try {
    const assembly = await getAssemblyWithItems(params.assemblyId);
    return { title: assembly?.name ?? 'Assembly' };
  } catch {
    return { title: 'Assembly' };
  }
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  material: 'Material',
  labor: 'Labor',
  equipment: 'Equipment',
  subcontract: 'Subcontract',
  other: 'Other',
};

export default async function AssemblyDetailPage({
  params,
  searchParams,
}: {
  params: { assemblyId: string };
  searchParams: { edit?: string };
}) {
  let assembly;
  let scopeCategories;
  let laborRates;
  let vendors;
  let materials;
  try {
    assembly = await getAssemblyWithItems(params.assemblyId);
    if (!assembly) notFound();
    [scopeCategories, laborRates, vendors, materials] = await Promise.all([
      listScopeCategories(),
      listLaborRates(),
      listVendors(),
      searchMaterialsForPicker('', 200),
    ]);
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error) throw error;
    return (
      <>
        <PageHeader title="Assembly" />
        <SetupNotice error={describeThrown(error)} />
      </>
    );
  }

  const rateMap = new Map<string, LaborRate>(laborRates.map((rate) => [rate.id, rate]));
  const unitCost = assemblyUnitCost(assembly.items, rateMap);
  const editingItem = assembly.items.find((item) => item.id === searchParams.edit);
  const basePath = `/admin/assemblies/${assembly.id}`;

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Assemblies', href: '/admin/assemblies' }, { label: assembly.name }]}
        title={assembly.name}
        subtitle={`Version ${assembly.version} · priced per 1 ${assembly.unit}`}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatTile label="Material" value={money(unitCost.material)} />
        <StatTile
          label="Labor"
          value={money(unitCost.labor)}
          hint={`${unitCost.laborHours.toFixed(2)} hrs`}
        />
        <StatTile label="Equipment" value={money(unitCost.equipment)} />
        <StatTile label="Subcontract" value={money(unitCost.subcontract)} />
        <StatTile label="Other" value={money(unitCost.other)} />
        <StatTile label={`Cost per ${assembly.unit}`} value={money(unitCost.total)} emphasis />
      </div>

      <Callout tone="info" title="This preview is raw cost, not a bid price">
        Overhead, contingency and margin are applied at the estimate level, never inside an
        assembly. Adding this assembly to an estimate copies these values onto the takeoff lines.
      </Callout>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel>
            <PanelHeader
              title="Components"
              description={`${assembly.items.length} component${assembly.items.length === 1 ? '' : 's'}. Quantities are per one ${assembly.unit}.`}
            />
            {assembly.items.length === 0 ? (
              <EmptyState
                title="No components yet"
                description="Add the equipment, materials, labor, rental and allowances this work actually takes."
              />
            ) : (
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <TH>Type</TH>
                      <TH>Component</TH>
                      <TH align="right">Qty / unit</TH>
                      <TH>Unit</TH>
                      <TH align="right">Unit cost</TH>
                      <TH align="right">Waste</TH>
                      <TH align="right">Hrs</TH>
                      <TH align="right">Extended</TH>
                      <TH align="right">Actions</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {assembly.items.map((item) => {
                      const extended = Number(item.quantity_per_unit) * Number(item.unit_cost);
                      const rate = item.labor_rate_id ? rateMap.get(item.labor_rate_id) : undefined;
                      const itemHours =
                        Number(item.quantity_per_unit) * Number(item.labor_hours_per_unit);
                      return (
                        <tr key={item.id} className="hover:bg-white/[0.02]">
                          <TD className="whitespace-nowrap text-xs text-steel-400">
                            {ITEM_TYPE_LABELS[item.item_type] ?? item.item_type}
                          </TD>
                          <TD>
                            <div className="font-medium text-steel-100">{item.description}</div>
                            {rate && (
                              <div className="text-[11px] text-steel-500">
                                {rate.name} · {money(rate.base_hourly_rate)}/hr
                              </div>
                            )}
                            {item.notes && (
                              <div className="text-[11px] text-steel-500">{item.notes}</div>
                            )}
                          </TD>
                          <TD align="right" numeric>
                            {formatQuantity(item.quantity_per_unit)}
                          </TD>
                          <TD className="text-xs text-steel-400">{item.unit}</TD>
                          <TD align="right" numeric>
                            {money(item.unit_cost)}
                          </TD>
                          <TD align="right" numeric className="text-steel-400">
                            {Number(item.waste_percent) > 0
                              ? `${Number(item.waste_percent).toFixed(1)}%`
                              : '—'}
                          </TD>
                          <TD align="right" numeric className="text-steel-300">
                            {itemHours > 0 ? itemHours.toFixed(4) : '—'}
                          </TD>
                          <TD align="right" numeric className="font-semibold text-white">
                            {money(extended)}
                          </TD>
                          <TD align="right">
                            <div className="flex items-center justify-end gap-1">
                              <a
                                href={`${basePath}?edit=${item.id}`}
                                className="inline-flex h-8 items-center rounded px-2 text-xs font-semibold text-steel-300 hover:bg-white/10 hover:text-white"
                              >
                                Edit
                              </a>
                              <DeleteAssemblyItemButton id={item.id} name={item.description} />
                            </div>
                          </TD>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </TableWrap>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title={editingItem ? `Edit ${editingItem.description}` : 'Add a component'}
            />
            <PanelBody>
              <AssemblyItemForm
                key={editingItem?.id ?? 'new'}
                assemblyId={assembly.id}
                item={editingItem}
                laborRates={laborRates}
                vendors={vendors}
                cancelHref={basePath}
              />
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader
              title="Add from the price book"
              description="Copies the material's current cost, waste and productivity into this assembly."
            />
            <PanelBody>
              <AddMaterialToAssemblyForm assemblyId={assembly.id} materials={materials} />
            </PanelBody>
          </Panel>
        </div>

        <div>
          <Panel>
            <PanelHeader title="Assembly details" />
            <PanelBody>
              <AssemblyForm assembly={assembly} scopeCategories={scopeCategories} />
            </PanelBody>
          </Panel>
        </div>
      </div>
    </>
  );
}
