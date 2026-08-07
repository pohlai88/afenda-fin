// MinorUnits: an exact authoritative monetary amount, always bigint, never
// binary floating point (doctrine MON-01, Forbidden #4). No `parseFloat`,
// `Number(...)`, or implicit float arithmetic appears anywhere in this module —
// scripts/check-money-safety.ts (SCC-03) mechanically enforces that for this
// package's src/ tree.
//
// Range decision (MON-06 "range, overflow and sign behavior are part of money
// correctness" + the phase brief's explicit instruction not to let bigint's
// arbitrary range silently define database compatibility): AFENDA deliberately
// bounds MinorUnits to exactly PostgreSQL's `bigint` range,
// [-9223372036854775808, 9223372036854775807]. This is a forward-compatibility
// decision for a `bigint` PostgreSQL column that does not exist yet in this
// phase (no database code is created here) — it is recorded now so the type
// never silently drifts into a range a future ledger schema could not store.
// A different, wider-precision `numeric` representation is left to a future
// decimal/valuation type if AFENDA ever needs amounts genuinely outside this
// range; MinorUnits itself does not attempt to be that type.

import { err, ok, type Result } from '@afenda/errors';

declare const minorUnitsBrand: unique symbol;

/** An exact authoritative monetary amount in minor currency units. Always bigint, never `number`. */
export type MinorUnits = bigint & { readonly [minorUnitsBrand]: 'MinorUnits' };

export type MinorUnitsErrorCode = 'OUT_OF_RANGE' | 'MALFORMED_CANONICAL_STRING';

/** Inclusive lower bound: PostgreSQL `bigint` minimum. */
export const MIN_MINOR_UNITS: bigint = -9_223_372_036_854_775_808n;
/** Inclusive upper bound: PostgreSQL `bigint` maximum. */
export const MAX_MINOR_UNITS: bigint = 9_223_372_036_854_775_807n;

/**
 * Validates and brands a `bigint` as `MinorUnits`. Deliberately accepts only
 * `bigint` — there is no overload and no code path that accepts `number`.
 */
export function toMinorUnits(value: bigint): Result<MinorUnits, MinorUnitsErrorCode> {
  if (value < MIN_MINOR_UNITS || value > MAX_MINOR_UNITS) {
    return err('OUT_OF_RANGE', `minor units ${value.toString()} is outside [${MIN_MINOR_UNITS.toString()}, ${MAX_MINOR_UNITS.toString()}]`);
  }
  // Single sanctioned brand-attaching cast, immediately after the range check,
  // inside this module's one smart constructor — see the identical rationale in
  // currency.ts's toCurrencyCode.
  return ok(value as MinorUnits);
}

const CANONICAL_INTEGER_STRING_PATTERN = /^-?[0-9]+$/;

/**
 * Parses a canonical minor-units integer string (e.g. `"12345"`, `"-500"`,
 * `"0"`). Rejects leading zeros (except the single digit `"0"`), a leading
 * `"+"`, `"-0"`, decimal points, exponential notation, and whitespace — there
 * is exactly one canonical string per valid amount (DET-05).
 */
export function parseMinorUnits(canonical: string): Result<MinorUnits, MinorUnitsErrorCode> {
  if (!CANONICAL_INTEGER_STRING_PATTERN.test(canonical)) {
    return err('MALFORMED_CANONICAL_STRING', `not a canonical minor-units integer string: ${JSON.stringify(canonical)}`);
  }
  if (canonical === '-0') {
    return err('MALFORMED_CANONICAL_STRING', `"-0" is not canonical; use "0"`);
  }
  const digits = canonical.startsWith('-') ? canonical.slice(1) : canonical;
  if (digits.length > 1 && digits.startsWith('0')) {
    return err('MALFORMED_CANONICAL_STRING', `leading zeros are not canonical: ${JSON.stringify(canonical)}`);
  }
  const value = BigInt(canonical);
  return toMinorUnits(value);
}

/** Serializes `value` to its canonical integer string form. Always a plain integer string, never exponential/decimal notation. */
export function minorUnitsToCanonicalString(value: MinorUnits): string {
  return value.toString();
}

export type MinorUnitsArithmeticErrorCode = 'RANGE_OVERFLOW';

/**
 * Exact addition. Fails explicitly (never wraps/truncates) if the result would
 * leave the valid range. Reuses `toMinorUnits` as the single range-check
 * authority rather than duplicating the bound comparison.
 */
export function addMinorUnits(a: MinorUnits, b: MinorUnits): Result<MinorUnits, MinorUnitsArithmeticErrorCode> {
  const sum: bigint = a + b;
  const validated = toMinorUnits(sum);
  if (!validated.ok) {
    return err('RANGE_OVERFLOW', `addMinorUnits overflow: ${a.toString()} + ${b.toString()} = ${sum.toString()}`);
  }
  return validated;
}

/**
 * Exact subtraction. Fails explicitly (never wraps/truncates) if the result
 * would leave the valid range. Reuses `toMinorUnits` as the single range-check
 * authority rather than duplicating the bound comparison.
 */
export function subtractMinorUnits(a: MinorUnits, b: MinorUnits): Result<MinorUnits, MinorUnitsArithmeticErrorCode> {
  const difference: bigint = a - b;
  const validated = toMinorUnits(difference);
  if (!validated.ok) {
    return err('RANGE_OVERFLOW', `subtractMinorUnits overflow: ${a.toString()} - ${b.toString()} = ${difference.toString()}`);
  }
  return validated;
}

/** The sign of `value`: -1, 0, or 1. Explicit, never inferred from formatting. */
export function signOfMinorUnits(value: MinorUnits): -1 | 0 | 1 {
  if (value < 0n) return -1;
  if (value > 0n) return 1;
  return 0;
}
