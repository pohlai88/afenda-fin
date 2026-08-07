import { describe, expect, it } from 'vitest';
import { ROUNDING_BOUNDARY_IDS, roundExactRateToMinorUnits } from '../src/rounding.ts';
import { toRate, type Rate } from '../src/rate.ts';
import { toMinorUnits } from '../src/minor-units.ts';
import { independentHalfEvenRoundOracle } from './oracles/rounding-oracle.ts';

function rate(numerator: bigint, denominator: bigint): Rate {
  const result = toRate(numerator, denominator);
  if (!result.ok) throw new Error('test fixture construction failed');
  return result.value;
}

const BOUNDARY = ROUNDING_BOUNDARY_IDS[0];

describe('registered rounding boundary', () => {
  it('rejects an unregistered boundary id', () => {
    // Cast through `unknown` only in this test, to exercise the runtime guard
    // against a value that the type system would otherwise reject at the call
    // site — this is exactly what an untrusted/legacy caller could attempt.
    const result = roundExactRateToMinorUnits(rate(1n, 2n), 'NOT.A.REAL.BOUNDARY' as unknown as typeof BOUNDARY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('UNKNOWN_ROUNDING_BOUNDARY');
  });
});

describe('half-even rounding: positive ties', () => {
  it.each([
    ['0.5 -> 0 (round to even)', 1n, 2n, 0n],
    ['1.5 -> 2 (round to even)', 3n, 2n, 2n],
    ['2.5 -> 2 (round to even)', 5n, 2n, 2n],
    ['3.5 -> 4 (round to even)', 7n, 2n, 4n],
  ])('%s', (_label, numerator, denominator, expected) => {
    const result = roundExactRateToMinorUnits(rate(numerator, denominator), BOUNDARY);
    expect(result).toEqual(toMinorUnits(expected));
  });
});

describe('half-even rounding: negative ties', () => {
  it.each([
    ['-0.5 -> 0 (round to even)', -1n, 2n, 0n],
    ['-1.5 -> -2 (round to even)', -3n, 2n, -2n],
    ['-2.5 -> -2 (round to even)', -5n, 2n, -2n],
  ])('%s', (_label, numerator, denominator, expected) => {
    const result = roundExactRateToMinorUnits(rate(numerator, denominator), BOUNDARY);
    expect(result).toEqual(toMinorUnits(expected));
  });
});

describe('half-even rounding: non-tie cases', () => {
  it.each([
    ['0.49 rounds down', 49n, 100n, 0n],
    ['0.51 rounds up', 51n, 100n, 1n],
    ['-0.49 rounds toward zero (up in value)', -49n, 100n, 0n],
    ['-0.51 rounds down (away from zero in value)', -51n, 100n, -1n],
    ['exact integer stays unchanged', 10n, 1n, 10n],
  ])('%s', (_label, numerator, denominator, expected) => {
    const result = roundExactRateToMinorUnits(rate(numerator, denominator), BOUNDARY);
    expect(result).toEqual(toMinorUnits(expected));
  });
});

describe('independent oracle agreement', () => {
  it('agrees with the independently-written oracle on every example above', () => {
    const cases: Array<[bigint, bigint]> = [
      [1n, 2n],
      [3n, 2n],
      [5n, 2n],
      [7n, 2n],
      [-1n, 2n],
      [-3n, 2n],
      [-5n, 2n],
      [49n, 100n],
      [51n, 100n],
      [-49n, 100n],
      [-51n, 100n],
      [10n, 1n],
      [0n, 1n],
    ];
    for (const [numerator, denominator] of cases) {
      const production = roundExactRateToMinorUnits(rate(numerator, denominator), BOUNDARY);
      const oracle = independentHalfEvenRoundOracle(numerator, denominator);
      expect(production).toEqual(toMinorUnits(oracle));
    }
  });
});
