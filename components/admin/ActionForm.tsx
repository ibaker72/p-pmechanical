'use client';

// Form plumbing for estimating server actions.
//
// Every mutation returns an ActionResult rather than throwing, so the form can
// render a real message ("The line could not be added because the selected
// labor classification no longer exists.") instead of a generic failure.
//
// There is no optimistic UI here on purpose. An estimate is financial data:
// the server recalculates and returns, then the page revalidates. Nothing is
// shown as saved until it actually is.

import { createContext, useContext, useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { ActionResult } from '@/lib/estimating/types';

type AnyResult = ActionResult<unknown> | null;

const FormResultContext = createContext<AnyResult>(null);

export function useFormResult(): AnyResult {
  return useContext(FormResultContext);
}

/** Field-level message for `name`, if the last submission rejected it. */
export function useFieldError(name: string): string | undefined {
  const result = useFormResult();
  if (!result || result.ok) return undefined;
  return result.fieldErrors?.[name];
}

export type ActionFn<T> = (
  prev: ActionResult<T> | null,
  formData: FormData,
) => Promise<ActionResult<T>>;

export function ActionForm<T>({
  action,
  children,
  className,
  redirectTo,
  resetOnSuccess,
  refocusOnSuccess,
  onSuccess,
  id,
}: {
  action: ActionFn<T>;
  children: React.ReactNode;
  className?: string;
  /** Navigate here after a successful submit. */
  redirectTo?: (data: T) => string;
  /** Clear the form after a successful submit — for repeated "add line" work. */
  resetOnSuccess?: boolean;
  /**
   * After a successful reset, put the cursor back on the first editable field.
   * Turns repetitive takeoff entry into type-tab-enter without reaching for the
   * mouse between lines.
   */
  refocusOnSuccess?: boolean;
  onSuccess?: (data: T) => void;
  id?: string;
}) {
  const [state, formAction] = useFormState<ActionResult<T> | null, FormData>(action, null);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  // Only react to a given success once, not on every re-render.
  const handled = useRef<ActionResult<T> | null>(null);

  useEffect(() => {
    if (!state || !state.ok || handled.current === state) return;
    handled.current = state;
    if (resetOnSuccess) formRef.current?.reset();
    if (refocusOnSuccess) {
      const first = formRef.current?.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
      );
      first?.focus();
    }
    onSuccess?.(state.data);
    if (redirectTo) router.push(redirectTo(state.data));
  }, [state, redirectTo, resetOnSuccess, refocusOnSuccess, onSuccess, router]);

  return (
    <FormResultContext.Provider value={state}>
      <form ref={formRef} id={id} action={formAction} className={className}>
        {children}
      </form>
    </FormResultContext.Provider>
  );
}

/** Renders the last submission's top-level error. */
export function FormError({ className }: { className?: string }) {
  const result = useFormResult();
  if (!result || result.ok) return null;
  return (
    <p
      role="alert"
      className={cn(
        'rounded border border-red-400/30 bg-red-400/[0.08] px-3 py-2 text-sm text-red-200',
        className,
      )}
    >
      {result.error}
    </p>
  );
}

export function FieldError({ name }: { name: string }) {
  const message = useFieldError(name);
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-300">{message}</p>;
}

export function SubmitButton({
  children,
  className,
  variant = 'primary',
  size = 'md',
  pendingLabel,
  title,
  formAction,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  pendingLabel?: string;
  title?: string;
  formAction?: (formData: FormData) => void;
}) {
  const { pending } = useFormStatus();
  const variants: Record<string, string> = {
    primary: 'bg-ember-500 text-ink-950 hover:bg-ember-400',
    outline: 'border border-white/20 bg-white/5 text-white hover:bg-white/10',
    ghost: 'text-steel-200 hover:bg-white/10 hover:text-white',
    danger: 'border border-red-400/40 bg-red-500/10 text-red-200 hover:bg-red-500/20',
  };
  return (
    <button
      type="submit"
      title={title}
      formAction={formAction}
      disabled={pending}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 focus-visible:ring-offset-1 focus-visible:ring-offset-ink-950',
        'disabled:cursor-not-allowed disabled:opacity-60',
        size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
        variants[variant],
        className,
      )}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

/**
 * Small icon-style button for destructive row actions.
 * `confirm` is a genuine guard, not decoration: deletes are not undoable.
 */
export function ConfirmSubmitButton({
  children,
  confirm,
  className,
  variant = 'danger',
  size = 'sm',
  title,
}: {
  children: React.ReactNode;
  confirm: string;
  className?: string;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  title?: string;
}) {
  const { pending } = useFormStatus();
  const variants: Record<string, string> = {
    primary: 'bg-ember-500 text-ink-950 hover:bg-ember-400',
    outline: 'border border-white/20 bg-white/5 text-white hover:bg-white/10',
    ghost: 'text-steel-400 hover:bg-white/10 hover:text-white',
    danger: 'border border-red-400/40 bg-red-500/10 text-red-200 hover:bg-red-500/20',
  };
  return (
    <button
      type="submit"
      title={title}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirm)) event.preventDefault();
      }}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 focus-visible:ring-offset-1 focus-visible:ring-offset-ink-950',
        'disabled:cursor-not-allowed disabled:opacity-60',
        size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Confirmation banner shown after a successful submit that stays on the page. */
export function FormSuccess({ message }: { message: string }) {
  const result = useFormResult();
  if (!result || !result.ok) return null;
  return (
    <p className="rounded border border-emerald-400/30 bg-emerald-400/[0.08] px-3 py-2 text-sm text-emerald-200">
      {message}
    </p>
  );
}
