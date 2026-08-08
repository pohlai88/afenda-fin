import { describe, expect, it } from 'vitest';
import {
  compareInstants,
  instantEquals,
  instantFromEpochMillis,
  instantToCanonicalString,
  MAX_EPOCH_MILLIS,
  MIN_EPOCH_MILLIS,
  parseInstant,
  type Instant,
} from '../src/instant.ts';

describe('valid Instant parsing', () => {
  it('parses a canonical UTC instant string', () => {
    const result = parseInstant('2026-08-08T00:00:00.000Z');
    expect(result.ok).toBe(true);
  });

  it('parses the epoch itself', () => {
    const result = parseInstant('1970-01-01T00:00:00.000Z');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.epochMillis).toBe(0);
  });

  it('parses a date with non-zero milliseconds', () => {
    const result = parseInstant('2026-01-01T12:34:56.789Z');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(instantToCanonicalString(result.value)).toBe('2026-01-01T12:34:56.789Z');
    }
  });

  it('accepts the leap-day 2024-02-29', () => {
    const result = parseInstant('2024-02-29T00:00:00.000Z');
    expect(result.ok).toBe(true);
  });
});

describe('invalid Instant parsing', () => {
  it('rejects a non-UTC offset', () => {
    const result = parseInstant('2026-08-08T00:00:00.000+08:00');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MALFORMED_CANONICAL_STRING');
  });

  it('rejects a missing milliseconds component', () => {
    const result = parseInstant('2026-08-08T00:00:00Z');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MALFORMED_CANONICAL_STRING');
  });

  it('rejects an impossible calendar date (Feb 30)', () => {
    const result = parseInstant('2026-02-30T00:00:00.000Z');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MALFORMED_CANONICAL_STRING');
  });

  it('rejects a non-leap-year Feb 29', () => {
    const result = parseInstant('2025-02-29T00:00:00.000Z');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MALFORMED_CANONICAL_STRING');
  });

  it('rejects an out-of-range hour', () => {
    const result = parseInstant('2026-08-08T24:00:00.000Z');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MALFORMED_CANONICAL_STRING');
  });

  it('rejects garbage input', () => {
    const result = parseInstant('not-an-instant');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MALFORMED_CANONICAL_STRING');
  });

  it('rejects empty string', () => {
    const result = parseInstant('');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MALFORMED_CANONICAL_STRING');
  });
});

describe('canonical round-trip', () => {
  it('round-trips instantFromEpochMillis -> instantToCanonicalString -> parseInstant', () => {
    const original = instantFromEpochMillis(1_754_611_200_000);
    expect(original.ok).toBe(true);
    if (!original.ok) return;
    const canonical = instantToCanonicalString(original.value);
    const parsed = parseInstant(canonical);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.epochMillis).toBe(original.value.epochMillis);
    }
  });

  it('round-trips the minimum representable instant', () => {
    const result = instantFromEpochMillis(MIN_EPOCH_MILLIS);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const parsed = parseInstant(instantToCanonicalString(result.value));
      expect(parsed).toEqual(result);
    }
  });

  it('round-trips the maximum representable instant', () => {
    const result = instantFromEpochMillis(MAX_EPOCH_MILLIS);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const parsed = parseInstant(instantToCanonicalString(result.value));
      expect(parsed).toEqual(result);
    }
  });
});

describe('range validation', () => {
  it('rejects epochMillis one below the minimum', () => {
    const result = instantFromEpochMillis(MIN_EPOCH_MILLIS - 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('OUT_OF_RANGE');
  });

  it('rejects epochMillis one above the maximum', () => {
    const result = instantFromEpochMillis(MAX_EPOCH_MILLIS + 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('OUT_OF_RANGE');
  });

  it('rejects a non-integer epochMillis', () => {
    const result = instantFromEpochMillis(1.5);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_SAFE_INTEGER');
  });

  it('rejects NaN', () => {
    const result = instantFromEpochMillis(Number.NaN);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_SAFE_INTEGER');
  });

  it('rejects an unsafe integer', () => {
    const result = instantFromEpochMillis(2 ** 53 + 10_000_000_000_000);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('NOT_SAFE_INTEGER');
  });

  it('normalizes -0 to 0', () => {
    const result = instantFromEpochMillis(-0);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.is(result.value.epochMillis, -0)).toBe(false);
      expect(result.value.epochMillis).toBe(0);
    }
  });
});

describe('serialize defense in depth', () => {
  it('throws rather than truncating a forged float Instant', () => {
    const forged = { epochMillis: 1.5 } as unknown as Instant;
    expect(() => instantToCanonicalString(forged)).toThrow(/NOT_SAFE_INTEGER/);
  });
});

describe('compareInstants / instantEquals', () => {
  it('orders earlier before later and equals same instants', () => {
    const earlier = instantFromEpochMillis(0);
    const later = instantFromEpochMillis(1000);
    expect(earlier.ok && later.ok).toBe(true);
    if (earlier.ok && later.ok) {
      expect(compareInstants(earlier.value, later.value)).toBeLessThan(0);
      expect(compareInstants(later.value, earlier.value)).toBeGreaterThan(0);
      expect(compareInstants(earlier.value, earlier.value)).toBe(0);
      expect(instantEquals(earlier.value, earlier.value)).toBe(true);
      expect(instantEquals(earlier.value, later.value)).toBe(false);
    }
  });
});
