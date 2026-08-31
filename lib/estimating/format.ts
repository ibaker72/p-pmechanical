// Display formatting for the estimating UI.
//
// All values arriving here are already rounded by the calculation engine or by
// Postgres; formatting never changes a number's value, only how it reads.

const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const USD_WHOLE = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function toFiniteNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function money(value: number | string | null | undefined): string {
  return USD.format(toFiniteNumber(value));
}

/** Whole dollars — for dashboard tiles where cents are noise. */
export function moneyWhole(value: number | string | null | undefined): string {
  return USD_WHOLE.format(toFiniteNumber(value));
}

export function percent(value: number | string | null | undefined, places = 2): string {
  return `${toFiniteNumber(value).toFixed(places)}%`;
}

export function hours(value: number | string | null | undefined, places = 2): string {
  return toFiniteNumber(value).toLocaleString('en-US', {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  });
}

export function quantity(value: number | string | null | undefined): string {
  const n = toFiniteNumber(value);
  // Show up to 4 decimals but drop trailing zeros — "12" not "12.0000".
  return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

export function factor(value: number | string | null | undefined): string {
  return toFiniteNumber(value).toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

export function integer(value: number | string | null | undefined): string {
  return Math.round(toFiniteNumber(value)).toLocaleString('en-US');
}

/** Format a `date` column (YYYY-MM-DD) without timezone drift. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return '—';
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function relativeDays(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const days = Math.round((date.getTime() - Date.now()) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`;
}

export function fileSize(bytes: number | null | undefined): string {
  const n = toFiniteNumber(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
