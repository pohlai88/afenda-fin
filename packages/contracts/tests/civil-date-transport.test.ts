import { describe, expect, it } from 'vitest';
import { decodeCivilDateTransport, encodeCivilDateTransport } from '../src/civil-date-transport.ts';
import { civilDateFromParts } from '@afenda/time';

function date(year: number, month: number, day: number) {
  const result = civilDateFromParts(year, month, day);
  if (!result.ok) throw new Error('test fixture construction failed');
  return result.value;
}

describe('CivilDate transport: exact JSON round trip, no timezone inference', () => {
  it('round-trips a valid date exactly', () => {
    const original = date(2026, 2, 28);
    const wire = encodeCivilDateTransport(original);
    expect(wire).toBe('2026-02-28');
    const json = JSON.parse(JSON.stringify(wire)) as unknown;
    const decoded = decodeCivilDateTransport(json);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.value).toEqual(original);
  });

  it('round-trips a leap-day date exactly', () => {
    const original = date(2028, 2, 29);
    const decoded = decodeCivilDateTransport(JSON.parse(JSON.stringify(encodeCivilDateTransport(original))) as unknown);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.value).toEqual(original);
  });
});

describe('SEC-05: external-input validation, negative/malformed cases', () => {
  it('rejects a JSON number instead of a string', () => {
    expect(decodeCivilDateTransport(20_260_228).ok).toBe(false);
  });

  it('rejects non-string input (null, object, array)', () => {
    expect(decodeCivilDateTransport(null).ok).toBe(false);
    expect(decodeCivilDateTransport({}).ok).toBe(false);
    expect(decodeCivilDateTransport([]).ok).toBe(false);
  });

  it.each([
    ['calendar-invalid day (Feb 30)', '2026-02-30'],
    ['calendar-invalid day (non-leap Feb 29)', '2026-02-29'],
    ['calendar-invalid month', '2025-13-01'],
    ['missing zero-padding', '2025-1-1'],
    ['includes a time component', '2025-01-01T00:00:00Z'],
    ['empty string', ''],
    ['garbage', 'not-a-date'],
  ])('rejects malformed civil-date string: %s', (_label, malformed) => {
    expect(decodeCivilDateTransport(malformed).ok).toBe(false);
  });
});
