// Instant: an absolute point in time (doctrine TIM-01/TIM-03).
//
// Represented as an integer count of milliseconds since the Unix epoch, always
// UTC. `Number.isSafeInteger` bounds the representable range, which keeps this
// entirely inside IEEE-754's exactly-representable integer range — there is no
// float-precision ambiguity for the range this module accepts. The valid range is
// further bounded to four-digit civil years (0000-01-01 through 9999-12-31) so
// canonical-string serialization is always exactly the fixed-width form this
// module parses back — see `MIN_EPOCH_MILLIS`/`MAX_EPOCH_MILLIS`.
//
// Canonicalization (DET-05): exactly one textual form is accepted/produced —
// `YYYY-MM-DDTHH:mm:ss.sssZ` (RFC 3339, UTC, exactly 3 fractional-second digits).
// This is intentionally narrower than the full RFC 3339 grammar (no non-Z offsets
// accepted) so the canonical form is unambiguous by construction rather than by
// convention; broader interoperability is left for a future contracts package
// with an explicit product requirement (not invented here).
//
// `Date`/`setUTCFullYear` are used internally, but ONLY as pure calendar-math
// helpers applied to already-known, explicitly supplied field values (never the
// legacy `Date.UTC`/`new Date(y, m, d)` two-digit-year special case, and never the
// ambient zero-argument `new Date()`). This module never calls `Date.now()` — see
// ./system-clock.ts for the one sanctioned ambient-clock call site in this
// package, and scripts/check-architecture.ts (SCC-24 / Forbidden #13) for the
// static control that enforces this repository-wide for packages/*.

import { err, ok, type Result } from '@afenda/errors';

/** An absolute instant in time, UTC, millisecond precision. */
export interface Instant {
  readonly epochMillis: number;
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

/** Inclusive lower bound: 0000-01-01T00:00:00.000Z. */
export const MIN_EPOCH_MILLIS = epochMillisFromUtcFields(0, 0, 1, 0, 0, 0, 0);
/** Inclusive upper bound: 9999-12-31T23:59:59.999Z. */
export const MAX_EPOCH_MILLIS = epochMillisFromUtcFields(9999, 11, 31, 23, 59, 59, 999);

/**
 * Constructs an `Instant` from an explicit epoch-millisecond count. Rejects any
 * value outside `Number.isSafeInteger`'s range, and any value outside the
 * four-digit-year range this module can canonically serialize.
 */
export function instantFromEpochMillis(epochMillis: number): Result<Instant, InstantErrorCode> {
  if (!Number.isSafeInteger(epochMillis)) {
    return err('NOT_SAFE_INTEGER', `epochMillis must be a safe integer, got ${String(epochMillis)}`);
  }
  if (epochMillis < MIN_EPOCH_MILLIS || epochMillis > MAX_EPOCH_MILLIS) {
    return err('OUT_OF_RANGE', `epochMillis ${String(epochMillis)} is outside the four-digit-year range`);
  }
  return ok({ epochMillis });
}

/** Serializes `instant` to its canonical RFC 3339 UTC string form. */
export function instantToCanonicalString(instant: Instant): string {
  const date = new Date(instant.epochMillis);
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  const second = String(date.getUTCSeconds()).padStart(2, '0');
  const millis = String(date.getUTCMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${millis}Z`;
}

/** Parses the canonical RFC 3339 UTC string form produced by `instantToCanonicalString`. */
export function parseInstant(canonical: string): Result<Instant, InstantErrorCode> {
  const match = CANONICAL_INSTANT_PATTERN.exec(canonical);
  if (!match) {
    return err('MALFORMED_CANONICAL_STRING', `not a canonical AFENDA instant string: ${canonical}`);
  }
  const [, year, month, day, hour, minute, second, millis] = match as unknown as [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  const epochMillis = epochMillisFromUtcFields(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    Number(millis),
  );
  // setUTCFullYear/setUTCHours normalize out-of-range fields (e.g. month 13, day
  // 32) instead of rejecting them; round-trip the result and require it to
  // reproduce the exact input string so a malformed-but-numeric calendar value
  // (e.g. "2026-02-30") is rejected too.
  const candidate: Instant = { epochMillis };
  if (instantToCanonicalString(candidate) !== canonical) {
    return err('MALFORMED_CANONICAL_STRING', `not a valid calendar instant: ${canonical}`);
  }
  return ok(candidate);
}

/** Total order on instants: negative if `a` is before `b`, positive if after, zero if equal. */
export function compareInstants(a: Instant, b: Instant): number {
  return a.epochMillis - b.epochMillis;
}
