import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { rateEquals, toRate } from '../src/rate.ts';

const nonZeroBigIntArbitrary = fc.bigInt({ min: -1_000_000_000_000n, max: 1_000_000_000_000n }).filter((n) => n !== 0n);

describe('Rate properties', () => {
  it('normalization preserves the exact rational value (cross-multiplication against the input)', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: -1_000_000_000_000n, max: 1_000_000_000_000n }), nonZeroBigIntArbitrary, (numerator, denominator) => {
        const result = toRate(numerator, denominator);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        // value(result) == numerator/denominator  <=>  result.numerator * denominator == numerator * result.denominator
        expect(result.value.numerator * denominator).toBe(numerator * result.value.denominator);
      }),
    );
  });

  it('the denominator is never zero for any successfully constructed Rate', () => {
    fc.assert(
      fc.property(fc.bigInt(), nonZeroBigIntArbitrary, (numerator, denominator) => {
        const result = toRate(numerator, denominator);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value.denominator).not.toBe(0n);
      }),
    );
  });

  it('toRate always rejects a zero denominator, for any numerator', () => {
    fc.assert(
      fc.property(fc.bigInt(), (numerator) => {
        expect(toRate(numerator, 0n).ok).toBe(false);
      }),
    );
  });

  it('sign normalization is deterministic: the denominator is always strictly positive', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: -1_000_000_000_000n, max: 1_000_000_000_000n }), nonZeroBigIntArbitrary, (numerator, denominator) => {
        const result = toRate(numerator, denominator);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value.denominator > 0n).toBe(true);
      }),
    );
  });

  it('two rates built from proportional numerator/denominator pairs are rateEquals', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: -1000n, max: 1000n }),
        nonZeroBigIntArbitrary,
        fc.integer({ min: 1, max: 10 }),
        (numerator, denominator, scale) => {
          const a = toRate(numerator, denominator);
          const b = toRate(numerator * BigInt(scale), denominator * BigInt(scale));
          expect(a.ok && b.ok).toBe(true);
          if (a.ok && b.ok) expect(rateEquals(a.value, b.value)).toBe(true);
        },
      ),
    );
  });
});
