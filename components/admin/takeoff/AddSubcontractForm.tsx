'use client';

import { ActionForm, FormError, SubmitButton } from '../ActionForm';
import { Field, FieldGrid, NumberInput, SelectInput, TextArea, TextInput } from '../fields';
import { addSubcontractLineAction } from '@/lib/estimating/actions/takeoff';
import { TAKEOFF_DISPOSITIONS, TAKEOFF_DISPOSITION_LABELS } from '@/lib/estimating/constants';
import type { ScopeCategory, Vendor } from '@/lib/estimating/types';

export function AddSubcontractForm({
  estimateId,
  vendors,
  scopeCategories,
}: {
  estimateId: string;
  vendors: Vendor[];
  scopeCategories: ScopeCategory[];
}) {
  return (
    <ActionForm action={addSubcontractLineAction} className="space-y-3" resetOnSuccess>
      <input type="hidden" name="estimate_id" value={estimateId} />
      <FormError />
      <FieldGrid columns={4}>
        <Field label="Scope of work" name="description" required className="sm:col-span-2">
          <TextInput name="description" required placeholder="e.g. Temperature controls package" />
        </Field>
        <Field label="Quoted amount" name="amount" required>
          <NumberInput name="amount" step="0.01" min="0" defaultValue={0} required />
        </Field>
        <Field label="Subcontractor" name="vendor_id">
          <SelectInput name="vendor_id" defaultValue="">
            <option value="">Not yet selected</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.company_name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Scope category" name="scope_category_id">
          <SelectInput name="scope_category_id" defaultValue="">
            <option value="">Unassigned</option>
            {scopeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Disposition" name="disposition">
          <SelectInput name="disposition" defaultValue="included">
            {TAKEOFF_DISPOSITIONS.map((value) => (
              <option key={value} value={value}>
                {TAKEOFF_DISPOSITION_LABELS[value]}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field
          label="Internal notes"
          name="internal_notes"
          className="sm:col-span-2"
          hint="Quote number, date received, exclusions."
        >
          <TextArea name="internal_notes" rows={2} />
        </Field>
      </FieldGrid>
      <SubmitButton size="sm" pendingLabel="Adding…">
        Add subcontractor cost
      </SubmitButton>
    </ActionForm>
  );
}
