import { describe, expect, it } from 'vitest';
import { civilDateFromParts, civilDateToCanonicalString, compareCivilDates, parseCivilDate } from '../src/civil-date.ts';

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
    expect(civilDateFromParts(2025, 2, 29).ok).toBe(false);
  });

  it('rejects Feb 29 on a century non-leap year (divisible by 100, not 400)', () => {
    expect(civilDateFromParts(1900, 2, 29).ok).toBe(false);
  });

  it('rejects day 31 of a 30-day month', () => {
    expect(civilDateFromParts(2026, 4, 31).ok).toBe(false);
  });

  it('rejects month 0 and month 13', () => {
    expect(civilDateFromParts(2026, 0, 1).ok).toBe(false);
    expect(civilDateFromParts(2026, 13, 1).ok).toBe(false);
  });

  it('rejects day 0', () => {
    expect(civilDateFromParts(2026, 1, 0).ok).toBe(false);
  });

  it('rejects a year outside [0, 9999]', () => {
    expect(civilDateFromParts(-1, 1, 1).ok).toBe(false);
    expect(civilDateFromParts(10_000, 1, 1).ok).toBe(false);
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

describe('compareCivilDates', () => {
  it('orders by year, then month, then day', () => {
    const a = civilDateFromParts(2025, 12, 31);
    const b = civilDateFromParts(2026, 1, 1);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(compareCivilDates(a.value, b.value)).toBeLessThan(0);
      expect(compareCivilDates(b.value, a.value)).toBeGreaterThan(0);
      expect(compareCivilDates(a.value, a.value)).toBe(0);
    }
  });
});
