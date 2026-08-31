'use client';

import Link from 'next/link';
import { ActionForm, FormError, FormSuccess, SubmitButton } from './ActionForm';
import {
  CheckboxField,
  Field,
  FieldGrid,
  Fieldset,
  NumberInput,
  SelectInput,
  TextArea,
  TextInput,
} from './fields';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
  PROJECT_TYPE_LABELS,
  PROJECT_TYPES,
} from '@/lib/estimating/constants';
import type { ActionResult, Project } from '@/lib/estimating/types';

type ProjectFormProps = {
  action: (
    prev: ActionResult<{ id: string }> | null,
    formData: FormData,
  ) => Promise<ActionResult<{ id: string }>>;
  project?: Project;
  suggestedNumber?: string;
  submitLabel: string;
};

/** Convert a timestamptz to the value a datetime-local input expects. */
function toLocalDateTimeValue(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ProjectForm({ action, project, suggestedNumber, submitLabel }: ProjectFormProps) {
  const isEdit = !!project;

  return (
    <ActionForm
      action={action}
      className="space-y-6"
      redirectTo={isEdit ? undefined : (data) => `/admin/projects/${data.id}`}
    >
      {project && <input type="hidden" name="project_id" value={project.id} />}
      <FormError />
      {isEdit && <FormSuccess message="Project saved." />}

      <Fieldset legend="Project">
        <FieldGrid columns={3}>
          <Field label="Project name" name="name" required className="sm:col-span-2">
            <TextInput
              name="name"
              defaultValue={project?.name ?? ''}
              required
              autoFocus={!isEdit}
            />
          </Field>
          <Field
            label="Project number"
            name="project_number"
            hint={isEdit ? undefined : 'Leave blank to use the next number in sequence.'}
          >
            <TextInput
              name="project_number"
              defaultValue={project?.project_number ?? ''}
              placeholder={suggestedNumber}
            />
          </Field>
          <Field label="Project type" name="project_type">
            <SelectInput name="project_type" defaultValue={project?.project_type ?? ''}>
              <option value="">—</option>
              {PROJECT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {PROJECT_TYPE_LABELS[type]}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Status" name="status">
            <SelectInput name="status" defaultValue={project?.status ?? 'draft'}>
              {PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PROJECT_STATUS_LABELS[status]}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Estimator" name="estimator">
            <TextInput name="estimator" defaultValue={project?.estimator ?? ''} />
          </Field>
        </FieldGrid>
      </Fieldset>

      <Fieldset legend="Customer / general contractor">
        <FieldGrid columns={4}>
          <Field label="Company" name="customer_company" className="sm:col-span-2">
            <TextInput name="customer_company" defaultValue={project?.customer_company ?? ''} />
          </Field>
          <Field label="Contact name" name="customer_contact_name">
            <TextInput
              name="customer_contact_name"
              defaultValue={project?.customer_contact_name ?? ''}
            />
          </Field>
          <Field label="Email" name="customer_email">
            <TextInput
              name="customer_email"
              type="email"
              defaultValue={project?.customer_email ?? ''}
            />
          </Field>
          <Field label="Phone" name="customer_phone">
            <TextInput name="customer_phone" defaultValue={project?.customer_phone ?? ''} />
          </Field>
        </FieldGrid>
      </Fieldset>

      <Fieldset legend="Site">
        <FieldGrid columns={4}>
          <Field label="Address" name="address_line1" className="sm:col-span-2">
            <TextInput name="address_line1" defaultValue={project?.address_line1 ?? ''} />
          </Field>
          <Field label="Suite / unit" name="address_line2">
            <TextInput name="address_line2" defaultValue={project?.address_line2 ?? ''} />
          </Field>
          <Field label="City" name="city">
            <TextInput name="city" defaultValue={project?.city ?? ''} />
          </Field>
          <Field label="State" name="state">
            <TextInput name="state" maxLength={2} defaultValue={project?.state ?? ''} />
          </Field>
          <Field label="ZIP" name="postal_code">
            <TextInput name="postal_code" defaultValue={project?.postal_code ?? ''} />
          </Field>
          <Field label="Square footage" name="square_footage">
            <NumberInput
              name="square_footage"
              min={0}
              step={1}
              defaultValue={project?.square_footage ?? ''}
            />
          </Field>
          <Field label="Floors" name="floors">
            <NumberInput name="floors" min={0} step={1} defaultValue={project?.floors ?? ''} />
          </Field>
        </FieldGrid>
      </Fieldset>

      <Fieldset legend="Schedule">
        <FieldGrid columns={3}>
          <Field label="Bid due" name="bid_due_at">
            <TextInput
              name="bid_due_at"
              type="datetime-local"
              defaultValue={toLocalDateTimeValue(project?.bid_due_at)}
            />
          </Field>
          <Field label="Anticipated start" name="anticipated_start_date">
            <TextInput
              name="anticipated_start_date"
              type="date"
              defaultValue={project?.anticipated_start_date ?? ''}
            />
          </Field>
          <Field label="Anticipated completion" name="anticipated_completion_date">
            <TextInput
              name="anticipated_completion_date"
              type="date"
              defaultValue={project?.anticipated_completion_date ?? ''}
            />
          </Field>
        </FieldGrid>
      </Fieldset>

      <Fieldset legend="Commercial conditions">
        <p className="mb-2 text-xs text-steel-500">
          These drive estimating assumptions. Occupied building, after-hours work and prevailing
          wage automatically seed matching labor productivity conditions on new estimates.
        </p>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
          <CheckboxField
            label="Prevailing wage"
            name="prevailing_wage"
            defaultChecked={project?.prevailing_wage ?? false}
          />
          <CheckboxField
            label="Tax exempt"
            name="tax_exempt"
            defaultChecked={project?.tax_exempt ?? false}
            hint="New lines are marked non-taxable."
          />
          <CheckboxField
            label="Bond required"
            name="bond_required"
            defaultChecked={project?.bond_required ?? false}
          />
          <CheckboxField
            label="Occupied building"
            name="occupied_building"
            defaultChecked={project?.occupied_building ?? false}
          />
          <CheckboxField
            label="After-hours work"
            name="after_hours_work"
            defaultChecked={project?.after_hours_work ?? false}
          />
        </div>
      </Fieldset>

      <Fieldset legend="Notes">
        <Field label="Internal notes" name="notes">
          <TextArea name="notes" defaultValue={project?.notes ?? ''} rows={4} />
        </Field>
      </Fieldset>

      <div className="flex items-center gap-2 border-t border-white/10 pt-4">
        <SubmitButton pendingLabel="Saving…">{submitLabel}</SubmitButton>
        <Link
          href={project ? `/admin/projects/${project.id}` : '/admin/projects'}
          className="inline-flex h-9 items-center rounded px-3 text-sm text-steel-300 hover:text-white"
        >
          Cancel
        </Link>
      </div>
    </ActionForm>
  );
}
