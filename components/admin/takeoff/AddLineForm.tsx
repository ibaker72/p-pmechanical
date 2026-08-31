'use client';

import { useState } from 'react';
import { ActionForm, FormError, SubmitButton } from '../ActionForm';
import { Field, FieldGrid, NumberInput, SelectInput, TextInput } from '../fields';
import { createTakeoffItemAction } from '@/lib/estimating/actions/takeoff';
import {
  CREATABLE_LINE_TYPES,
  TAKEOFF_DISPOSITIONS,
  TAKEOFF_DISPOSITION_LABELS,
  TAKEOFF_LINE_TYPE_LABELS,
  UNITS_OF_MEASURE,
  type TakeoffLineType,
} from '@/lib/estimating/constants';
import type { LaborRate, ScopeCategory } from '@/lib/estimating/types';

/**
 * Manual line entry.
 *
 * The cost fields shown follow the chosen line type, so an estimator adding a
 * subcontract quote is not asked about waste percentages. Everything still
 * posts, because hidden inputs keep the unused fields at zero — the schema
 * validates the whole shape either way.
 */
export function AddLineForm({
  estimateId,
  scopeCategories,
  laborRates,
  defaultLineType = 'material',
  defaultScopeCategoryId,
}: {
  estimateId: string;
  scopeCategories: ScopeCategory[];
  laborRates: LaborRate[];
  defaultLineType?: TakeoffLineType;
  defaultScopeCategoryId?: string;
}) {
  const [lineType, setLineType] = useState<TakeoffLineType>(defaultLineType);

  const showsMaterial = lineType === 'material' || lineType === 'other' || lineType === 'lump_sum';
  const showsLabor = lineType === 'material' || lineType === 'labor';
  const showsEquipment = lineType === 'equipment';
  const showsSub = lineType === 'subcontract';
  const showsOther = lineType === 'allowance' || lineType === 'lump_sum' || lineType === 'other';

  return (
    <ActionForm action={createTakeoffItemAction} className="space-y-3" resetOnSuccess>
      <input type="hidden" name="estimate_id" value={estimateId} />
      {/* Always submit every cost field so the schema sees a complete line. */}
      {!showsMaterial && <input type="hidden" name="unit_material_cost" value="0" />}
      {!showsMaterial && <input type="hidden" name="material_waste_percent" value="0" />}
      {!showsLabor && <input type="hidden" name="labor_hours_per_unit" value="0" />}
      {!showsLabor && <input type="hidden" name="labor_rate_id" value="" />}
      {!showsEquipment && <input type="hidden" name="equipment_cost" value="0" />}
      {!showsSub && <input type="hidden" name="subcontract_cost" value="0" />}
      {!showsOther && <input type="hidden" name="other_cost" value="0" />}
      <input type="hidden" name="labor_modifier_factor" value="1" />
      <input type="hidden" name="apply_estimate_conditions" value="on" />
      <input type="hidden" name="is_taxable" value={lineType === 'material' ? 'on' : ''} />

      <FormError />

      <FieldGrid columns={4}>
        <Field label="Line type" name="line_type">
          <SelectInput
            name="line_type"
            value={lineType}
            onChange={(event) => setLineType(event.target.value as TakeoffLineType)}
          >
            {CREATABLE_LINE_TYPES.map((type) => (
              <option key={type} value={type}>
                {TAKEOFF_LINE_TYPE_LABELS[type]}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Description" name="description" required className="sm:col-span-2">
          <TextInput name="description" required placeholder="e.g. 24x12 rectangular duct" />
        </Field>
        <Field label="Scope" name="scope_category_id">
          <SelectInput name="scope_category_id" defaultValue={defaultScopeCategoryId ?? ''}>
            <option value="">Unassigned</option>
            {scopeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectInput>
        </Field>
      </FieldGrid>

      <FieldGrid columns={4}>
        <Field label="Quantity" name="quantity">
          <NumberInput name="quantity" step="0.0001" min="0" defaultValue={1} />
        </Field>
        <Field label="Unit" name="unit">
          <SelectInput name="unit" defaultValue={lineType === 'subcontract' ? 'LOT' : 'EA'}>
            {UNITS_OF_MEASURE.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Disposition" name="disposition">
          <SelectInput
            name="disposition"
            defaultValue={lineType === 'allowance' ? 'allowance' : 'included'}
          >
            {TAKEOFF_DISPOSITIONS.map((value) => (
              <option key={value} value={value}>
                {TAKEOFF_DISPOSITION_LABELS[value]}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Internal notes" name="internal_notes">
          <TextInput name="internal_notes" placeholder="Optional" />
        </Field>
      </FieldGrid>

      <FieldGrid columns={4}>
        {showsMaterial && (
          <>
            <Field label="Unit material cost" name="unit_material_cost">
              <NumberInput name="unit_material_cost" step="0.0001" min="0" defaultValue={0} />
            </Field>
            <Field label="Waste %" name="material_waste_percent">
              <NumberInput
                name="material_waste_percent"
                step="0.01"
                min="0"
                max="100"
                defaultValue={0}
              />
            </Field>
          </>
        )}
        {showsLabor && (
          <>
            <Field label="Labor hours / unit" name="labor_hours_per_unit">
              <NumberInput name="labor_hours_per_unit" step="0.0001" min="0" defaultValue={0} />
            </Field>
            <Field
              label="Labor classification"
              name="labor_rate_id"
              hint="Required when hours are entered."
            >
              <SelectInput name="labor_rate_id" defaultValue="">
                <option value="">None</option>
                {laborRates.map((rate) => (
                  <option key={rate.id} value={rate.id}>
                    {rate.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </>
        )}
        {showsEquipment && (
          <Field label="Equipment cost" name="equipment_cost">
            <NumberInput name="equipment_cost" step="0.01" min="0" defaultValue={0} />
          </Field>
        )}
        {showsSub && (
          <Field label="Subcontract cost" name="subcontract_cost">
            <NumberInput name="subcontract_cost" step="0.01" min="0" defaultValue={0} />
          </Field>
        )}
        {showsOther && (
          <Field
            label="Other cost"
            name="other_cost"
            hint="May be negative for a credit or deduct."
          >
            <NumberInput name="other_cost" step="0.01" defaultValue={0} />
          </Field>
        )}
      </FieldGrid>

      <SubmitButton size="sm" pendingLabel="Adding…">
        Add line
      </SubmitButton>
    </ActionForm>
  );
}
