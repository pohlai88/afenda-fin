// Money: an authoritative amount paired with an explicit currency (doctrine
// MON-01, MON-03, MON-06). Every field is already a validated, branded type
// (`CurrencyCode`, `MinorUnits`), so `Money` itself is a plain immutable
// interface — no additional brand is needed on top of two already-validated
// primitives, and no class is used (SEL-25: functions and immutable data).

import { err, ok, type Result } from '@afenda/errors';
import { toCurrencyCode, type CurrencyCode, type CurrencyCodeErrorCode } from './currency.ts';
import {
  addMinorUnits,
  minorUnitsToCanonicalString,
  parseMinorUnits,
  subtractMinorUnits,
  toMinorUnits,
  type MinorUnits,
  type MinorUnitsErrorCode,
} from './minor-units.ts';

/** An authoritative monetary amount: an explicit currency and exact minor units. */
export interface Money {
  readonly currency: CurrencyCode;
  readonly minorUnits: MinorUnits;
}

/** The canonical, JSON-transportable shape of `Money` (doctrine MON-01: minor units as a canonical decimal STRING, never a JSON `number`). */
export interface CanonicalMoney {
  readonly currency: string;
  readonly minorUnits: string;
}

/** Combines an already-validated currency and minor-units amount into a `Money`. */
export function makeMoney(currency: CurrencyCode, minorUnits: MinorUnits): Money {
  return { currency, minorUnits };
}

export type MoneyFromPartsErrorCode = CurrencyCodeErrorCode | MinorUnitsErrorCode;

/** Validates a raw currency string and a raw `bigint` amount together and constructs a `Money`. */
export function moneyFromParts(currencyCode: string, minorUnitsValue: bigint): Result<Money, MoneyFromPartsErrorCode> {
  const currency = toCurrencyCode(currencyCode);
  if (!currency.ok) return currency;
  const minorUnits = toMinorUnits(minorUnitsValue);
  if (!minorUnits.ok) return minorUnits;
  return ok(makeMoney(currency.value, minorUnits.value));
}

/** Serializes `money` to its canonical, JSON-transportable shape. */
export function serializeMoney(money: Money): CanonicalMoney {
  return { currency: money.currency, minorUnits: minorUnitsToCanonicalString(money.minorUnits) };
}

export type MoneyParseErrorCode = CurrencyCodeErrorCode | MinorUnitsErrorCode | 'MALFORMED_CANONICAL_MONEY_SHAPE';

/**
 * Parses an arbitrary, untrusted value as `CanonicalMoney` and constructs the
 * corresponding `Money`. Rejects any shape whose `minorUnits` is not a string
 * (in particular, a JSON `number` is rejected here, not silently coerced).
 */
export function parseMoney(input: unknown): Result<Money, MoneyParseErrorCode> {
  if (typeof input !== 'object' || input === null) {
    return err('MALFORMED_CANONICAL_MONEY_SHAPE', 'expected an object with currency/minorUnits fields');
  }
  const record = input as Record<string, unknown>;
  const currencyRaw = record['currency'];
  const minorUnitsRaw = record['minorUnits'];
  if (typeof currencyRaw !== 'string') {
    return err('MALFORMED_CANONICAL_MONEY_SHAPE', 'currency must be a string');
  }
  if (typeof minorUnitsRaw !== 'string') {
    return err(
      'MALFORMED_CANONICAL_MONEY_SHAPE',
      'minorUnits must be a canonical integer string, not a JSON number (MON-01 / SCC-03)',
    );
  }
  const currency = toCurrencyCode(currencyRaw);
  if (!currency.ok) return currency;
  const minorUnits = parseMinorUnits(minorUnitsRaw);
  if (!minorUnits.ok) return minorUnits;
  return ok(makeMoney(currency.value, minorUnits.value));
}

export type MoneyArithmeticErrorCode = 'CURRENCY_MISMATCH' | 'RANGE_OVERFLOW';

/**
 * Exact addition. Requires `a` and `b` to share the same currency — this
 * equality check is the critical guard exercised by
 * scripts/red.ts's `runMoneyCurrencyGuardMutationFixture` (GOV-03: a critical
 * executable control must demonstrably be able to fail).
 */
export function addMoney(a: Money, b: Money): Result<Money, MoneyArithmeticErrorCode> {
  if (a.currency !== b.currency) {
    return err('CURRENCY_MISMATCH', `cannot add ${a.currency} to ${b.currency}`);
  }
  const sum = addMinorUnits(a.minorUnits, b.minorUnits);
  if (!sum.ok) {
    return err('RANGE_OVERFLOW', sum.error.message);
  }
  return ok(makeMoney(a.currency, sum.value));
}

/** Exact subtraction. Requires `a` and `b` to share the same currency. */
export function subtractMoney(a: Money, b: Money): Result<Money, MoneyArithmeticErrorCode> {
  if (a.currency !== b.currency) {
    return err('CURRENCY_MISMATCH', `cannot subtract ${b.currency} from ${a.currency}`);
  }
  const difference = subtractMinorUnits(a.minorUnits, b.minorUnits);
  if (!difference.ok) {
    return err('RANGE_OVERFLOW', difference.error.message);
  }
  return ok(makeMoney(a.currency, difference.value));
}

/** True if `a` and `b` have the same currency and the same exact amount. */
export function moneyEquals(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.minorUnits === b.minorUnits;
}
