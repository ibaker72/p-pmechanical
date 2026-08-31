// Decimal-safe fixed-point arithmetic for estimating math.
//
// Currency and productivity math must not accumulate binary floating-point
// error: a 2,000-line commercial takeoff that is off by a cent per line is off
// by $20 on the bid. Every value here is a bigint scaled by 10^6 (SCALE), so
// addition, subtraction and comparison are exact and multiplication/division
// round explicitly and predictably.
//
// Rounding is HALF-UP AWAY FROM ZERO (2.005 -> 2.01, -2.005 -> -2.01), which is
// what construction accounting and every spreadsheet an estimator will check
// this against does. Banker's rounding would surprise the user.
//
// The module is deliberately dependency-free and pure so it can be unit tested
// without a database or a browser.

export const SCALE = 6;
const SCALE_FACTOR = 1_000_000n;

/** A fixed-point decimal: the real value multiplied by 10^6. */
export type Dec = bigint;

export const ZERO: Dec = 0n;
export const ONE: Dec = SCALE_FACTOR;
export const HUNDRED: Dec = 100n * SCALE_FACTOR;

export class DecimalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecimalError';
  }
}

/** Integer division rounding half-up away from zero. */
function divRound(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new DecimalError('Division by zero');
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const q = n / d;
  const remainder = n % d;
  const rounded = remainder * 2n >= d ? q + 1n : q;
  return negative ? -rounded : rounded;
}

/**
 * Parse a decimal string with no float round-trip. Accepts an optional sign,
 * digits, a fractional part, and surrounding whitespace / thousands separators
 * and currency symbols (so pasted spreadsheet values work).
 */
export function fromString(input: string): Dec {
  const cleaned = input.trim().replace(/[$,\s]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '+') return ZERO;
  const match = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(cleaned);
  if (!match) throw new DecimalError(`Not a valid decimal: ${JSON.stringify(input)}`);
  const [, sign, whole, fraction = ''] = match;
  if (whole === '' && fraction === '')
    throw new DecimalError(`Not a valid decimal: ${JSON.stringify(input)}`);

  const wholePart = BigInt(whole === '' ? '0' : whole) * SCALE_FACTOR;
  // Round rather than truncate when more than SCALE digits are supplied.
  const fracDigits = fraction.padEnd(SCALE + 1, '0');
  const kept = BigInt(fracDigits.slice(0, SCALE) || '0');
  const nextDigit = Number(fracDigits[SCALE] ?? '0');
  const fracPart = kept + (nextDigit >= 5 ? 1n : 0n);

  const magnitude = wholePart + fracPart;
  return sign === '-' ? -magnitude : magnitude;
}

/** Convert a JS number. Routed through a decimal string so 0.1 + 0.2 never leaks in. */
export function fromNumber(value: number): Dec {
  if (!Number.isFinite(value)) throw new DecimalError(`Not a finite number: ${value}`);
  return fromString(value.toFixed(SCALE));
}

/** Coerce anything the app might hold (Supabase returns numerics as strings). */
export function dec(value: Dec | number | string | null | undefined): Dec {
  if (value === null || value === undefined) return ZERO;
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return fromNumber(value);
  return fromString(value);
}

export function add(a: Dec, b: Dec): Dec {
  return a + b;
}
export function sub(a: Dec, b: Dec): Dec {
  return a - b;
}
export function mul(a: Dec, b: Dec): Dec {
  return divRound(a * b, SCALE_FACTOR);
}
export function div(a: Dec, b: Dec): Dec {
  if (b === ZERO) throw new DecimalError('Division by zero');
  return divRound(a * SCALE_FACTOR, b);
}
export function neg(a: Dec): Dec {
  return -a;
}
export function abs(a: Dec): Dec {
  return a < 0n ? -a : a;
}
export function isZero(a: Dec): boolean {
  return a === ZERO;
}
export function isNegative(a: Dec): boolean {
  return a < ZERO;
}
export function cmp(a: Dec, b: Dec): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}
export function max(a: Dec, b: Dec): Dec {
  return a > b ? a : b;
}
export function min(a: Dec, b: Dec): Dec {
  return a < b ? a : b;
}

export function sum(values: Dec[]): Dec {
  let total = ZERO;
  for (const v of values) total += v;
  return total;
}

/** Round to `places` decimal places, half-up away from zero. */
export function roundTo(value: Dec, places: number): Dec {
  if (places < 0 || places > SCALE || !Number.isInteger(places)) {
    throw new DecimalError(`places must be an integer 0..${SCALE}, got ${places}`);
  }
  const step = 10n ** BigInt(SCALE - places);
  if (step === 1n) return value;
  return divRound(value, step) * step;
}

/** Round to cents. Use for every stored or displayed dollar amount. */
export function roundMoney(value: Dec): Dec {
  return roundTo(value, 2);
}

/** Round to 4 places. Use for labor hours, percentages and factors. */
export function roundRate(value: Dec): Dec {
  return roundTo(value, 4);
}

/** `value` percent of `base`, e.g. percentOf(dec(100), dec(20)) -> 20. */
export function percentOf(base: Dec, percent: Dec): Dec {
  return div(mul(base, percent), HUNDRED);
}

/** Multiply by (1 + percent/100). */
export function applyPercentIncrease(base: Dec, percent: Dec): Dec {
  return add(base, percentOf(base, percent));
}

export function toFixed(value: Dec, places = 2): string {
  const rounded = roundTo(value, places);
  const negative = rounded < 0n;
  const magnitude = negative ? -rounded : rounded;
  const whole = magnitude / SCALE_FACTOR;
  const fraction = (magnitude % SCALE_FACTOR).toString().padStart(SCALE, '0').slice(0, places);
  const sign = negative && (whole !== 0n || Number(fraction) !== 0) ? '-' : '';
  return places === 0 ? `${sign}${whole}` : `${sign}${whole}.${fraction}`;
}

/**
 * Convert to a JS number for display or for handing to Postgres numeric.
 * Values are rounded first, so the double always lands on an exactly
 * representable-enough value for a numeric(16,2) / numeric(14,4) column.
 */
export function toNumber(value: Dec, places = 6): number {
  return Number(toFixed(value, places));
}

/** Money as a plain number, rounded to cents. */
export function toMoneyNumber(value: Dec): number {
  return Number(toFixed(value, 2));
}

/** Rate/hours/percent as a plain number, rounded to 4 places. */
export function toRateNumber(value: Dec): number {
  return Number(toFixed(value, 4));
}
