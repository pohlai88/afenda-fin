import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  civilDateFromParts,
  civilDateToCanonicalString,
  parseCivilDate,
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
});

describe('CivilDate round-trip property', () => {
  // Generate only within 28-day bound to guarantee validity across all months
  // (including February on a non-leap year) without needing calendar-aware
  // shrinking; the example tests above separately cover the Feb 29 boundary.
  const validCivilDateArbitrary = fc
    .tuple(fc.integer({ min: 0, max: 9999 }), fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 28 }))
    .map(([year, month, day]) => ({ year, month, day }));

  it('parseCivilDate(civilDateToCanonicalString(x)) === x for any valid civil date', () => {
    fc.assert(
      fc.property(validCivilDateArbitrary, ({ year, month, day }) => {
        const built = civilDateFromParts(year, month, day);
        expect(built.ok).toBe(true);
        if (!built.ok) return;
        const canonical = civilDateToCanonicalString(built.value);
        expect(parseCivilDate(canonical)).toEqual(built);
      }),
    );
  });
});
