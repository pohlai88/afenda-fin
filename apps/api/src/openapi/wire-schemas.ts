// OpenAPI-registered wire schemas for route docs/validation.
// Field shapes match @afenda/contracts exactly; handlers still call
// decode*Transport so domain/canonical authority is never duplicated here.

import { z } from '@hono/zod-openapi';

export const MoneyWireOpenApiSchema = z
  .object({
    currency: z.string().openapi({ example: 'MYR' }),
    minorUnits: z.string().openapi({
      description: 'Canonical integer string (never JSON number)',
      example: '12345',
    }),
  })
  .strict()
  .openapi('MoneyWire');

export const InstantWireOpenApiSchema = z.string().openapi({
  description: 'Canonical RFC 3339 UTC instant (YYYY-MM-DDTHH:mm:ss.sssZ)',
  example: '2026-08-08T00:00:00.000Z',
  // Named component registration happens via parent objects / MoneyWire style.
});

export const CivilDateWireOpenApiSchema = z.string().openapi({
  description: 'Canonical civil date YYYY-MM-DD (no timezone)',
  example: '2026-08-08',
});

export const AsOfWireOpenApiSchema = z
  .object({
    businessAsOf: InstantWireOpenApiSchema,
    knowledgeAsOf: InstantWireOpenApiSchema,
  })
  .strict()
  .openapi('AsOfWire');

export const PublicFailureWireOpenApiSchema = z
  .object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  })
  .strict()
  .openapi('PublicFailureWire');

export const HealthWireOpenApiSchema = z
  .object({
    ok: z.literal(true),
  })
  .strict()
  .openapi('HealthWire');
