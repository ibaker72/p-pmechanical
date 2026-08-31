'use client';

import { ActionForm, FormError, SubmitButton } from '../ActionForm';
import { NumberInput, SelectInput } from '../fields';
import { addMaterialLineAction } from '@/lib/estimating/actions/takeoff';
import type { ScopeCategory } from '@/lib/estimating/types';

/**
 * Compact "add this price-book item to the estimate" control, rendered inside a
 * search-results row so a takeoff can be built without leaving the page.
 */
export function AddMaterialLineForm({
  estimateId,
  materialId,
  scopeCategories,
  defaultScopeCategoryId,
}: {
  estimateId: string;
  materialId: string;
  scopeCategories: ScopeCategory[];
  defaultScopeCategoryId?: string | null;
}) {
  return (
    <ActionForm action={addMaterialLineAction} className="flex items-end justify-end gap-1.5">
      <input type="hidden" name="estimate_id" value={estimateId} />
      <input type="hidden" name="material_id" value={materialId} />
      <input type="hidden" name="disposition" value="included" />
      <div className="w-24">
        <label className="sr-only" htmlFor={`qty-${materialId}`}>
          Quantity
        </label>
        <NumberInput
          id={`qty-${materialId}`}
          name="quantity"
          step="0.0001"
          min="0"
          defaultValue={1}
          className="h-8 py-1"
        />
      </div>
      <div className="w-40">
        <label className="sr-only" htmlFor={`scope-${materialId}`}>
          Scope
        </label>
        <SelectInput
          id={`scope-${materialId}`}
          name="scope_category_id"
          defaultValue={defaultScopeCategoryId ?? ''}
          className="h-8 py-1"
        >
          <option value="">Unassigned</option>
          {scopeCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </SelectInput>
      </div>
      <SubmitButton size="sm" pendingLabel="Adding…">
        Add
      </SubmitButton>
      <FormError className="basis-full" />
    </ActionForm>
  );
}
