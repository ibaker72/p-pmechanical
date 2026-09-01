import Link from 'next/link';
import type { Metadata } from 'next';
import { getDashboardSummary } from '@/lib/estimating/queries';
import { formatDate, moneyWhole, relativeDays } from '@/lib/estimating/format';
import {
  EmptyState,
  EstimateStatusBadge,
  Money,
  PageHeader,
  Panel,
  PanelHeader,
  StatTile,
  Table,
  TableWrap,
  TD,
  TH,
} from '@/components/admin/ui';
import { describeThrown, SetupNotice } from '@/components/admin/SetupNotice';

export const metadata: Metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  let summary;
  try {
    summary = await getDashboardSummary();
  } catch (error) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <SetupNotice error={describeThrown(error, 'getDashboardSummary')} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Commercial mechanical bidding at a glance."
        actions={
          <>
            <Link
              href="/admin/projects/new"
              className="inline-flex h-9 items-center rounded bg-ember-500 px-3.5 text-sm font-semibold text-ink-950 hover:bg-ember-400"
            >
              New project
            </Link>
            <Link
              href="/admin/estimates"
              className="inline-flex h-9 items-center rounded border border-white/20 bg-white/5 px-3.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              All estimates
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Active projects" value={summary.activeProjects} />
        <StatTile label="Open estimates" value={summary.openEstimates} />
        <StatTile
          label="Open pipeline"
          value={moneyWhole(summary.pipelineValue)}
          hint="Sell price of estimates not yet won or lost"
        />
        <StatTile label="Awarded" value={summary.awardedEstimates} tone="positive" />
        <StatTile label="Awarded value" value={moneyWhole(summary.awardedValue)} tone="positive" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Bids due in the next 21 days"
            description="Estimates with a bid date on the calendar."
          />
          {summary.bidsDueSoon.length === 0 ? (
            <EmptyState
              title="Nothing due"
              description="No estimate has a bid date in the next three weeks."
            />
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <TH>Bid date</TH>
                    <TH>Project</TH>
                    <TH>Estimate</TH>
                    <TH align="right">Sell price</TH>
                  </tr>
                </thead>
                <tbody>
                  {summary.bidsDueSoon.map((estimate) => (
                    <tr key={estimate.id}>
                      <TD>
                        <div className="whitespace-nowrap">{formatDate(estimate.bid_date)}</div>
                        <div className="text-[11px] text-ember-300">
                          {relativeDays(estimate.bid_date)}
                        </div>
                      </TD>
                      <TD>
                        {estimate.project ? (
                          <Link
                            href={`/admin/projects/${estimate.project.id}`}
                            className="text-steel-100 hover:text-ember-300"
                          >
                            {estimate.project.name}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </TD>
                      <TD>
                        <Link
                          href={`/admin/estimates/${estimate.id}/overview`}
                          className="hover:text-ember-300"
                        >
                          {estimate.estimate_number} · rev {estimate.revision}
                        </Link>
                      </TD>
                      <TD align="right" numeric>
                        <Money value={estimate.sell_price} whole />
                      </TD>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Recently updated estimates" />
          {summary.recentEstimates.length === 0 ? (
            <EmptyState
              title="No estimates yet"
              description="Create a project, then add its first estimate."
              action={
                <Link
                  href="/admin/projects/new"
                  className="inline-flex h-9 items-center rounded bg-ember-500 px-3.5 text-sm font-semibold text-ink-950 hover:bg-ember-400"
                >
                  New project
                </Link>
              }
            />
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <TH>Estimate</TH>
                    <TH>Project</TH>
                    <TH>Status</TH>
                    <TH align="right">Sell price</TH>
                    <TH align="right">Margin</TH>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentEstimates.map((estimate) => (
                    <tr key={estimate.id}>
                      <TD>
                        <Link
                          href={`/admin/estimates/${estimate.id}/overview`}
                          className="font-medium hover:text-ember-300"
                        >
                          {estimate.estimate_number}
                        </Link>
                        <div className="text-[11px] text-steel-500">rev {estimate.revision}</div>
                      </TD>
                      <TD className="max-w-[220px] truncate">{estimate.project?.name ?? '—'}</TD>
                      <TD>
                        <EstimateStatusBadge status={estimate.status} />
                      </TD>
                      <TD align="right" numeric>
                        <Money value={estimate.sell_price} whole />
                      </TD>
                      <TD align="right" numeric>
                        {Number(estimate.gross_margin_percent).toFixed(1)}%
                      </TD>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Panel>
      </div>
    </>
  );
}
