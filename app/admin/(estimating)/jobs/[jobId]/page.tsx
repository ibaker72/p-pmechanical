import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getJob } from '@/lib/estimating/queries';
import { formatDate, formatDateTime, hours, money } from '@/lib/estimating/format';
import {
  Callout,
  DetailRow,
  EmptyState,
  JobStatusBadge,
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
import { JobStatusForm, RefreshBudgetForm } from '@/components/admin/JobStatusForm';
import { describeThrown, SetupNotice } from '@/components/admin/SetupNotice';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { jobId: string };
}): Promise<Metadata> {
  try {
    const job = await getJob(params.jobId);
    return { title: job?.job_number ?? 'Job' };
  } catch {
    return { title: 'Job' };
  }
}

export default async function JobDetailPage({ params }: { params: { jobId: string } }) {
  let job;
  try {
    job = await getJob(params.jobId);
    if (!job) notFound();
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error) throw error;
    return (
      <>
        <PageHeader title="Job" />
        <SetupNotice error={describeThrown(error)} />
      </>
    );
  }

  const current = job.budgets[0];

  return (
    <>
      <PageHeader
        breadcrumb={[{ label: 'Jobs', href: '/admin/jobs' }, { label: job.job_number }]}
        title={job.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <JobStatusBadge status={job.status} />
            <span className="font-mono text-xs text-steel-400">{job.job_number}</span>
            {job.project && <span>· {job.project.name}</span>}
          </span>
        }
        actions={
          job.source_estimate_id ? (
            <Link
              href={`/admin/estimates/${job.source_estimate_id}/overview`}
              className="inline-flex h-9 items-center rounded border border-white/20 bg-white/5 px-3.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Source estimate
            </Link>
          ) : undefined
        }
      />

      {current && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
          <StatTile label="Material" value={money(current.material_budget)} />
          <StatTile
            label="Labor"
            value={money(current.labor_cost_budget)}
            hint={`${hours(current.labor_hours_budget, 0)} hrs`}
          />
          <StatTile label="Equipment" value={money(current.equipment_budget)} />
          <StatTile label="Subcontract" value={money(current.subcontract_budget)} />
          <StatTile label="Other" value={money(current.other_budget)} />
          <StatTile label="Cost budget" value={money(current.total_cost_budget)} emphasis />
          <StatTile
            label="Contract value"
            value={money(current.contract_value)}
            hint={`${Number(current.expected_gross_margin_percent).toFixed(2)}% expected margin`}
            emphasis
            tone="positive"
          />
        </div>
      )}

      <Callout tone="info" title="Actual costs are not tracked yet">
        The schema is in place — <code className="rounded bg-ink-900 px-1">job_cost_entries</code>{' '}
        links every actual back to the takeoff line that budgeted it — but no procurement, purchase
        order or actual-cost entry is implemented in this phase. Nothing on this page pretends
        otherwise.
      </Callout>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Panel>
            <PanelHeader
              title="Budget versions"
              description="Each snapshot is immutable. Re-snapshotting adds a version, never edits one."
            />
            {job.budgets.length === 0 ? (
              <EmptyState title="No budget snapshot" />
            ) : (
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <TH align="right">Version</TH>
                      <TH>Snapshot taken</TH>
                      <TH align="right">Material</TH>
                      <TH align="right">Labor hrs</TH>
                      <TH align="right">Labor $</TH>
                      <TH align="right">Equip.</TH>
                      <TH align="right">Sub</TH>
                      <TH align="right">Cost budget</TH>
                      <TH align="right">Contract</TH>
                      <TH align="right">Margin</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {job.budgets.map((budget) => (
                      <tr key={budget.id}>
                        <TD align="right" numeric className="font-semibold text-white">
                          v{budget.version}
                        </TD>
                        <TD className="whitespace-nowrap text-xs text-steel-400">
                          {formatDateTime(budget.snapshot_at)}
                        </TD>
                        <TD align="right" numeric>
                          {money(budget.material_budget)}
                        </TD>
                        <TD align="right" numeric className="text-steel-300">
                          {hours(budget.labor_hours_budget, 1)}
                        </TD>
                        <TD align="right" numeric>
                          {money(budget.labor_cost_budget)}
                        </TD>
                        <TD align="right" numeric>
                          {money(budget.equipment_budget)}
                        </TD>
                        <TD align="right" numeric>
                          {money(budget.subcontract_budget)}
                        </TD>
                        <TD align="right" numeric className="font-semibold text-white">
                          {money(budget.total_cost_budget)}
                        </TD>
                        <TD align="right" numeric>
                          {money(budget.contract_value)}
                        </TD>
                        <TD align="right" numeric>
                          {Number(budget.expected_gross_margin_percent).toFixed(2)}%
                        </TD>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Job details" />
            <PanelBody>
              <dl>
                <DetailRow label="Job number">{job.job_number}</DetailRow>
                <DetailRow label="Project">{job.project?.name ?? '—'}</DetailRow>
                <DetailRow label="Customer">{job.project?.customer_company ?? '—'}</DetailRow>
                <DetailRow label="Contract value">{money(job.contract_value)}</DetailRow>
                <DetailRow label="Start">{formatDate(job.start_date)}</DetailRow>
                <DetailRow label="End">{formatDate(job.end_date)}</DetailRow>
                <DetailRow label="Created">{formatDateTime(job.created_at)}</DetailRow>
              </dl>
              {job.notes && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-steel-300">{job.notes}</p>
              )}
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Status" />
            <PanelBody>
              <JobStatusForm jobId={job.id} status={job.status} />
            </PanelBody>
          </Panel>

          {job.source_estimate_id && (
            <Panel>
              <PanelHeader title="Budget" />
              <PanelBody>
                <RefreshBudgetForm jobId={job.id} />
              </PanelBody>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
