// Verification-only composition HTTP surface — NOT registered by createApi().
// Proves HTTP → contracts → packages/db → PostgreSQL → Result → HTTP.
// Production router must never import or mount these routes.

import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import {
  decodeCivilDateTransport,
  decodeInstantTransport,
  decodeMoneyTransport,
  encodeCivilDateTransport,
  encodeInstantTransport,
  encodeMoneyTransport,
} from '@afenda/contracts';
import {
  failExactPersistenceProbe,
  roundTripCivilDateExact,
  roundTripInstantExact,
  roundTripMoneyExact,
  type Pool,
} from '@afenda/db';
import { mapResultToHttp, validationFailureBody } from '../http/map-result.ts';
import {
  CivilDateWireOpenApiSchema,
  InstantWireOpenApiSchema,
  MoneyWireOpenApiSchema,
  PublicFailureWireOpenApiSchema,
} from '../openapi/wire-schemas.ts';

export interface CompositionApiDependencies {
  readonly pool: Pool;
  /** Optional session TimeZone for Instant probe (e.g. Asia/Kuala_Lumpur). */
  readonly instantSessionTimeZone?: string;
}

const InstantBodySchema = z
  .object({ instant: InstantWireOpenApiSchema })
  .strict()
  .openapi('CompositionInstantBody');

const CivilDateBodySchema = z
  .object({ civilDate: CivilDateWireOpenApiSchema })
  .strict()
  .openapi('CompositionCivilDateBody');

const moneyRoute = createRoute({
  method: 'post',
  path: '/_afenda/composition/money',
  tags: ['afenda-composition-verify'],
  summary: 'Verification-only Money HTTP→DB→HTTP (not product ERP)',
  request: {
    body: { required: true, content: { 'application/json': { schema: MoneyWireOpenApiSchema } } },
  },
  responses: {
    200: {
      description: 'Exact MoneyWire after PostgreSQL bigint round-trip',
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
    500: {
      description: 'Persistence failure (public-safe)',
      content: { 'application/json': { schema: PublicFailureWireOpenApiSchema } },
    },
  },
});

const instantRoute = createRoute({
  method: 'post',
  path: '/_afenda/composition/instant',
  tags: ['afenda-composition-verify'],
  summary: 'Verification-only Instant HTTP→DB→HTTP (not product ERP)',
  request: {
    body: { required: true, content: { 'application/json': { schema: InstantBodySchema } } },
  },
  responses: {
    200: {
      description: 'Exact Instant after timestamptz round-trip',
      content: { 'application/json': { schema: InstantBodySchema } },
    },
    400: {
      description: 'Public failure',
      content: { 'application/json': { schema: PublicFailureWireOpenApiSchema } },
    },
    422: {
      description: 'Domain/range failure',
      content: { 'application/json': { schema: PublicFailureWireOpenApiSchema } },
    },
    500: {
      description: 'Persistence failure (public-safe)',
      content: { 'application/json': { schema: PublicFailureWireOpenApiSchema } },
    },
  },
});

const civilDateRoute = createRoute({
  method: 'post',
  path: '/_afenda/composition/civil-date',
  tags: ['afenda-composition-verify'],
  summary: 'Verification-only CivilDate HTTP→DB→HTTP (not product ERP)',
  request: {
    body: { required: true, content: { 'application/json': { schema: CivilDateBodySchema } } },
  },
  responses: {
    200: {
      description: 'Exact CivilDate after date round-trip',
      content: { 'application/json': { schema: CivilDateBodySchema } },
    },
    400: {
      description: 'Public failure',
      content: { 'application/json': { schema: PublicFailureWireOpenApiSchema } },
    },
    422: {
      description: 'Domain/range failure',
      content: { 'application/json': { schema: PublicFailureWireOpenApiSchema } },
    },
    500: {
      description: 'Persistence failure (public-safe)',
      content: { 'application/json': { schema: PublicFailureWireOpenApiSchema } },
    },
  },
});

const failRoute = createRoute({
  method: 'post',
  path: '/_afenda/composition/fail',
  tags: ['afenda-composition-verify'],
  summary: 'Verification-only deliberate DB failure (not product ERP)',
  responses: {
    500: {
      description: 'Public-safe persistence failure',
      content: { 'application/json': { schema: PublicFailureWireOpenApiSchema } },
    },
  },
});

/**
 * Test/composition factory. Must not be called from createApi() / cli.ts.
 */
export function createCompositionApi(deps: CompositionApiDependencies): OpenAPIHono {
  const app = new OpenAPIHono({
    defaultHook: (result, c) => {
      if (result.success) return undefined;
      return c.json(validationFailureBody(), 400);
    },
  });

  app.openapi(moneyRoute, async (c) => {
    const json = c.req.valid('json');
    const decoded = decodeMoneyTransport(json);
    if (!decoded.ok) {
      const mapped = mapResultToHttp(decoded, encodeMoneyTransport);
      // Exclude 200 first so failure body narrows (OpenAPI typed responses).
      if (mapped.status === 200) {
        return c.json(mapped.body as { currency: string; minorUnits: string }, 200);
      }
      if (mapped.status === 422) return c.json(mapped.body, 422);
      if (mapped.status === 500) return c.json(mapped.body, 500);
      return c.json(mapped.body, 400);
    }
    const persisted = await roundTripMoneyExact(deps.pool, encodeMoneyTransport(decoded.value));
    if (!persisted.ok) {
      const mapped = mapResultToHttp(persisted, (v) => v);
      if (mapped.status === 200) {
        return c.json(mapped.body as { currency: string; minorUnits: string }, 200);
      }
      if (mapped.status === 422) return c.json(mapped.body, 422);
      if (mapped.status === 500) return c.json(mapped.body, 500);
      return c.json(mapped.body, 400);
    }
    const mapped = mapResultToHttp(decodeMoneyTransport(persisted.value), encodeMoneyTransport);
    if (mapped.status === 200) {
      return c.json(mapped.body as { currency: string; minorUnits: string }, 200);
    }
    if (mapped.status === 422) return c.json(mapped.body, 422);
    if (mapped.status === 500) return c.json(mapped.body, 500);
    return c.json(mapped.body, 400);
  });

  app.openapi(instantRoute, async (c) => {
    const { instant } = c.req.valid('json');
    const decoded = decodeInstantTransport(instant);
    const toBody = (value: Parameters<typeof encodeInstantTransport>[0]) => ({
      instant: encodeInstantTransport(value),
    });
    if (!decoded.ok) {
      const mapped = mapResultToHttp(decoded, toBody);
      if (mapped.status === 200) return c.json(mapped.body, 200);
      if (mapped.status === 422) return c.json(mapped.body, 422);
      if (mapped.status === 500) return c.json(mapped.body, 500);
      return c.json(mapped.body, 400);
    }
    const persisted = await roundTripInstantExact(
      deps.pool,
      encodeInstantTransport(decoded.value),
      deps.instantSessionTimeZone,
    );
    if (!persisted.ok) {
      const mapped = mapResultToHttp(persisted, (v) => v);
      // Cast: Err-narrowed Result loses success body precision for OpenAPI.
      if (mapped.status === 200) return c.json(mapped.body as { instant: string }, 200);
      if (mapped.status === 422) return c.json(mapped.body, 422);
      if (mapped.status === 500) return c.json(mapped.body, 500);
      return c.json(mapped.body, 400);
    }
    const mapped = mapResultToHttp(decodeInstantTransport(persisted.value.instant), toBody);
    if (mapped.status === 200) return c.json(mapped.body, 200);
    if (mapped.status === 422) return c.json(mapped.body, 422);
    if (mapped.status === 500) return c.json(mapped.body, 500);
    return c.json(mapped.body, 400);
  });

  app.openapi(civilDateRoute, async (c) => {
    const { civilDate } = c.req.valid('json');
    const decoded = decodeCivilDateTransport(civilDate);
    const toBody = (value: Parameters<typeof encodeCivilDateTransport>[0]) => ({
      civilDate: encodeCivilDateTransport(value),
    });
    if (!decoded.ok) {
      const mapped = mapResultToHttp(decoded, toBody);
      if (mapped.status === 200) return c.json(mapped.body, 200);
      if (mapped.status === 422) return c.json(mapped.body, 422);
      if (mapped.status === 500) return c.json(mapped.body, 500);
      return c.json(mapped.body, 400);
    }
    const persisted = await roundTripCivilDateExact(
      deps.pool,
      encodeCivilDateTransport(decoded.value),
    );
    if (!persisted.ok) {
      const mapped = mapResultToHttp(persisted, (v) => v);
      // Cast: Err-narrowed Result loses success body precision for OpenAPI.
      if (mapped.status === 200) return c.json(mapped.body as { civilDate: string }, 200);
      if (mapped.status === 422) return c.json(mapped.body, 422);
      if (mapped.status === 500) return c.json(mapped.body, 500);
      return c.json(mapped.body, 400);
    }
    const mapped = mapResultToHttp(decodeCivilDateTransport(persisted.value.civilDate), toBody);
    if (mapped.status === 200) return c.json(mapped.body, 200);
    if (mapped.status === 422) return c.json(mapped.body, 422);
    if (mapped.status === 500) return c.json(mapped.body, 500);
    return c.json(mapped.body, 400);
  });

  app.openapi(failRoute, async (c) => {
    const failed = await failExactPersistenceProbe(deps.pool);
    const mapped = mapResultToHttp(failed, (): { unreachable: true } => ({ unreachable: true }));
    if (mapped.status === 500) return c.json(mapped.body, 500);
    return c.json(
      { code: 'PERSISTENCE_PROBE_FAILED', message: 'exact persistence probe failed' },
      500,
    );
  });

  return app;
}
