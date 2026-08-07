/**
 * PGlite fast lane (SEL-20) — quick SQL feedback only.
 * Concurrency-sensitive tests must NOT live here; they import
 * requireTestcontainersLane() which throws under AFENDA_DB_LANE=pglite.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { requireTestcontainersLane } from '../src/testcontainers-lane.ts';

describe('PGlite fast lane', () => {
  let db: PGlite;

  beforeAll(async () => {
    process.env['AFENDA_DB_LANE'] = 'pglite';
    db = await PGlite.create();
  }, 60_000);

  afterAll(async () => {
    await db?.close();
  });

  it(
    'executes simple SQL for fast feedback',
    async () => {
      const result = await db.query<{ n: number }>('SELECT 1::int AS n');
      expect(result.rows[0]?.n).toBe(1);
    },
    30_000,
  );

  it('keeps bigint-like values as strings when cast to text', async () => {
    const result = await db.query<{ v: string }>("SELECT '9007199254740993'::bigint::text AS v");
    expect(result.rows[0]?.v).toBe('9007199254740993');
  });

  it('structurally refuses concurrency-sensitive helpers', () => {
    expect(() => requireTestcontainersLane()).toThrow(/AFENDA_DB_LANE=testcontainers/);
  });
});
