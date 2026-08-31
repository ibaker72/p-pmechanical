'use client';

import { ActionForm, ConfirmSubmitButton, FormError, SubmitButton } from './ActionForm';
import {
  CheckboxField,
  Field,
  FieldGrid,
  NumberInput,
  SelectInput,
  TextArea,
  TextInput,
} from './fields';
import { EmptyState, Panel, PanelBody, PanelHeader, Badge } from './ui';
import { money } from '@/lib/estimating/format';
import {
  createScopeItemAction,
  deleteScopeItemAction,
  reorderScopeItemAction,
} from '@/lib/estimating/actions/scope';
import type { ScopeDisposition } from '@/lib/estimating/constants';
import type { EstimateScopeItem, ScopeCategory } from '@/lib/estimating/types';

/**
 * One narrative section of the estimate (inclusions, exclusions, clarifications,
 * assumptions, alternates, allowances).
 *
 * Order is controlled with explicit up/down buttons rather than drag and drop:
 * it works without pointer precision, survives without JavaScript, and the
 * proposal reads in exactly this order.
 */
export function ScopeSection({
  estimateId,
  disposition,
  title,
  description,
  items,
  scopeCategories,
  locked,
  showAmount,
  amountLabel,
  amountHint,
}: {
  estimateId: string;
  disposition: ScopeDisposition;
  title: string;
  description: string;
  items: EstimateScopeItem[];
  scopeCategories: ScopeCategory[];
  locked: boolean;
  showAmount?: boolean;
  amountLabel?: string;
  amountHint?: string;
}) {
  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <Panel>
      <PanelHeader
        title={title}
        description={description}
        actions={<Badge tone="muted">{sorted.length}</Badge>}
      />

      {sorted.length === 0 ? (
        <EmptyState title={`No ${title.toLowerCase()} yet`} />
      ) : (
        <ul className="divide-y divide-white/5">
          {sorted.map((item, index) => (
            <li key={item.id} className="px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-steel-100">
                    <span className="tabular-nums text-steel-500">{index + 1}.</span>
                    {item.title}
                    {item.is_uncertain && <Badge tone="warning">Uncertain</Badge>}
                    {item.scope_name && <Badge tone="muted">{item.scope_name}</Badge>}
                    {showAmount && item.amount != null && (
                      <span className="tabular-nums text-ember-300">{money(item.amount)}</span>
                    )}
                  </p>
                  {item.customer_text && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-steel-300">
                      {item.customer_text}
                    </p>
                  )}
                  {item.internal_notes && (
                    <p className="mt-1 whitespace-pre-wrap text-[11px] text-steel-500">
                      Internal: {item.internal_notes}
                    </p>
                  )}
                </div>

                {!locked && (
                  <div className="flex shrink-0 items-center gap-1">
                    <ActionForm action={reorderScopeItemAction} className="inline">
                      <input type="hidden" name="scope_item_id" value={item.id} />
                      <input type="hidden" name="direction" value="up" />
                      <SubmitButton variant="ghost" size="sm" title="Move up">
                        ↑
                      </SubmitButton>
                    </ActionForm>
                    <ActionForm action={reorderScopeItemAction} className="inline">
                      <input type="hidden" name="scope_item_id" value={item.id} />
                      <input type="hidden" name="direction" value="down" />
                      <SubmitButton variant="ghost" size="sm" title="Move down">
                        ↓
                      </SubmitButton>
                    </ActionForm>
                    <ActionForm action={deleteScopeItemAction} className="inline">
                      <input type="hidden" name="scope_item_id" value={item.id} />
                      <ConfirmSubmitButton
                        variant="ghost"
                        confirm={`Delete "${item.title}"?`}
                        title="Delete"
                      >
                        Del
                      </ConfirmSubmitButton>
                    </ActionForm>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!locked && (
        <PanelBody className="border-t border-white/10">
          <ActionForm action={createScopeItemAction} className="space-y-3" resetOnSuccess>
            <input type="hidden" name="estimate_id" value={estimateId} />
            <input type="hidden" name="disposition" value={disposition} />
            {!showAmount && <input type="hidden" name="amount" value="" />}
            <FormError />
            <FieldGrid columns={showAmount ? 4 : 3}>
              <Field
                label="Title"
                name="title"
                required
                className={showAmount ? 'sm:col-span-2' : 'sm:col-span-2'}
              >
                <TextInput name="title" required placeholder="Short line the customer will read" />
              </Field>
              <Field label="Scope category" name="scope_category_id">
                <SelectInput name="scope_category_id" defaultValue="">
                  <option value="">None</option>
                  {scopeCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              {showAmount && (
                <Field label={amountLabel ?? 'Amount'} name="amount" hint={amountHint}>
                  <NumberInput name="amount" step="0.01" />
                </Field>
              )}
            </FieldGrid>
            <FieldGrid columns={2}>
              <Field label="Customer-facing detail" name="customer_text">
                <TextArea name="customer_text" rows={2} />
              </Field>
              <Field label="Internal notes" name="internal_notes">
                <TextArea name="internal_notes" rows={2} />
              </Field>
            </FieldGrid>
            <div className="flex items-center justify-between gap-3">
              <CheckboxField
                name="is_uncertain"
                label="Flag as uncertain"
                hint="Marks it for review before the bid goes out."
              />
              <SubmitButton size="sm" pendingLabel="Adding…">
                Add
              </SubmitButton>
            </div>
          </ActionForm>
        </PanelBody>
      )}
    </Panel>
  );
}
