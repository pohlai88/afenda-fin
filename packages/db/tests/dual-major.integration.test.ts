/**
 * Dual-major qualification (SCC-07).
 *
 * Policy: PostgreSQL 17 and 18 must both pass the same migration + transaction
 * + type-parser corpus. Any difference is a build failure requiring
 * investigation — never a silent compatibility-floor bump.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { createAppPool, createBootstrapPool } from '../src/pool.ts';
import { migrate } from '../src/migrate.ts';
import { withTransaction } from '../src/transaction.ts';
import { configureExactTypeParsers, resetTypeParserConfigurationForTests } from '../src/type-parsers.ts';
import {
  APP_PASSWORD,
  APP_USER,
  BOOTSTRAP_USER,
  MIGRATIONS_DIR,
  containerConnection,
  startPostgres,
  type PostgresMajor,
} from './helpers/postgres-container.ts';

function describeMajor(major: PostgresMajor): void {
  describe(`PostgreSQL ${String(major)} corpus`, () => {
    let container: StartedPostgreSqlContainer;
    let bootstrapPool: pg.Pool;
    let appPool: pg.Pool;

    beforeAll(async () => {
      process.env['AFENDA_DB_LANE'] = 'testcontainers';
      container = await startPostgres(major);
      const conn = containerConnection(container);
      bootstrapPool = createBootstrapPool({
        ...conn,
        user: BOOTSTRAP_USER,
        password: conn.password,
        applicationName: `afenda-bootstrap-pg${String(major)}`,
      });
      const migrated = await migrate(bootstrapPool, {
        migrationsDir: MIGRATIONS_DIR,
        appliedBy: BOOTSTRAP_USER,
      });
      expect(migrated.ok).toBe(true);
      if (!migrated.ok) throw new Error(migrated.error.message);

      appPool = createAppPool({
        host: conn.host,
        port: conn.port,
        database: conn.database,
        user: APP_USER,
        password: APP_PASSWORD,
        applicationName: `afenda-app-pg${String(major)}`,
      });
      await bootstrapPool.query(`
        CREATE TABLE IF NOT EXISTS tx_probe (
          id integer PRIMARY KEY,
          label text NOT NULL
        )
      `);
      await bootstrapPool.query('GRANT INSERT, SELECT, DELETE, TRUNCATE ON TABLE tx_probe TO afenda_app');
    }, 180_000);

    afterAll(async () => {
      await appPool?.end();
      await bootstrapPool?.end();
      await container?.stop();
    });

    it('applies 0001 and records history', async () => {
      const history = await bootstrapPool.query<{ name: string }>('SELECT name FROM afenda_migration_history');
      expect(history.rows[0]?.name).toBe('bootstrap');
    });

    it('round-trips int8 beyond Number.MAX_SAFE_INTEGER as an exact string', async () => {
      resetTypeParserConfigurationForTests();
      configureExactTypeParsers();
      const result = await appPool.query<{ v: unknown }>('SELECT $1::int8 AS v', ['9007199254740993']);
      expect(result.rows[0]?.v).toBe('9007199254740993');
    });

    it('rolls back a failed withTransaction', async () => {
      await bootstrapPool.query('TRUNCATE tx_probe');
      await expect(
        withTransaction(appPool, async (client) => {
          await client.query(`INSERT INTO tx_probe (id, label) VALUES (1, 'a')`);
          throw new Error('force-rollback');
        }),
      ).rejects.toThrow('force-rollback');
      const rows = await appPool.query<{ n: string }>('SELECT count(*)::text AS n FROM tx_probe');
      expect(rows.rows[0]?.n).toBe('0');
    });
  });
}

describe('dual-major qualification (disagreement = build failure)', () => {
  describeMajor(18);
  describeMajor(17);
});
