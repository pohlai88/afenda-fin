import { describe, expect, it } from 'vitest';
import { createApi } from '../src/create-api.ts';
import { startServer } from '../src/start-server.ts';

describe('Node adapter smoke', () => {
  it('serves /health via @hono/node-server', async () => {
    const app = createApi();
    const port = 18787;
    const live = startServer(app, { port });
    try {
      const res = await fetch(`http://127.0.0.1:${String(port)}/health`);
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({ ok: true });
    } finally {
      await live.close();
    }
  });
});
