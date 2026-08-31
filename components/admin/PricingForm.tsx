'use client';

import { ActionForm, FormError, FormSuccess, SubmitButton } from './ActionForm';
import { Field, FieldGrid, NumberInput, SelectInput, TextArea } from './fields';
import { updateEstimatePricingAction } from '@/lib/estimating/actions/estimates';
import { PRICING_MODES, PRICING_MODE_LABELS } from '@/lib/estimating/constants';
import type { Estimate } from '@/lib/estimating/types';

export function PricingForm({ estimate }: { estimate: Estimate }) {
  return (
    <ActionForm action={updateEstimatePricingAction} className="space-y-4">
      <input type="hidden" name="estimate_id" value={estimate.id} />
      <FormError />
      <FormSuccess message="Pricing saved and the estimate recalculated." />

      <FieldGrid columns={2}>
        <Field label="Overhead %" name="overhead_percent" hint="Applied to direct cost.">
          <NumberInput
            name="overhead_percent"
            step="0.01"
            min="0"
            defaultValue={estimate.overhead_percent}
          />
        </Field>
        <Field
          label="Contingency %"
          name="contingency_percent"
          hint="Also applied to direct cost, not on top of overhead."
        >
          <NumberInput
            name="contingency_percent"
            step="0.01"
            min="0"
            defaultValue={estimate.contingency_percent}
          />
        </Field>
      </FieldGrid>

      <FieldGrid columns={3}>
        <Field label="Pricing basis" name="pricing_mode">
          <SelectInput name="pricing_mode" defaultValue={estimate.pricing_mode}>
            {PRICING_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {PRICING_MODE_LABELS[mode]}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field
          label="Target gross margin %"
          name="target_margin_percent"
          hint="Sell = cost ÷ (1 − margin). Used in margin mode."
        >
          <NumberInput
            name="target_margin_percent"
            step="0.01"
            min="0"
            max="99.99"
            defaultValue={estimate.target_margin_percent}
          />
        </Field>
        <Field
          label="Markup %"
          name="markup_percent"
          hint="Sell = cost × (1 + markup). Used in markup mode."
        >
          <NumberInput
            name="markup_percent"
            step="0.01"
            min="0"
            defaultValue={estimate.markup_percent}
          />
        </Field>
      </FieldGrid>

      <FieldGrid columns={3}>
        <Field
          label="Fixed sell price"
          name="fixed_sell_price"
          hint="Used in fixed-price mode. Profit becomes whatever is left."
        >
          <NumberInput
            name="fixed_sell_price"
            step="0.01"
            min="0"
            defaultValue={estimate.fixed_sell_price ?? ''}
          />
        </Field>
        <Field
          label="Other direct cost"
          name="other_direct_cost"
          hint="Permits, bonds, freight not tied to a line."
        >
          <NumberInput
            name="other_direct_cost"
            step="0.01"
            min="0"
            defaultValue={estimate.other_direct_cost}
          />
        </Field>
        <Field
          label="Sales tax %"
          name="sales_tax_percent"
          hint="Applied to taxable material only."
        >
          <NumberInput
            name="sales_tax_percent"
            step="0.001"
            min="0"
            max="100"
            defaultValue={estimate.sales_tax_percent}
          />
        </Field>
      </FieldGrid>

      <Field label="Other direct cost notes" name="other_direct_cost_notes">
        <TextArea
          name="other_direct_cost_notes"
          rows={2}
          defaultValue={estimate.other_direct_cost_notes ?? ''}
          placeholder="What the other direct cost covers"
        />
      </Field>

      <SubmitButton pendingLabel="Recalculating…">Save & recalculate</SubmitButton>
    </ActionForm>
  );
}
