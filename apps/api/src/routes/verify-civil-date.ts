import { createRoute, type OpenAPIHono, z } from '@hono/zod-openapi';
import { decodeCivilDateTransport, encodeCivilDateTransport } from '@afenda/contracts';
import { mapResultToHttp } from '../http/map-result.ts';
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
    422: {
      description: 'Domain/range failure',
      content: { 'application/json': { schema: PublicFailureWireOpenApiSchema } },
    },
  },
});

export function registerCivilDateVerifyRoute(app: OpenAPIHono): void {
  app.openapi(route, (c) => {
    const { civilDate } = c.req.valid('json');
    const mapped = mapResultToHttp(decodeCivilDateTransport(civilDate), (value) => ({
      civilDate: encodeCivilDateTransport(value),
    }));
    if (mapped.status === 200) {
      return c.json(mapped.body as { civilDate: string }, 200);
    }
    if (mapped.status === 422) {
      return c.json(mapped.body, 422);
    }
    return c.json(mapped.body, 400);
  });
}
