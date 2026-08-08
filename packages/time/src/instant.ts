// Instant: an absolute point in time (doctrine TIM-01/TIM-03).
//
// Represented as a branded integer count of milliseconds since the Unix epoch,
// always UTC. `Number.isSafeInteger` bounds the representable range, which keeps
// this entirely inside IEEE-754's exactly-representable integer range — there is
// no float-precision ambiguity for the range this module accepts. The valid
// range is further bounded to four-digit civil years (0000-01-01 through
// 9999-12-31) so canonical-string serialization is always exactly the fixed-width
// form this module parses back — see `MIN_EPOCH_MILLIS`/`MAX_EPOCH_MILLIS`.
//
// Branding (aligned with packages/money MinorUnits): `EpochMillis` is nominal.
// A plain `{ epochMillis: number }` is not an `Instant`, so float/NaN values
// cannot silently type-check into domain or transport encode paths.
//
// Canonicalization (DET-05): exactly one textual form is accepted/produced —
// `YYYY-MM-DDTHH:mm:ss.sssZ` (RFC 3339, UTC, exactly 3 fractional-second digits).
//
// `Date`/`setUTCFullYear` are used internally, but ONLY as pure calendar-math
// helpers applied to already-known, explicitly supplied field values (never the
// ambient zero-argument `new Date()`). This module never calls `Date.now()` —
// see ./system-clock.ts and scripts/check-architecture.ts (SCC-24).

import { err, ok, type Result } from '@afenda/errors';

declare const epochMillisBrand: unique symbol;

/** Branded UTC epoch-millisecond count. Only attached by `toEpochMillis`. */
export type EpochMillis = number & { readonly [epochMillisBrand]: 'EpochMillis' };

/** An absolute instant in time, UTC, millisecond precision. */
export interface Instant {
  readonly epochMillis: EpochMillis;
}

export type InstantErrorCode = 'NOT_SAFE_INTEGER' | 'OUT_OF_RANGE' | 'MALFORMED_CANONICAL_STRING';

const CANONICAL_INSTANT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/;

function epochMillisFromUtcFields(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millis: number,
): number {
  const date = new Date(0);
  date.setUTCFullYear(year, monthIndex, day);
  date.setUTCHours(hour, minute, second, millis);
  return date.getTime();
}

function formatEpochMillisUnchecked(epochMillis: number): string {
  const date = new Date(epochMillis);
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  const second = String(date.getUTCSeconds()).padStart(2, '0');
  const millis = String(date.getUTCMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${millis}Z`;
}

/** Inclusive lower bound: 0000-01-01T00:00:00.000Z. */
export const MIN_EPOCH_MILLIS = epochMillisFromUtcFields(0, 0, 1, 0, 0, 0, 0);
/** Inclusive upper bound: 9999-12-31T23:59:59.999Z. */
export const MAX_EPOCH_MILLIS = epochMillisFromUtcFields(9999, 11, 31, 23, 59, 59, 999);

/**
 * Validates and brands a millisecond epoch count. Rejects non-safe-integers
 * (including floats/NaN), out-of-range values, and normalizes `-0` to `0`.
 */
export function toEpochMillis(epochMillis: number): Result<EpochMillis, InstantErrorCode> {
  const normalized = Object.is(epochMillis, -0) ? 0 : epochMillis;
  if (!Number.isSafeInteger(normalized)) {
    return err('NOT_SAFE_INTEGER', `epochMillis must be a safe integer, got ${String(epochMillis)}`);
  }
  if (normalized < MIN_EPOCH_MILLIS || normalized > MAX_EPOCH_MILLIS) {
    return err('OUT_OF_RANGE', `epochMillis ${String(normalized)} is outside the four-digit-year range`);
  }
  // Single sanctioned brand-attaching cast, immediately after validation.
  return ok(normalized as EpochMillis);
}

/** Combines an already-validated `EpochMillis` into an `Instant`. */
export function makeInstant(epochMillis: EpochMillis): Instant {
  return { epochMillis };
}

/**
 * Constructs an `Instant` from an explicit epoch-millisecond count. Rejects any
 * value outside `Number.isSafeInteger`'s range, and any value outside the
 * four-digit-year range this module can canonically serialize.
 */
export function instantFromEpochMillis(epochMillis: number): Result<Instant, InstantErrorCode> {
  const branded = toEpochMillis(epochMillis);
  if (!branded.ok) return branded;
  return ok(makeInstant(branded.value));
}

/**
 * Serializes `instant` to its canonical RFC 3339 UTC string form.
 * Re-validates epoch millis so a forged/`as`-cast Instant cannot silently
 * truncate through `Date` (programmer fault → throw).
 */
export function instantToCanonicalString(instant: Instant): string {
  const checked = toEpochMillis(instant.epochMillis);
  if (!checked.ok) {
    throw new Error(`instantToCanonicalString: invalid Instant (${checked.error.code}): ${checked.error.message}`);
  }
  return formatEpochMillisUnchecked(checked.value);
}

/** Parses the canonical RFC 3339 UTC string form produced by `instantToCanonicalString`. */
export function parseInstant(canonical: string): Result<Instant, InstantErrorCode> {
  const match = CANONICAL_INSTANT_PATTERN.exec(canonical);
  if (match === null) {
    return err('MALFORMED_CANONICAL_STRING', `not a canonical AFENDA instant string: ${canonical}`);
  }
  const year = match[1];
  const month = match[2];
  const day = match[3];
  const hour = match[4];
  const minute = match[5];
  const second = match[6];
  const millis = match[7];
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    minute === undefined ||
    second === undefined ||
    millis === undefined
  ) {
    return err('MALFORMED_CANONICAL_STRING', `not a canonical AFENDA instant string: ${canonical}`);
  }
  const epochMillis = epochMillisFromUtcFields(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    Number(millis),
  );
  // setUTCFullYear/setUTCHours normalize out-of-range fields; require the
  // formatted result to reproduce the exact input string.
  if (formatEpochMillisUnchecked(epochMillis) !== canonical) {
    return err('MALFORMED_CANONICAL_STRING', `not a valid calendar instant: ${canonical}`);
  }
  return instantFromEpochMillis(epochMillis);
}

/** Total order on instants: negative if `a` is before `b`, positive if after, zero if equal. */
export function compareInstants(a: Instant, b: Instant): number {
  return a.epochMillis - b.epochMillis;
}

/** Equality via total order. */
export function instantEquals(a: Instant, b: Instant): boolean {
  return compareInstants(a, b) === 0;
}
