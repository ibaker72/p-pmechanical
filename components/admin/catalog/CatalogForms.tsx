'use client';

// Add/edit forms for the smaller reference catalogs. They share the same shape:
// one form that creates when no record is passed and updates when one is.

import Link from 'next/link';
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
  createEquipmentRateAction,
  createLaborModifierAction,
  createLaborRateAction,
  createScopeCategoryAction,
  createVendorAction,
  deleteEquipmentRateAction,
  deleteLaborModifierAction,
  deleteLaborRateAction,
  deleteVendorAction,
  updateEquipmentRateAction,
  updateLaborModifierAction,
  updateLaborRateAction,
  updateScopeCategoryAction,
  updateVendorAction,
} from '@/lib/estimating/actions/catalog';
import {
  EQUIPMENT_UNITS,
  VENDOR_CATEGORIES,
  VENDOR_CATEGORY_LABELS,
} from '@/lib/estimating/constants';
import type {
  EquipmentRate,
  LaborModifier,
  LaborRate,
  ScopeCategory,
  Vendor,
} from '@/lib/estimating/types';

function FormFooter({
  isEdit,
  cancelHref,
  createLabel,
}: {
  isEdit: boolean;
  cancelHref: string;
  createLabel: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <SubmitButton pendingLabel="Saving…">{isEdit ? 'Save changes' : createLabel}</SubmitButton>
      {isEdit && (
        <Link
          href={cancelHref}
          className="inline-flex h-9 items-center rounded px-3 text-sm text-steel-300 hover:text-white"
        >
          Cancel
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function LaborRateForm({ rate, cancelHref }: { rate?: LaborRate; cancelHref: string }) {
  const isEdit = !!rate;
  return (
    <ActionForm
      action={isEdit ? updateLaborRateAction : createLaborRateAction}
      className="space-y-4"
      resetOnSuccess={!isEdit}
    >
      {rate && <input type="hidden" name="labor_rate_id" value={rate.id} />}
      <FormError />
      <FormSuccess message="Labor classification saved." />
      <FieldGrid columns={4}>
        <Field label="Name" name="name" required className="sm:col-span-2">
          <TextInput
            name="name"
            required
            defaultValue={rate?.name ?? ''}
            placeholder="Sheet Metal Journeyman"
          />
        </Field>
        <Field label="Code" name="code" required hint="Lowercase, no spaces.">
          <TextInput
            name="code"
            required
            defaultValue={rate?.code ?? ''}
            placeholder="sm_journeyman"
          />
        </Field>
        <Field
          label="Burdened hourly rate"
          name="base_hourly_rate"
          required
          hint="Wage plus burden — never the raw wage."
        >
          <NumberInput
            name="base_hourly_rate"
            step="0.01"
            min="0"
            defaultValue={rate?.base_hourly_rate ?? 0}
          />
        </Field>
        <Field label="Overtime multiplier" name="overtime_multiplier">
          <NumberInput
            name="overtime_multiplier"
            step="0.01"
            min="1"
            defaultValue={rate?.overtime_multiplier ?? 1.5}
          />
        </Field>
        <Field label="Double-time multiplier" name="doubletime_multiplier">
          <NumberInput
            name="doubletime_multiplier"
            step="0.01"
            min="1"
            defaultValue={rate?.doubletime_multiplier ?? 2}
          />
        </Field>
        <Field
          label="Prevailing wage rate"
          name="prevailing_wage_hourly_rate"
          hint="Used automatically on prevailing-wage projects."
        >
          <NumberInput
            name="prevailing_wage_hourly_rate"
            step="0.01"
            min="0"
            defaultValue={rate?.prevailing_wage_hourly_rate ?? ''}
          />
        </Field>
        <Field label="Sort order" name="sort_order">
          <NumberInput name="sort_order" step="1" min="0" defaultValue={rate?.sort_order ?? 0} />
        </Field>
      </FieldGrid>
      <FieldGrid columns={2}>
        <Field label="Description" name="description">
          <TextInput name="description" defaultValue={rate?.description ?? ''} />
        </Field>
        <Field label="Notes" name="notes">
          <TextInput name="notes" defaultValue={rate?.notes ?? ''} />
        </Field>
      </FieldGrid>
      <CheckboxField name="is_active" label="Active" defaultChecked={rate?.is_active ?? true} />
      <FormFooter isEdit={isEdit} cancelHref={cancelHref} createLabel="Add classification" />
    </ActionForm>
  );
}

export function DeleteLaborRateButton({ id, name }: { id: string; name: string }) {
  return (
    <ActionForm action={deleteLaborRateAction} className="inline">
      <input type="hidden" name="labor_rate_id" value={id} />
      <ConfirmSubmitButton
        variant="ghost"
        confirm={`Delete "${name}"? Estimate lines keep the rate they snapshotted, but new lines can no longer use it.`}
      >
        Del
      </ConfirmSubmitButton>
      <FormError className="mt-1" />
    </ActionForm>
  );
}

// ---------------------------------------------------------------------------

export function LaborModifierForm({
  modifier,
  cancelHref,
}: {
  modifier?: LaborModifier;
  cancelHref: string;
}) {
  const isEdit = !!modifier;
  return (
    <ActionForm
      action={isEdit ? updateLaborModifierAction : createLaborModifierAction}
      className="space-y-4"
      resetOnSuccess={!isEdit}
    >
      {modifier && <input type="hidden" name="labor_modifier_id" value={modifier.id} />}
      <FormError />
      <FormSuccess message="Labor modifier saved." />
      <FieldGrid columns={4}>
        <Field label="Name" name="name" required className="sm:col-span-2">
          <TextInput name="name" required defaultValue={modifier?.name ?? ''} />
        </Field>
        <Field label="Code" name="code" required>
          <TextInput name="code" required defaultValue={modifier?.code ?? ''} />
        </Field>
        <Field label="Factor" name="factor" required hint="1.00 = normal. 1.15 = 15% more hours.">
          <NumberInput
            name="factor"
            step="0.01"
            min="0.01"
            max="10"
            defaultValue={modifier?.factor ?? 1}
          />
        </Field>
        <Field label="Category" name="category">
          <TextInput name="category" defaultValue={modifier?.category ?? ''} placeholder="site" />
        </Field>
        <Field label="Sort order" name="sort_order">
          <NumberInput
            name="sort_order"
            step="1"
            min="0"
            defaultValue={modifier?.sort_order ?? 0}
          />
        </Field>
        <Field label="Description" name="description" className="sm:col-span-2">
          <TextInput name="description" defaultValue={modifier?.description ?? ''} />
        </Field>
      </FieldGrid>
      <Field label="Notes" name="notes">
        <TextArea name="notes" rows={2} defaultValue={modifier?.notes ?? ''} />
      </Field>
      <CheckboxField name="is_active" label="Active" defaultChecked={modifier?.is_active ?? true} />
      <FormFooter isEdit={isEdit} cancelHref={cancelHref} createLabel="Add modifier" />
    </ActionForm>
  );
}

export function DeleteLaborModifierButton({ id, name }: { id: string; name: string }) {
  return (
    <ActionForm action={deleteLaborModifierAction} className="inline">
      <input type="hidden" name="labor_modifier_id" value={id} />
      <ConfirmSubmitButton
        variant="ghost"
        confirm={`Delete "${name}"? Estimates that already applied it keep their snapshotted factor.`}
      >
        Del
      </ConfirmSubmitButton>
      <FormError className="mt-1" />
    </ActionForm>
  );
}

// ---------------------------------------------------------------------------

export function EquipmentRateForm({
  rate,
  vendors,
  cancelHref,
}: {
  rate?: EquipmentRate;
  vendors: Vendor[];
  cancelHref: string;
}) {
  const isEdit = !!rate;
  return (
    <ActionForm
      action={isEdit ? updateEquipmentRateAction : createEquipmentRateAction}
      className="space-y-4"
      resetOnSuccess={!isEdit}
    >
      {rate && <input type="hidden" name="equipment_rate_id" value={rate.id} />}
      <FormError />
      <FormSuccess message="Equipment rate saved." />
      <FieldGrid columns={4}>
        <Field label="Name" name="name" required className="sm:col-span-2">
          <TextInput
            name="name"
            required
            defaultValue={rate?.name ?? ''}
            placeholder="Scissor lift 26'"
          />
        </Field>
        <Field label="Code" name="code">
          <TextInput name="code" defaultValue={rate?.code ?? ''} />
        </Field>
        <Field label="Category" name="category">
          <TextInput name="category" defaultValue={rate?.category ?? ''} placeholder="lift" />
        </Field>
        <Field label="Primary unit" name="unit">
          <SelectInput name="unit" defaultValue={rate?.unit ?? 'DAY'}>
            {EQUIPMENT_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Daily rate" name="daily_rate">
          <NumberInput name="daily_rate" step="0.01" min="0" defaultValue={rate?.daily_rate ?? 0} />
        </Field>
        <Field label="Weekly rate" name="weekly_rate">
          <NumberInput
            name="weekly_rate"
            step="0.01"
            min="0"
            defaultValue={rate?.weekly_rate ?? 0}
          />
        </Field>
        <Field label="Monthly rate" name="monthly_rate">
          <NumberInput
            name="monthly_rate"
            step="0.01"
            min="0"
            defaultValue={rate?.monthly_rate ?? 0}
          />
        </Field>
        <Field label="Mobilization" name="mobilization_cost">
          <NumberInput
            name="mobilization_cost"
            step="0.01"
            min="0"
            defaultValue={rate?.mobilization_cost ?? 0}
          />
        </Field>
        <Field label="Delivery" name="delivery_cost">
          <NumberInput
            name="delivery_cost"
            step="0.01"
            min="0"
            defaultValue={rate?.delivery_cost ?? 0}
          />
        </Field>
        <Field label="Pickup" name="pickup_cost">
          <NumberInput
            name="pickup_cost"
            step="0.01"
            min="0"
            defaultValue={rate?.pickup_cost ?? 0}
          />
        </Field>
        <Field label="Vendor" name="vendor_id">
          <SelectInput name="vendor_id" defaultValue={rate?.vendor_id ?? ''}>
            <option value="">None</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.company_name}
              </option>
            ))}
          </SelectInput>
        </Field>
      </FieldGrid>
      <Field label="Notes" name="notes">
        <TextArea name="notes" rows={2} defaultValue={rate?.notes ?? ''} />
      </Field>
      <CheckboxField name="is_active" label="Active" defaultChecked={rate?.is_active ?? true} />
      <FormFooter isEdit={isEdit} cancelHref={cancelHref} createLabel="Add equipment rate" />
    </ActionForm>
  );
}

export function DeleteEquipmentRateButton({ id, name }: { id: string; name: string }) {
  return (
    <ActionForm action={deleteEquipmentRateAction} className="inline">
      <input type="hidden" name="equipment_rate_id" value={id} />
      <ConfirmSubmitButton variant="ghost" confirm={`Delete "${name}"?`}>
        Del
      </ConfirmSubmitButton>
      <FormError className="mt-1" />
    </ActionForm>
  );
}

// ---------------------------------------------------------------------------

export function VendorForm({ vendor, cancelHref }: { vendor?: Vendor; cancelHref: string }) {
  const isEdit = !!vendor;
  return (
    <ActionForm
      action={isEdit ? updateVendorAction : createVendorAction}
      className="space-y-4"
      resetOnSuccess={!isEdit}
    >
      {vendor && <input type="hidden" name="vendor_id" value={vendor.id} />}
      <FormError />
      <FormSuccess message="Vendor saved." />
      <FieldGrid columns={4}>
        <Field label="Company" name="company_name" required className="sm:col-span-2">
          <TextInput name="company_name" required defaultValue={vendor?.company_name ?? ''} />
        </Field>
        <Field label="Category" name="category">
          <SelectInput name="category" defaultValue={vendor?.category ?? ''}>
            <option value="">—</option>
            {VENDOR_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {VENDOR_CATEGORY_LABELS[category]}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Contact" name="contact_name">
          <TextInput name="contact_name" defaultValue={vendor?.contact_name ?? ''} />
        </Field>
        <Field label="Email" name="email">
          <TextInput name="email" type="email" defaultValue={vendor?.email ?? ''} />
        </Field>
        <Field label="Phone" name="phone">
          <TextInput name="phone" defaultValue={vendor?.phone ?? ''} />
        </Field>
        <Field label="Website" name="website">
          <TextInput name="website" defaultValue={vendor?.website ?? ''} />
        </Field>
        <Field label="City" name="city">
          <TextInput name="city" defaultValue={vendor?.city ?? ''} />
        </Field>
      </FieldGrid>
      <div className="flex flex-wrap gap-x-6">
        <CheckboxField
          name="is_supplier"
          label="Supplier"
          defaultChecked={vendor?.is_supplier ?? true}
        />
        <CheckboxField
          name="is_subcontractor"
          label="Subcontractor"
          defaultChecked={vendor?.is_subcontractor ?? false}
          hint="Appears in the estimate subcontractor picker."
        />
        <CheckboxField name="is_active" label="Active" defaultChecked={vendor?.is_active ?? true} />
      </div>
      <Field label="Notes" name="notes">
        <TextArea name="notes" rows={2} defaultValue={vendor?.notes ?? ''} />
      </Field>
      <FormFooter isEdit={isEdit} cancelHref={cancelHref} createLabel="Add vendor" />
    </ActionForm>
  );
}

export function DeleteVendorButton({ id, name }: { id: string; name: string }) {
  return (
    <ActionForm action={deleteVendorAction} className="inline">
      <input type="hidden" name="vendor_id" value={id} />
      <ConfirmSubmitButton variant="ghost" confirm={`Delete "${name}"?`}>
        Del
      </ConfirmSubmitButton>
      <FormError className="mt-1" />
    </ActionForm>
  );
}

// ---------------------------------------------------------------------------

export function ScopeCategoryForm({
  category,
  cancelHref,
}: {
  category?: ScopeCategory;
  cancelHref: string;
}) {
  const isEdit = !!category;
  return (
    <ActionForm
      action={isEdit ? updateScopeCategoryAction : createScopeCategoryAction}
      className="space-y-4"
      resetOnSuccess={!isEdit}
    >
      {category && <input type="hidden" name="scope_category_id" value={category.id} />}
      <FormError />
      <FormSuccess message="Scope category saved." />
      <FieldGrid columns={4}>
        <Field label="Name" name="name" required className="sm:col-span-2">
          <TextInput name="name" required defaultValue={category?.name ?? ''} />
        </Field>
        <Field label="Code" name="code" required>
          <TextInput name="code" required defaultValue={category?.code ?? ''} />
        </Field>
        <Field label="Sort order" name="sort_order">
          <NumberInput
            name="sort_order"
            step="10"
            min="0"
            defaultValue={category?.sort_order ?? 0}
          />
        </Field>
      </FieldGrid>
      <Field label="Description" name="description">
        <TextInput name="description" defaultValue={category?.description ?? ''} />
      </Field>
      <CheckboxField name="is_active" label="Active" defaultChecked={category?.is_active ?? true} />
      <FormFooter isEdit={isEdit} cancelHref={cancelHref} createLabel="Add scope category" />
    </ActionForm>
  );
}
