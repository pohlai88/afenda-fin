// Money wire contract (doctrine MON-01/MON-03/MON-06, stack SEL-10, SCC-03).
//
// Transport/domain separation: `MoneyWire` is a plain, JSON-safe structure
// (`{ currency: string, minorUnits: string }`) — it is NOT `Money` (whose
// `minorUnits` is a branded bigint). A domain `Money` value is never
// assignable to `MoneyWire` and vice versa (see
// tests/type-invalid/domain-money-not-assignable-to-money-transport.ts).
//
// This module does not reinvent the canonical-integer-string grammar or the
// MinorUnits range. The domain (@afenda/money) already owns that authority —
// `parseMinorUnits`'s pattern (`^-?[0-9]+$`, "-0" rejected, leading zeros
// rejected) and `MIN_MINOR_UNITS`/`MAX_MINOR_UNITS` (PostgreSQL bigint
// extrema) — via `parseMoney`/`serializeMoney`. What this module adds, which
// the domain layer deliberately does not do on its own, is the external
// SHAPE gate: a strict Zod object that rejects extra/unknown fields (SEC-05:
// "reject unknown authoritative fields unless a versioned compatibility
// policy permits them") and rejects a JSON `number` for `minorUnits` at the
// schema level, before the domain parser is ever reached.

import { z } from 'zod';
import { err, type Result } from '@afenda/errors';
import { type Money, type CanonicalMoney, parseMoney, serializeMoney, type MoneyParseErrorCode } from '@afenda/money';

/** The exact JSON wire shape of `Money`. Structurally identical to `@afenda/money`'s own `CanonicalMoney` — reused, not duplicated. */
export type MoneyWire = CanonicalMoney;

/**
 * Strict shape/type gate: exactly `currency` (string) and `minorUnits`
 * (string), no more, no fewer. `z.string()` does not coerce — a JSON
 * `number` for `minorUnits` fails here, before any domain parsing occurs.
 */
export const MoneyWireSchema: z.ZodType<MoneyWire> = z
  .object({
    currency: z.string(),
    minorUnits: z.string(),
  })
  .strict();

export type MoneyTransportErrorCode = 'MALFORMED_MONEY_WIRE_SHAPE' | MoneyParseErrorCode;

/**
 * Decodes an untrusted external value into a domain `Money`. Two layers,
 * neither duplicating the other: (1) `MoneyWireSchema` rejects a malformed
 * external shape (missing/extra fields, non-string `minorUnits`); (2) the
 * domain's own `parseMoney` is the sole authority for canonical-integer-string
 * grammar, currency format, and MinorUnits range.
 */
export function decodeMoneyTransport(input: unknown): Result<Money, MoneyTransportErrorCode> {
  const shape = MoneyWireSchema.safeParse(input);
  if (!shape.success) {
    return err('MALFORMED_MONEY_WIRE_SHAPE', `money wire shape invalid: ${shape.error.issues.map((issue) => issue.message).join('; ')}`);
  }
  return parseMoney(shape.data);
}

/** Encodes a domain `Money` to its canonical wire shape. Delegates entirely to the domain's own `serializeMoney`. */
export function encodeMoneyTransport(money: Money): MoneyWire {
  return serializeMoney(money);
}
