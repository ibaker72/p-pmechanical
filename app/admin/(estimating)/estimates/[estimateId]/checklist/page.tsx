import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadEstimateWorkspace } from '@/lib/estimating/page-data';
import { listChecklistItems } from '@/lib/estimating/queries';
import { Callout, StatTile } from '@/components/admin/ui';
import { ChecklistPanel } from '@/components/admin/ChecklistPanel';

export const metadata: Metadata = { title: 'Bid review' };
export const dynamic = 'force-dynamic';

export default async function EstimateChecklistPage({
  params,
}: {
  params: { estimateId: string };
}) {
  const workspace = await loadEstimateWorkspace(params.estimateId);
  if (!workspace) notFound();

  const items = await listChecklistItems(workspace.estimate.id);
  const answered = items.filter((item) => item.answer !== 'needs_review').length;
  const noAnswers = items.filter((item) => item.answer === 'no').length;
  const { unresolved, locked } = workspace;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Reviewed" value={`${answered} / ${items.length}`} />
        <StatTile
          label="Unresolved"
          value={unresolved.total}
          tone={unresolved.total > 0 ? 'warning' : 'positive'}
          emphasis
        />
        <StatTile
          label="Critical unresolved"
          value={unresolved.critical}
          tone={unresolved.critical > 0 ? 'danger' : 'positive'}
        />
        <StatTile
          label="Answered “No”"
          value={noAnswers}
          hint="Confirm these are documented as exclusions"
        />
      </div>

      {noAnswers > 0 && (
        <Callout tone="info" title="Items answered “No” belong in the exclusions">
          Anything the bid does not cover should appear as an exclusion on the Scope tab so it
          reaches the proposal.
        </Callout>
      )}

      <ChecklistPanel estimateId={workspace.estimate.id} items={items} locked={locked} />
    </div>
  );
}
