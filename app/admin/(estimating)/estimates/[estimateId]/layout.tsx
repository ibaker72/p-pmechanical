import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadEstimateWorkspace } from '@/lib/estimating/page-data';
import { formatDate, formatDateTime } from '@/lib/estimating/format';
import { EstimateTabs } from '@/components/admin/EstimateTabs';
import { EstimateTotalsBar } from '@/components/admin/EstimateTotalsBar';
import { Badge, Callout, EstimateStatusBadge, PageHeader } from '@/components/admin/ui';
import { describeThrown, SetupNotice } from '@/components/admin/SetupNotice';

export const dynamic = 'force-dynamic';

export default async function EstimateLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { estimateId: string };
}) {
  let workspace;
  try {
    workspace = await loadEstimateWorkspace(params.estimateId);
  } catch (error) {
    return (
      <>
        <PageHeader title="Estimate" />
        <SetupNotice error={describeThrown(error, 'loadEstimateWorkspace')} />
      </>
    );
  }
  if (!workspace) notFound();

  const { estimate, totals, unresolved, locked } = workspace;

  return (
    <>
      {/* Estimator-facing chrome. It is marked print-hidden because the Proposal
          tab renders INSIDE this layout: without it, printing the customer
          proposal would put PP Mechanical's direct cost and gross margin at the
          top of the page the general contractor receives. */}
      <div className="print-hidden">
        <PageHeader
          breadcrumb={[
            { label: 'Projects', href: '/admin/projects' },
            {
              label: estimate.project.project_number,
              href: `/admin/projects/${estimate.project_id}`,
            },
            { label: `Rev ${estimate.revision}` },
          ]}
          title={estimate.project.name}
          subtitle={
            <span className="flex flex-wrap items-center gap-2">
              <EstimateStatusBadge status={estimate.status} />
              <span className="font-mono text-xs text-steel-400">
                {estimate.estimate_number} · rev {estimate.revision}
              </span>
              {estimate.revision_label && <span>· {estimate.revision_label}</span>}
              {estimate.bid_date && <span>· Bid {formatDate(estimate.bid_date)}</span>}
              {unresolved.total > 0 && (
                <Badge tone="warning">
                  {unresolved.total} unresolved bid item{unresolved.total === 1 ? '' : 's'}
                </Badge>
              )}
            </span>
          }
          actions={
            <>
              <span className="hidden text-xs text-steel-500 sm:inline">
                Updated {formatDateTime(estimate.updated_at)}
              </span>
              <Link
                href={`/admin/projects/${estimate.project_id}`}
                className="inline-flex h-9 items-center rounded border border-white/20 bg-white/5 px-3.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Project
              </Link>
            </>
          }
        />

        {locked && (
          <Callout tone="warning" title="This revision is superseded">
            It is kept read-only so the bid history stays accurate. Open the current revision on the
            project page to make changes.
          </Callout>
        )}

        <EstimateTabs estimateId={estimate.id} unresolvedCount={unresolved.total} />
        <EstimateTotalsBar totals={totals} />
      </div>

      {children}
    </>
  );
}
