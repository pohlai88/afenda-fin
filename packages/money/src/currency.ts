// CurrencyCode: an explicit, validated currency identifier (doctrine MON-03: "no
// implicit currency"). Format validation only (3 uppercase ASCII letters, the
// ISO 4217 alphabetic shape) — this module does not maintain or validate against
// a live ISO 4217 registry; that is a future, explicitly-scoped concern, not
// invented here.
//
// Branded so a plain `string` can never be silently substituted for a validated
// `CurrencyCode` without going through `toCurrencyCode`.

import { err, ok, type Result } from '@afenda/errors';

declare const currencyCodeBrand: unique symbol;

/** A validated, explicit currency code. Never construct one except via `toCurrencyCode`. */
export type CurrencyCode = string & { readonly [currencyCodeBrand]: 'CurrencyCode' };

export type CurrencyCodeErrorCode = 'INVALID_CURRENCY_CODE';

const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

/** Validates and brands `code` as a `CurrencyCode`. The only sanctioned way to obtain one. */
export function toCurrencyCode(code: string): Result<CurrencyCode, CurrencyCodeErrorCode> {
  if (!CURRENCY_CODE_PATTERN.test(code)) {
    return err('INVALID_CURRENCY_CODE', `currency code must be exactly 3 uppercase letters, got ${JSON.stringify(code)}`);
  }
  // Single sanctioned brand-attaching cast, immediately after validation, inside
  // this module's one smart constructor. This does not silence a real
  // assignability error — `code` genuinely has passed the format check above —
  // it only attaches the nominal brand that lets the type system reject
  // unvalidated strings everywhere else.
  return ok(code as CurrencyCode);
}

/** True if `code` would be accepted by `toCurrencyCode`, without allocating a Result. */
export function isValidCurrencyCode(code: string): boolean {
  return CURRENCY_CODE_PATTERN.test(code);
}
