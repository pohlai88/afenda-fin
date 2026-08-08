import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import { decodeAsOfTransport, encodeAsOfTransport, encodeFailureTransport } from '@afenda/contracts';
import { AsOfWireOpenApiSchema, PublicFailureWireOpenApiSchema } from '../openapi/wire-schemas.ts';

const route = createRoute({
  method: 'post',
  path: '/_afenda/verify/as-of',
  tags: ['afenda-verify'],
  summary: 'AFENDA reference: AsOf wire round-trip (not a business operation)',
  description: 'Both businessAsOf and knowledgeAsOf are required. Neither may be omitted or substituted.',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: AsOfWireOpenApiSchema } },
    },
  },
  responses: {
    200: {
      description: 'Canonical AsOfWire',
      content: { 'application/json': { schema: AsOfWireOpenApiSchema } },
    },
    400: {
      description: 'Public failure',
      content: { 'application/json': { schema: PublicFailureWireOpenApiSchema } },
    },
  },
});

export function registerAsOfVerifyRoute(app: OpenAPIHono): void {
  app.openapi(route, (c) => {
    const json = c.req.valid('json');
    const decoded = decodeAsOfTransport(json);
    if (!decoded.ok) {
      return c.json(encodeFailureTransport(decoded.error), 400);
    }
    return c.json(encodeAsOfTransport(decoded.value), 200);
  });
}
