'use client';

import { ActionForm, FormError, SubmitButton } from '@/components/admin/ActionForm';
import { Field, TextInput } from '@/components/admin/fields';
import { loginAction } from './actions';

export function LoginForm({ next }: { next?: string }) {
  return (
    <ActionForm
      action={loginAction}
      className="space-y-4 rounded-lg border border-white/10 bg-ink-900/60 p-5"
    >
      <input type="hidden" name="next" value={next ?? ''} />
      <FormError />
      <Field label="Admin password" name="password" required>
        <TextInput
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
        />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </ActionForm>
  );
}
