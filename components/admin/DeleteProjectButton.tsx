'use client';

import { ActionForm, ConfirmSubmitButton, FormError } from './ActionForm';
import { deleteProjectAction } from '@/lib/estimating/actions/projects';

export function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  return (
    <ActionForm action={deleteProjectAction} redirectTo={() => '/admin/projects'}>
      <input type="hidden" name="project_id" value={projectId} />
      <ConfirmSubmitButton
        size="md"
        confirm={`Delete "${projectName}" and every estimate on it? This cannot be undone.`}
      >
        Delete
      </ConfirmSubmitButton>
      <FormError className="mt-2" />
    </ActionForm>
  );
}
