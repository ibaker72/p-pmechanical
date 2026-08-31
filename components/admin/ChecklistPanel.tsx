'use client';

import { ActionForm, FormError, SubmitButton } from './ActionForm';
import { SelectInput, TextInput } from './fields';
import { Badge, Panel, PanelBody, PanelHeader } from './ui';
import { CHECKLIST_ANSWERS, CHECKLIST_ANSWER_LABELS } from '@/lib/estimating/constants';
import {
  resolveRemainingChecklistAction,
  updateChecklistItemAction,
} from '@/lib/estimating/actions/scope';
import type { ChecklistItem } from '@/lib/estimating/types';

function answerTone(answer: ChecklistItem['answer']) {
  if (answer === 'yes') return 'positive' as const;
  if (answer === 'no') return 'danger' as const;
  if (answer === 'na') return 'muted' as const;
  return 'warning' as const;
}

export function ChecklistPanel({
  estimateId,
  items,
  locked,
}: {
  estimateId: string;
  items: ChecklistItem[];
  locked: boolean;
}) {
  const categories = new Map<string, ChecklistItem[]>();
  for (const item of items) {
    const key = item.category ?? 'Other';
    const list = categories.get(key);
    if (list) list.push(item);
    else categories.set(key, [item]);
  }

  const unresolvedNonCritical = items.filter(
    (item) => item.answer === 'needs_review' && !item.is_critical,
  ).length;

  return (
    <div className="space-y-6">
      {!locked && unresolvedNonCritical > 0 && (
        <ActionForm action={resolveRemainingChecklistAction}>
          <input type="hidden" name="estimate_id" value={estimateId} />
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-ink-900/60 px-4 py-3">
            <p className="flex-1 text-sm text-steel-300">
              {unresolvedNonCritical} non-critical item{unresolvedNonCritical === 1 ? '' : 's'}{' '}
              still need review. Critical items are never cleared in bulk — answer those
              deliberately.
            </p>
            <SubmitButton size="sm" variant="outline" pendingLabel="Marking…">
              Mark non-critical items N/A
            </SubmitButton>
          </div>
          <FormError className="mt-2" />
        </ActionForm>
      )}

      {[...categories.entries()].map(([category, categoryItems]) => (
        <Panel key={category}>
          <PanelHeader
            title={category}
            actions={
              <Badge tone="muted">
                {categoryItems.filter((item) => item.answer !== 'needs_review').length}/
                {categoryItems.length}
              </Badge>
            }
          />
          <ul className="divide-y divide-white/5">
            {categoryItems.map((item) => (
              <li key={item.id} className="px-4 py-2.5">
                {locked ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex-1 text-sm text-steel-100">
                      {item.prompt}
                      {item.is_critical && (
                        <Badge tone="warning" className="ml-2">
                          Critical
                        </Badge>
                      )}
                    </span>
                    <Badge tone={answerTone(item.answer)}>
                      {CHECKLIST_ANSWER_LABELS[item.answer]}
                    </Badge>
                    {item.note && <span className="text-xs text-steel-500">{item.note}</span>}
                  </div>
                ) : (
                  <ActionForm
                    action={updateChecklistItemAction}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="checklist_item_id" value={item.id} />
                    <span className="min-w-[220px] flex-1 text-sm text-steel-100">
                      {item.prompt}
                      {item.is_critical && (
                        <Badge tone="warning" className="ml-2">
                          Critical
                        </Badge>
                      )}
                    </span>
                    <div className="w-36">
                      <label className="sr-only" htmlFor={`answer-${item.id}`}>
                        Answer for {item.prompt}
                      </label>
                      <SelectInput
                        id={`answer-${item.id}`}
                        name="answer"
                        defaultValue={item.answer}
                        className="h-8 py-1"
                      >
                        {CHECKLIST_ANSWERS.map((answer) => (
                          <option key={answer} value={answer}>
                            {CHECKLIST_ANSWER_LABELS[answer]}
                          </option>
                        ))}
                      </SelectInput>
                    </div>
                    <div className="min-w-[180px] flex-1">
                      <label className="sr-only" htmlFor={`note-${item.id}`}>
                        Note for {item.prompt}
                      </label>
                      <TextInput
                        id={`note-${item.id}`}
                        name="note"
                        defaultValue={item.note ?? ''}
                        placeholder="Note"
                        className="h-8 py-1"
                      />
                    </div>
                    <SubmitButton size="sm" variant="outline">
                      Save
                    </SubmitButton>
                    <FormError className="basis-full" />
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      ))}

      {items.length === 0 && (
        <Panel>
          <PanelBody>
            <p className="text-sm text-steel-400">
              No checklist items on this estimate. New estimates are seeded with the standard bid
              review checklist.
            </p>
          </PanelBody>
        </Panel>
      )}
    </div>
  );
}
