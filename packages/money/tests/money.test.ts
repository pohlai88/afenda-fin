import { describe, expect, it } from 'vitest';
import {
  addMoney,
  makeMoney,
  moneyEquals,
  moneyFromParts,
  parseMoney,
  serializeMoney,
  subtractMoney,
} from '../src/money.ts';
import { toCurrencyCode } from '../src/currency.ts';
import { toMinorUnits } from '../src/minor-units.ts';

function myr(amount: bigint) {
  const currency = toCurrencyCode('MYR');
  const minorUnits = toMinorUnits(amount);
  if (!currency.ok || !minorUnits.ok) throw new Error('test fixture construction failed');
  return makeMoney(currency.value, minorUnits.value);
}

describe('exact construction', () => {
  it('constructs Money from validated parts', () => {
    const result = moneyFromParts('MYR', 12_345n);
    expect(result.ok).toBe(true);
  });

  it('rejects an invalid currency code', () => {
    expect(moneyFromParts('myr', 100n).ok).toBe(false);
  });

  it('rejects an out-of-range amount', () => {
    expect(moneyFromParts('MYR', 10n ** 30n).ok).toBe(false);
  });
});

describe('canonical parse/serialize', () => {
  it('serializes minorUnits as a string, never a JSON number', () => {
    const money = myr(12_345n);
    const canonical = serializeMoney(money);
    expect(canonical).toEqual({ currency: 'MYR', minorUnits: '12345' });
    expect(typeof canonical.minorUnits).toBe('string');
  });

  it('round-trips through serializeMoney -> JSON.stringify -> JSON.parse -> parseMoney', () => {
    const money = myr(-500n);
    const json = JSON.stringify(serializeMoney(money));
    const parsed = parseMoney(JSON.parse(json));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(moneyEquals(parsed.value, money)).toBe(true);
  });

  it('rejects a canonical shape whose minorUnits is a JSON number instead of a string', () => {
    const unsafe = { currency: 'MYR', minorUnits: 12_345 };
    expect(parseMoney(unsafe).ok).toBe(false);
  });

  it('rejects a shape missing currency', () => {
    expect(parseMoney({ minorUnits: '100' }).ok).toBe(false);
  });

  it('rejects a shape missing minorUnits', () => {
    expect(parseMoney({ currency: 'MYR' }).ok).toBe(false);
  });

  it('rejects non-object input', () => {
    expect(parseMoney(null).ok).toBe(false);
    expect(parseMoney('MYR 100').ok).toBe(false);
    expect(parseMoney(100).ok).toBe(false);
  });
});

describe('addition/subtraction', () => {
  it('adds two amounts of the same currency', () => {
    const result = addMoney(myr(100n), myr(250n));
    expect(result.ok).toBe(true);
    if (result.ok) expect(moneyEquals(result.value, myr(350n))).toBe(true);
  });

  it('subtracts two amounts of the same currency', () => {
    const result = subtractMoney(myr(250n), myr(100n));
    expect(result.ok).toBe(true);
    if (result.ok) expect(moneyEquals(result.value, myr(150n))).toBe(true);
  });

  it('rejects addition across different currencies (currency mismatch)', () => {
    const currencyA = toCurrencyCode('MYR');
    const currencyB = toCurrencyCode('USD');
    const units = toMinorUnits(100n);
    expect(currencyA.ok && currencyB.ok && units.ok).toBe(true);
    if (!currencyA.ok || !currencyB.ok || !units.ok) return;
    const a = makeMoney(currencyA.value, units.value);
    const b = makeMoney(currencyB.value, units.value);
    const result = addMoney(a, b);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CURRENCY_MISMATCH');
  });

  it('rejects subtraction across different currencies (currency mismatch)', () => {
    const currencyA = toCurrencyCode('MYR');
    const currencyB = toCurrencyCode('USD');
    const units = toMinorUnits(100n);
    expect(currencyA.ok && currencyB.ok && units.ok).toBe(true);
    if (!currencyA.ok || !currencyB.ok || !units.ok) return;
    const a = makeMoney(currencyA.value, units.value);
    const b = makeMoney(currencyB.value, units.value);
    const result = subtractMoney(a, b);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('CURRENCY_MISMATCH');
  });

  it('propagates a range overflow as a RANGE_OVERFLOW failure, never wrapping', () => {
    const nearMax = moneyFromParts('MYR', 9_223_372_036_854_775_807n);
    const one = moneyFromParts('MYR', 1n);
    expect(nearMax.ok && one.ok).toBe(true);
    if (!nearMax.ok || !one.ok) return;
    const result = addMoney(nearMax.value, one.value);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('RANGE_OVERFLOW');
  });
});

describe('moneyEquals', () => {
  it('is true only when both currency and amount match', () => {
    expect(moneyEquals(myr(100n), myr(100n))).toBe(true);
    expect(moneyEquals(myr(100n), myr(101n))).toBe(false);
  });
});
