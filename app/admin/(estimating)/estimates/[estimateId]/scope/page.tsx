import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadEstimateWorkspace, loadScopeItems } from '@/lib/estimating/page-data';
import { rollUpByScope } from '@/lib/estimating/recalc';
import { toMoneyNumber, toRateNumber } from '@/lib/estimating/decimal';
import { hours, money } from '@/lib/estimating/format';
import {
  Callout,
  EmptyState,
  Money,
  Panel,
  PanelHeader,
  StatTile,
  Table,
  TableWrap,
  TD,
  TH,
} from '@/components/admin/ui';
import { ScopeSection } from '@/components/admin/ScopeSection';

export const metadata: Metadata = { title: 'Scope' };
export const dynamic = 'force-dynamic';

export default async function EstimateScopePage({ params }: { params: { estimateId: string } }) {
  const workspace = await loadEstimateWorkspace(params.estimateId);
  if (!workspace) notFound();

  const { estimate, items, lineTotals, totals, scopeCategories, locked } = workspace;
  const scopeItems = await loadScopeItems(estimate.id);
  const activeScopes = scopeCategories.filter((category) => category.is_active);
  const byScope = rollUpByScope(items, lineTotals);

  const bucket = (disposition: string) =>
    scopeItems.filter((item) => item.disposition === disposition);

  const uncertain = scopeItems.filter((item) => item.is_uncertain);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Inclusions" value={bucket('included').length} />
        <StatTile label="Exclusions" value={bucket('excluded').length} />
        <StatTile
          label="Alternates"
          value={bucket('alternate').length}
          hint={`${money(toMoneyNumber(totals.alternatesCost))} of alternate lines`}
        />
        <StatTile
          label="Flagged uncertain"
          value={uncertain.length}
          tone={uncertain.length > 0 ? 'warning' : 'neutral'}
        />
      </div>

      {uncertain.length > 0 && (
        <Callout tone="warning" title={`${uncertain.length} scope items flagged uncertain`}>
          <ul className="list-disc pl-5">
            {uncertain.map((item) => (
              <li key={item.id}>{item.title}</li>
            ))}
          </ul>
        </Callout>
      )}

      <Panel>
        <PanelHeader
          title="Priced scope"
          description="What the takeoff actually carries, by scope category."
        />
        {byScope.length === 0 ? (
          <EmptyState
            title="Nothing priced yet"
            description="Scope categories appear here as soon as takeoff lines are assigned to them."
          />
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <TH>Scope</TH>
                  <TH align="right">Lines</TH>
                  <TH align="right">Hours</TH>
                  <TH align="right">Cost</TH>
                </tr>
              </thead>
              <tbody>
                {byScope.map((group) => (
                  <tr key={group.scopeCode ?? group.scopeName}>
                    <TD className="font-medium text-steel-100">{group.scopeName}</TD>
                    <TD align="right" numeric className="text-steel-400">
                      {group.lineCount}
                    </TD>
                    <TD align="right" numeric className="text-steel-300">
                      {hours(toRateNumber(group.laborHours), 1)}
                    </TD>
                    <TD align="right" numeric className="font-semibold text-white">
                      <Money value={toMoneyNumber(group.total)} />
                    </TD>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ScopeSection
          estimateId={estimate.id}
          disposition="included"
          title="Inclusions"
          description="What this bid covers. Reads on the proposal in this order."
          items={bucket('included')}
          scopeCategories={activeScopes}
          locked={locked}
        />
        <ScopeSection
          estimateId={estimate.id}
          disposition="excluded"
          title="Exclusions"
          description="What this bid does not cover. The most valuable page of a commercial proposal."
          items={bucket('excluded')}
          scopeCategories={activeScopes}
          locked={locked}
        />
        <ScopeSection
          estimateId={estimate.id}
          disposition="clarification"
          title="Clarifications"
          description="Conditions the customer needs to know the bid depends on."
          items={bucket('clarification')}
          scopeCategories={activeScopes}
          locked={locked}
        />
        <ScopeSection
          estimateId={estimate.id}
          disposition="assumption"
          title="Assumptions"
          description="What was assumed where the documents were silent."
          items={bucket('assumption')}
          scopeCategories={activeScopes}
          locked={locked}
        />
        <ScopeSection
          estimateId={estimate.id}
          disposition="alternate"
          title="Alternates"
          description="Add or deduct alternates. Price them with alternate-disposition takeoff lines."
          items={bucket('alternate')}
          scopeCategories={activeScopes}
          locked={locked}
          showAmount
          amountLabel="Proposal amount"
          amountHint="May be negative for a deduct."
        />
        <ScopeSection
          estimateId={estimate.id}
          disposition="allowance"
          title="Allowances"
          description="Carried inside the base bid. Add a matching allowance takeoff line so the price covers it."
          items={bucket('allowance')}
          scopeCategories={activeScopes}
          locked={locked}
          showAmount
          amountLabel="Allowance amount"
          amountHint="Shown on the proposal."
        />
      </div>
    </div>
  );
}
