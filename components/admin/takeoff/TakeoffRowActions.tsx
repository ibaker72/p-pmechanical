'use client';

import Link from 'next/link';
import { ActionForm, ConfirmSubmitButton, FormError, SubmitButton } from '../ActionForm';
import {
  deleteTakeoffItemAction,
  duplicateTakeoffItemAction,
  moveTakeoffItemAction,
  syncLineToPriceBookAction,
} from '@/lib/estimating/actions/takeoff';

/**
 * Row controls. Only top-level rows get these — assembly components are
 * managed through their group row so an exploded assembly cannot be left
 * half-deleted.
 */
export function TakeoffRowActions({
  itemId,
  description,
  editHref,
  canSync,
}: {
  itemId: string;
  description: string;
  editHref: string;
  canSync: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={editHref}
        className="inline-flex h-8 items-center rounded px-2 text-xs font-semibold text-steel-300 hover:bg-white/10 hover:text-white"
      >
        Edit
      </Link>

      <ActionForm action={moveTakeoffItemAction} className="inline">
        <input type="hidden" name="item_id" value={itemId} />
        <input type="hidden" name="direction" value="up" />
        <SubmitButton variant="ghost" size="sm" title="Move up">
          ↑
        </SubmitButton>
      </ActionForm>

      <ActionForm action={moveTakeoffItemAction} className="inline">
        <input type="hidden" name="item_id" value={itemId} />
        <input type="hidden" name="direction" value="down" />
        <SubmitButton variant="ghost" size="sm" title="Move down">
          ↓
        </SubmitButton>
      </ActionForm>

      {canSync && (
        <ActionForm action={syncLineToPriceBookAction} className="inline">
          <input type="hidden" name="item_id" value={itemId} />
          <SubmitButton
            variant="ghost"
            size="sm"
            title="Reset this line's cost to the current price book value"
          >
            Sync
          </SubmitButton>
          <FormError className="mt-1" />
        </ActionForm>
      )}

      <ActionForm action={duplicateTakeoffItemAction} className="inline">
        <input type="hidden" name="item_id" value={itemId} />
        <SubmitButton variant="ghost" size="sm" title="Duplicate">
          Copy
        </SubmitButton>
      </ActionForm>

      <ActionForm action={deleteTakeoffItemAction} className="inline">
        <input type="hidden" name="item_id" value={itemId} />
        <ConfirmSubmitButton
          variant="ghost"
          confirm={`Delete "${description}"? Assembly components are removed with it.`}
          title="Delete"
        >
          Del
        </ConfirmSubmitButton>
        <FormError className="mt-1" />
      </ActionForm>
    </div>
  );
}
