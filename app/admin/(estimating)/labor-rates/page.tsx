import Link from 'next/link';
import type { Metadata } from 'next';
import { listLaborRates } from '@/lib/estimating/queries';
import { money } from '@/lib/estimating/format';
import {
  Badge,
  Callout,
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
import { DeleteLaborRateButton, LaborRateForm } from '@/components/admin/catalog/CatalogForms';
import { describeThrown, SetupNotice } from '@/components/admin/SetupNotice';

export const metadata: Metadata = { title: 'Labor rates' };
export const dynamic = 'force-dynamic';

export default async function LaborRatesPage({
  searchParams,
}: {
  searchParams: { edit?: string };
}) {
  let rates;
  try {
    rates = await listLaborRates(true);
  } catch (error) {
    return (
      <>
        <PageHeader title="Labor rates" />
        <SetupNotice error={describeThrown(error, 'listLaborRates')} />
      </>
    );
  }

  const editing = rates.find((rate) => rate.id === searchParams.edit);

  return (
    <>
      <PageHeader
        title="Labor rates"
        subtitle="Burdened hourly cost by classification. The estimating engine never uses a raw wage."
      />

      <Callout tone="info" title="Rates are snapshotted onto estimates">
        Changing a rate here affects new takeoff lines only. Lines already on an estimate keep the
        rate they were priced with, so historical bids stay accurate.
      </Callout>

      <Panel className="my-6">
        <PanelHeader title={editing ? `Edit ${editing.name}` : 'Add a classification'} />
        <PanelBody>
          <LaborRateForm
            key={editing?.id ?? 'new'}
            rate={editing}
            cancelHref="/admin/labor-rates"
          />
        </PanelBody>
      </Panel>

      <Panel>
        {rates.length === 0 ? (
          <EmptyState
            title="No labor classifications yet"
            description="Add the trades PP Mechanical bids — sheet metal, pipefitter, plumber, foreman."
          />
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <TH>Classification</TH>
                  <TH>Code</TH>
                  <TH align="right">Burdened rate</TH>
                  <TH align="right">OT</TH>
                  <TH align="right">DT</TH>
                  <TH align="right">Prevailing wage</TH>
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
                      {rate.description && (
                        <div className="text-[11px] text-steel-500">{rate.description}</div>
                      )}
                    </TD>
                    <TD className="font-mono text-xs text-steel-400">{rate.code}</TD>
                    <TD align="right" numeric className="font-semibold text-white">
                      {money(rate.base_hourly_rate)}
                    </TD>
                    <TD align="right" numeric className="text-steel-400">
                      x{Number(rate.overtime_multiplier).toFixed(2)}
                    </TD>
                    <TD align="right" numeric className="text-steel-400">
                      x{Number(rate.doubletime_multiplier).toFixed(2)}
                    </TD>
                    <TD align="right" numeric className="text-steel-300">
                      {rate.prevailing_wage_hourly_rate != null
                        ? money(rate.prevailing_wage_hourly_rate)
                        : '—'}
                    </TD>
                    <TD align="right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/labor-rates?edit=${rate.id}`}
                          className="inline-flex h-8 items-center rounded px-2 text-xs font-semibold text-steel-300 hover:bg-white/10 hover:text-white"
                        >
                          Edit
                        </Link>
                        <DeleteLaborRateButton id={rate.id} name={rate.name} />
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
