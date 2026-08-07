// AsOf wire contract (doctrine TIM-04, stack SEL-10).
//
// Both boundaries are mandatory at the wire shape too — `AsOfWireSchema` is a
// strict object with two required string fields, so a wire payload missing
// either `businessAsOf` or `knowledgeAsOf` fails Zod validation before any
// domain construction is attempted. This mirrors, at the transport layer, the
// same non-optionality `@afenda/time`'s `AsOf` interface already enforces at
// the domain layer (see tests/type-invalid/asof-transport-missing-*.ts).

import { z } from 'zod';
import { err, ok, type Result } from '@afenda/errors';
import { type AsOf, makeAsOf } from '@afenda/time';
import { InstantWireSchema, decodeInstantTransport, encodeInstantTransport, type InstantTransportErrorCode } from './instant-transport.ts';

/** The exact JSON wire shape of `AsOf`: both boundaries present, each the canonical `Instant` wire string. */
export interface AsOfWire {
  readonly businessAsOf: string;
  readonly knowledgeAsOf: string;
}

export const AsOfWireSchema: z.ZodType<AsOfWire> = z
  .object({
    businessAsOf: InstantWireSchema,
    knowledgeAsOf: InstantWireSchema,
  })
  .strict();

export type AsOfTransportErrorCode = 'MALFORMED_ASOF_WIRE_SHAPE' | InstantTransportErrorCode;

/**
 * Decodes an untrusted external value into a domain `AsOf`. Both dimensions
 * are validated independently — one being malformed never masks the other,
 * and neither can be silently defaulted from the other.
 */
export function decodeAsOfTransport(input: unknown): Result<AsOf, AsOfTransportErrorCode> {
  const shape = AsOfWireSchema.safeParse(input);
  if (!shape.success) {
    return err('MALFORMED_ASOF_WIRE_SHAPE', `as-of wire shape invalid: ${shape.error.issues.map((issue) => issue.message).join('; ')}`);
  }
  const business = decodeInstantTransport(shape.data.businessAsOf);
  if (!business.ok) return business;
  const knowledge = decodeInstantTransport(shape.data.knowledgeAsOf);
  if (!knowledge.ok) return knowledge;
  return ok(makeAsOf(business.value, knowledge.value));
}

/** Encodes a domain `AsOf` to its canonical wire shape. Both boundaries always present, each independently encoded. */
export function encodeAsOfTransport(asOf: AsOf): AsOfWire {
  return {
    businessAsOf: encodeInstantTransport(asOf.businessAsOf),
    knowledgeAsOf: encodeInstantTransport(asOf.knowledgeAsOf),
  };
}
