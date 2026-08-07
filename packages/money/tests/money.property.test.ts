import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { addMoney, makeMoney, moneyEquals, parseMoney, serializeMoney, subtractMoney } from '../src/money.ts';
import { toCurrencyCode } from '../src/currency.ts';
import { addMinorUnits, MAX_MINOR_UNITS, MIN_MINOR_UNITS, subtractMinorUnits, toMinorUnits } from '../src/minor-units.ts';

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

describe('Money properties', () => {
  it('parseMoney(serializeMoney(x)) equals x, for any valid Money', () => {
    fc.assert(
      fc.property(moneyArbitrary, (money) => {
        const canonical = serializeMoney(money);
        const parsed = parseMoney(canonical);
        expect(parsed.ok).toBe(true);
        if (parsed.ok) expect(moneyEquals(parsed.value, money)).toBe(true);
      }),
    );
  });

  it('serialized minorUnits is always a plain integer string, never decimal or exponential notation', () => {
    fc.assert(
      fc.property(moneyArbitrary, (money) => {
        const canonical = serializeMoney(money);
        expect(canonical.minorUnits).toMatch(/^-?[0-9]+$/);
      }),
    );
  });

  it('(a + b) - b === a whenever the addition does not overflow', () => {
    fc.assert(
      fc.property(currencyCodeArbitrary, minorUnitsArbitrary, minorUnitsArbitrary, (currency, aUnits, bUnits) => {
        const a = makeMoney(currency, aUnits);
        const b = makeMoney(currency, bUnits);
        const sum = addMoney(a, b);
        fc.pre(sum.ok);
        if (!sum.ok) return;
        const back = subtractMoney(sum.value, b);
        expect(back.ok).toBe(true);
        if (back.ok) expect(moneyEquals(back.value, a)).toBe(true);
      }),
    );
  });

  it('addMoney matches addMinorUnits exactly for same-currency operands (both agree on overflow)', () => {
    fc.assert(
      fc.property(currencyCodeArbitrary, minorUnitsArbitrary, minorUnitsArbitrary, (currency, aUnits, bUnits) => {
        const moneyResult = addMoney(makeMoney(currency, aUnits), makeMoney(currency, bUnits));
        const unitsResult = addMinorUnits(aUnits, bUnits);
        expect(moneyResult.ok).toBe(unitsResult.ok);
        if (moneyResult.ok && unitsResult.ok) {
          expect(moneyResult.value.minorUnits).toBe(unitsResult.value);
        }
      }),
    );
  });

  it('subtractMoney matches subtractMinorUnits exactly for same-currency operands', () => {
    fc.assert(
      fc.property(currencyCodeArbitrary, minorUnitsArbitrary, minorUnitsArbitrary, (currency, aUnits, bUnits) => {
        const moneyResult = subtractMoney(makeMoney(currency, aUnits), makeMoney(currency, bUnits));
        const unitsResult = subtractMinorUnits(aUnits, bUnits);
        expect(moneyResult.ok).toBe(unitsResult.ok);
        if (moneyResult.ok && unitsResult.ok) {
          expect(moneyResult.value.minorUnits).toBe(unitsResult.value);
        }
      }),
    );
  });

  it('incompatible currencies never combine: addMoney always fails for two distinct currency codes', () => {
    fc.assert(
      fc.property(currencyCodeArbitrary, currencyCodeArbitrary, minorUnitsArbitrary, minorUnitsArbitrary, (currencyA, currencyB, aUnits, bUnits) => {
        fc.pre(currencyA !== currencyB);
        const result = addMoney(makeMoney(currencyA, aUnits), makeMoney(currencyB, bUnits));
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.code).toBe('CURRENCY_MISMATCH');
      }),
    );
  });
});
