'use client';

import Link from 'next/link';
import { ActionForm, FormError, SubmitButton } from '../ActionForm';
import { CheckboxField, Field, FieldGrid, NumberInput, SelectInput, TextInput } from '../fields';
import { addEquipmentLineAction } from '@/lib/estimating/actions/takeoff';
import { money } from '@/lib/estimating/format';
import type { EquipmentRate, ScopeCategory } from '@/lib/estimating/types';

export function AddEquipmentForm({
  estimateId,
  rates,
  scopeCategories,
}: {
  estimateId: string;
  rates: EquipmentRate[];
  scopeCategories: ScopeCategory[];
}) {
  if (rates.length === 0) {
    return (
      <p className="text-sm text-steel-400">
        No active equipment rates yet.{' '}
        <Link
          href="/admin/equipment-rates"
          className="text-ember-300 underline underline-offset-4 hover:text-ember-200"
        >
          Add lifts, cranes and rentals
        </Link>{' '}
        to price them in one step.
      </p>
    );
  }

  return (
    <ActionForm action={addEquipmentLineAction} className="space-y-3" resetOnSuccess>
      <input type="hidden" name="estimate_id" value={estimateId} />
      <FormError />
      <FieldGrid columns={4}>
        <Field label="Equipment" name="equipment_rate_id" required className="sm:col-span-2">
          <SelectInput name="equipment_rate_id" required defaultValue="">
            <option value="" disabled>
              Choose equipment…
            </option>
            {rates.map((rate) => (
              <option key={rate.id} value={rate.id}>
                {rate.name} — {money(rate.daily_rate)}/day
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Rate basis" name="rate_basis">
          <SelectInput name="rate_basis" defaultValue="daily">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </SelectInput>
        </Field>
        <Field label="Duration" name="duration" hint="Number of days, weeks or months.">
          <NumberInput name="duration" step="0.01" min="0" defaultValue={1} />
        </Field>
        <Field label="Description override" name="description" className="sm:col-span-2">
          <TextInput name="description" placeholder="Blank uses the equipment name" />
        </Field>
        <Field label="Scope" name="scope_category_id">
          <SelectInput name="scope_category_id" defaultValue="">
            <option value="">Unassigned</option>
            {scopeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="flex flex-col justify-end">
          <CheckboxField name="include_mobilization" label="Add mobilization" defaultChecked />
          <CheckboxField name="include_delivery" label="Add delivery + pickup" defaultChecked />
        </div>
      </FieldGrid>
      <SubmitButton size="sm" pendingLabel="Adding…">
        Add equipment
      </SubmitButton>
    </ActionForm>
  );
}
