import Link from 'next/link';
import type { Metadata } from 'next';
import { listJobs } from '@/lib/estimating/queries';
import { formatDate } from '@/lib/estimating/format';
import {
  EmptyState,
  JobStatusBadge,
  Money,
  PageHeader,
  Panel,
  Table,
  TableWrap,
  TD,
  TH,
} from '@/components/admin/ui';
import { describeThrown, SetupNotice } from '@/components/admin/SetupNotice';

export const metadata: Metadata = { title: 'Jobs' };
export const dynamic = 'force-dynamic';

export default async function JobsPage() {
  let jobs;
  try {
    jobs = await listJobs();
  } catch (error) {
    return (
      <>
        <PageHeader title="Jobs" />
        <SetupNotice error={describeThrown(error, 'listJobs')} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Jobs"
        subtitle="Awarded estimates converted to a job with a fixed budget snapshot."
      />

      <Panel>
        {jobs.length === 0 ? (
          <EmptyState
            title="No jobs yet"
            description="Set an estimate to Awarded, then use Convert to job on its overview."
            action={
              <Link
                href="/admin/estimates?status=awarded"
                className="inline-flex h-9 items-center rounded border border-white/20 bg-white/5 px-3.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Awarded estimates
              </Link>
            }
          />
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <TH>Job</TH>
                  <TH>Project</TH>
                  <TH>Customer</TH>
                  <TH>Status</TH>
                  <TH>Start</TH>
                  <TH align="right">Contract value</TH>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-white/[0.02]">
                    <TD>
                      <Link
                        href={`/admin/jobs/${job.id}`}
                        className="font-medium text-white hover:text-ember-300"
                      >
                        {job.job_number}
                      </Link>
                      <div className="text-[11px] text-steel-500">{job.name}</div>
                    </TD>
                    <TD className="max-w-[200px] truncate">
                      {job.project ? (
                        <Link
                          href={`/admin/projects/${job.project.id}`}
                          className="hover:text-ember-300"
                        >
                          {job.project.name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </TD>
                    <TD className="max-w-[180px] truncate text-steel-300">
                      {job.project?.customer_company ?? '—'}
                    </TD>
                    <TD>
                      <JobStatusBadge status={job.status} />
                    </TD>
                    <TD className="whitespace-nowrap text-steel-300">
                      {formatDate(job.start_date)}
                    </TD>
                    <TD align="right" numeric className="font-semibold text-white">
                      <Money value={job.contract_value} whole />
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
