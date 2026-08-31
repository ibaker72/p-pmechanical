import Link from 'next/link';
import type { Metadata } from 'next';
import { listEquipmentRates, listVendors } from '@/lib/estimating/queries';
import { money } from '@/lib/estimating/format';
import {
  Badge,
  EmptyState,
  PageHeader,
  Panel,
  PanelBody,
  PanelHeader,
  Table,
  TableWrap,
  TD,
  TH,
} from '@/components/admin/ui';
import {
  DeleteEquipmentRateButton,
  EquipmentRateForm,
} from '@/components/admin/catalog/CatalogForms';
import { describeThrown, SetupNotice } from '@/components/admin/SetupNotice';

export const metadata: Metadata = { title: 'Equipment rates' };
export const dynamic = 'force-dynamic';

export default async function EquipmentRatesPage({
  searchParams,
}: {
  searchParams: { edit?: string };
}) {
  let rates;
  let vendors;
  try {
    [rates, vendors] = await Promise.all([listEquipmentRates(true), listVendors()]);
  } catch (error) {
    return (
      <>
        <PageHeader title="Equipment rates" />
        <SetupNotice error={describeThrown(error)} />
      </>
    );
  }

  const editing = rates.find((rate) => rate.id === searchParams.edit);
  const vendorNames = new Map(vendors.map((vendor) => [vendor.id, vendor.company_name]));

  return (
    <>
      <PageHeader
        title="Equipment & rental rates"
        subtitle="Lifts, cranes, threading machines, temporary equipment, dumpsters and delivery."
      />

      <Panel className="mb-6">
        <PanelHeader title={editing ? `Edit ${editing.name}` : 'Add an equipment rate'} />
        <PanelBody>
          <EquipmentRateForm
            key={editing?.id ?? 'new'}
            rate={editing}
            vendors={vendors}
            cancelHref="/admin/equipment-rates"
          />
        </PanelBody>
      </Panel>

      <Panel>
        {rates.length === 0 ? (
          <EmptyState
            title="No equipment rates yet"
            description="Add the lifts, cranes and rentals PP Mechanical uses so they can be priced in one step."
          />
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <TH>Equipment</TH>
                  <TH>Category</TH>
                  <TH align="right">Daily</TH>
                  <TH align="right">Weekly</TH>
                  <TH align="right">Monthly</TH>
                  <TH align="right">Mobilization</TH>
                  <TH align="right">Delivery + pickup</TH>
                  <TH>Vendor</TH>
                  <TH align="right">Actions</TH>
                </tr>
              </thead>
              <tbody>
                {rates.map((rate) => (
                  <tr key={rate.id} className="hover:bg-white/[0.02]">
                    <TD>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{rate.name}</span>
                        {!rate.is_active && <Badge tone="muted">Inactive</Badge>}
                      </div>
                    </TD>
                    <TD className="text-xs text-steel-300">{rate.category ?? '—'}</TD>
                    <TD align="right" numeric>
                      {money(rate.daily_rate)}
                    </TD>
                    <TD align="right" numeric>
                      {money(rate.weekly_rate)}
                    </TD>
                    <TD align="right" numeric>
                      {money(rate.monthly_rate)}
                    </TD>
                    <TD align="right" numeric className="text-steel-300">
                      {money(rate.mobilization_cost)}
                    </TD>
                    <TD align="right" numeric className="text-steel-300">
                      {money(Number(rate.delivery_cost) + Number(rate.pickup_cost))}
                    </TD>
                    <TD className="max-w-[140px] truncate text-xs text-steel-300">
                      {rate.vendor_id ? (vendorNames.get(rate.vendor_id) ?? '—') : '—'}
                    </TD>
                    <TD align="right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/equipment-rates?edit=${rate.id}`}
                          className="inline-flex h-8 items-center rounded px-2 text-xs font-semibold text-steel-300 hover:bg-white/10 hover:text-white"
                        >
                          Edit
                        </Link>
                        <DeleteEquipmentRateButton id={rate.id} name={rate.name} />
                      </div>
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
