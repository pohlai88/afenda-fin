// Reference/verification surface — NOT product ERP functionality.
// Proves MoneyWire survives HTTP → Zod/OpenAPI → contracts decode → encode.

import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import { decodeMoneyTransport, encodeMoneyTransport, encodeFailureTransport } from '@afenda/contracts';
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
    const decoded = decodeMoneyTransport(json);
    if (!decoded.ok) {
      const status = decoded.error.code.includes('OVERFLOW') || decoded.error.code.includes('RANGE') ? 422 : 400;
      return c.json(encodeFailureTransport(decoded.error), status);
    }
    return c.json(encodeMoneyTransport(decoded.value), 200);
  });
}
