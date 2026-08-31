'use client';

import { ActionForm, FormError, SubmitButton } from './ActionForm';
import { Field, FieldGrid, TextArea, TextInput } from './fields';
import { convertEstimateToJobAction } from '@/lib/estimating/actions/jobs';

export function ConvertToJobForm({
  estimateId,
  suggestedNumber,
  projectName,
}: {
  estimateId: string;
  suggestedNumber: string;
  projectName: string;
}) {
  return (
    <ActionForm
      action={convertEstimateToJobAction}
      className="space-y-3"
      redirectTo={(data) => `/admin/jobs/${data.id}`}
    >
      <input type="hidden" name="estimate_id" value={estimateId} />
      <FormError />
      <p className="text-xs text-steel-400">
        Creates a job with a budget snapshot taken from this estimate. The snapshot is fixed at the
        moment of conversion — later estimate edits never move it.
      </p>
      <FieldGrid columns={2}>
        <Field label="Job number" name="job_number" hint="Blank uses the next in sequence.">
          <TextInput name="job_number" placeholder={suggestedNumber} />
        </Field>
        <Field label="Job name" name="name">
          <TextInput name="name" defaultValue={projectName} />
        </Field>
        <Field label="Start date" name="start_date">
          <TextInput name="start_date" type="date" />
        </Field>
        <Field label="Notes" name="notes">
          <TextArea name="notes" rows={2} />
        </Field>
      </FieldGrid>
      <SubmitButton size="sm" pendingLabel="Converting…">
        Convert to job
      </SubmitButton>
    </ActionForm>
  );
}
