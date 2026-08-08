import { describe, expect, it } from 'vitest';
import { createApi } from '../src/create-api.ts';

describe('GET /health', () => {
  it('returns ok: true', async () => {
    const app = createApi();
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });
});
