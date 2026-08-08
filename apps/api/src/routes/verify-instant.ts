import { createRoute, type OpenAPIHono, z } from '@hono/zod-openapi';
import { decodeInstantTransport, encodeInstantTransport, encodeFailureTransport } from '@afenda/contracts';
import { InstantWireOpenApiSchema, PublicFailureWireOpenApiSchema } from '../openapi/wire-schemas.ts';

const BodySchema = z
  .object({
    instant: InstantWireOpenApiSchema,
  })
  .strict()
  .openapi('InstantVerifyBody');

const route = createRoute({
  method: 'post',
  path: '/_afenda/verify/instant',
  tags: ['afenda-verify'],
  summary: 'AFENDA reference: Instant wire round-trip (not a business operation)',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: BodySchema } },
    },
  },
  responses: {
    200: {
      description: 'Canonical InstantWire',
      content: { 'application/json': { schema: BodySchema } },
    },
    400: {
      description: 'Public failure',
      content: { 'application/json': { schema: PublicFailureWireOpenApiSchema } },
    },
  },
});

export function registerInstantVerifyRoute(app: OpenAPIHono): void {
  app.openapi(route, (c) => {
    const { instant } = c.req.valid('json');
    const decoded = decodeInstantTransport(instant);
    if (!decoded.ok) {
      return c.json(encodeFailureTransport(decoded.error), 400);
    }
    return c.json({ instant: encodeInstantTransport(decoded.value) }, 200);
  });
}
