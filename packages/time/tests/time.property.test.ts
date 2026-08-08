import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  civilDateFromParts,
  civilDateToCanonicalString,
  parseCivilDate,
  type CivilDate,
} from '../src/civil-date.ts';
import {
  instantFromEpochMillis,
  instantToCanonicalString,
  MAX_EPOCH_MILLIS,
  MIN_EPOCH_MILLIS,
  parseInstant,
} from '../src/instant.ts';

describe('Instant canonical round-trip property', () => {
  it('parseInstant(instantToCanonicalString(x)) === x for any in-range epochMillis', () => {
    fc.assert(
      fc.property(fc.integer({ min: MIN_EPOCH_MILLIS, max: MAX_EPOCH_MILLIS }), (epochMillis) => {
        const built = instantFromEpochMillis(epochMillis);
        expect(built.ok).toBe(true);
        if (!built.ok) return;
        const canonical = instantToCanonicalString(built.value);
        const parsed = parseInstant(canonical);
        expect(parsed).toEqual(built);
      }),
    );
  });

  it('the canonical string always matches the fixed-width RFC 3339 UTC pattern', () => {
    fc.assert(
      fc.property(fc.integer({ min: MIN_EPOCH_MILLIS, max: MAX_EPOCH_MILLIS }), (epochMillis) => {
        const built = instantFromEpochMillis(epochMillis);
        if (!built.ok) return;
        const canonical = instantToCanonicalString(built.value);
        expect(canonical).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      }),
    );
  });

  it('near-canonical malformed strings are rejected (not silently normalized)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          '2026-02-30T00:00:00.000Z',
          '2025-02-29T00:00:00.000Z',
          '2026-08-08T24:00:00.000Z',
          '2026-08-08T00:00:00.000+00:00',
          '2026-08-08T00:00:00Z',
          '2026-08-08T00:00:00.0000Z',
          '2026-13-01T00:00:00.000Z',
        ),
        (input) => {
          const parsed = parseInstant(input);
          expect(parsed.ok).toBe(false);
          if (!parsed.ok) expect(parsed.error.code).toBe('MALFORMED_CANONICAL_STRING');
        },
      ),
    );
  });
});

describe('CivilDate round-trip property', () => {
  // Calendar-aware: generate day 1–31 and keep only dates civilDateFromParts accepts
  // (covers 29–31 and leap/non-leap February without a separate arb).
  const validCivilDateArbitrary: fc.Arbitrary<CivilDate> = fc
    .tuple(fc.integer({ min: 0, max: 9999 }), fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 31 }))
    .map(([year, month, day]) => civilDateFromParts(year, month, day))
    .filter((result) => result.ok)
    .map((result) => {
      if (!result.ok) throw new Error('filter invariant violated');
      return result.value;
    });

  it('parseCivilDate(civilDateToCanonicalString(x)) === x for any valid civil date', () => {
    fc.assert(
      fc.property(validCivilDateArbitrary, (date) => {
        const canonical = civilDateToCanonicalString(date);
        const parsed = parseCivilDate(canonical);
        expect(parsed.ok).toBe(true);
        if (parsed.ok) {
          expect(parsed.value.year).toBe(date.year);
          expect(parsed.value.month).toBe(date.month);
          expect(parsed.value.day).toBe(date.day);
        }
      }),
    );
  });

  it('invalid day-of-month combinations are rejected with INVALID_DAY', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          { year: 2025, month: 2, day: 29 },
          { year: 1900, month: 2, day: 29 },
          { year: 2026, month: 4, day: 31 },
          { year: 2026, month: 2, day: 30 },
        ),
        ({ year, month, day }) => {
          const built = civilDateFromParts(year, month, day);
          expect(built.ok).toBe(false);
          if (!built.ok) expect(built.error.code).toBe('INVALID_DAY');
        },
      ),
    );
  });
});
