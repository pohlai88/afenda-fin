// Rate: an exact rational number (bigint numerator/denominator), used for
// intermediate quantity/rate calculations that must stay exact until an
// explicit, named rounding boundary converts them to posted `MinorUnits`
// (doctrine MON-02: "posted amounts and intermediate calculations use
// different exact representations"). Never converts through `number`.

import { err, ok, type Result } from '@afenda/errors';

/** An exact rational number in lowest terms, with a strictly positive denominator. */
export interface Rate {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

export type RateErrorCode = 'ZERO_DENOMINATOR';

function gcdBigInt(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const remainder = x % y;
    x = y;
    y = remainder;
  }
  return x;
}

/**
 * Constructs a `Rate` from a raw numerator/denominator, normalizing
 * deterministically: the denominator is always made strictly positive (sign is
 * carried entirely by the numerator), the fraction is reduced to lowest terms
 * by its exact GCD, and zero is always represented as `0/1` regardless of the
 * denominator it was originally paired with.
 */
export function toRate(numerator: bigint, denominator: bigint): Result<Rate, RateErrorCode> {
  if (denominator === 0n) {
    return err('ZERO_DENOMINATOR', 'Rate denominator must not be zero');
  }
  if (numerator === 0n) {
    return ok({ numerator: 0n, denominator: 1n });
  }
  const sign = denominator < 0n ? -1n : 1n;
  const normalizedNumerator = numerator * sign;
  const normalizedDenominator = denominator * sign;
  const divisor = gcdBigInt(normalizedNumerator, normalizedDenominator);
  return ok({ numerator: normalizedNumerator / divisor, denominator: normalizedDenominator / divisor });
}

/** Exact rational equality via cross-multiplication — correct even for two `Rate`s that were not both produced by `toRate`. */
export function rateEquals(a: Rate, b: Rate): boolean {
  return a.numerator * b.denominator === b.numerator * a.denominator;
}

/** The sign of `rate`: -1, 0, or 1. The denominator is always positive, so the sign is exactly the numerator's sign. */
export function signOfRate(rate: Rate): -1 | 0 | 1 {
  if (rate.numerator < 0n) return -1;
  if (rate.numerator > 0n) return 1;
  return 0;
}
