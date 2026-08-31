'use client';

import Link from 'next/link';
import { ActionForm, FormError, SubmitButton } from '../ActionForm';
import { NumberInput, SelectInput, TextInput } from '../fields';
import { updateTakeoffItemAction } from '@/lib/estimating/actions/takeoff';
import {
  TAKEOFF_DISPOSITIONS,
  TAKEOFF_DISPOSITION_LABELS,
  TAKEOFF_LINE_TYPES,
  TAKEOFF_LINE_TYPE_LABELS,
  UNITS_OF_MEASURE,
} from '@/lib/estimating/constants';
import type { LaborRate, ScopeCategory, TakeoffItem } from '@/lib/estimating/types';

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-steel-400">
        {label}
      </span>
      {children}
    </label>
  );
}

/**
 * Full editor for a single line, rendered in place of the row.
 *
 * Only the row being edited mounts a form. Every other row stays static markup,
 * so a takeoff with hundreds of lines does not pay to hydrate hundreds of forms.
 */
export function TakeoffEditRow({
  item,
  scopeCategories,
  laborRates,
  columns,
  cancelHref,
}: {
  item: TakeoffItem;
  scopeCategories: ScopeCategory[];
  laborRates: LaborRate[];
  columns: number;
  cancelHref: string;
}) {
  return (
    <tr className="bg-ember-500/[0.04]">
      <td colSpan={columns} className="border-b border-white/10 px-3 py-3">
        <ActionForm action={updateTakeoffItemAction} className="space-y-3">
          <input type="hidden" name="item_id" value={item.id} />
          <FormError />

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
            <div className="col-span-2">
              <Cell label="Description">
                <TextInput name="description" defaultValue={item.description} required />
              </Cell>
            </div>
            <Cell label="Type">
              <SelectInput name="line_type" defaultValue={item.line_type}>
                {TAKEOFF_LINE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {TAKEOFF_LINE_TYPE_LABELS[type]}
                  </option>
                ))}
              </SelectInput>
            </Cell>
            <Cell label="Scope">
              <SelectInput name="scope_category_id" defaultValue={item.scope_category_id ?? ''}>
                <option value="">Unassigned</option>
                {scopeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </SelectInput>
            </Cell>
            <Cell label="Qty">
              <NumberInput name="quantity" step="0.0001" min="0" defaultValue={item.quantity} />
            </Cell>
            <Cell label="Unit">
              <SelectInput name="unit" defaultValue={item.unit}>
                {UNITS_OF_MEASURE.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </SelectInput>
            </Cell>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
            <Cell label="Unit material $">
              <NumberInput
                name="unit_material_cost"
                step="0.0001"
                min="0"
                defaultValue={item.unit_material_cost}
              />
            </Cell>
            <Cell label="Waste %">
              <NumberInput
                name="material_waste_percent"
                step="0.01"
                min="0"
                max="100"
                defaultValue={item.material_waste_percent}
              />
            </Cell>
            <Cell label="Hrs / unit">
              <NumberInput
                name="labor_hours_per_unit"
                step="0.0001"
                min="0"
                defaultValue={item.labor_hours_per_unit}
              />
            </Cell>
            <Cell label="Labor class">
              <SelectInput name="labor_rate_id" defaultValue={item.labor_rate_id ?? ''}>
                <option value="">None</option>
                {laborRates.map((rate) => (
                  <option key={rate.id} value={rate.id}>
                    {rate.name}
                  </option>
                ))}
              </SelectInput>
            </Cell>
            <Cell label="Line factor">
              <NumberInput
                name="labor_modifier_factor"
                step="0.01"
                min="0.01"
                max="10"
                defaultValue={item.labor_modifier_factor}
              />
            </Cell>
            <Cell label="Disposition">
              <SelectInput name="disposition" defaultValue={item.disposition}>
                {TAKEOFF_DISPOSITIONS.map((value) => (
                  <option key={value} value={value}>
                    {TAKEOFF_DISPOSITION_LABELS[value]}
                  </option>
                ))}
              </SelectInput>
            </Cell>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
            <Cell label="Equipment $">
              <NumberInput
                name="equipment_cost"
                step="0.01"
                min="0"
                defaultValue={item.equipment_cost}
              />
            </Cell>
            <Cell label="Subcontract $">
              <NumberInput
                name="subcontract_cost"
                step="0.01"
                min="0"
                defaultValue={item.subcontract_cost}
              />
            </Cell>
            <Cell label="Other $">
              <NumberInput name="other_cost" step="0.01" defaultValue={item.other_cost} />
            </Cell>
            <div className="col-span-2 lg:col-span-3">
              <Cell label="Override reason">
                <TextInput
                  name="override_reason"
                  defaultValue={item.override_reason ?? ''}
                  placeholder="e.g. current vendor quote"
                />
              </Cell>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            <Cell label="Customer-facing description">
              <TextInput
                name="customer_description"
                defaultValue={item.customer_description ?? ''}
              />
            </Cell>
            <Cell label="Internal notes">
              <TextInput name="internal_notes" defaultValue={item.internal_notes ?? ''} />
            </Cell>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-steel-200">
              <input
                type="checkbox"
                name="apply_estimate_conditions"
                defaultChecked={item.apply_estimate_conditions}
                className="h-4 w-4 rounded border-white/25 bg-ink-950 accent-ember-500"
              />
              Apply estimate labor conditions
            </label>
            <label className="flex items-center gap-2 text-xs text-steel-200">
              <input
                type="checkbox"
                name="is_taxable"
                defaultChecked={item.is_taxable}
                className="h-4 w-4 rounded border-white/25 bg-ink-950 accent-ember-500"
              />
              Sales tax applies to material
            </label>
            <div className="ml-auto flex items-center gap-2">
              <Link
                href={cancelHref}
                className="inline-flex h-9 items-center rounded px-3 text-sm text-steel-300 hover:text-white"
              >
                Cancel
              </Link>
              <SubmitButton pendingLabel="Saving…">Save line</SubmitButton>
            </div>
          </div>
        </ActionForm>
      </td>
    </tr>
  );
}
