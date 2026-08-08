import { createRoute, type OpenAPIHono } from '@hono/zod-openapi';
import { HealthWireOpenApiSchema } from '../openapi/wire-schemas.ts';

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['ops'],
  summary: 'Liveness probe (not an authoritative money/time boundary)',
  responses: {
    200: {
      description: 'Process is up',
      content: {
        'application/json': {
          schema: HealthWireOpenApiSchema,
        },
      },
    },
  },
});

export function registerHealthRoutes(app: OpenAPIHono): void {
  app.openapi(healthRoute, (c) => c.json({ ok: true as const }, 200));
}
