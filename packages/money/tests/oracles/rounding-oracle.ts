// Independent oracle for half-even rounding (doctrine GOV-04: "a critical
// financial ... invariant shall have at least one oracle that does not reuse
// the implementation's principal calculation path").
//
// Authoring lineage: written independently of src/rounding.ts's
// `halfEvenRoundToInteger`, from the rounding DEFINITION directly, not by
// reading and re-deriving that function's code. Structural difference from the
// production path: production keeps the numerator's sign inside a single
// floor-division (`floorDivMod`) and reasons about the remainder's sign
// directly; this oracle strips the sign FIRST (mirrors negative inputs to
// positive, rounds the always-non-negative magnitude, then reapplies the
// sign), so a sign-handling defect in one implementation is unlikely to be
// reproduced identically in the other. Both must agree on every case tested in
// tests/rounding.test.ts and tests/rounding.property.test.ts; that agreement,
// not either implementation's self-consistency, is the actual evidence GOV-04
// requires. Test-only: this file is not exported from src/index.ts and is not
// part of @afenda/money's public API.

export function independentHalfEvenRoundOracle(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    throw new Error('independentHalfEvenRoundOracle: denominator must be strictly positive');
  }
  const negative = numerator < 0n;
  const magnitudeNumerator = negative ? -numerator : numerator;
  const truncatedQuotient = magnitudeNumerator / denominator;
  const remainder = magnitudeNumerator % denominator;
  const twiceRemainder = remainder * 2n;

  let roundedMagnitude: bigint;
  if (twiceRemainder < denominator) {
    roundedMagnitude = truncatedQuotient;
  } else if (twiceRemainder > denominator) {
    roundedMagnitude = truncatedQuotient + 1n;
  } else {
    roundedMagnitude = truncatedQuotient % 2n === 0n ? truncatedQuotient : truncatedQuotient + 1n;
  }

  return negative ? -roundedMagnitude : roundedMagnitude;
}
