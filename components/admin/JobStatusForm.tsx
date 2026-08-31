'use client';

import { ActionForm, FormError, SubmitButton } from './ActionForm';
import { Field, SelectInput } from './fields';
import { refreshJobBudgetAction, updateJobStatusAction } from '@/lib/estimating/actions/jobs';
import { JOB_STATUSES, JOB_STATUS_LABELS, type JobStatus } from '@/lib/estimating/constants';

export function JobStatusForm({ jobId, status }: { jobId: string; status: JobStatus }) {
  return (
    <ActionForm action={updateJobStatusAction} className="space-y-3">
      <input type="hidden" name="job_id" value={jobId} />
      <FormError />
      <Field label="Status" name="status">
        <SelectInput name="status" defaultValue={status}>
          {JOB_STATUSES.map((value) => (
            <option key={value} value={value}>
              {JOB_STATUS_LABELS[value]}
            </option>
          ))}
        </SelectInput>
      </Field>
      <SubmitButton size="sm" variant="outline" pendingLabel="Saving…">
        Update status
      </SubmitButton>
    </ActionForm>
  );
}

export function RefreshBudgetForm({ jobId }: { jobId: string }) {
  return (
    <ActionForm action={refreshJobBudgetAction} className="space-y-2">
      <input type="hidden" name="job_id" value={jobId} />
      <FormError />
      <p className="text-xs text-steel-400">
        Takes a new snapshot from the source estimate and stores it as the next budget version.
        Existing versions are never edited.
      </p>
      <SubmitButton size="sm" variant="outline" pendingLabel="Snapshotting…">
        Re-snapshot budget
      </SubmitButton>
    </ActionForm>
  );
}
