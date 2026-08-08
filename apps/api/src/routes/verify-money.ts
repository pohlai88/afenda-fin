// Reference/verification surface — NOT product ERP functionality.
// Proves MoneyWire survives HTTP → Zod/OpenAPI → contracts decode → encode.

import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import { decodeMoneyTransport, encodeMoneyTransport } from '@afenda/contracts';
import { mapResultToHttp } from '../http/map-result.ts';
import { MoneyWireOpenApiSchema, PublicFailureWireOpenApiSchema } from '../openapi/wire-schemas.ts';

const moneyVerifyRoute = createRoute({
  method: 'post',
  path: '/_afenda/verify/money',
  tags: ['afenda-verify'],
  summary: 'AFENDA reference: Money wire round-trip (not a business operation)',
  description:
    'Verification-only endpoint. Decodes MoneyWire via @afenda/contracts and re-encodes. Not ERP posting/sales/payment functionality.',
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: MoneyWireOpenApiSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Canonical MoneyWire round-trip',
      content: { 'application/json': { schema: MoneyWireOpenApiSchema } },
    },
    400: {
      description: 'Public failure',
      content: { 'application/json': { schema: PublicFailureWireOpenApiSchema } },
    },
    422: {
      description: 'Domain/range failure',
      content: { 'application/json': { schema: PublicFailureWireOpenApiSchema } },
    },
  },
});

export function registerMoneyVerifyRoute(app: OpenAPIHono): void {
  app.openapi(moneyVerifyRoute, (c) => {
    const json = c.req.valid('json');
    const mapped = mapResultToHttp(decodeMoneyTransport(json), encodeMoneyTransport);
    if (mapped.status === 200) {
      return c.json(mapped.body as { currency: string; minorUnits: string }, 200);
    }
    if (mapped.status === 422) {
      return c.json(mapped.body, 422);
    }
    return c.json(mapped.body, 400);
  });
}
