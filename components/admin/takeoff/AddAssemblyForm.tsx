'use client';

import Link from 'next/link';
import { ActionForm, FormError, SubmitButton } from '../ActionForm';
import { Field, FieldGrid, NumberInput, SelectInput } from '../fields';
import { addAssemblyAction } from '@/lib/estimating/actions/takeoff';
import { TAKEOFF_DISPOSITIONS, TAKEOFF_DISPOSITION_LABELS } from '@/lib/estimating/constants';
import type { ScopeCategory } from '@/lib/estimating/types';

export type AssemblyOption = {
  id: string;
  name: string;
  unit: string;
  itemCount: number;
};

export function AddAssemblyForm({
  estimateId,
  assemblies,
  scopeCategories,
}: {
  estimateId: string;
  assemblies: AssemblyOption[];
  scopeCategories: ScopeCategory[];
}) {
  if (assemblies.length === 0) {
    return (
      <p className="text-sm text-steel-400">
        No active assemblies yet.{' '}
        <Link
          href="/admin/assemblies/new"
          className="text-ember-300 underline underline-offset-4 hover:text-ember-200"
        >
          Build one
        </Link>{' '}
        to add repeatable installed work in a single step.
      </p>
    );
  }

  return (
    <ActionForm action={addAssemblyAction} className="space-y-3" resetOnSuccess refocusOnSuccess>
      <input type="hidden" name="estimate_id" value={estimateId} />
      <FormError />
      <p className="text-xs text-steel-500">
        Adding an assembly copies every component&rsquo;s price and productivity value onto this
        estimate. Editing the master assembly later will not change this bid.
      </p>
      <FieldGrid columns={4}>
        <Field label="Assembly" name="assembly_id" required className="sm:col-span-2">
          <SelectInput name="assembly_id" required defaultValue="">
            <option value="" disabled>
              Choose an assembly…
            </option>
            {assemblies.map((assembly) => (
              <option key={assembly.id} value={assembly.id}>
                {assembly.name} ({assembly.unit}, {assembly.itemCount} component
                {assembly.itemCount === 1 ? '' : 's'})
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Quantity" name="quantity">
          <NumberInput name="quantity" step="0.0001" min="0" defaultValue={1} />
        </Field>
        <Field
          label="Scope override"
          name="scope_category_id"
          hint="Blank uses the assembly's own scope."
        >
          <SelectInput name="scope_category_id" defaultValue="">
            <option value="">Use assembly scope</option>
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
      </FieldGrid>
      <SubmitButton size="sm" pendingLabel="Adding…">
        Add assembly
      </SubmitButton>
    </ActionForm>
  );
}
