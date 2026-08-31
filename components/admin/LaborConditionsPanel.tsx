'use client';

import { ActionForm, ConfirmSubmitButton, FormError, SubmitButton } from './ActionForm';
import { Field, FieldGrid, NumberInput, SelectInput, TextInput } from './fields';
import { EmptyState, Panel, PanelBody, PanelHeader } from './ui';
import {
  addLaborConditionAction,
  removeLaborConditionAction,
  updateLaborConditionAction,
} from '@/lib/estimating/actions/scope';
import type { EstimateLaborCondition, LaborModifier } from '@/lib/estimating/types';

/**
 * Estimate-wide productivity conditions.
 *
 * The factor is snapshotted onto the estimate when a condition is added, and is
 * editable here per bid. Changing the master modifier in /admin/labor-modifiers
 * never reprices an estimate that already carries it.
 */
export function LaborConditionsPanel({
  estimateId,
  conditions,
  modifiers,
  locked,
}: {
  estimateId: string;
  conditions: EstimateLaborCondition[];
  modifiers: LaborModifier[];
  locked: boolean;
}) {
  const available = modifiers.filter(
    (modifier) => !conditions.some((condition) => condition.code === modifier.code),
  );

  return (
    <Panel>
      <PanelHeader
        title="Labor productivity conditions"
        description="Multiplied together and applied to every line that opts in."
      />

      {conditions.length === 0 ? (
        <EmptyState
          title="Normal conditions"
          description="No productivity adjustments applied. Base labor hours are used as estimated."
        />
      ) : (
        <ul className="divide-y divide-white/5">
          {conditions.map((condition) => (
            <li key={condition.id} className="flex flex-wrap items-end gap-2 px-4 py-2.5">
              <span className="min-w-[160px] flex-1 self-center font-medium text-steel-100">
                {condition.name}
                {locked && (
                  <span className="ml-2 tabular-nums text-steel-400">
                    x{Number(condition.factor).toFixed(4)}
                  </span>
                )}
                {locked && condition.note && (
                  <span className="block text-[11px] text-steel-500">{condition.note}</span>
                )}
              </span>

              {!locked && (
                <>
                  <ActionForm
                    action={updateLaborConditionAction}
                    className="flex flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="condition_id" value={condition.id} />
                    <div className="w-24">
                      <label className="sr-only" htmlFor={`factor-${condition.id}`}>
                        Factor for {condition.name}
                      </label>
                      <NumberInput
                        id={`factor-${condition.id}`}
                        name="factor"
                        step="0.01"
                        min="0.01"
                        max="10"
                        defaultValue={condition.factor}
                        className="h-8 py-1"
                      />
                    </div>
                    <div className="w-48">
                      <label className="sr-only" htmlFor={`note-${condition.id}`}>
                        Note for {condition.name}
                      </label>
                      <TextInput
                        id={`note-${condition.id}`}
                        name="note"
                        defaultValue={condition.note ?? ''}
                        placeholder="Why this factor"
                        className="h-8 py-1"
                      />
                    </div>
                    <SubmitButton size="sm" variant="outline">
                      Save
                    </SubmitButton>
                    <FormError className="basis-full" />
                  </ActionForm>

                  <ActionForm action={removeLaborConditionAction}>
                    <input type="hidden" name="condition_id" value={condition.id} />
                    <ConfirmSubmitButton
                      confirm={`Remove "${condition.name}" from this estimate?`}
                      variant="ghost"
                    >
                      Remove
                    </ConfirmSubmitButton>
                    <FormError className="mt-1" />
                  </ActionForm>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {!locked && (
        <PanelBody className="border-t border-white/10">
          {available.length === 0 ? (
            <p className="text-sm text-steel-400">
              Every active labor modifier is already applied to this estimate.
            </p>
          ) : (
            <ActionForm action={addLaborConditionAction} className="space-y-3">
              <input type="hidden" name="estimate_id" value={estimateId} />
              <FormError />
              <FieldGrid columns={3}>
                <Field label="Condition" name="labor_modifier_id" required>
                  <SelectInput name="labor_modifier_id" required defaultValue="">
                    <option value="" disabled>
                      Choose a condition…
                    </option>
                    {available.map((modifier) => (
                      <option key={modifier.id} value={modifier.id}>
                        {modifier.name} (x{Number(modifier.factor).toFixed(2)})
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field
                  label="Factor for this bid"
                  name="factor"
                  hint="1.00 = normal. 1.15 = 15% more hours."
                >
                  <NumberInput name="factor" step="0.01" min="0.01" max="10" defaultValue={1} />
                </Field>
                <Field label="Note" name="note">
                  <TextInput name="note" placeholder="Optional" />
                </Field>
              </FieldGrid>
              <SubmitButton size="sm" pendingLabel="Adding…">
                Apply condition
              </SubmitButton>
            </ActionForm>
          )}
        </PanelBody>
      )}
    </Panel>
  );
}
