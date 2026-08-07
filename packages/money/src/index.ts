// Root public API of @afenda/money. Consumers must import from the package root
// ("@afenda/money"), never from a src/* subpath — enforced by .dependency-cruiser.cjs's
// no-cross-package-src-import rule (SCC-05).

export type { CurrencyCode, CurrencyCodeErrorCode } from './currency.ts';
export { toCurrencyCode, isValidCurrencyCode } from './currency.ts';

export type { MinorUnits, MinorUnitsErrorCode, MinorUnitsArithmeticErrorCode } from './minor-units.ts';
export {
  MIN_MINOR_UNITS,
  MAX_MINOR_UNITS,
  toMinorUnits,
  parseMinorUnits,
  minorUnitsToCanonicalString,
  addMinorUnits,
  subtractMinorUnits,
  signOfMinorUnits,
} from './minor-units.ts';

export type { Money, CanonicalMoney, MoneyFromPartsErrorCode, MoneyParseErrorCode, MoneyArithmeticErrorCode } from './money.ts';
export { makeMoney, moneyFromParts, serializeMoney, parseMoney, addMoney, subtractMoney, moneyEquals } from './money.ts';

export type { Rate, RateErrorCode } from './rate.ts';
export { toRate, rateEquals, signOfRate } from './rate.ts';

export type { RoundingBoundaryId, RoundingErrorCode } from './rounding.ts';
export { ROUNDING_BOUNDARY_IDS, roundExactRateToMinorUnits } from './rounding.ts';
