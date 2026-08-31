import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadEstimateWorkspace, loadScopeItems } from '@/lib/estimating/page-data';
import { rollUpByScope } from '@/lib/estimating/recalc';
import { toMoneyNumber, toRateNumber } from '@/lib/estimating/decimal';
import { nextJobNumber } from '@/lib/estimating/numbering';
import { formatDate, formatDateTime, hours, money } from '@/lib/estimating/format';
import { estimatingDb } from '@/lib/estimating/db';
import {
  Callout,
  DetailRow,
  EmptyState,
  Money,
  Panel,
  PanelBody,
  PanelHeader,
  StatTile,
  Table,
  TableWrap,
  TD,
  TH,
} from '@/components/admin/ui';
import { EstimateStatusForm } from '@/components/admin/EstimateStatusForm';
import { CreateRevisionForm } from '@/components/admin/CreateRevisionForm';
import { ConvertToJobForm } from '@/components/admin/ConvertToJobForm';
import { LaborMathPanel } from '@/components/admin/LaborMathPanel';

export const metadata: Metadata = { title: 'Overview' };
export const dynamic = 'force-dynamic';

export default async function EstimateOverviewPage({ params }: { params: { estimateId: string } }) {
  const workspace = await loadEstimateWorkspace(params.estimateId);
  if (!workspace) notFound();

  const { estimate, items, conditions, totals, lineTotals, unresolved, locked } = workspace;
  const scopeItems = await loadScopeItems(estimate.id);
  const scopeRollUp = rollUpByScope(items, lineTotals);

  // A narrative allowance in the Scope tab is display text; the money is
  // carried by allowance takeoff lines. Surfacing the difference catches the
  // classic "wrote the allowance in the proposal, forgot to price it" mistake.
  const narrativeAllowances = scopeItems
    .filter((item) => item.disposition === 'allowance' && item.amount != null)
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const carriedAllowances = toMoneyNumber(totals.allowancesCost);
  const allowanceGap = Math.abs(narrativeAllowances - carriedAllowances) >= 0.01;

  const canConvert = estimate.status === 'awarded';
  let existingJobId: string | null = null;
  let suggestedJobNumber = '';
  if (canConvert) {
    const { data } = await estimatingDb()
      .from('jobs')
      .select('id')
      .eq('source_estimate_id', estimate.id)
      .maybeSingle();
    existingJobId = (data as { id: string } | null)?.id ?? null;
    if (!existingJobId) suggestedJobNumber = await nextJobNumber();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <StatTile label="Materials" value={money(toMoneyNumber(totals.materialCost))} />
        <StatTile
          label="Labor"
          value={money(toMoneyNumber(totals.laborCost))}
          hint={`${hours(toRateNumber(totals.totalLaborHours), 1)} hrs`}
        />
        <StatTile label="Equipment" value={money(toMoneyNumber(totals.equipmentCost))} />
        <StatTile label="Subcontractors" value={money(toMoneyNumber(totals.subcontractorCost))} />
        <StatTile
          label="Other direct"
          value={money(toMoneyNumber(totals.otherCost))}
          hint={
            toMoneyNumber(totals.salesTaxAmount) > 0
              ? `+ ${money(toMoneyNumber(totals.salesTaxAmount))} sales tax`
              : undefined
          }
        />
        <StatTile label="Direct cost" value={money(toMoneyNumber(totals.directCost))} emphasis />
        <StatTile label="Overhead" value={money(toMoneyNumber(totals.overheadAmount))} />
        <StatTile label="Contingency" value={money(toMoneyNumber(totals.contingencyAmount))} />
        <StatTile label="Total cost" value={money(toMoneyNumber(totals.costBasis))} />
        <StatTile
          label="Profit"
          value={money(toMoneyNumber(totals.profitAmount))}
          tone={totals.profitAmount < 0n ? 'danger' : 'positive'}
        />
        <StatTile label="Bid price" value={money(toMoneyNumber(totals.sellPrice))} emphasis />
        <StatTile
          label="Gross margin"
          value={`${toRateNumber(totals.grossMarginPercent).toFixed(2)}%`}
          hint={`${toRateNumber(totals.effectiveMarkupPercent).toFixed(2)}% markup`}
          emphasis
          tone={totals.profitAmount < 0n ? 'danger' : 'neutral'}
        />
      </div>

      {totals.profitAmount < 0n && (
        <Callout tone="danger" title="This bid is priced below cost">
          The bid price is lower than the total cost, so the estimate carries a loss. Check the
          Pricing tab.
        </Callout>
      )}

      {unresolved.total > 0 && (
        <Callout tone="warning" title={`${unresolved.total} unresolved bid review items`}>
          {unresolved.critical > 0 ? (
            <>
              {unresolved.critical} of them are marked critical. Advancing the status past draft
              asks you to confirm them first.{' '}
            </>
          ) : null}
          <Link
            href={`/admin/estimates/${estimate.id}/checklist`}
            className="underline underline-offset-4"
          >
            Open the bid review checklist
          </Link>
          .
        </Callout>
      )}

      {allowanceGap && (
        <Callout tone="warning" title="Allowance amounts do not reconcile">
          The Scope tab describes {money(narrativeAllowances)} of allowances, but{' '}
          {money(carriedAllowances)} of allowance lines are carried in the takeoff. Add or adjust
          allowance takeoff lines so the price matches what the proposal promises.
        </Callout>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel>
            <PanelHeader
              title="Cost by scope"
              description="Base-bid lines only. Excluded and alternate lines are tracked separately."
            />
            {scopeRollUp.length === 0 ? (
              <EmptyState
                title="No takeoff lines yet"
                description="Add materials, assemblies, labor, equipment or subcontractor costs on the Takeoff tab."
                action={
                  <Link
                    href={`/admin/estimates/${estimate.id}/takeoff`}
                    className="inline-flex h-9 items-center rounded bg-ember-500 px-3.5 text-sm font-semibold text-ink-950 hover:bg-ember-400"
                  >
                    Open takeoff
                  </Link>
                }
              />
            ) : (
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <TH>Scope</TH>
                      <TH align="right">Lines</TH>
                      <TH align="right">Material</TH>
                      <TH align="right">Hours</TH>
                      <TH align="right">Labor</TH>
                      <TH align="right">Equip.</TH>
                      <TH align="right">Sub</TH>
                      <TH align="right">Total</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {scopeRollUp.map((group) => (
                      <tr key={group.scopeCode ?? group.scopeName}>
                        <TD className="font-medium text-steel-100">{group.scopeName}</TD>
                        <TD align="right" numeric className="text-steel-400">
                          {group.lineCount}
                        </TD>
                        <TD align="right" numeric>
                          <Money value={toMoneyNumber(group.material)} whole />
                        </TD>
                        <TD align="right" numeric className="text-steel-300">
                          {hours(toRateNumber(group.laborHours), 1)}
                        </TD>
                        <TD align="right" numeric>
                          <Money value={toMoneyNumber(group.labor)} whole />
                        </TD>
                        <TD align="right" numeric>
                          <Money value={toMoneyNumber(group.equipment)} whole />
                        </TD>
                        <TD align="right" numeric>
                          <Money value={toMoneyNumber(group.subcontract)} whole />
                        </TD>
                        <TD align="right" numeric className="font-semibold text-white">
                          <Money value={toMoneyNumber(group.total)} whole />
                        </TD>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            )}
          </Panel>

          <LaborMathPanel conditions={conditions} totals={totals} />

          {(toMoneyNumber(totals.alternatesCost) > 0 || toMoneyNumber(totals.excludedCost) > 0) && (
            <Panel>
              <PanelHeader
                title="Outside the base bid"
                description="Tracked but not included in the bid price."
              />
              <PanelBody>
                <dl>
                  <DetailRow label="Alternates (cost)">
                    {money(toMoneyNumber(totals.alternatesCost))}
                  </DetailRow>
                  <DetailRow label="Excluded work (cost)">
                    {money(toMoneyNumber(totals.excludedCost))}
                  </DetailRow>
                  <DetailRow label="Allowances carried in base bid">
                    {money(toMoneyNumber(totals.allowancesCost))}
                  </DetailRow>
                </dl>
              </PanelBody>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Estimate" />
            <PanelBody>
              <dl>
                <DetailRow label="Estimator">{estimate.estimator ?? '—'}</DetailRow>
                <DetailRow label="Revision">
                  {estimate.revision}
                  {estimate.revision_label ? ` · ${estimate.revision_label}` : ''}
                </DetailRow>
                <DetailRow label="Bid date">{formatDate(estimate.bid_date)}</DetailRow>
                <DetailRow label="Expires">{formatDate(estimate.expiration_date)}</DetailRow>
                <DetailRow label="Takeoff lines">{items.length}</DetailRow>
                <DetailRow label="Unresolved review items">{unresolved.total}</DetailRow>
                <DetailRow label="Last calculated">
                  {formatDateTime(estimate.totals_calculated_at)}
                </DetailRow>
                <DetailRow label="Last modified">{formatDateTime(estimate.updated_at)}</DetailRow>
              </dl>
            </PanelBody>
          </Panel>

          {!locked && (
            <Panel>
              <PanelHeader title="Status" />
              <PanelBody>
                <EstimateStatusForm
                  estimateId={estimate.id}
                  status={estimate.status}
                  criticalUnresolved={unresolved.critical}
                />
              </PanelBody>
            </Panel>
          )}

          <Panel>
            <PanelHeader title="Create revision" />
            <PanelBody>
              <CreateRevisionForm estimateId={estimate.id} />
            </PanelBody>
          </Panel>

          {canConvert && (
            <Panel>
              <PanelHeader title="Convert to job" />
              <PanelBody>
                {existingJobId ? (
                  <p className="text-sm text-steel-300">
                    This estimate has already been converted.{' '}
                    <Link
                      href={`/admin/jobs/${existingJobId}`}
                      className="text-ember-300 underline underline-offset-4 hover:text-ember-200"
                    >
                      Open the job
                    </Link>
                    .
                  </p>
                ) : (
                  <ConvertToJobForm
                    estimateId={estimate.id}
                    suggestedNumber={suggestedJobNumber}
                    projectName={estimate.project.name}
                  />
                )}
              </PanelBody>
            </Panel>
          )}

          {estimate.internal_notes && (
            <Panel>
              <PanelHeader title="Internal notes" />
              <PanelBody>
                <p className="whitespace-pre-wrap text-sm text-steel-200">
                  {estimate.internal_notes}
                </p>
              </PanelBody>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
