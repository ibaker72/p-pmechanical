import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadEstimateWorkspace } from '@/lib/estimating/page-data';
import { listLaborModifiers } from '@/lib/estimating/queries';
import { toMoneyNumber, toRateNumber } from '@/lib/estimating/decimal';
import { hours, money } from '@/lib/estimating/format';
import {
  EmptyState,
  Panel,
  PanelBody,
  PanelHeader,
  StatTile,
  Table,
  TableWrap,
  TD,
  TH,
} from '@/components/admin/ui';
import { LaborConditionsPanel } from '@/components/admin/LaborConditionsPanel';
import { LaborMathPanel } from '@/components/admin/LaborMathPanel';
import { AddLineForm } from '@/components/admin/takeoff/AddLineForm';

export const metadata: Metadata = { title: 'Labor' };
export const dynamic = 'force-dynamic';

export default async function EstimateLaborPage({ params }: { params: { estimateId: string } }) {
  const workspace = await loadEstimateWorkspace(params.estimateId);
  if (!workspace) notFound();

  const { estimate, items, conditions, lineTotals, totals, scopeCategories, laborRates, locked } =
    workspace;
  const modifiers = locked ? [] : await listLaborModifiers();
  const activeScopes = scopeCategories.filter((category) => category.is_active);

  // Every line that carries hours, regardless of line type.
  const laborLines = items.filter((item) => {
    const line = lineTotals.get(item.id);
    return line ? line.laborHours !== 0n : false;
  });

  // Hours and cost per labor classification.
  const byClassification = new Map<string, { name: string; hours: bigint; cost: bigint }>();
  for (const item of laborLines) {
    const line = lineTotals.get(item.id);
    if (!line) continue;
    const key = item.labor_rate_id ?? '__none__';
    const existing = byClassification.get(key);
    if (existing) {
      existing.hours += line.laborHours;
      existing.cost += line.laborCost;
    } else {
      byClassification.set(key, {
        name: item.labor_rate_name ?? 'Unassigned classification',
        hours: line.laborHours,
        cost: line.laborCost,
      });
    }
  }

  const averageRate =
    toRateNumber(totals.totalLaborHours) > 0
      ? toMoneyNumber(totals.laborCost) / toRateNumber(totals.totalLaborHours)
      : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Base hours" value={hours(toRateNumber(totals.baseLaborHours), 1)} />
        <StatTile
          label="Adjusted hours"
          value={hours(toRateNumber(totals.totalLaborHours), 1)}
          emphasis
        />
        <StatTile label="Labor cost" value={money(toMoneyNumber(totals.laborCost))} emphasis />
        <StatTile
          label="Blended rate"
          value={money(averageRate)}
          hint="Adjusted labor cost per hour"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <LaborConditionsPanel
          estimateId={estimate.id}
          conditions={conditions}
          modifiers={modifiers}
          locked={locked}
        />
        <LaborMathPanel conditions={conditions} totals={totals} />
      </div>

      <Panel>
        <PanelHeader title="Hours by classification" />
        {byClassification.size === 0 ? (
          <EmptyState
            title="No labor hours yet"
            description="Add labor lines below, or give material lines an hours-per-unit value."
          />
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <TH>Classification</TH>
                  <TH align="right">Hours</TH>
                  <TH align="right">Cost</TH>
                  <TH align="right">Effective rate</TH>
                </tr>
              </thead>
              <tbody>
                {[...byClassification.values()]
                  .sort((a, b) => (b.hours > a.hours ? 1 : -1))
                  .map((group) => {
                    const groupHours = toRateNumber(group.hours);
                    return (
                      <tr key={group.name}>
                        <TD className="font-medium text-steel-100">{group.name}</TD>
                        <TD align="right" numeric>
                          {hours(groupHours, 2)}
                        </TD>
                        <TD align="right" numeric>
                          {money(toMoneyNumber(group.cost))}
                        </TD>
                        <TD align="right" numeric className="text-steel-400">
                          {groupHours > 0 ? money(toMoneyNumber(group.cost) / groupHours) : '—'}
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
          title="Lines carrying labor"
          description="Includes material and assembly lines with productivity hours."
        />
        {laborLines.length === 0 ? (
          <EmptyState title="No lines carry labor hours yet" />
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <TH>Scope</TH>
                  <TH>Item</TH>
                  <TH align="right">Qty</TH>
                  <TH align="right">Hrs / unit</TH>
                  <TH align="right">Base hrs</TH>
                  <TH align="right">Factor</TH>
                  <TH align="right">Adjusted hrs</TH>
                  <TH>Classification</TH>
                  <TH align="right">Labor cost</TH>
                </tr>
              </thead>
              <tbody>
                {laborLines.map((item) => {
                  const line = lineTotals.get(item.id)!;
                  return (
                    <tr key={item.id}>
                      <TD className="whitespace-nowrap text-xs text-steel-400">
                        {item.scope_name ?? '—'}
                      </TD>
                      <TD>{item.description}</TD>
                      <TD align="right" numeric>
                        {Number(item.quantity).toLocaleString('en-US', {
                          maximumFractionDigits: 4,
                        })}
                      </TD>
                      <TD align="right" numeric className="text-steel-400">
                        {Number(item.labor_hours_per_unit).toFixed(4)}
                      </TD>
                      <TD align="right" numeric>
                        {hours(toRateNumber(line.baseLaborHours), 2)}
                      </TD>
                      <TD align="right" numeric className="text-ember-300">
                        x{toRateNumber(line.effectiveLaborFactor).toFixed(4)}
                      </TD>
                      <TD align="right" numeric className="font-semibold text-white">
                        {hours(toRateNumber(line.laborHours), 2)}
                      </TD>
                      <TD className="text-xs text-steel-300">
                        {item.labor_rate_name ?? '—'}
                        <span className="block text-[11px] text-steel-500">
                          {money(item.labor_rate_snapshot)}/hr
                        </span>
                      </TD>
                      <TD align="right" numeric>
                        {money(toMoneyNumber(line.laborCost))}
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Panel>

      {!locked && (
        <Panel>
          <PanelHeader title="Add a labor line" />
          <PanelBody>
            <AddLineForm
              estimateId={estimate.id}
              scopeCategories={activeScopes}
              laborRates={laborRates.filter((rate) => rate.is_active)}
              defaultLineType="labor"
            />
          </PanelBody>
        </Panel>
      )}
    </div>
  );
}
