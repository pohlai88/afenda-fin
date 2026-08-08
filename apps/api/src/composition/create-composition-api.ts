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

type PublicFailureBody = { code: string; message: string; details?: Record<string, string | number | boolean | null> };

function asPublicFailure(body: unknown): PublicFailureBody {
  return body as PublicFailureBody;
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
      if (mapped.status === 200) return c.json(mapped.body as never, 200);
      if (mapped.status === 422) return c.json(asPublicFailure(mapped.body), 422);
      if (mapped.status === 500) return c.json(asPublicFailure(mapped.body), 500);
      return c.json(asPublicFailure(mapped.body), 400);
    }
    const wire = encodeMoneyTransport(decoded.value);
    const persisted = await roundTripMoneyExact(deps.pool, wire);
    if (!persisted.ok) {
      const mapped = mapResultToHttp(persisted, (v) => v);
      return c.json(asPublicFailure(mapped.body), 500);
    }
    // Re-enter contracts so domain decode gates the DB-returned strings.
    const again = decodeMoneyTransport(persisted.value);
    const mapped = mapResultToHttp(again, encodeMoneyTransport);
    if (mapped.status === 200) {
      return c.json(mapped.body as { currency: string; minorUnits: string }, 200);
    }
    if (mapped.status === 422) return c.json(asPublicFailure(mapped.body), 422);
    if (mapped.status === 500) return c.json(asPublicFailure(mapped.body), 500);
    return c.json(asPublicFailure(mapped.body), 400);
  });

  app.openapi(instantRoute, async (c) => {
    const { instant } = c.req.valid('json');
    const decoded = decodeInstantTransport(instant);
    if (!decoded.ok) {
      const mapped = mapResultToHttp(decoded, encodeInstantTransport);
      if (mapped.status === 200) return c.json({ instant: mapped.body as string }, 200);
      if (mapped.status === 422) return c.json(asPublicFailure(mapped.body), 422);
      if (mapped.status === 500) return c.json(asPublicFailure(mapped.body), 500);
      return c.json(asPublicFailure(mapped.body), 400);
    }
    const canonical = encodeInstantTransport(decoded.value);
    const persisted = await roundTripInstantExact(deps.pool, canonical, deps.instantSessionTimeZone);
    if (!persisted.ok) {
      return c.json(asPublicFailure(mapResultToHttp(persisted, (v) => v).body), 500);
    }
    const again = decodeInstantTransport(persisted.value.instant);
    const mapped = mapResultToHttp(again, (value) => ({ instant: encodeInstantTransport(value) }));
    if (mapped.status === 200) return c.json(mapped.body as { instant: string }, 200);
    if (mapped.status === 422) return c.json(asPublicFailure(mapped.body), 422);
    if (mapped.status === 500) return c.json(asPublicFailure(mapped.body), 500);
    return c.json(asPublicFailure(mapped.body), 400);
  });

  app.openapi(civilDateRoute, async (c) => {
    const { civilDate } = c.req.valid('json');
    const decoded = decodeCivilDateTransport(civilDate);
    if (!decoded.ok) {
      const mapped = mapResultToHttp(decoded, encodeCivilDateTransport);
      if (mapped.status === 200) return c.json({ civilDate: mapped.body as string }, 200);
      if (mapped.status === 422) return c.json(asPublicFailure(mapped.body), 422);
      if (mapped.status === 500) return c.json(asPublicFailure(mapped.body), 500);
      return c.json(asPublicFailure(mapped.body), 400);
    }
    const canonical = encodeCivilDateTransport(decoded.value);
    const persisted = await roundTripCivilDateExact(deps.pool, canonical);
    if (!persisted.ok) {
      return c.json(asPublicFailure(mapResultToHttp(persisted, (v) => v).body), 500);
    }
    const again = decodeCivilDateTransport(persisted.value.civilDate);
    const mapped = mapResultToHttp(again, (value) => ({ civilDate: encodeCivilDateTransport(value) }));
    if (mapped.status === 200) return c.json(mapped.body as { civilDate: string }, 200);
    if (mapped.status === 422) return c.json(asPublicFailure(mapped.body), 422);
    if (mapped.status === 500) return c.json(asPublicFailure(mapped.body), 500);
    return c.json(asPublicFailure(mapped.body), 400);
  });

  app.openapi(failRoute, async (c) => {
    const failed = await failExactPersistenceProbe(deps.pool);
    const mapped = mapResultToHttp(failed, (v) => v);
    return c.json(asPublicFailure(mapped.body), 500);
  });

  return app;
}
