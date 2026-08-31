'use client';

import { ActionForm, FormError, SubmitButton } from './ActionForm';
import { CheckboxField, Field, TextInput } from './fields';
import { createRevisionAction } from '@/lib/estimating/actions/estimates';

export function CreateRevisionForm({ estimateId }: { estimateId: string }) {
  return (
    <ActionForm
      action={createRevisionAction}
      className="space-y-3"
      redirectTo={(data) => `/admin/estimates/${data.id}/overview`}
    >
      <input type="hidden" name="estimate_id" value={estimateId} />
      <FormError />
      <p className="text-xs text-steel-400">
        Copies every takeoff line, scope item, checklist answer and labor condition — with their
        snapshotted prices — into a new revision. This revision is left exactly as it is.
      </p>
      <Field label="Revision label" name="revision_label" hint="e.g. Addendum 2, GC revision">
        <TextInput name="revision_label" placeholder="Addendum 1" />
      </Field>
      <CheckboxField
        name="supersede_source"
        label="Mark this revision superseded"
        defaultChecked
        hint="Superseded revisions become read-only but are never deleted."
      />
      <SubmitButton size="sm" variant="outline" pendingLabel="Creating…">
        Create revision
      </SubmitButton>
    </ActionForm>
  );
}
