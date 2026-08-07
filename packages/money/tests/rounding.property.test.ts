import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ROUNDING_BOUNDARY_IDS, roundExactRateToMinorUnits } from '../src/rounding.ts';
import { toRate } from '../src/rate.ts';
import { toMinorUnits } from '../src/minor-units.ts';
import { independentHalfEvenRoundOracle } from './oracles/rounding-oracle.ts';

const BOUNDARY = ROUNDING_BOUNDARY_IDS[0];
const positiveDenominatorArbitrary = fc.bigInt({ min: 1n, max: 1_000_000n });
const numeratorArbitrary = fc.bigInt({ min: -1_000_000_000n, max: 1_000_000_000n });

describe('rounding properties (production vs independent oracle)', () => {
  it('production roundExactRateToMinorUnits agrees with the independent oracle for any exact rational', () => {
    fc.assert(
      fc.property(numeratorArbitrary, positiveDenominatorArbitrary, (numerator, denominator) => {
        const rate = toRate(numerator, denominator);
        expect(rate.ok).toBe(true);
        if (!rate.ok) return;
        const production = roundExactRateToMinorUnits(rate.value, BOUNDARY);
        const oracle = independentHalfEvenRoundOracle(rate.value.numerator, rate.value.denominator);
        expect(production).toEqual(toMinorUnits(oracle));
      }),
    );
  });

  it('the rounded result is always within 0.5 of the exact value (both directions)', () => {
    fc.assert(
      fc.property(numeratorArbitrary, positiveDenominatorArbitrary, (numerator, denominator) => {
        const rate = toRate(numerator, denominator);
        expect(rate.ok).toBe(true);
        if (!rate.ok) return;
        const production = roundExactRateToMinorUnits(rate.value, BOUNDARY);
        expect(production.ok).toBe(true);
        if (!production.ok) return;
        // |2 * (numerator - rounded * denominator)| <= denominator, checked with exact bigint arithmetic (no float).
        const roundedValue: bigint = production.value;
        const twiceDifference = 2n * (numerator - roundedValue * denominator);
        const absTwiceDifference = twiceDifference < 0n ? -twiceDifference : twiceDifference;
        expect(absTwiceDifference <= denominator).toBe(true);
      }),
    );
  });

  it('rounding an exact integer rate returns that integer unchanged', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: -1_000_000_000n, max: 1_000_000_000n }), (integerValue) => {
        const rate = toRate(integerValue, 1n);
        expect(rate.ok).toBe(true);
        if (!rate.ok) return;
        const production = roundExactRateToMinorUnits(rate.value, BOUNDARY);
        expect(production).toEqual(toMinorUnits(integerValue));
      }),
    );
  });
});
