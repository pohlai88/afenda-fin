import { describe, expect, it } from 'vitest';
import {
  civilDateEquals,
  civilDateFromParts,
  civilDateToCanonicalString,
  compareCivilDates,
  parseCivilDate,
  type CivilDate,
} from '../src/civil-date.ts';

describe('valid CivilDate', () => {
  it('accepts an ordinary date', () => {
    expect(civilDateFromParts(2026, 8, 8).ok).toBe(true);
  });

  it('accepts the first and last day of a 31-day month', () => {
    expect(civilDateFromParts(2026, 1, 1).ok).toBe(true);
    expect(civilDateFromParts(2026, 1, 31).ok).toBe(true);
  });

  it('accepts Feb 29 on a leap year (divisible by 4, not by 100)', () => {
    expect(civilDateFromParts(2024, 2, 29).ok).toBe(true);
  });

  it('accepts Feb 29 on a century leap year (divisible by 400)', () => {
    expect(civilDateFromParts(2000, 2, 29).ok).toBe(true);
  });

  it('accepts the minimum and maximum year', () => {
    expect(civilDateFromParts(0, 1, 1).ok).toBe(true);
    expect(civilDateFromParts(9999, 12, 31).ok).toBe(true);
  });
});

describe('invalid CivilDate', () => {
  it('rejects Feb 29 on a non-leap year', () => {
    const result = civilDateFromParts(2025, 2, 29);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_DAY');
  });

  it('rejects Feb 29 on a century non-leap year (divisible by 100, not 400)', () => {
    const result = civilDateFromParts(1900, 2, 29);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_DAY');
  });

  it('rejects day 31 of a 30-day month', () => {
    const result = civilDateFromParts(2026, 4, 31);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_DAY');
  });

  it('rejects month 0 and month 13', () => {
    const m0 = civilDateFromParts(2026, 0, 1);
    const m13 = civilDateFromParts(2026, 13, 1);
    expect(m0.ok).toBe(false);
    expect(m13.ok).toBe(false);
    if (!m0.ok) expect(m0.error.code).toBe('INVALID_MONTH');
    if (!m13.ok) expect(m13.error.code).toBe('INVALID_MONTH');
  });

  it('rejects day 0', () => {
    const result = civilDateFromParts(2026, 1, 0);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_DAY');
  });

  it('rejects a year outside [0, 9999]', () => {
    const low = civilDateFromParts(-1, 1, 1);
    const high = civilDateFromParts(10_000, 1, 1);
    expect(low.ok).toBe(false);
    expect(high.ok).toBe(false);
    if (!low.ok) expect(low.error.code).toBe('INVALID_YEAR');
    if (!high.ok) expect(high.error.code).toBe('INVALID_YEAR');
  });

  it('rejects non-integer fields', () => {
    expect(civilDateFromParts(2026.5, 1, 1).ok).toBe(false);
    expect(civilDateFromParts(2026, 1.5, 1).ok).toBe(false);
    expect(civilDateFromParts(2026, 1, 1.5).ok).toBe(false);
  });
});

describe('canonical round-trip', () => {
  it('round-trips civilDateFromParts -> civilDateToCanonicalString -> parseCivilDate', () => {
    const original = civilDateFromParts(2026, 8, 8);
    expect(original.ok).toBe(true);
    if (!original.ok) return;
    const canonical = civilDateToCanonicalString(original.value);
    expect(canonical).toBe('2026-08-08');
    expect(parseCivilDate(canonical)).toEqual(original);
  });

  it('pads single-digit month/day with a leading zero', () => {
    const date = civilDateFromParts(5, 3, 7);
    expect(date.ok).toBe(true);
    if (date.ok) expect(civilDateToCanonicalString(date.value)).toBe('0005-03-07');
  });
});

describe('parseCivilDate malformed input', () => {
  it('rejects garbage', () => {
    expect(parseCivilDate('not-a-date').ok).toBe(false);
  });

  it('rejects a date with a time component', () => {
    expect(parseCivilDate('2026-08-08T00:00:00Z').ok).toBe(false);
  });

  it('rejects a two-digit year', () => {
    expect(parseCivilDate('26-08-08').ok).toBe(false);
  });
});

describe('serialize defense in depth', () => {
  it('throws rather than emitting an invalid forged CivilDate', () => {
    const forged = { year: 2026, month: 2, day: 30 } as unknown as CivilDate;
    expect(() => civilDateToCanonicalString(forged)).toThrow(/INVALID_DAY/);
  });
});

describe('compareCivilDates / civilDateEquals', () => {
  it('orders by year, then month, then day', () => {
    const a = civilDateFromParts(2025, 12, 31);
    const b = civilDateFromParts(2026, 1, 1);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(compareCivilDates(a.value, b.value)).toBeLessThan(0);
      expect(compareCivilDates(b.value, a.value)).toBeGreaterThan(0);
      expect(civilDateEquals(a.value, a.value)).toBe(true);
      expect(civilDateEquals(a.value, b.value)).toBe(false);
      expect(compareCivilDates(a.value, a.value)).toBe(0);
    }
  });
});
