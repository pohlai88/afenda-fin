import { describe, expect, it } from 'vitest';
import { decodeInstantTransport, encodeInstantTransport } from '../src/instant-transport.ts';
import { instantFromEpochMillis } from '@afenda/time';

function instant(epochMillis: number) {
  const result = instantFromEpochMillis(epochMillis);
  if (!result.ok) throw new Error('test fixture construction failed');
  return result.value;
}

describe('Instant transport: exact JSON round trip', () => {
  it('round-trips epoch zero exactly', () => {
    const wire = encodeInstantTransport(instant(0));
    const json = JSON.parse(JSON.stringify(wire)) as unknown;
    const decoded = decodeInstantTransport(json);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.value.epochMillis).toBe(0);
  });

  it('round-trips an arbitrary explicit instant exactly', () => {
    const original = instant(1_735_689_600_000); // 2025-01-01T00:00:00.000Z
    const wire = encodeInstantTransport(original);
    expect(wire).toBe('2025-01-01T00:00:00.000Z');
    const json = JSON.parse(JSON.stringify(wire)) as unknown;
    const decoded = decodeInstantTransport(json);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.value.epochMillis).toBe(original.epochMillis);
  });
});

describe('SEC-05: external-input validation, negative/malformed cases', () => {
  it('rejects a JSON number (epoch millis) instead of the canonical string', () => {
    expect(decodeInstantTransport(1_735_689_600_000).ok).toBe(false);
  });

  it('rejects non-string input (null, object, array)', () => {
    expect(decodeInstantTransport(null).ok).toBe(false);
    expect(decodeInstantTransport({}).ok).toBe(false);
    expect(decodeInstantTransport([]).ok).toBe(false);
    expect(decodeInstantTransport(undefined).ok).toBe(false);
  });

  it.each([
    ['missing Z suffix', '2025-01-01T00:00:00.000'],
    ['missing milliseconds', '2025-01-01T00:00:00Z'],
    ['non-UTC offset', '2025-01-01T00:00:00.000+08:00'],
    ['calendar-invalid day', '2026-02-30T00:00:00.000Z'],
    ['calendar-invalid month', '2025-13-01T00:00:00.000Z'],
    ['space instead of T', '2025-01-01 00:00:00.000Z'],
    ['empty string', ''],
    ['garbage', 'not-an-instant'],
  ])('rejects malformed instant string: %s', (_label, malformed) => {
    expect(decodeInstantTransport(malformed).ok).toBe(false);
  });
});
