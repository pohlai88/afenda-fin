import { describe, expect, it } from 'vitest';
import { createApi } from '../src/create-api.ts';

const app = () => createApi();

describe('HTTP Instant / CivilDate / AsOf verify', () => {
  it('round-trips a canonical Instant', async () => {
    const instant = '2026-08-08T00:00:00.000Z';
    const res = await app().request('/_afenda/verify/instant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ instant }),
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ instant });
  });

  it('rejects malformed Instant calendar (2026-02-30)', async () => {
    const res = await app().request('/_afenda/verify/instant', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ instant: '2026-02-30T00:00:00.000Z' }),
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { code: string };
    expect(json.code).toMatch(/MALFORMED|INVALID|CANONICAL/i);
    expect(json).not.toHaveProperty('cause');
  });

  it('round-trips CivilDate', async () => {
    const civilDate = '2026-08-08';
    const res = await app().request('/_afenda/verify/civil-date', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ civilDate }),
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ civilDate });
  });

  it('rejects malformed CivilDate', async () => {
    const res = await app().request('/_afenda/verify/civil-date', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ civilDate: '2026-02-30' }),
    });
    expect(res.status).toBe(400);
  });

  it('round-trips AsOf with both boundaries', async () => {
    const body = {
      businessAsOf: '2026-01-01T00:00:00.000Z',
      knowledgeAsOf: '2026-08-08T00:00:00.000Z',
    };
    const res = await app().request('/_afenda/verify/as-of', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(body);
  });

  it('rejects AsOf missing knowledgeAsOf', async () => {
    const res = await app().request('/_afenda/verify/as-of', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ businessAsOf: '2026-01-01T00:00:00.000Z' }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects AsOf missing businessAsOf', async () => {
    const res = await app().request('/_afenda/verify/as-of', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ knowledgeAsOf: '2026-08-08T00:00:00.000Z' }),
    });
    expect(res.status).toBe(400);
  });
});
