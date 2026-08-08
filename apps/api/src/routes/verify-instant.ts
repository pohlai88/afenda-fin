import { createRoute, type OpenAPIHono, z } from '@hono/zod-openapi';
import { decodeInstantTransport, encodeInstantTransport } from '@afenda/contracts';
import { mapResultToHttp } from '../http/map-result.ts';
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
    422: {
      description: 'Domain/range failure',
      content: { 'application/json': { schema: PublicFailureWireOpenApiSchema } },
    },
  },
});

export function registerInstantVerifyRoute(app: OpenAPIHono): void {
  app.openapi(route, (c) => {
    const { instant } = c.req.valid('json');
    const mapped = mapResultToHttp(decodeInstantTransport(instant), (value) => ({
      instant: encodeInstantTransport(value),
    }));
    if (mapped.status === 200) {
      return c.json(mapped.body as { instant: string }, 200);
    }
    if (mapped.status === 422) {
      return c.json(mapped.body, 422);
    }
    return c.json(mapped.body, 400);
  });
}
