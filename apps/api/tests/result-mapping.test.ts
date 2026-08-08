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
});
