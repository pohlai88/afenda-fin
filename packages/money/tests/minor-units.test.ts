import { describe, expect, it } from 'vitest';
import {
  addMinorUnits,
  MAX_MINOR_UNITS,
  MIN_MINOR_UNITS,
  minorUnitsToCanonicalString,
  parseMinorUnits,
  signOfMinorUnits,
  subtractMinorUnits,
  toMinorUnits,
} from '../src/minor-units.ts';

describe('exact construction', () => {
  it('accepts zero, positive and negative bigints in range', () => {
    expect(toMinorUnits(0n).ok).toBe(true);
    expect(toMinorUnits(12_345n).ok).toBe(true);
    expect(toMinorUnits(-12_345n).ok).toBe(true);
  });

  it('rejects a value one below the minimum', () => {
    expect(toMinorUnits(MIN_MINOR_UNITS - 1n).ok).toBe(false);
  });

  it('rejects a value one above the maximum', () => {
    expect(toMinorUnits(MAX_MINOR_UNITS + 1n).ok).toBe(false);
  });

  it('accepts the exact minimum and maximum', () => {
    expect(toMinorUnits(MIN_MINOR_UNITS).ok).toBe(true);
    expect(toMinorUnits(MAX_MINOR_UNITS).ok).toBe(true);
  });
});

describe('required boundary corpus', () => {
  it('accepts 2^53 - 1, 2^53 and 2^53 + 1 as exact bigints (well within MinorUnits range)', () => {
    const belowSafeInteger = 2n ** 53n - 1n;
    const atSafeInteger = 2n ** 53n;
    const aboveSafeInteger = 2n ** 53n + 1n;
    for (const value of [belowSafeInteger, atSafeInteger, aboveSafeInteger]) {
      const built = toMinorUnits(value);
      expect(built.ok).toBe(true);
      if (built.ok) {
        // Round-trip through the canonical string exactly, proving no float
        // ever entered the path even though 2^53 exceeds float-safe range for
        // some representations elsewhere.
        expect(parseMinorUnits(minorUnitsToCanonicalString(built.value))).toEqual(built);
      }
    }
  });

  it('accepts the exact PostgreSQL bigint extrema', () => {
    expect(toMinorUnits(-9_223_372_036_854_775_808n).ok).toBe(true);
    expect(toMinorUnits(9_223_372_036_854_775_807n).ok).toBe(true);
  });

  it('rejects one-beyond the PostgreSQL bigint extrema', () => {
    expect(toMinorUnits(-9_223_372_036_854_775_809n).ok).toBe(false);
    expect(toMinorUnits(9_223_372_036_854_775_808n).ok).toBe(false);
  });
});

describe('canonical parse/serialize', () => {
  it('round-trips zero, positive and negative amounts', () => {
    for (const raw of [0n, 1n, -1n, 12_345n, -12_345n]) {
      const built = toMinorUnits(raw);
      expect(built.ok).toBe(true);
      if (!built.ok) continue;
      const canonical = minorUnitsToCanonicalString(built.value);
      expect(parseMinorUnits(canonical)).toEqual(built);
    }
  });

  it('serializes without decimal points or exponential notation', () => {
    const built = toMinorUnits(123_456_789_012_345n);
    expect(built.ok).toBe(true);
    if (built.ok) {
      const canonical = minorUnitsToCanonicalString(built.value);
      expect(canonical).toBe('123456789012345');
      expect(canonical).not.toMatch(/[.eE]/);
    }
  });
});

describe('malformed canonical strings are rejected', () => {
  it.each([
    ['empty string', ''],
    ['non-numeric', 'abc'],
    ['decimal point', '1.5'],
    ['exponential notation', '1e10'],
    ['leading plus', '+5'],
    ['negative zero', '-0'],
    ['leading zero', '007'],
    ['negative leading zero', '-007'],
    ['leading whitespace', ' 5'],
    ['trailing whitespace', '5 '],
    ['hex notation', '0x5'],
    ['comma separator', '1,000'],
  ])('rejects %s (%s)', (_label, input) => {
    expect(parseMinorUnits(input).ok).toBe(false);
  });

  it('accepts the single-digit canonical zero', () => {
    expect(parseMinorUnits('0').ok).toBe(true);
  });

  it('rejects an out-of-range canonical string even though it is well-formed', () => {
    expect(parseMinorUnits('99999999999999999999999999').ok).toBe(false);
  });
});

describe('addition/subtraction', () => {
  it('adds two positive amounts exactly', () => {
    const a = toMinorUnits(100n);
    const b = toMinorUnits(250n);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      const sum = addMinorUnits(a.value, b.value);
      expect(sum).toEqual(toMinorUnits(350n));
    }
  });

  it('subtracts exactly, including crossing zero into negative', () => {
    const a = toMinorUnits(100n);
    const b = toMinorUnits(250n);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      const difference = subtractMinorUnits(a.value, b.value);
      expect(difference).toEqual(toMinorUnits(-150n));
    }
  });

  it('fails explicitly on addition overflow at the maximum boundary (never wraps)', () => {
    const max = toMinorUnits(MAX_MINOR_UNITS);
    const one = toMinorUnits(1n);
    expect(max.ok && one.ok).toBe(true);
    if (max.ok && one.ok) {
      const result = addMinorUnits(max.value, one.value);
      expect(result.ok).toBe(false);
    }
  });

  it('fails explicitly on subtraction overflow at the minimum boundary (never wraps)', () => {
    const min = toMinorUnits(MIN_MINOR_UNITS);
    const one = toMinorUnits(1n);
    expect(min.ok && one.ok).toBe(true);
    if (min.ok && one.ok) {
      const result = subtractMinorUnits(min.value, one.value);
      expect(result.ok).toBe(false);
    }
  });

  it('zero plus zero is zero', () => {
    const zero = toMinorUnits(0n);
    expect(zero.ok).toBe(true);
    if (zero.ok) {
      expect(addMinorUnits(zero.value, zero.value)).toEqual(zero);
    }
  });
});

describe('sign', () => {
  it('reports -1, 0 and 1 explicitly', () => {
    const negative = toMinorUnits(-5n);
    const zero = toMinorUnits(0n);
    const positive = toMinorUnits(5n);
    expect(negative.ok && zero.ok && positive.ok).toBe(true);
    if (negative.ok && zero.ok && positive.ok) {
      expect(signOfMinorUnits(negative.value)).toBe(-1);
      expect(signOfMinorUnits(zero.value)).toBe(0);
      expect(signOfMinorUnits(positive.value)).toBe(1);
    }
  });
});
