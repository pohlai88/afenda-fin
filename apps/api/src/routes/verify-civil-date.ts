import { createRoute, type OpenAPIHono, z } from '@hono/zod-openapi';
import { decodeCivilDateTransport, encodeCivilDateTransport, encodeFailureTransport } from '@afenda/contracts';
import { CivilDateWireOpenApiSchema, PublicFailureWireOpenApiSchema } from '../openapi/wire-schemas.ts';

const BodySchema = z
  .object({
    civilDate: CivilDateWireOpenApiSchema,
  })
  .strict()
  .openapi('CivilDateVerifyBody');

const route = createRoute({
  method: 'post',
  path: '/_afenda/verify/civil-date',
  tags: ['afenda-verify'],
  summary: 'AFENDA reference: CivilDate wire round-trip (not a business operation)',
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: BodySchema } },
    },
  },
  responses: {
    200: {
      description: 'Canonical CivilDateWire',
      content: { 'application/json': { schema: BodySchema } },
    },
    400: {
      description: 'Public failure',
      content: { 'application/json': { schema: PublicFailureWireOpenApiSchema } },
    },
  },
});

export function registerCivilDateVerifyRoute(app: OpenAPIHono): void {
  app.openapi(route, (c) => {
    const { civilDate } = c.req.valid('json');
    const decoded = decodeCivilDateTransport(civilDate);
    if (!decoded.ok) {
      return c.json(encodeFailureTransport(decoded.error), 400);
    }
    return c.json({ civilDate: encodeCivilDateTransport(decoded.value) }, 200);
  });
}
