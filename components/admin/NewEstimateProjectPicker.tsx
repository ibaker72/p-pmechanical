'use client';

import { useState } from 'react';
import { ActionForm, FormError, SubmitButton } from './ActionForm';
import { Field, FieldGrid, SelectInput, TextArea, TextInput } from './fields';
import { createEstimateAction } from '@/lib/estimating/actions/estimates';

export type ProjectOption = {
  id: string;
  name: string;
  number: string;
  customer: string | null;
  estimator: string | null;
};

export function NewEstimateProjectPicker({
  projects,
  defaultProjectId,
}: {
  projects: ProjectOption[];
  defaultProjectId?: string;
}) {
  const [projectId, setProjectId] = useState(
    defaultProjectId && projects.some((p) => p.id === defaultProjectId)
      ? defaultProjectId
      : (projects[0]?.id ?? ''),
  );
  const selected = projects.find((project) => project.id === projectId);

  return (
    <ActionForm
      action={createEstimateAction}
      className="space-y-4"
      redirectTo={(data) => `/admin/estimates/${data.id}/overview`}
    >
      <FormError />
      <FieldGrid columns={2}>
        <Field label="Project" name="project_id" required>
          <SelectInput
            name="project_id"
            required
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.number} — {project.name}
                {project.customer ? ` (${project.customer})` : ''}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Estimate number" name="estimate_number" hint="Blank uses the project number.">
          {/* Keyed so switching projects refreshes the suggested number. */}
          <TextInput key={projectId} name="estimate_number" defaultValue={selected?.number ?? ''} />
        </Field>
      </FieldGrid>

      <FieldGrid columns={3}>
        <Field label="Revision label" name="revision_label">
          <TextInput name="revision_label" placeholder="Base bid" />
        </Field>
        <Field label="Estimator" name="estimator">
          <TextInput key={projectId} name="estimator" defaultValue={selected?.estimator ?? ''} />
        </Field>
        <Field label="Bid date" name="bid_date">
          <TextInput name="bid_date" type="date" />
        </Field>
      </FieldGrid>

      <Field label="Internal notes" name="internal_notes">
        <TextArea name="internal_notes" rows={3} />
      </Field>

      <SubmitButton pendingLabel="Creating…">Create estimate</SubmitButton>
    </ActionForm>
  );
}
