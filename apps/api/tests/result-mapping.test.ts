import { describe, expect, it } from 'vitest';
import { err, ok } from '@afenda/errors';
import { mapResultToHttp } from '../src/http/map-result.ts';

describe('mapResultToHttp', () => {
  it('maps ok to 200 body', () => {
    const mapped = mapResultToHttp(ok({ x: 1 }), (v) => v);
    expect(mapped).toEqual({ status: 200, body: { x: 1 } });
  });

  it('maps err via encodeFailureTransport without cause', () => {
    const failure = err('MALFORMED_TEST', 'bad', { cause: new Error('secret-stack') });
    const mapped = mapResultToHttp(failure, (v) => v);
    expect(mapped.status).toBe(400);
    if (mapped.status === 200) return;
    expect(mapped.body).toEqual({ code: 'MALFORMED_TEST', message: 'bad' });
    expect(mapped.body).not.toHaveProperty('cause');
  });

  it('maps RANGE/OVERFLOW/MISMATCH codes to 422', () => {
    for (const code of ['OUT_OF_RANGE', 'RANGE_OVERFLOW', 'CURRENCY_MISMATCH'] as const) {
      const mapped = mapResultToHttp(err(code, 'domain'), (v) => v);
      expect(mapped.status).toBe(422);
      if (mapped.status === 200) return;
      expect(mapped.body).not.toHaveProperty('cause');
    }
  });

  it('maps PERSISTENCE codes to 500 without cause', () => {
    const mapped = mapResultToHttp(err('PERSISTENCE_PROBE_FAILED', 'exact persistence probe failed'), (v) => v);
    expect(mapped.status).toBe(500);
    if (mapped.status === 200) return;
    expect(mapped.body).toEqual({
      code: 'PERSISTENCE_PROBE_FAILED',
      message: 'exact persistence probe failed',
    });
    expect(mapped.body).not.toHaveProperty('cause');
  });
});
