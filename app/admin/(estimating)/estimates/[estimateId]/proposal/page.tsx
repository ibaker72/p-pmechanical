import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadEstimateWorkspace, loadScopeItems } from '@/lib/estimating/page-data';
import { toMoneyNumber } from '@/lib/estimating/decimal';
import { formatDate, money } from '@/lib/estimating/format';
import { BUSINESS } from '@/lib/constants';
import { Callout } from '@/components/admin/ui';
import { PrintButton } from '@/components/admin/PrintButton';
import type { EstimateScopeItem } from '@/lib/estimating/types';

export const metadata: Metadata = { title: 'Proposal' };
export const dynamic = 'force-dynamic';

/**
 * Customer-facing proposal.
 *
 * WHAT IS DELIBERATELY ABSENT: cost, labor hours, labor rates, waste factors,
 * vendor pricing, markup, margin, profit, contingency, overhead, internal notes
 * and every takeoff line. The ONLY figure that crosses to the customer is the
 * total proposed amount (plus alternate and allowance amounts the estimator
 * explicitly entered for the proposal). Nothing on this page reads a cost
 * field, so an internal number cannot leak by accident.
 */
function Section({
  title,
  items,
  emptyHidden = true,
  showAmount,
  numbered,
}: {
  title: string;
  items: EstimateScopeItem[];
  emptyHidden?: boolean;
  showAmount?: boolean;
  numbered?: boolean;
}) {
  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
  if (sorted.length === 0 && emptyHidden) return null;

  const ListTag = numbered ? 'ol' : 'ul';
  return (
    <section className="proposal-break-avoid mt-8">
      <h2 className="border-b border-gray-300 pb-1 text-sm font-bold uppercase tracking-[0.12em] text-gray-900">
        {title}
      </h2>
      <ListTag
        className={`mt-3 space-y-2 ${numbered ? 'list-decimal pl-5' : 'list-disc pl-5'} text-[13px] leading-relaxed text-gray-800`}
      >
        {sorted.map((item) => (
          <li key={item.id}>
            <span className="font-semibold">{item.title}</span>
            {showAmount && item.amount != null && (
              <span className="ml-2 font-semibold tabular-nums">{money(item.amount)}</span>
            )}
            {item.customer_text && (
              <span className="block whitespace-pre-wrap text-gray-700">{item.customer_text}</span>
            )}
          </li>
        ))}
      </ListTag>
    </section>
  );
}

export default async function ProposalPage({ params }: { params: { estimateId: string } }) {
  const workspace = await loadEstimateWorkspace(params.estimateId);
  if (!workspace) notFound();

  const { estimate, totals } = workspace;
  const project = estimate.project;
  const scopeItems = await loadScopeItems(estimate.id);
  const bucket = (disposition: string) =>
    scopeItems.filter((item) => item.disposition === disposition);

  const address = [
    project.address_line1,
    project.address_line2,
    [project.city, project.state, project.postal_code].filter(Boolean).join(' '),
  ].filter(Boolean);

  const proposalNumber = `${estimate.estimate_number}${estimate.revision > 1 ? `-R${estimate.revision}` : ''}`;
  const sellPrice = toMoneyNumber(totals.sellPrice);

  return (
    <>
      <div className="print-hidden mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl text-white">Customer proposal</h1>
          <p className="text-sm text-steel-400">
            Print or save as PDF to send. Internal costs, rates, markup and margin never appear on
            this page.
          </p>
        </div>
        <PrintButton />
      </div>

      {sellPrice <= 0 && (
        <div className="print-hidden mb-4">
          <Callout tone="warning" title="This proposal has no price yet">
            The bid price is {money(sellPrice)}. Add takeoff lines and set the pricing before
            sending it.
          </Callout>
        </div>
      )}

      <article className="proposal-sheet mx-auto max-w-[8.5in] rounded-lg border border-white/10 p-8 shadow-lg sm:p-10">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-gray-900 pb-5">
          <div>
            <p className="font-display text-2xl font-bold tracking-tight text-gray-900">
              {BUSINESS.legalName}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              {BUSINESS.address.city}, {BUSINESS.address.region} {BUSINESS.address.postalCode}
              <br />
              {BUSINESS.phone} · {BUSINESS.email}
              <br />
              {BUSINESS.license}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold uppercase tracking-[0.15em] text-gray-900">Proposal</p>
            <dl className="mt-2 space-y-0.5 text-xs text-gray-700">
              <div className="flex justify-end gap-2">
                <dt className="text-gray-500">Proposal no.</dt>
                <dd className="font-semibold tabular-nums">{proposalNumber}</dd>
              </div>
              <div className="flex justify-end gap-2">
                <dt className="text-gray-500">Date</dt>
                <dd className="tabular-nums">
                  {formatDate(estimate.bid_date ?? new Date().toISOString().slice(0, 10))}
                </dd>
              </div>
              {estimate.expiration_date && (
                <div className="flex justify-end gap-2">
                  <dt className="text-gray-500">Valid until</dt>
                  <dd className="tabular-nums">{formatDate(estimate.expiration_date)}</dd>
                </div>
              )}
              {project.project_number && (
                <div className="flex justify-end gap-2">
                  <dt className="text-gray-500">Project no.</dt>
                  <dd className="tabular-nums">{project.project_number}</dd>
                </div>
              )}
            </dl>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">
              Submitted to
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {project.customer_company ?? '—'}
            </p>
            {project.customer_contact_name && (
              <p className="text-sm text-gray-700">{project.customer_contact_name}</p>
            )}
            {project.customer_email && (
              <p className="text-sm text-gray-700">{project.customer_email}</p>
            )}
            {project.customer_phone && (
              <p className="text-sm text-gray-700">{project.customer_phone}</p>
            )}
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">
              Project
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900">{project.name}</p>
            {address.map((line) => (
              <p key={line} className="text-sm text-gray-700">
                {line}
              </p>
            ))}
          </div>
        </div>

        {estimate.customer_notes && (
          <section className="proposal-break-avoid mt-8">
            <h2 className="border-b border-gray-300 pb-1 text-sm font-bold uppercase tracking-[0.12em] text-gray-900">
              Project scope
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-gray-800">
              {estimate.customer_notes}
            </p>
          </section>
        )}

        <Section title="Included in this proposal" items={bucket('included')} numbered />
        <Section title="Allowances" items={bucket('allowance')} showAmount />
        <Section title="Clarifications" items={bucket('clarification')} />
        <Section title="Assumptions" items={bucket('assumption')} />
        <Section title="Exclusions" items={bucket('excluded')} />
        <Section title="Alternates" items={bucket('alternate')} showAmount />

        <section className="proposal-break-avoid mt-8 border-t-2 border-gray-900 pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <p className="text-sm font-bold uppercase tracking-[0.12em] text-gray-900">
              Total proposed amount
            </p>
            <p className="font-display text-3xl font-bold tabular-nums text-gray-900">
              {money(sellPrice)}
            </p>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-600">
            This proposal covers the scope described above. Work not listed under “Included” is
            excluded. Alternates are priced separately and are not part of the total proposed
            amount.
            {estimate.expiration_date
              ? ` This proposal is valid through ${formatDate(estimate.expiration_date)}.`
              : ' Pricing is subject to change if not accepted within 30 days.'}
          </p>
        </section>

        <section className="proposal-break-avoid mt-10 border-t border-gray-300 pt-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">
            Acceptance
          </p>
          <p className="mt-2 text-[12px] text-gray-700">
            Signing below authorizes {BUSINESS.legalName} to proceed with the scope and amount set
            out in this proposal.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div>
              <div className="h-8 border-b border-gray-400" />
              <p className="mt-1 text-[11px] text-gray-500">Authorized signature</p>
            </div>
            <div>
              <div className="h-8 border-b border-gray-400" />
              <p className="mt-1 text-[11px] text-gray-500">Date</p>
            </div>
            <div>
              <div className="h-8 border-b border-gray-400" />
              <p className="mt-1 text-[11px] text-gray-500">Printed name</p>
            </div>
            <div>
              <div className="h-8 border-b border-gray-400" />
              <p className="mt-1 text-[11px] text-gray-500">Title</p>
            </div>
          </div>
        </section>

        <footer className="mt-8 border-t border-gray-200 pt-3 text-center text-[10px] text-gray-500">
          {BUSINESS.legalName} · {BUSINESS.phone} · {BUSINESS.url.replace('https://', '')}
        </footer>
      </article>
    </>
  );
}
