import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createAppPool, createBootstrapPool } from '../src/pool.ts';
import { migrate } from '../src/migrate.ts';
import { withTransaction } from '../src/transaction.ts';
import { configureExactTypeParsers, resetTypeParserConfigurationForTests } from '../src/type-parsers.ts';
import { PG_OID } from '../src/oids.ts';
import {
  APP_PASSWORD,
  APP_USER,
  BOOTSTRAP_USER,
  MIGRATIONS_DIR,
  containerConnection,
  startPostgres18,
} from './helpers/postgres-container.ts';

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

describe('AFENDA persistence foundations (PostgreSQL 18 / Testcontainers)', () => {
  let container: StartedPostgreSqlContainer;
  let bootstrapPool: pg.Pool;
  let appPool: pg.Pool;
  let defaultInt8IsString: boolean;
  let defaultNumericIsString: boolean;
  let defaultMoneyIsString: boolean;

  beforeAll(async () => {
    container = await startPostgres18();
    const conn = containerConnection(container);

    // Empirical defaults probe — BEFORE owned configureExactTypeParsers().
    const rawPool = new pg.Pool(conn);
    try {
      const int8 = await rawPool.query<{ v: unknown }>('SELECT $1::int8 AS v', ['9007199254740993']);
      const numeric = await rawPool.query<{ v: unknown }>('SELECT $1::numeric AS v', ['1.5']);
      const money = await rawPool.query<{ v: unknown }>("SELECT '12.34'::money AS v");
      defaultInt8IsString = typeof int8.rows[0]?.v === 'string';
      defaultNumericIsString = typeof numeric.rows[0]?.v === 'string';
      defaultMoneyIsString = typeof money.rows[0]?.v === 'string';
    } finally {
      await rawPool.end();
    }

    bootstrapPool = createBootstrapPool({
      ...conn,
      user: BOOTSTRAP_USER,
      password: conn.password,
      applicationName: 'afenda-bootstrap-test',
    });
    const migrated = await migrate(bootstrapPool, {
      migrationsDir: MIGRATIONS_DIR,
      appliedBy: BOOTSTRAP_USER,
    });
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) throw new Error(migrated.error.message);
    expect(migrated.value.applied).toEqual(['0001_bootstrap.sql']);

    appPool = createAppPool({
      host: conn.host,
      port: conn.port,
      database: conn.database,
      user: APP_USER,
      password: APP_PASSWORD,
      applicationName: 'afenda-app-test',
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

  it('records empirical defaults: int8 and numeric are strings; money is string but forbidden', () => {
    expect(defaultInt8IsString).toBe(true);
    expect(defaultNumericIsString).toBe(true);
    expect(defaultMoneyIsString).toBe(true);
  });

  it('records 0001 in afenda_migration_history with checksum and roles', async () => {
    const history = await bootstrapPool.query<{ version: number; name: string; applied_by: string }>(
      'SELECT version, name, applied_by FROM afenda_migration_history ORDER BY version',
    );
    expect(history.rows).toHaveLength(1);
    expect(history.rows[0]?.name).toBe('bootstrap');
    expect(history.rows[0]?.applied_by).toBe(BOOTSTRAP_USER);

    const roles = await bootstrapPool.query<{ rolname: string }>(
      `SELECT rolname FROM pg_roles WHERE rolname IN ('afenda_migrator', 'afenda_app') ORDER BY rolname`,
    );
    expect(roles.rows.map((r) => r.rolname)).toEqual(['afenda_app', 'afenda_migrator']);

    const timeouts = await bootstrapPool.query<{ setconfig: string[] | null }>(
      `SELECT rolconfig AS setconfig FROM pg_roles WHERE rolname = 'afenda_migrator'`,
    );
    const config = timeouts.rows[0]?.setconfig ?? [];
    expect(config.some((c) => c.includes('lock_timeout'))).toBe(true);
    expect(config.some((c) => c.includes('statement_timeout'))).toBe(true);
  });

  it('is idempotent: second migrate applies nothing', async () => {
    const again = await migrate(bootstrapPool, {
      migrationsDir: MIGRATIONS_DIR,
      appliedBy: BOOTSTRAP_USER,
    });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.value.applied).toEqual([]);
    expect(again.value.alreadyApplied).toEqual(['0001_bootstrap.sql']);
  });

  it('rejects checksum mismatch when an applied migration file changes on disk', async () => {
    // Mutate a temp copy — never the shared repo migration file — so parallel
    // Vitest files (dual-major) cannot race on db/migrations/0001_bootstrap.sql.
    const tempDir = mkdtempSync(path.join(tmpdir(), 'afenda-checksum-'));
    tempDirs.push(tempDir);
    const original = readFileSync(path.join(MIGRATIONS_DIR, '0001_bootstrap.sql'), 'utf8');
    writeFileSync(path.join(tempDir, '0001_bootstrap.sql'), `${original}\n-- red-checksum-probe\n`, 'utf8');
    const mismatched = await migrate(bootstrapPool, {
      migrationsDir: tempDir,
      appliedBy: BOOTSTRAP_USER,
    });
    expect(mismatched.ok).toBe(false);
    if (mismatched.ok) return;
    expect(mismatched.error.code).toBe('MIGRATION_CHECKSUM_MISMATCH');
  });

  it('withTransaction commits both writes on the same client', async () => {
    await bootstrapPool.query('TRUNCATE tx_probe');
    await withTransaction(appPool, async (client) => {
      await client.query(`INSERT INTO tx_probe (id, label) VALUES (1, 'a')`);
      await client.query(`INSERT INTO tx_probe (id, label) VALUES (2, 'b')`);
    });
    const rows = await appPool.query<{ id: string }>('SELECT id::text AS id FROM tx_probe ORDER BY id');
    expect(rows.rows.map((r) => r.id)).toEqual(['1', '2']);
  });

  it('withTransaction rolls back all writes when the callback throws', async () => {
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

  it('keeps int8 / numeric as exact strings through owned parsers', async () => {
    resetTypeParserConfigurationForTests();
    configureExactTypeParsers();
    const result = await appPool.query<{ i: unknown; n: unknown }>(
      `SELECT $1::int8 AS i, $2::numeric AS n`,
      ['9007199254740993', '12345678901234567890'],
    );
    expect(result.rows[0]?.i).toBe('9007199254740993');
    expect(result.rows[0]?.n).toBe('12345678901234567890');
    expect(typeof result.rows[0]?.i).toBe('string');
    expect(typeof result.rows[0]?.n).toBe('string');
  });

  it('throws when PostgreSQL money (OID 790) is returned', async () => {
    resetTypeParserConfigurationForTests();
    configureExactTypeParsers();
    await expect(appPool.query(`SELECT '12.34'::money AS m`)).rejects.toThrow(/OID 790|money type/i);
    expect(PG_OID.MONEY).toBe(790);
  });

  it('detects precision loss when a lossy int8 parser is registered (correct mutant direction)', async () => {
    // Defaults already return strings — removing a safe registration would be a
    // false-red. The real mutant is registering parseInt/Number.
    pg.types.setTypeParser(PG_OID.INT8, (value: string) => Number.parseInt(value, 10));
    try {
      const result = await appPool.query<{ v: unknown }>('SELECT $1::int8 AS v', ['9007199254740993']);
      const value = result.rows[0]?.v;
      expect(typeof value).toBe('number');
      // 2^53+1 cannot be represented exactly as a JS number; parseInt/Number
      // collapses it. Compare via string so we do not trip JS number equality
      // (`9007199254740993 === 9007199254740992` is true in IEEE-754).
      expect(String(value)).not.toBe('9007199254740993');
      expect(Number.isSafeInteger(value as number)).toBe(false);
    } finally {
      resetTypeParserConfigurationForTests();
      configureExactTypeParsers();
    }
  });
});
