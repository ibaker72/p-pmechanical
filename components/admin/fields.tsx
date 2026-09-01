'use client';

// Form inputs for the admin. Dense, keyboard-friendly, and consistent with the
// existing components/ui/input.tsx styling so the admin does not look like a
// different product from the rest of the site.

import { cn } from '@/lib/utils';
import { FieldError } from './ActionForm';

const baseInput =
  'w-full rounded border border-white/15 bg-ink-950/60 px-2.5 py-1.5 text-sm text-white placeholder:text-steel-500 ' +
  'focus:border-ember-400/60 focus:outline-none focus:ring-1 focus:ring-ember-400 disabled:opacity-50';

export function Field({
  label,
  name,
  children,
  hint,
  className,
  required,
}: {
  label: string;
  name?: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <label
        htmlFor={name}
        className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-steel-400"
      >
        {label}
        {required && <span className="ml-0.5 text-ember-400">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-steel-500">{hint}</p>}
      {name && <FieldError name={name} />}
    </div>
  );
}

export function TextInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} id={props.id ?? props.name} className={cn(baseInput, className)} />;
}

/** Numeric input: right-aligned, tabular, and step-friendly for fast entry. */
export function NumberInput({
  className,
  onWheel,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="number"
      inputMode="decimal"
      // A focused number input normally captures the mouse wheel and silently
      // changes its value. On a long takeoff that means scrolling past a
      // quantity field quietly edits the bid. Blurring on wheel lets the page
      // scroll and leaves the number alone.
      onWheel={(event) => {
        event.currentTarget.blur();
        onWheel?.(event);
      }}
      {...props}
      id={props.id ?? props.name}
      className={cn(baseInput, 'text-right tabular-nums', className)}
    />
  );
}

export function TextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      {...props}
      id={props.id ?? props.name}
      className={cn(baseInput, 'min-h-[72px] resize-y', className)}
    />
  );
}

export function SelectInput({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      id={props.id ?? props.name}
      className={cn(baseInput, 'appearance-none bg-ink-950/60 pr-7', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23ff9b22' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 0.5rem center',
      }}
    >
      {children}
    </select>
  );
}

export function CheckboxField({
  label,
  name,
  defaultChecked,
  hint,
  value = 'on',
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
  value?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 py-1 text-sm text-steel-100">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/25 bg-ink-950 text-ember-500 accent-ember-500 focus:ring-1 focus:ring-ember-400"
      />
      <span>
        {label}
        {hint && <span className="block text-[11px] text-steel-500">{hint}</span>}
      </span>
    </label>
  );
}

export function FieldGrid({
  children,
  columns = 2,
  className,
}: {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const map = {
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  } as const;
  return <div className={cn('grid grid-cols-1 gap-3', map[columns], className)}>{children}</div>;
}

export function Fieldset({
  legend,
  children,
  className,
}: {
  legend: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn('border-t border-white/10 pt-4', className)}>
      <legend className="pr-2 text-[11px] font-semibold uppercase tracking-wider text-ember-300">
        {legend}
      </legend>
      <div className="mt-2">{children}</div>
    </fieldset>
  );
}
