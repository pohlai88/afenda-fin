// Public-safe Result/Failure wire contract (doctrine SEC-05, GOV-01/GOV-02).
//
// This does not redesign @afenda/errors — it wraps the existing
// `toPublicJson` projection (which already strips the diagnostic `cause`)
// with a Zod schema for the external wire shape, and proves structurally
// that the generic, non-authoritative `details` numeric slot can never carry
// an authoritative Money value:
//
//   - `PublicErrorDetailValueSchema` only ever accepts `string | number |
//     boolean | null` — the same restriction @afenda/errors' own
//     `PublicErrorDetailValue` type already declares.
//   - `Money`/`MinorUnits` are branded, structurally distinct types (an
//     object with a branded-bigint field, and a branded bigint,
//     respectively) — neither is a `string | number | boolean | null`, so
//     neither can be assigned into a `details` value at compile time. See
//     tests/type-invalid/money-cannot-enter-failure-details.ts.
//   - An authoritative Money amount that legitimately needs to appear in a
//     diagnostic must cross as its canonical decimal STRING (via
//     `minorUnitsToCanonicalString`/`serializeMoney`), which is exactly a
//     `string` and therefore already representable — never as a JS number.
//
// Encode and decode share `@afenda/errors`' detail canonicalization
// (`normalizePublicErrorDetails`), so inbound `-0` becomes `'-0'` just as
// outbound encode/`toPublicJson` already does. No HTTP status mapping exists
// here; no API framework exists yet (SCC-12).

import { z } from 'zod';
import {
  err,
  ok,
  normalizePublicErrorDetails,
  toPublicJson,
  type ErrorShape,
  type Result,
} from '@afenda/errors';

/** JSON-safe scalar allowed inside a public failure's `details` — identical restriction to @afenda/errors' own `PublicErrorDetailValue`. */
export const PublicErrorDetailValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

/** The exact JSON wire shape of a public (diagnostic-stripped) failure. */
export const PublicFailureWireSchema = z
  .object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), PublicErrorDetailValueSchema).optional(),
  })
  .strict();

export type PublicFailureWire = z.infer<typeof PublicFailureWireSchema>;

/** Encodes an internal `ErrorShape` to its public wire shape. Delegates entirely to `@afenda/errors`' own `toPublicJson` — `cause` is never present. */
export function encodeFailureTransport<C extends string>(error: ErrorShape<C>): PublicFailureWire {
  return toPublicJson(error);
}

/**
 * Validates that an untrusted external value has the shape of a public
 * failure, then applies the same detail canonicalization as encode /
 * `toPublicJson` (including `-0` → `'-0'`). This is a shape + canonical-form
 * gate — a decoded failure wire is terminal transport data (a description of
 * a past failure), not a domain value to reconstruct further, so there is no
 * corresponding "decode to ErrorShape" step.
 */
export function decodeFailureTransportShape(input: unknown): Result<PublicFailureWire, 'MALFORMED_FAILURE_WIRE_SHAPE'> {
  const shape = PublicFailureWireSchema.safeParse(input);
  if (!shape.success) {
    return err('MALFORMED_FAILURE_WIRE_SHAPE', `failure wire shape invalid: ${shape.error.issues.map((issue) => issue.message).join('; ')}`);
  }
  const { code, message, details } = shape.data;
  if (details === undefined) {
    return ok({ code, message });
  }
  return ok({ code, message, details: normalizePublicErrorDetails(details) });
}
