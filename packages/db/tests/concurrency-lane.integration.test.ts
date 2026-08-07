import { describe, expect, it } from 'vitest';
import { requireTestcontainersLane } from '../src/testcontainers-lane.ts';

describe('structural concurrency-lane gate', () => {
  it('requireTestcontainersLane resolves under the Testcontainers lane', () => {
    process.env['AFENDA_DB_LANE'] = 'testcontainers';
    expect(() => requireTestcontainersLane()).not.toThrow();
  });
});
