// Presentational primitives for the estimating admin.
//
// The design brief for this area is "contractor software", not marketing site:
// dense tables, hard numbers, no decorative gradients or motion. Money is
// always right-aligned and tabular so columns line up when scanned quickly.

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { money, moneyWhole } from '@/lib/estimating/format';
import {
  ESTIMATE_STATUS_LABELS,
  JOB_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  type EstimateStatus,
  type JobStatus,
  type ProjectStatus,
} from '@/lib/estimating/constants';

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumb?: { label: string; href?: string }[];
}) {
  return (
    <div className="mb-6 border-b border-white/10 pb-5">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-steel-400">
          {breadcrumb.map((crumb, index) => (
            <span key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && <span aria-hidden>/</span>}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-ember-300">
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl leading-tight tracking-tight text-white sm:text-3xl">
            {title}
          </h1>
          {subtitle && <div className="mt-1 text-sm text-steel-300">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Panel({
  children,
  className,
  as: Component = 'section',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'aside';
}) {
  return (
    <Component className={cn('rounded-lg border border-white/10 bg-ink-900/60', className)}>
      {children}
    </Component>
  );
}

export function PanelHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-steel-100">{title}</h2>
        {description && <p className="mt-1 text-xs text-steel-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PanelBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('p-4', className)}>{children}</div>;
}

/**
 * A single operational number. `emphasis` marks the figures an estimator is
 * actually deciding on (bid price, margin) so they read first.
 */
export function StatTile({
  label,
  value,
  hint,
  emphasis,
  tone = 'neutral',
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  emphasis?: boolean;
  tone?: 'neutral' | 'positive' | 'warning' | 'danger';
}) {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-300'
      : tone === 'warning'
        ? 'text-ember-300'
        : tone === 'danger'
          ? 'text-red-300'
          : 'text-white';
  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3',
        emphasis ? 'border-ember-500/40 bg-ember-500/[0.06]' : 'border-white/10 bg-ink-900/60',
      )}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-steel-400">
        {label}
      </div>
      <div
        className={cn(
          'mt-1 font-display tabular-nums leading-none',
          emphasis ? 'text-2xl' : 'text-xl',
          toneClass,
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] text-steel-400">{hint}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'info' | 'positive' | 'warning' | 'danger' | 'muted';
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: 'border-white/15 bg-white/5 text-steel-100',
    info: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
    positive: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    warning: 'border-ember-400/40 bg-ember-400/10 text-ember-200',
    danger: 'border-red-400/30 bg-red-400/10 text-red-200',
    muted: 'border-white/10 bg-white/[0.02] text-steel-400',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const ESTIMATE_STATUS_TONES: Record<EstimateStatus, Parameters<typeof Badge>[0]['tone']> = {
  draft: 'muted',
  ready_for_review: 'info',
  approved_internal: 'info',
  submitted: 'warning',
  awarded: 'positive',
  lost: 'danger',
  superseded: 'muted',
};

export function EstimateStatusBadge({ status }: { status: EstimateStatus }) {
  return <Badge tone={ESTIMATE_STATUS_TONES[status]}>{ESTIMATE_STATUS_LABELS[status]}</Badge>;
}

const PROJECT_STATUS_TONES: Record<ProjectStatus, Parameters<typeof Badge>[0]['tone']> = {
  draft: 'muted',
  bidding: 'info',
  submitted: 'warning',
  revision_requested: 'warning',
  awarded: 'positive',
  lost: 'danger',
  cancelled: 'muted',
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={PROJECT_STATUS_TONES[status]}>{PROJECT_STATUS_LABELS[status]}</Badge>;
}

const JOB_STATUS_TONES: Record<JobStatus, Parameters<typeof Badge>[0]['tone']> = {
  planning: 'info',
  active: 'positive',
  on_hold: 'warning',
  complete: 'positive',
  closed: 'muted',
  cancelled: 'muted',
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge tone={JOB_STATUS_TONES[status]}>{JOB_STATUS_LABELS[status]}</Badge>;
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

/** Horizontal scroll lives on the wrapper so the page body never scrolls sideways. */
export function TableWrap({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('w-full overflow-x-auto', className)}>{children}</div>;
}

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return <table className={cn('w-full min-w-full text-sm', className)}>{children}</table>;
}

export function TH({
  children,
  align = 'left',
  className,
  scope = 'col',
}: {
  children?: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  scope?: 'col' | 'row';
}) {
  return (
    <th
      scope={scope}
      className={cn(
        'whitespace-nowrap border-b border-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-steel-400',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TD({
  children,
  align = 'left',
  className,
  numeric,
  colSpan,
}: {
  children?: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  numeric?: boolean;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        'border-b border-white/5 px-3 py-2 align-top text-steel-100',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        numeric && 'tabular-nums',
        className,
      )}
    >
      {children}
    </td>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-sm font-semibold text-steel-100">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-steel-400">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/** Right-aligned currency cell content. */
export function Money({
  value,
  whole,
  className,
  muted,
}: {
  value: number | string | null | undefined;
  whole?: boolean;
  className?: string;
  muted?: boolean;
}) {
  const zero = !value || Number(value) === 0;
  return (
    <span className={cn('tabular-nums', (muted || zero) && 'text-steel-500', className)}>
      {whole ? moneyWhole(value) : money(value)}
    </span>
  );
}

export function Callout({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'positive';
  title?: React.ReactNode;
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    info: 'border-sky-400/30 bg-sky-400/[0.06] text-sky-100',
    warning: 'border-ember-400/40 bg-ember-400/[0.06] text-ember-100',
    danger: 'border-red-400/30 bg-red-400/[0.06] text-red-100',
    positive: 'border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-100',
  };
  return (
    <div className={cn('rounded-lg border px-4 py-3 text-sm', tones[tone])}>
      {title && <p className="font-semibold">{title}</p>}
      <div className={cn(title && 'mt-1', 'text-sm opacity-90')}>{children}</div>
    </div>
  );
}

/** Key/value row used on detail pages. */
export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/5 py-1.5 last:border-b-0">
      <dt className="text-xs uppercase tracking-wide text-steel-400">{label}</dt>
      <dd className="text-right text-sm text-steel-100">{children}</dd>
    </div>
  );
}

export { money, moneyWhole };
