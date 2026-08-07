import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decodeMoneyTransport, encodeMoneyTransport } from '../src/money-transport.ts';
import { makeMoney, moneyEquals, toCurrencyCode, toMinorUnits, MIN_MINOR_UNITS, MAX_MINOR_UNITS } from '@afenda/money';

const minorUnitsArbitrary = fc
  .bigInt({ min: MIN_MINOR_UNITS, max: MAX_MINOR_UNITS })
  .map((value) => {
    const built = toMinorUnits(value);
    if (!built.ok) throw new Error('unreachable: value already in range');
    return built.value;
  });

const currencyCodeArbitrary = fc
  .array(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')), { minLength: 3, maxLength: 3 })
  .map((letters) => {
    const built = toCurrencyCode(letters.join(''));
    if (!built.ok) throw new Error('unreachable: 3 uppercase letters is always valid');
    return built.value;
  });

const moneyArbitrary = fc.tuple(currencyCodeArbitrary, minorUnitsArbitrary).map(([currency, minorUnits]) => makeMoney(currency, minorUnits));

describe('Money transport properties', () => {
  it('decode(encode(x)) equals x, for any valid domain Money', () => {
    fc.assert(
      fc.property(moneyArbitrary, (money) => {
        const decoded = decodeMoneyTransport(encodeMoneyTransport(money));
        expect(decoded.ok).toBe(true);
        if (decoded.ok) expect(moneyEquals(decoded.value, money)).toBe(true);
      }),
    );
  });

  it('a full JSON.stringify/JSON.parse round trip preserves x exactly', () => {
    fc.assert(
      fc.property(moneyArbitrary, (money) => {
        const wire = encodeMoneyTransport(money);
        const roundTripped = JSON.parse(JSON.stringify(wire)) as unknown;
        const decoded = decodeMoneyTransport(roundTripped);
        expect(decoded.ok).toBe(true);
        if (decoded.ok) expect(moneyEquals(decoded.value, money)).toBe(true);
      }),
    );
  });

  it('encoded minorUnits is always a canonical plain integer string (never decimal/exponential notation)', () => {
    fc.assert(
      fc.property(moneyArbitrary, (money) => {
        const wire = encodeMoneyTransport(money);
        expect(wire.minorUnits).toMatch(/^-?[0-9]+$/);
        expect(typeof wire.minorUnits).toBe('string');
      }),
    );
  });

  it('a JSON-number minorUnits is always rejected, for any numeric value', () => {
    fc.assert(
      fc.property(currencyCodeArbitrary, fc.integer(), (currency, numericMinorUnits) => {
        const result = decodeMoneyTransport({ currency, minorUnits: numericMinorUnits });
        expect(result.ok).toBe(false);
      }),
    );
  });

  it('two distinct currencies never decode-equal each other for the same amount', () => {
    fc.assert(
      fc.property(currencyCodeArbitrary, currencyCodeArbitrary, minorUnitsArbitrary, (currencyA, currencyB, units) => {
        fc.pre(currencyA !== currencyB);
        const a = decodeMoneyTransport({ currency: currencyA, minorUnits: units.toString() });
        const b = decodeMoneyTransport({ currency: currencyB, minorUnits: units.toString() });
        expect(a.ok && b.ok).toBe(true);
        if (a.ok && b.ok) expect(moneyEquals(a.value, b.value)).toBe(false);
      }),
    );
  });
});
