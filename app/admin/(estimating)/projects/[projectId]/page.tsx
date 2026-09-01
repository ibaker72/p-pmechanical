import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProject, listProjectDocuments, listProjectEstimates } from '@/lib/estimating/queries';
import { PROJECT_TYPE_LABELS, type ProjectType } from '@/lib/estimating/constants';
import { formatDate, formatDateTime, integer } from '@/lib/estimating/format';
import {
  Badge,
  DetailRow,
  EmptyState,
  EstimateStatusBadge,
  Money,
  PageHeader,
  Panel,
  PanelBody,
  PanelHeader,
  ProjectStatusBadge,
  Table,
  TableWrap,
  TD,
  TH,
} from '@/components/admin/ui';
import { EstimateCreateForm } from '@/components/admin/EstimateCreateForm';
import { DocumentsPanel } from '@/components/admin/DocumentsPanel';
import { DeleteProjectButton } from '@/components/admin/DeleteProjectButton';
import { describeThrown, SetupNotice } from '@/components/admin/SetupNotice';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { projectId: string };
}): Promise<Metadata> {
  try {
    const project = await getProject(params.projectId);
    return { title: project ? project.name : 'Project' };
  } catch {
    return { title: 'Project' };
  }
}

export default async function ProjectDetailPage({ params }: { params: { projectId: string } }) {
  let project;
  let estimates;
  let documents;
  try {
    project = await getProject(params.projectId);
    if (!project) notFound();
    [estimates, documents] = await Promise.all([
      listProjectEstimates(project.id),
      listProjectDocuments(project.id),
    ]);
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error) throw error;
    return (
      <>
        <PageHeader title="Project" />
        <SetupNotice error={describeThrown(error, 'getProject')} />
      </>
    );
  }

  const conditions = [
    project.prevailing_wage && 'Prevailing wage',
    project.tax_exempt && 'Tax exempt',
    project.bond_required && 'Bond required',
    project.occupied_building && 'Occupied building',
    project.after_hours_work && 'After hours',
  ].filter(Boolean) as string[];

  const address = [
    project.address_line1,
    project.address_line2,
    [project.city, project.state].filter(Boolean).join(', '),
    project.postal_code,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: 'Projects', href: '/admin/projects' },
          { label: project.project_number },
        ]}
        title={project.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            <span className="font-mono text-xs text-steel-400">{project.project_number}</span>
            {project.customer_company && <span>· {project.customer_company}</span>}
          </span>
        }
        actions={
          <>
            <Link
              href={`/admin/projects/${project.id}/edit`}
              className="inline-flex h-9 items-center rounded border border-white/20 bg-white/5 px-3.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Edit project
            </Link>
            <DeleteProjectButton projectId={project.id} projectName={project.name} />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel>
            <PanelHeader
              title="Estimates & revisions"
              description="Every revision is kept. Superseded revisions stay exactly as they were submitted."
            />
            {estimates.length === 0 ? (
              <EmptyState
                title="No estimates yet"
                description="Create the first estimate below to start the takeoff."
              />
            ) : (
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <TH>Rev</TH>
                      <TH>Estimate</TH>
                      <TH>Status</TH>
                      <TH>Bid date</TH>
                      <TH align="right">Direct cost</TH>
                      <TH align="right">Sell price</TH>
                      <TH align="right">Margin</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {estimates.map((estimate) => (
                      <tr key={estimate.id} className="hover:bg-white/[0.02]">
                        <TD numeric className="font-mono text-xs">
                          {estimate.revision}
                        </TD>
                        <TD>
                          <Link
                            href={`/admin/estimates/${estimate.id}/overview`}
                            className="font-medium text-white hover:text-ember-300"
                          >
                            {estimate.estimate_number}
                          </Link>
                          {estimate.revision_label && (
                            <div className="text-[11px] text-steel-500">
                              {estimate.revision_label}
                            </div>
                          )}
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
            <PanelBody className="border-t border-white/10">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-steel-400">
                New estimate
              </p>
              <EstimateCreateForm
                projectId={project.id}
                defaultNumber={project.project_number}
                defaultEstimator={project.estimator}
              />
            </PanelBody>
          </Panel>

          <DocumentsPanel projectId={project.id} documents={documents} />
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Project details" />
            <PanelBody>
              <dl>
                <DetailRow label="Customer">{project.customer_company ?? '—'}</DetailRow>
                <DetailRow label="Contact">{project.customer_contact_name ?? '—'}</DetailRow>
                <DetailRow label="Email">
                  {project.customer_email ? (
                    <a
                      href={`mailto:${project.customer_email}`}
                      className="text-ember-300 hover:text-ember-200"
                    >
                      {project.customer_email}
                    </a>
                  ) : (
                    '—'
                  )}
                </DetailRow>
                <DetailRow label="Phone">{project.customer_phone ?? '—'}</DetailRow>
                <DetailRow label="Address">{address || '—'}</DetailRow>
                <DetailRow label="Type">
                  {project.project_type
                    ? (PROJECT_TYPE_LABELS[project.project_type as ProjectType] ??
                      project.project_type)
                    : '—'}
                </DetailRow>
                <DetailRow label="Square footage">
                  {project.square_footage ? integer(project.square_footage) : '—'}
                </DetailRow>
                <DetailRow label="Floors">{project.floors ?? '—'}</DetailRow>
                <DetailRow label="Estimator">{project.estimator ?? '—'}</DetailRow>
                <DetailRow label="Bid due">{formatDateTime(project.bid_due_at)}</DetailRow>
                <DetailRow label="Anticipated start">
                  {formatDate(project.anticipated_start_date)}
                </DetailRow>
                <DetailRow label="Anticipated completion">
                  {formatDate(project.anticipated_completion_date)}
                </DetailRow>
                <DetailRow label="Created">{formatDateTime(project.created_at)}</DetailRow>
                <DetailRow label="Last updated">{formatDateTime(project.updated_at)}</DetailRow>
              </dl>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Commercial conditions" />
            <PanelBody>
              {conditions.length === 0 ? (
                <p className="text-sm text-steel-400">No special conditions flagged.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {conditions.map((condition) => (
                    <Badge key={condition} tone="warning">
                      {condition}
                    </Badge>
                  ))}
                </div>
              )}
            </PanelBody>
          </Panel>

          {project.notes && (
            <Panel>
              <PanelHeader title="Notes" />
              <PanelBody>
                <p className="whitespace-pre-wrap text-sm text-steel-200">{project.notes}</p>
              </PanelBody>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
