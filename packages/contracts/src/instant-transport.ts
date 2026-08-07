// Instant wire contract (doctrine TIM-01/TIM-03, stack SEL-10).
//
// The wire shape is exactly the canonical RFC 3339 string
// (`YYYY-MM-DDTHH:mm:ss.sssZ`) `@afenda/time` already defines and owns. This
// module adds only the external shape gate (a JSON string, not any other
// JSON type) before delegating all calendar/format authority to the domain's
// own `parseInstant`/`instantToCanonicalString` — no duplicate temporal
// semantics are created here.

import { z } from 'zod';
import { err, type Result } from '@afenda/errors';
import { type Instant, parseInstant, instantToCanonicalString, type InstantErrorCode } from '@afenda/time';

/** The exact JSON wire shape of `Instant`: its canonical RFC 3339 string. */
export type InstantWire = string;

export const InstantWireSchema: z.ZodType<InstantWire> = z.string();

export type InstantTransportErrorCode = 'MALFORMED_INSTANT_WIRE_SHAPE' | InstantErrorCode;

/** Decodes an untrusted external value into a domain `Instant`. Shape gate, then the domain parser is the sole calendar authority. */
export function decodeInstantTransport(input: unknown): Result<Instant, InstantTransportErrorCode> {
  const shape = InstantWireSchema.safeParse(input);
  if (!shape.success) {
    return err('MALFORMED_INSTANT_WIRE_SHAPE', `instant wire shape invalid: ${shape.error.issues.map((issue) => issue.message).join('; ')}`);
  }
  return parseInstant(shape.data);
}

/** Encodes a domain `Instant` to its canonical wire string. Delegates entirely to the domain's own `instantToCanonicalString`. */
export function encodeInstantTransport(instant: Instant): InstantWire {
  return instantToCanonicalString(instant);
}
