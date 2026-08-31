'use client';

import { ActionForm, FormError, SubmitButton } from './ActionForm';
import { CheckboxField, Field, SelectInput } from './fields';
import { ESTIMATE_STATUSES, ESTIMATE_STATUS_LABELS } from '@/lib/estimating/constants';
import { updateEstimateStatusAction } from '@/lib/estimating/actions/estimates';
import type { EstimateStatus } from '@/lib/estimating/constants';

export function EstimateStatusForm({
  estimateId,
  status,
  criticalUnresolved,
}: {
  estimateId: string;
  status: EstimateStatus;
  criticalUnresolved: number;
}) {
  return (
    <ActionForm action={updateEstimateStatusAction} className="space-y-3">
      <input type="hidden" name="estimate_id" value={estimateId} />
      <FormError />
      <Field label="Status" name="status">
        <SelectInput name="status" defaultValue={status}>
          {ESTIMATE_STATUSES.filter((value) => value !== 'superseded').map((value) => (
            <option key={value} value={value}>
              {ESTIMATE_STATUS_LABELS[value]}
            </option>
          ))}
        </SelectInput>
      </Field>
      {criticalUnresolved > 0 && (
        <CheckboxField
          name="acknowledge_unresolved"
          label={`Proceed with ${criticalUnresolved} unresolved critical review item${
            criticalUnresolved === 1 ? '' : 's'
          }`}
          hint="Drafts always save. This only applies when advancing the status."
        />
      )}
      <SubmitButton size="sm" variant="outline" pendingLabel="Saving…">
        Update status
      </SubmitButton>
    </ActionForm>
  );
}
