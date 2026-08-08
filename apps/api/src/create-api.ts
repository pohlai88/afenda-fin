// Explicit app factory — no listen side effects, no globals, no DI container.

import { OpenAPIHono } from '@hono/zod-openapi';
import { validationFailureBody } from './http/map-result.ts';
import { registerHealthRoutes } from './routes/health.ts';
import { registerMoneyVerifyRoute } from './routes/verify-money.ts';
import { registerInstantVerifyRoute } from './routes/verify-instant.ts';
import { registerCivilDateVerifyRoute } from './routes/verify-civil-date.ts';
import { registerAsOfVerifyRoute } from './routes/verify-asof.ts';

/** Optional explicit capabilities. Actor/scope auth is not-yet-built (V11). */
export interface ApiDependencies {
  readonly serviceName?: string;
}

export const OPENAPI_INFO = {
  openapi: '3.1.0',
  info: {
    title: 'AFENDA API',
    version: '0.0.0',
    description:
      'Thin Hono adapter over @afenda/contracts. Routes tagged afenda-verify are reference/verification surfaces, not product ERP operations. No ledger, identity, or frontend client in this phase.',
  },
} as const;

/**
 * Compose the OpenAPIHono application. Does not bind a port.
 * Tests should call createApi() and use app.request().
 *
 * OpenAPI document identity is always OPENAPI_INFO (drift authority).
 * `deps.serviceName` is reserved for future capability wiring and does not
 * alter the OpenAPI title (avoids runtime-vs-committed document divergence).
 */
export function createApi(deps: ApiDependencies = {}): OpenAPIHono {
  void deps.serviceName;

  const app = new OpenAPIHono({
    defaultHook: (result, c) => {
      if (result.success) {
        return undefined;
      }
      return c.json(validationFailureBody(), 400);
    },
  });

  registerHealthRoutes(app);
  registerMoneyVerifyRoute(app);
  registerInstantVerifyRoute(app);
  registerCivilDateVerifyRoute(app);
  registerAsOfVerifyRoute(app);

  // Doc endpoint for humans; committed openapi.json is the gate authority.
  app.doc31('/openapi.json', OPENAPI_INFO);

  return app;
}

/** Deterministic OpenAPI 3.1 document from a fresh createApi() route registry. */
export function buildOpenApiDocument(): ReturnType<OpenAPIHono['getOpenAPI31Document']> {
  return createApi().getOpenAPI31Document(OPENAPI_INFO);
}
