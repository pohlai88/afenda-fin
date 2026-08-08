import { describe, expect, it } from 'vitest';
import { createApi } from '../src/create-api.ts';

async function postMoney(body: unknown): Promise<Response> {
  const app = createApi();
  return app.request('/_afenda/verify/money', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('HTTP Money verify (reference route)', () => {
  it('round-trips 2^53-1 / 2^53 / 2^53+1 as canonical integer strings', async () => {
    for (const minorUnits of ['9007199254740991', '9007199254740992', '9007199254740993']) {
      const res = await postMoney({ currency: 'MYR', minorUnits });
      expect(res.status).toBe(200);
      const json: unknown = await res.json();
      expect(json).toEqual({ currency: 'MYR', minorUnits });
      expect(typeof (json as { minorUnits: string }).minorUnits).toBe('string');
    }
  });

  it('round-trips PostgreSQL bigint bounds', async () => {
    for (const minorUnits of ['-9223372036854775808', '9223372036854775807']) {
      const res = await postMoney({ currency: 'USD', minorUnits });
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({ currency: 'USD', minorUnits });
    }
  });

  it('rejects JSON number minorUnits (SEC-05)', async () => {
    const res = await postMoney({ currency: 'MYR', minorUnits: 12345 });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { code: string };
    expect(json.code).toBe('REQUEST_VALIDATION_FAILED');
    expect(json).not.toHaveProperty('cause');
  });

  it('rejects malformed minorUnits via contracts decode', async () => {
    const res = await postMoney({ currency: 'MYR', minorUnits: '12.34' });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { code: string };
    expect(json.code).not.toBe('REQUEST_VALIDATION_FAILED');
    expect(json).not.toHaveProperty('cause');
  });

  it('rejects out-of-range minorUnits', async () => {
    const res = await postMoney({ currency: 'MYR', minorUnits: '9223372036854775808' });
    expect([400, 422]).toContain(res.status);
  });

  it('rejects extra authoritative fields under strict schema', async () => {
    const res = await postMoney({ currency: 'MYR', minorUnits: '1', extra: true });
    expect(res.status).toBe(400);
  });

  it('rejects missing currency', async () => {
    const res = await postMoney({ minorUnits: '1' });
    expect(res.status).toBe(400);
  });
});
