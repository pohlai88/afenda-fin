// Rounding boundary registry (doctrine MON-04: "every rounding boundary is
// named and versioned"; Forbidden #8: "silent rounding or an unregistered
// rounding boundary").
//
// Honest scope for this phase: there is no ledger, document-line posting, tax,
// allocation or FX domain yet (no packages/operations, no db). Registering
// real business rounding boundaries for domains that do not exist would be
// fabricated evidence. This module registers exactly ONE boundary,
// `KERNEL.DEMO.HALF_EVEN.v1`, whose only purpose is to prove the *mechanism*
// (a named, versioned, explicit boundary id required by every call site; no
// generic `.round()` escape hatch) with real, executed, mutation-tested
// behavior. governance/PHASE_3A_KERNEL_REPORT.md records this explicitly as
// partial evidence for MON-04, not a claim that AFENDA's real business
// rounding boundaries are implemented.

import { err, type Result } from '@afenda/errors';
import { toMinorUnits, type MinorUnits, type MinorUnitsErrorCode } from './minor-units.ts';
import { toRate, type Rate, type RateErrorCode } from './rate.ts';

/** The fixed set of rounding boundaries registered in this phase. Deliberately singular — see module doc comment. */
export const ROUNDING_BOUNDARY_IDS = ['KERNEL.DEMO.HALF_EVEN.v1'] as const;

export type RoundingBoundaryId = (typeof ROUNDING_BOUNDARY_IDS)[number];

export type RoundingErrorCode = 'UNKNOWN_ROUNDING_BOUNDARY' | RateErrorCode | MinorUnitsErrorCode;

function isKnownRoundingBoundary(id: string): id is RoundingBoundaryId {
  return (ROUNDING_BOUNDARY_IDS as readonly string[]).includes(id);
}

function floorDivMod(numerator: bigint, denominator: bigint): { quotient: bigint; remainder: bigint } {
  let quotient = numerator / denominator;
  let remainder = numerator % denominator;
  if (remainder !== 0n && remainder < 0n) {
    quotient -= 1n;
    remainder += denominator;
  }
  return { quotient, remainder };
}

/** Round-half-to-even on an exact rational `numerator/denominator` (`denominator` must be strictly positive, as `Rate` guarantees). */
function halfEvenRoundToInteger(numerator: bigint, denominator: bigint): bigint {
  const { quotient, remainder } = floorDivMod(numerator, denominator);
  const twiceRemainder = remainder * 2n;
  if (twiceRemainder < denominator) return quotient;
  if (twiceRemainder > denominator) return quotient + 1n;
  return quotient % 2n === 0n ? quotient : quotient + 1n;
}

/**
 * Rounds an exact `Rate` (e.g. a quantity-times-rate product still in exact
 * rational form) to `MinorUnits`, under an explicitly named, registered
 * rounding boundary. There is no overload that omits `boundaryId` — every call
 * site must name which boundary authorizes the rounding.
 */
export function roundExactRateToMinorUnits(exactValue: Rate, boundaryId: RoundingBoundaryId): Result<MinorUnits, RoundingErrorCode> {
  if (!isKnownRoundingBoundary(boundaryId)) {
    return err('UNKNOWN_ROUNDING_BOUNDARY', `unregistered rounding boundary: ${String(boundaryId)}`);
  }
  // Defense in depth: even a forged `Rate` (type assertion past the brand) is
  // re-normalized here so a non-positive denominator cannot silently mis-round
  // or throw from bigint division. Honest callers already hold a `toRate` value;
  // this path is idempotent for those.
  const normalized = toRate(exactValue.numerator, exactValue.denominator);
  if (!normalized.ok) return normalized;
  const rounded = halfEvenRoundToInteger(normalized.value.numerator, normalized.value.denominator);
  return toMinorUnits(rounded);
}
