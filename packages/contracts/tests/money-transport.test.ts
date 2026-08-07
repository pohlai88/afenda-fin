import { describe, expect, it } from 'vitest';
import { decodeMoneyTransport, encodeMoneyTransport } from '../src/money-transport.ts';
import { moneyFromParts, MIN_MINOR_UNITS, MAX_MINOR_UNITS } from '@afenda/money';

function myr(amount: bigint) {
  const result = moneyFromParts('MYR', amount);
  if (!result.ok) throw new Error('test fixture construction failed');
  return result.value;
}

describe('exact JSON round trip: domain Money -> transport -> JSON.stringify -> JSON.parse -> transport -> domain Money', () => {
  const boundaryCorpus: readonly bigint[] = [
    0n,
    1n,
    -1n,
    9_007_199_254_740_991n, // 2^53 - 1
    9_007_199_254_740_992n, // 2^53
    9_007_199_254_740_993n, // 2^53 + 1
    MIN_MINOR_UNITS, // PostgreSQL bigint minimum
    MAX_MINOR_UNITS, // PostgreSQL bigint maximum
    -9_007_199_254_740_991n,
    -9_007_199_254_740_992n,
    -9_007_199_254_740_993n,
  ];

  for (const amount of boundaryCorpus) {
    it(`round-trips ${amount.toString()} exactly through JSON`, () => {
      const money = myr(amount);
      const wire = encodeMoneyTransport(money);
      const json = JSON.parse(JSON.stringify(wire)) as unknown;
      const decoded = decodeMoneyTransport(json);
      expect(decoded.ok).toBe(true);
      if (decoded.ok) {
        expect(decoded.value.minorUnits.toString()).toBe(amount.toString());
        expect(decoded.value.currency).toBe(money.currency);
      }
    });
  }

  it('round-trips independently across currencies', () => {
    for (const currency of ['MYR', 'USD', 'SGD', 'JPY']) {
      const result = moneyFromParts(currency, 12_345n);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      const wire = encodeMoneyTransport(result.value);
      const json = JSON.parse(JSON.stringify(wire)) as unknown;
      const decoded = decodeMoneyTransport(json);
      expect(decoded.ok).toBe(true);
      if (decoded.ok) expect(decoded.value.currency).toBe(currency);
    }
  });

  it('never emits a decimal or exponential-notation minorUnits string', () => {
    const wire = encodeMoneyTransport(myr(MAX_MINOR_UNITS));
    expect(wire.minorUnits).toBe('9223372036854775807');
    expect(wire.minorUnits).toMatch(/^-?[0-9]+$/);
  });
});

describe('SEC-05: external-input validation, negative/malformed cases', () => {
  it('rejects a JSON number for minorUnits (never coerces)', () => {
    expect(decodeMoneyTransport({ currency: 'MYR', minorUnits: 12_345 }).ok).toBe(false);
  });

  it('rejects a missing currency field', () => {
    expect(decodeMoneyTransport({ minorUnits: '100' }).ok).toBe(false);
  });

  it('rejects a missing minorUnits field', () => {
    expect(decodeMoneyTransport({ currency: 'MYR' }).ok).toBe(false);
  });

  it('rejects an extra/unknown field (strict shape)', () => {
    expect(decodeMoneyTransport({ currency: 'MYR', minorUnits: '100', extra: 'field' }).ok).toBe(false);
  });

  it('rejects non-object input (null, string, number, array)', () => {
    expect(decodeMoneyTransport(null).ok).toBe(false);
    expect(decodeMoneyTransport('MYR 100').ok).toBe(false);
    expect(decodeMoneyTransport(100).ok).toBe(false);
    expect(decodeMoneyTransport(['MYR', '100']).ok).toBe(false);
    expect(decodeMoneyTransport(undefined).ok).toBe(false);
  });

  it('rejects an invalid currency code', () => {
    expect(decodeMoneyTransport({ currency: 'myr', minorUnits: '100' }).ok).toBe(false);
    expect(decodeMoneyTransport({ currency: 'MY', minorUnits: '100' }).ok).toBe(false);
    expect(decodeMoneyTransport({ currency: 12, minorUnits: '100' }).ok).toBe(false);
  });

  it.each([
    ['empty string', ''],
    ['leading space', ' 1'],
    ['trailing space', '1 '],
    ['leading plus', '+1'],
    ['leading zero', '01'],
    ['negative zero', '-0'],
    ['decimal point', '1.0'],
    ['lowercase exponent', '1e3'],
    ['uppercase exponent', '1E3'],
    ['NaN literal', 'NaN'],
    ['Infinity literal', 'Infinity'],
    ['hex notation', '0x10'],
  ])('rejects malformed canonical integer string: %s (%j)', (_label, malformed) => {
    expect(decodeMoneyTransport({ currency: 'MYR', minorUnits: malformed }).ok).toBe(false);
  });

  it('rejects an out-of-range minorUnits string (one beyond each PostgreSQL bigint bound)', () => {
    const oneBeyondMax = (MAX_MINOR_UNITS + 1n).toString();
    const oneBeyondMin = (MIN_MINOR_UNITS - 1n).toString();
    expect(decodeMoneyTransport({ currency: 'MYR', minorUnits: oneBeyondMax }).ok).toBe(false);
    expect(decodeMoneyTransport({ currency: 'MYR', minorUnits: oneBeyondMin }).ok).toBe(false);
  });

  it('accepts the exact PostgreSQL bigint boundary values', () => {
    expect(decodeMoneyTransport({ currency: 'MYR', minorUnits: MAX_MINOR_UNITS.toString() }).ok).toBe(true);
    expect(decodeMoneyTransport({ currency: 'MYR', minorUnits: MIN_MINOR_UNITS.toString() }).ok).toBe(true);
  });
});
