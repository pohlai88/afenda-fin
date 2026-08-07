// CivilDate wire contract (doctrine TIM-01, stack SEL-10).
//
// The wire shape is exactly the canonical `YYYY-MM-DD` string
// `@afenda/time` already defines and owns. No timezone inference occurs at
// this boundary or in the domain parser it delegates to — a CivilDate never
// becomes an Instant here.

import { z } from 'zod';
import { err, type Result } from '@afenda/errors';
import { type CivilDate, parseCivilDate, civilDateToCanonicalString, type CivilDateErrorCode } from '@afenda/time';

/** The exact JSON wire shape of `CivilDate`: its canonical `YYYY-MM-DD` string. */
export type CivilDateWire = string;

export const CivilDateWireSchema: z.ZodType<CivilDateWire> = z.string();

export type CivilDateTransportErrorCode = 'MALFORMED_CIVIL_DATE_WIRE_SHAPE' | CivilDateErrorCode;

/** Decodes an untrusted external value into a domain `CivilDate`. Shape gate, then the domain parser is the sole calendar authority. */
export function decodeCivilDateTransport(input: unknown): Result<CivilDate, CivilDateTransportErrorCode> {
  const shape = CivilDateWireSchema.safeParse(input);
  if (!shape.success) {
    return err('MALFORMED_CIVIL_DATE_WIRE_SHAPE', `civil date wire shape invalid: ${shape.error.issues.map((issue) => issue.message).join('; ')}`);
  }
  return parseCivilDate(shape.data);
}

/** Encodes a domain `CivilDate` to its canonical wire string. Delegates entirely to the domain's own `civilDateToCanonicalString`. */
export function encodeCivilDateTransport(date: CivilDate): CivilDateWire {
  return civilDateToCanonicalString(date);
}
