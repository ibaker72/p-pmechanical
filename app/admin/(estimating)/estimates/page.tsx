import Link from 'next/link';
import type { Metadata } from 'next';
import { listEstimates } from '@/lib/estimating/queries';
import { ESTIMATE_STATUSES, ESTIMATE_STATUS_LABELS } from '@/lib/estimating/constants';
import { formatDate, formatDateTime } from '@/lib/estimating/format';
import {
  EmptyState,
  EstimateStatusBadge,
  Money,
  PageHeader,
  Panel,
  Table,
  TableWrap,
  TD,
  TH,
} from '@/components/admin/ui';
import { describeThrown, SetupNotice } from '@/components/admin/SetupNotice';

export const metadata: Metadata = { title: 'Estimates' };
export const dynamic = 'force-dynamic';

export default async function EstimatesPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const status = ESTIMATE_STATUSES.includes(searchParams.status as never)
    ? searchParams.status
    : undefined;

  let estimates;
  try {
    estimates = await listEstimates({ status, search: searchParams.q });
  } catch (error) {
    return (
      <>
        <PageHeader title="Estimates" />
        <SetupNotice error={describeThrown(error, 'listEstimates')} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Estimates"
        subtitle={`${estimates.length} estimate${estimates.length === 1 ? '' : 's'} across all projects`}
        actions={
          <Link
            href="/admin/estimates/new"
            className="inline-flex h-9 items-center rounded bg-ember-500 px-3.5 text-sm font-semibold text-ink-950 hover:bg-ember-400"
          >
            New estimate
          </Link>
        }
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <label
            htmlFor="q"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-steel-400"
          >
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="Estimate number or revision label"
            className="w-full rounded border border-white/15 bg-ink-950/60 px-2.5 py-1.5 text-sm text-white placeholder:text-steel-500 focus:border-ember-400/60 focus:outline-none focus:ring-1 focus:ring-ember-400"
          />
        </div>
        <div>
          <label
            htmlFor="status"
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-steel-400"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ''}
            className="rounded border border-white/15 bg-ink-950/60 px-2.5 py-1.5 text-sm text-white focus:border-ember-400/60 focus:outline-none focus:ring-1 focus:ring-ember-400"
          >
            <option value="">All</option>
            {ESTIMATE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {ESTIMATE_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="h-[34px] rounded border border-white/20 bg-white/5 px-3 text-sm font-semibold text-white hover:bg-white/10"
        >
          Filter
        </button>
        {(searchParams.q || status) && (
          <Link
            href="/admin/estimates"
            className="flex h-[34px] items-center px-2 text-sm text-steel-400 hover:text-white"
          >
            Clear
          </Link>
        )}
      </form>

      <Panel>
        {estimates.length === 0 ? (
          <EmptyState
            title="No estimates found"
            description="Estimates belong to a project. Create a project first, then add its estimate."
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
                  <TH>Customer</TH>
                  <TH>Status</TH>
                  <TH>Bid date</TH>
                  <TH align="right">Direct cost</TH>
                  <TH align="right">Bid price</TH>
                  <TH align="right">Margin</TH>
                  <TH>Updated</TH>
                </tr>
              </thead>
              <tbody>
                {estimates.map((estimate) => (
                  <tr key={estimate.id} className="hover:bg-white/[0.02]">
                    <TD>
                      <Link
                        href={`/admin/estimates/${estimate.id}/overview`}
                        className="font-medium text-white hover:text-ember-300"
                      >
                        {estimate.estimate_number}
                      </Link>
                      <div className="text-[11px] text-steel-500">
                        rev {estimate.revision}
                        {estimate.revision_label ? ` · ${estimate.revision_label}` : ''}
                      </div>
                    </TD>
                    <TD className="max-w-[200px] truncate">
                      <Link
                        href={`/admin/projects/${estimate.project_id}`}
                        className="hover:text-ember-300"
                      >
                        {estimate.project?.name ?? '—'}
                      </Link>
                    </TD>
                    <TD className="max-w-[180px] truncate text-steel-300">
                      {estimate.project?.customer_company ?? '—'}
                    </TD>
                    <TD>
                      <EstimateStatusBadge status={estimate.status} />
                    </TD>
                    <TD className="whitespace-nowrap text-steel-300">
                      {formatDate(estimate.bid_date)}
                    </TD>
                    <TD align="right" numeric>
                      <Money value={estimate.direct_cost} whole />
                    </TD>
                    <TD align="right" numeric className="font-semibold text-white">
                      <Money value={estimate.sell_price} whole />
                    </TD>
                    <TD align="right" numeric>
                      {Number(estimate.gross_margin_percent).toFixed(1)}%
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-steel-400">
                      {formatDateTime(estimate.updated_at)}
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
