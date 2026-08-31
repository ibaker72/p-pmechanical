'use client';

import Link from 'next/link';
import { ActionForm, ConfirmSubmitButton, FormError, SubmitButton } from '../ActionForm';
import { NumberInput } from '../fields';
import {
  deleteMaterialAction,
  toggleMaterialActiveAction,
  updateMaterialCostAction,
} from '@/lib/estimating/actions/catalog';

/** Inline cost update — the most common price-book edit by a wide margin. */
export function MaterialCostCell({
  materialId,
  unitCost,
}: {
  materialId: string;
  unitCost: number | string;
}) {
  return (
    <ActionForm action={updateMaterialCostAction} className="flex items-center justify-end gap-1">
      <input type="hidden" name="material_id" value={materialId} />
      <label className="sr-only" htmlFor={`cost-${materialId}`}>
        Unit cost
      </label>
      <NumberInput
        id={`cost-${materialId}`}
        name="unit_cost"
        step="0.0001"
        min="0"
        defaultValue={unitCost}
        className="h-8 w-28 py-1"
      />
      <SubmitButton variant="ghost" size="sm" title="Update cost">
        Set
      </SubmitButton>
      <FormError className="basis-full" />
    </ActionForm>
  );
}

export function MaterialRowActions({
  materialId,
  name,
  isActive,
  editHref,
}: {
  materialId: string;
  name: string;
  isActive: boolean;
  editHref: string;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={editHref}
        className="inline-flex h-8 items-center rounded px-2 text-xs font-semibold text-steel-300 hover:bg-white/10 hover:text-white"
      >
        Edit
      </Link>
      <ActionForm action={toggleMaterialActiveAction} className="inline">
        <input type="hidden" name="material_id" value={materialId} />
        <SubmitButton variant="ghost" size="sm">
          {isActive ? 'Deactivate' : 'Activate'}
        </SubmitButton>
      </ActionForm>
      <ActionForm action={deleteMaterialAction} className="inline">
        <input type="hidden" name="material_id" value={materialId} />
        <ConfirmSubmitButton
          variant="ghost"
          confirm={`Delete "${name}" from the price book? Existing estimates keep their snapshotted prices, but deactivating is usually the better choice.`}
        >
          Del
        </ConfirmSubmitButton>
        <FormError className="mt-1" />
      </ActionForm>
    </div>
  );
}
