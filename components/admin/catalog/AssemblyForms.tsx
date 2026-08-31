'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ActionForm,
  ConfirmSubmitButton,
  FormError,
  FormSuccess,
  SubmitButton,
} from '../ActionForm';
import {
  CheckboxField,
  Field,
  FieldGrid,
  NumberInput,
  SelectInput,
  TextArea,
  TextInput,
} from '../fields';
import {
  addMaterialToAssemblyAction,
  createAssemblyAction,
  createAssemblyItemAction,
  deleteAssemblyAction,
  deleteAssemblyItemAction,
  duplicateAssemblyAction,
  updateAssemblyAction,
  updateAssemblyItemAction,
} from '@/lib/estimating/actions/assemblies';
import { UNITS_OF_MEASURE } from '@/lib/estimating/constants';
import { money } from '@/lib/estimating/format';
import type {
  Assembly,
  AssemblyItem,
  LaborRate,
  Material,
  ScopeCategory,
  Vendor,
} from '@/lib/estimating/types';

const ITEM_TYPES = [
  { value: 'material', label: 'Material' },
  { value: 'labor', label: 'Labor' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'subcontract', label: 'Subcontract allowance' },
  { value: 'other', label: 'Other cost' },
] as const;

export function AssemblyForm({
  assembly,
  scopeCategories,
  redirectAfterCreate,
}: {
  assembly?: Assembly;
  scopeCategories: ScopeCategory[];
  redirectAfterCreate?: boolean;
}) {
  const isEdit = !!assembly;
  return (
    <ActionForm
      action={isEdit ? updateAssemblyAction : createAssemblyAction}
      className="space-y-4"
      redirectTo={
        !isEdit && redirectAfterCreate ? (data) => `/admin/assemblies/${data.id}` : undefined
      }
    >
      {assembly && <input type="hidden" name="assembly_id" value={assembly.id} />}
      <FormError />
      {isEdit && <FormSuccess message="Assembly saved." />}
      <FieldGrid columns={4}>
        <Field label="Name" name="name" required className="sm:col-span-2">
          <TextInput
            name="name"
            required
            defaultValue={assembly?.name ?? ''}
            placeholder="5 Ton RTU – Standard Installation"
          />
        </Field>
        <Field label="Code" name="code" hint="Optional, must be unique.">
          <TextInput name="code" defaultValue={assembly?.code ?? ''} placeholder="rtu_5t_std" />
        </Field>
        <Field label="Unit" name="unit" hint="What one of this assembly represents.">
          <SelectInput name="unit" defaultValue={assembly?.unit ?? 'EA'}>
            {UNITS_OF_MEASURE.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Scope category" name="scope_category_id" className="sm:col-span-2">
          <SelectInput name="scope_category_id" defaultValue={assembly?.scope_category_id ?? ''}>
            <option value="">None</option>
            {scopeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="flex items-end pb-1">
          <CheckboxField
            name="is_active"
            label="Active"
            defaultChecked={assembly?.is_active ?? true}
          />
        </div>
      </FieldGrid>
      <FieldGrid columns={2}>
        <Field
          label="Customer-facing description"
          name="description"
          hint="Used as the default proposal wording when this assembly is added."
        >
          <TextArea name="description" rows={2} defaultValue={assembly?.description ?? ''} />
        </Field>
        <Field label="Internal notes" name="notes">
          <TextArea name="notes" rows={2} defaultValue={assembly?.notes ?? ''} />
        </Field>
      </FieldGrid>
      <SubmitButton pendingLabel="Saving…">
        {isEdit ? 'Save assembly' : 'Create assembly'}
      </SubmitButton>
    </ActionForm>
  );
}

export function AssemblyRowActions({ id, name }: { id: string; name: string }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/admin/assemblies/${id}`}
        className="inline-flex h-8 items-center rounded px-2 text-xs font-semibold text-steel-300 hover:bg-white/10 hover:text-white"
      >
        Open
      </Link>
      <ActionForm
        action={duplicateAssemblyAction}
        className="inline"
        redirectTo={(data) => `/admin/assemblies/${data.id}`}
      >
        <input type="hidden" name="assembly_id" value={id} />
        <SubmitButton variant="ghost" size="sm">
          Copy
        </SubmitButton>
      </ActionForm>
      <ActionForm action={deleteAssemblyAction} className="inline">
        <input type="hidden" name="assembly_id" value={id} />
        <ConfirmSubmitButton
          variant="ghost"
          confirm={`Delete "${name}"? Estimates that used it keep their exploded lines and snapshotted prices.`}
        >
          Del
        </ConfirmSubmitButton>
        <FormError className="mt-1" />
      </ActionForm>
    </div>
  );
}

/** Add a component by hand, with the fields that matter for its type. */
export function AssemblyItemForm({
  assemblyId,
  item,
  laborRates,
  vendors,
  cancelHref,
}: {
  assemblyId: string;
  item?: AssemblyItem;
  laborRates: LaborRate[];
  vendors: Vendor[];
  cancelHref: string;
}) {
  const isEdit = !!item;
  const [itemType, setItemType] = useState<string>(item?.item_type ?? 'material');
  const isMaterial = itemType === 'material';
  const isLabor = itemType === 'labor';

  return (
    <ActionForm
      action={isEdit ? updateAssemblyItemAction : createAssemblyItemAction}
      className="space-y-3"
      resetOnSuccess={!isEdit}
    >
      {isEdit ? (
        <input type="hidden" name="assembly_item_id" value={item.id} />
      ) : (
        <input type="hidden" name="assembly_id" value={assemblyId} />
      )}
      <FormError />
      <FieldGrid columns={4}>
        <Field label="Component type" name="item_type">
          <SelectInput
            name="item_type"
            value={itemType}
            onChange={(event) => setItemType(event.target.value)}
          >
            {ITEM_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Description" name="description" required className="sm:col-span-2">
          <TextInput name="description" required defaultValue={item?.description ?? ''} />
        </Field>
        <Field
          label="Qty per assembly unit"
          name="quantity_per_unit"
          hint="How much ONE assembly consumes."
        >
          <NumberInput
            name="quantity_per_unit"
            step="0.0001"
            min="0"
            defaultValue={item?.quantity_per_unit ?? 1}
          />
        </Field>
        <Field label="Unit" name="unit">
          <SelectInput name="unit" defaultValue={item?.unit ?? 'EA'}>
            {UNITS_OF_MEASURE.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field
          label={isLabor ? 'Cost per unit (usually 0)' : 'Unit cost'}
          name="unit_cost"
          hint={isLabor ? 'Labor cost comes from hours × classification rate.' : undefined}
        >
          <NumberInput name="unit_cost" step="0.0001" min="0" defaultValue={item?.unit_cost ?? 0} />
        </Field>
        <Field
          label="Waste %"
          name="waste_percent"
          hint={isMaterial ? undefined : 'Material only.'}
        >
          <NumberInput
            name="waste_percent"
            step="0.01"
            min="0"
            max="100"
            defaultValue={item?.waste_percent ?? 0}
          />
        </Field>
        <Field label="Labor hours per unit" name="labor_hours_per_unit">
          <NumberInput
            name="labor_hours_per_unit"
            step="0.0001"
            min="0"
            defaultValue={item?.labor_hours_per_unit ?? 0}
          />
        </Field>
        <Field label="Labor classification" name="labor_rate_id">
          <SelectInput name="labor_rate_id" defaultValue={item?.labor_rate_id ?? ''}>
            <option value="">None</option>
            {laborRates.map((rate) => (
              <option key={rate.id} value={rate.id}>
                {rate.name} — {money(rate.base_hourly_rate)}/hr
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Vendor" name="vendor_id">
          <SelectInput name="vendor_id" defaultValue={item?.vendor_id ?? ''}>
            <option value="">None</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.company_name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Notes" name="notes" className="sm:col-span-2">
          <TextInput name="notes" defaultValue={item?.notes ?? ''} />
        </Field>
      </FieldGrid>
      <div className="flex items-center gap-2">
        <SubmitButton size="sm" pendingLabel="Saving…">
          {isEdit ? 'Save component' : 'Add component'}
        </SubmitButton>
        {isEdit && (
          <Link
            href={cancelHref}
            className="inline-flex h-8 items-center rounded px-3 text-sm text-steel-300 hover:text-white"
          >
            Cancel
          </Link>
        )}
      </div>
    </ActionForm>
  );
}

/** Pull a price-book material into the assembly with its current values. */
export function AddMaterialToAssemblyForm({
  assemblyId,
  materials,
}: {
  assemblyId: string;
  materials: Material[];
}) {
  if (materials.length === 0) {
    return (
      <p className="text-sm text-steel-400">
        The price book is empty.{' '}
        <Link
          href="/admin/materials"
          className="text-ember-300 underline underline-offset-4 hover:text-ember-200"
        >
          Add materials
        </Link>{' '}
        to pull them into assemblies with their cost and productivity already set.
      </p>
    );
  }

  return (
    <ActionForm action={addMaterialToAssemblyAction} className="space-y-3" resetOnSuccess>
      <input type="hidden" name="assembly_id" value={assemblyId} />
      <FormError />
      <FieldGrid columns={3}>
        <Field label="Material" name="material_id" required className="sm:col-span-2">
          <SelectInput name="material_id" required defaultValue="">
            <option value="" disabled>
              Choose a material…
            </option>
            {materials.map((material) => (
              <option key={material.id} value={material.id}>
                {material.name} — {money(material.unit_cost)}/{material.unit_of_measure}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Qty per assembly unit" name="quantity_per_unit">
          <NumberInput name="quantity_per_unit" step="0.0001" min="0" defaultValue={1} />
        </Field>
      </FieldGrid>
      <SubmitButton size="sm" pendingLabel="Adding…">
        Add from price book
      </SubmitButton>
    </ActionForm>
  );
}

export function DeleteAssemblyItemButton({ id, name }: { id: string; name: string }) {
  return (
    <ActionForm action={deleteAssemblyItemAction} className="inline">
      <input type="hidden" name="assembly_item_id" value={id} />
      <ConfirmSubmitButton variant="ghost" confirm={`Remove "${name}" from this assembly?`}>
        Del
      </ConfirmSubmitButton>
      <FormError className="mt-1" />
    </ActionForm>
  );
}
