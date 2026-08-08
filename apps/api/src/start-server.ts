import { serve } from '@hono/node-server';
import type { OpenAPIHono } from '@hono/zod-openapi';

export interface StartServerOptions {
  readonly port: number;
  readonly hostname?: string;
}

export interface StartedServer {
  readonly port: number;
  readonly close: () => Promise<void>;
}

/**
 * Bind the composed app to @hono/node-server. Separated from createApi so
 * tests exercise the app without sockets unless they opt into this helper.
 */
export function startServer(app: OpenAPIHono, options: StartServerOptions): StartedServer {
  const hostname = options.hostname ?? '127.0.0.1';
  const server = serve({
    fetch: app.fetch,
    port: options.port,
    hostname,
  });

  return {
    port: options.port,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
  };
}
