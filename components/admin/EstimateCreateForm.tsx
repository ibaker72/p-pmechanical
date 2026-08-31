'use client';

import { ActionForm, FormError, SubmitButton } from './ActionForm';
import { Field, FieldGrid, TextInput } from './fields';
import { createEstimateAction } from '@/lib/estimating/actions/estimates';

/**
 * Creating an estimate is deliberately a one-click affair: everything here has
 * a sensible default, and the revision number is assigned by the server.
 */
export function EstimateCreateForm({
  projectId,
  defaultNumber,
  defaultEstimator,
}: {
  projectId: string;
  defaultNumber: string;
  defaultEstimator: string | null;
}) {
  return (
    <ActionForm
      action={createEstimateAction}
      className="space-y-3"
      redirectTo={(data) => `/admin/estimates/${data.id}/overview`}
    >
      <input type="hidden" name="project_id" value={projectId} />
      <FormError />
      <FieldGrid columns={4}>
        <Field label="Estimate number" name="estimate_number">
          <TextInput name="estimate_number" defaultValue={defaultNumber} />
        </Field>
        <Field label="Revision label" name="revision_label" hint="e.g. Addendum 1">
          <TextInput name="revision_label" placeholder="Base bid" />
        </Field>
        <Field label="Estimator" name="estimator">
          <TextInput name="estimator" defaultValue={defaultEstimator ?? ''} />
        </Field>
        <Field label="Bid date" name="bid_date">
          <TextInput name="bid_date" type="date" />
        </Field>
      </FieldGrid>
      <SubmitButton pendingLabel="Creating…">Create estimate</SubmitButton>
    </ActionForm>
  );
}
