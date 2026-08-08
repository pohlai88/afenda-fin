import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { countExactProbeRows, hasForceProbeFailureFunction, type Pool } from '@afenda/db';
import { createApi } from '../../src/create-api.ts';
import { createCompositionApi } from '../../src/composition/create-composition-api.ts';
import { startMigratedAppPool, stopCompositionPools, type PostgresMajor } from './helpers.ts';

const MONEY_CORPUS = [
  '9007199254740991', // 2^53 - 1
  '9007199254740992', // 2^53
  '9007199254740993', // 2^53 + 1
  '-9223372036854775808', // PG bigint min
  '9223372036854775807', // PG bigint max
] as const;

const LEAK_PATTERNS = [
  /afenda_force_probe_failure/i,
  /SELECT /i,
  /INSERT /i,
  /password/i,
  /127\.0\.0\.1/i,
  /stack/i,
  /at Object\./i,
  /node_modules/i,
  /cause/i,
];

function describeCompositionMajor(major: PostgresMajor): void {
  describe(`HTTP→DB composition PostgreSQL ${String(major)}`, () => {
    let appPool: Pool;
    let bootstrapPool: Pool;
    let container: Awaited<ReturnType<typeof startMigratedAppPool>>['container'];
    let composition: ReturnType<typeof createCompositionApi>;

    beforeAll(async () => {
      const started = await startMigratedAppPool(major);
      appPool = started.appPool;
      bootstrapPool = started.bootstrapPool;
      container = started.container;
      composition = createCompositionApi({
        pool: appPool,
        instantSessionTimeZone: 'Asia/Kuala_Lumpur',
      });
    }, 180_000);

    afterAll(async () => {
      await stopCompositionPools({ appPool, bootstrapPool, container });
    });

    it('production createApi does not register composition routes', async () => {
      const prod = createApi();
      for (const path of [
        '/_afenda/composition/money',
        '/_afenda/composition/instant',
        '/_afenda/composition/civil-date',
        '/_afenda/composition/fail',
      ]) {
        const res = await prod.request(path, { method: 'POST' });
        expect(res.status).toBe(404);
      }
    });

    it('round-trips Money corpus exactly (string identity, no number)', async () => {
      for (const minorUnits of MONEY_CORPUS) {
        const res = await composition.request('/_afenda/composition/money', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ currency: 'MYR', minorUnits }),
        });
        expect(res.status, minorUnits).toBe(200);
        const json = (await res.json()) as { currency: string; minorUnits: string };
        expect(json).toEqual({ currency: 'MYR', minorUnits });
        expect(typeof json.minorUnits).toBe('string');
      }
    });

    it('rejects numeric minorUnits at OpenAPI/Zod (SEC-05)', async () => {
      const res = await composition.request('/_afenda/composition/money', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currency: 'MYR', minorUnits: 12345 }),
      });
      expect(res.status).toBe(400);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json['code']).toBe('REQUEST_VALIDATION_FAILED');
      expect(json).not.toHaveProperty('cause');
    });

    it('round-trips Instant under session TimeZone Asia/Kuala_Lumpur', async () => {
      const instant = '2026-08-08T00:00:00.000Z';
      const res = await composition.request('/_afenda/composition/instant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ instant }),
      });
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({ instant });
    });

    it('round-trips CivilDate', async () => {
      const civilDate = '2026-08-08';
      const res = await composition.request('/_afenda/composition/civil-date', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ civilDate }),
      });
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({ civilDate });
    });

    it('DB failure maps to public-safe 500 and rolls back partial insert', async () => {
      expect(await hasForceProbeFailureFunction(appPool)).toBe(true);
      const before = await countExactProbeRows(appPool, 'money');
      const res = await composition.request('/_afenda/composition/fail', { method: 'POST' });
      expect(res.status).toBe(500);
      const json = (await res.json()) as Record<string, unknown>;
      expect(json['code']).toBe('PERSISTENCE_PROBE_FAILED');
      expect(json['message']).toBe('exact persistence probe failed');
      expect(json).not.toHaveProperty('cause');
      const bodyText = JSON.stringify(json);
      for (const pattern of LEAK_PATTERNS) {
        expect(bodyText).not.toMatch(pattern);
      }
      const after = await countExactProbeRows(appPool, 'money');
      expect(after).toBe(before);
    });
  });
}

describeCompositionMajor(18);
describeCompositionMajor(17);
