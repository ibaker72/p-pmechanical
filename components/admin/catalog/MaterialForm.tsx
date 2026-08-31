'use client';

import Link from 'next/link';
import { ActionForm, FormError, FormSuccess, SubmitButton } from '../ActionForm';
import {
  CheckboxField,
  Field,
  FieldGrid,
  NumberInput,
  SelectInput,
  TextArea,
  TextInput,
} from '../fields';
import { createMaterialAction, updateMaterialAction } from '@/lib/estimating/actions/catalog';
import {
  LABOR_UNIT_TYPES,
  LABOR_UNIT_TYPE_LABELS,
  UNITS_OF_MEASURE,
} from '@/lib/estimating/constants';
import type { LaborRate, Material, MaterialCategory, Vendor } from '@/lib/estimating/types';

export function MaterialForm({
  material,
  categories,
  vendors,
  laborRates,
  cancelHref,
}: {
  material?: Material;
  categories: MaterialCategory[];
  vendors: Vendor[];
  laborRates: LaborRate[];
  cancelHref: string;
}) {
  const isEdit = !!material;

  return (
    <ActionForm
      action={isEdit ? updateMaterialAction : createMaterialAction}
      className="space-y-4"
      resetOnSuccess={!isEdit}
    >
      {material && <input type="hidden" name="material_id" value={material.id} />}
      <FormError />
      <FormSuccess message={isEdit ? 'Material saved.' : 'Material added to the price book.'} />

      <FieldGrid columns={4}>
        <Field label="Name" name="name" required className="sm:col-span-2">
          <TextInput
            name="name"
            required
            defaultValue={material?.name ?? ''}
            placeholder={'e.g. 10" spiral duct'}
          />
        </Field>
        <Field label="SKU" name="sku" hint="Optional, must be unique.">
          <TextInput name="sku" defaultValue={material?.sku ?? ''} />
        </Field>
        <Field label="Category" name="category_id">
          <SelectInput name="category_id" defaultValue={material?.category_id ?? ''}>
            <option value="">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Subcategory" name="subcategory">
          <TextInput name="subcategory" defaultValue={material?.subcategory ?? ''} />
        </Field>
        <Field label="Manufacturer" name="manufacturer">
          <TextInput name="manufacturer" defaultValue={material?.manufacturer ?? ''} />
        </Field>
        <Field label="Model" name="model">
          <TextInput name="model" defaultValue={material?.model ?? ''} />
        </Field>
        <Field label="Preferred vendor" name="preferred_vendor_id">
          <SelectInput
            name="preferred_vendor_id"
            defaultValue={material?.preferred_vendor_id ?? ''}
          >
            <option value="">None</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.company_name}
              </option>
            ))}
          </SelectInput>
        </Field>
      </FieldGrid>

      <FieldGrid columns={4}>
        <Field label="Unit of measure" name="unit_of_measure">
          <SelectInput name="unit_of_measure" defaultValue={material?.unit_of_measure ?? 'EA'}>
            {UNITS_OF_MEASURE.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Unit cost" name="unit_cost" required>
          <NumberInput
            name="unit_cost"
            step="0.0001"
            min="0"
            defaultValue={material?.unit_cost ?? 0}
          />
        </Field>
        <Field label="Waste %" name="waste_percent">
          <NumberInput
            name="waste_percent"
            step="0.01"
            min="0"
            max="100"
            defaultValue={material?.waste_percent ?? 0}
          />
        </Field>
        <Field
          label="Labor unit"
          name="default_labor_unit"
          hint="Productivity assumption for this item."
        >
          <NumberInput
            name="default_labor_unit"
            step="0.0001"
            min="0"
            defaultValue={material?.default_labor_unit ?? 0}
          />
        </Field>
        <Field label="Labor unit basis" name="labor_unit_type">
          <SelectInput
            name="labor_unit_type"
            defaultValue={material?.labor_unit_type ?? 'hours_per_unit'}
          >
            {LABOR_UNIT_TYPES.map((type) => (
              <option key={type} value={type}>
                {LABOR_UNIT_TYPE_LABELS[type]}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Default labor classification" name="default_labor_rate_id">
          <SelectInput
            name="default_labor_rate_id"
            defaultValue={material?.default_labor_rate_id ?? ''}
          >
            <option value="">None</option>
            {laborRates.map((rate) => (
              <option key={rate.id} value={rate.id}>
                {rate.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <div className="flex flex-col justify-end pb-1">
          <CheckboxField
            name="is_taxable"
            label="Taxable"
            defaultChecked={material?.is_taxable ?? true}
          />
          <CheckboxField
            name="is_active"
            label="Active"
            defaultChecked={material?.is_active ?? true}
          />
        </div>
      </FieldGrid>

      <FieldGrid columns={2}>
        <Field label="Description" name="description">
          <TextArea name="description" rows={2} defaultValue={material?.description ?? ''} />
        </Field>
        <Field label="Notes" name="notes">
          <TextArea name="notes" rows={2} defaultValue={material?.notes ?? ''} />
        </Field>
      </FieldGrid>

      <div className="flex items-center gap-2">
        <SubmitButton pendingLabel="Saving…">
          {isEdit ? 'Save material' : 'Add material'}
        </SubmitButton>
        {isEdit && (
          <Link
            href={cancelHref}
            className="inline-flex h-9 items-center rounded px-3 text-sm text-steel-300 hover:text-white"
          >
            Cancel
          </Link>
        )}
      </div>
    </ActionForm>
  );
}
