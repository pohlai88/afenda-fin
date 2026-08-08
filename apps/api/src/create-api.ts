// Explicit app factory — no listen side effects, no globals, no DI container.

import { OpenAPIHono } from '@hono/zod-openapi';
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
 */
export function createApi(deps: ApiDependencies = {}): OpenAPIHono {
  const app = new OpenAPIHono({
    defaultHook: (result, c) => {
      if (result.success) {
        return undefined;
      }
      return c.json(
        {
          code: 'REQUEST_VALIDATION_FAILED',
          message: 'request failed OpenAPI/Zod validation',
        },
        400,
      );
    },
  });

  registerHealthRoutes(app);
  registerMoneyVerifyRoute(app);
  registerInstantVerifyRoute(app);
  registerCivilDateVerifyRoute(app);
  registerAsOfVerifyRoute(app);

  // Doc endpoint for humans; committed openapi.json is the gate authority.
  // Explicit deps reserved for future Clock/actor capabilities (V11 not-yet-built).
  const docInfo =
    deps.serviceName === undefined
      ? OPENAPI_INFO
      : {
          ...OPENAPI_INFO,
          info: {
            ...OPENAPI_INFO.info,
            title: `${deps.serviceName} (AFENDA API)`,
          },
        };
  app.doc31('/openapi.json', docInfo);

  return app;
}

/** Deterministic OpenAPI 3.1 document from the live route registry (no timestamps). */
export function buildOpenApiDocument(app: OpenAPIHono = createApi()): ReturnType<OpenAPIHono['getOpenAPI31Document']> {
  return app.getOpenAPI31Document(OPENAPI_INFO);
}
