import { describe, expect, it } from 'vitest';
import { rateEquals, signOfRate, toRate } from '../src/rate.ts';

describe('exact construction and normalization', () => {
  it('reduces to lowest terms', () => {
    const rate = toRate(4n, 8n);
    expect(rate.ok).toBe(true);
    if (rate.ok) expect(rate.value).toEqual({ numerator: 1n, denominator: 2n });
  });

  it('normalizes a negative denominator by moving the sign to the numerator', () => {
    const rate = toRate(3n, -4n);
    expect(rate.ok).toBe(true);
    if (rate.ok) expect(rate.value).toEqual({ numerator: -3n, denominator: 4n });
  });

  it('keeps a positive rate positive when both numerator and denominator are negative', () => {
    const rate = toRate(-3n, -4n);
    expect(rate.ok).toBe(true);
    if (rate.ok) expect(rate.value).toEqual({ numerator: 3n, denominator: 4n });
  });

  it('normalizes zero to 0/1 regardless of the original denominator', () => {
    const a = toRate(0n, 5n);
    const b = toRate(0n, -3n);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.value).toEqual({ numerator: 0n, denominator: 1n });
      expect(b.value).toEqual({ numerator: 0n, denominator: 1n });
    }
  });

  it('rejects a zero denominator', () => {
    const rate = toRate(5n, 0n);
    expect(rate.ok).toBe(false);
    if (!rate.ok) expect(rate.error.code).toBe('ZERO_DENOMINATOR');
  });

  it('rejects a zero denominator even when the numerator is also zero', () => {
    expect(toRate(0n, 0n).ok).toBe(false);
  });
});

describe('rateEquals', () => {
  it('is true for two differently-represented but value-equal rates', () => {
    const a = toRate(1n, 2n);
    const b = toRate(50n, 100n);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(rateEquals(a.value, b.value)).toBe(true);
  });

  it('is false for genuinely different rates', () => {
    const a = toRate(1n, 2n);
    const b = toRate(1n, 3n);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(rateEquals(a.value, b.value)).toBe(false);
  });
});

describe('signOfRate', () => {
  it('reports -1, 0 and 1 explicitly', () => {
    const negative = toRate(-1n, 2n);
    const zero = toRate(0n, 5n);
    const positive = toRate(1n, 2n);
    expect(negative.ok && zero.ok && positive.ok).toBe(true);
    if (negative.ok && zero.ok && positive.ok) {
      expect(signOfRate(negative.value)).toBe(-1);
      expect(signOfRate(zero.value)).toBe(0);
      expect(signOfRate(positive.value)).toBe(1);
    }
  });
});
