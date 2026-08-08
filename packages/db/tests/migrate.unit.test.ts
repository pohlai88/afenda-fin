import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Pool, PoolClient, QueryResult } from 'pg';
import {
  assertMigrationRunnerIdentity,
  checksumMigrationSource,
  loadMigrationFiles,
  migrate,
  parseMigrationHeader,
} from '../src/migrate.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../../../db/migrations');
const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

function fakePool(opts: {
  currentUser: string;
  sessionUser: string;
  applied: Array<{ version: number; name: string; checksum: string }>;
}): Pool {
  let appliedSql = false;
  const client = {
    query: (sql: string): Promise<QueryResult> => {
      const text = sql;
      if (text.includes('information_schema.tables') && text.includes('afenda_migration_history')) {
        return Promise.resolve({
          rows: [{ exists: opts.applied.length > 0 }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        });
      }
      if (text.includes('FROM afenda_migration_history')) {
        return Promise.resolve({
          rows: opts.applied.map((row) => ({
            version: String(row.version),
            name: row.name,
            checksum: row.checksum,
          })),
          rowCount: opts.applied.length,
          command: 'SELECT',
          oid: 0,
          fields: [],
        });
      }
      if (text.includes('current_user') && text.includes('session_user')) {
        return Promise.resolve({
          rows: [{ current_user: opts.currentUser, session_user: opts.sessionUser }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        });
      }
      appliedSql = true;
      return Promise.reject(
        new Error(`migrate() must not apply SQL when identity is forbidden; got: ${text.slice(0, 80)}`),
      );
    },
    release: (): void => {
      // no-op
    },
  } as unknown as PoolClient;

  return {
    connect: (): Promise<PoolClient> => Promise.resolve(client),
    // Expose for assertion that apply never ran.
    __appliedSql: () => appliedSql,
  } as unknown as Pool & { __appliedSql: () => boolean };
}

describe('migration header policy', () => {
  it('defaults to transactional when no directive is present', () => {
    const parsed = parseMigrationHeader('-- comment\nSELECT 1;');
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.transactional).toBe(true);
  });

  it('rejects non-transactional migrations without a residue note', () => {
    const parsed = parseMigrationHeader('-- afenda:transactional=false\nCREATE INDEX CONCURRENTLY ...;');
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe('MIGRATION_HEADER_INVALID');
  });

  it('accepts non-transactional migrations with an explicit residue note', () => {
    const parsed = parseMigrationHeader(
      [
        '-- afenda:transactional=false',
        '-- afenda:non-transactional-note: partial index may exist without validation',
        'CREATE INDEX CONCURRENTLY ...;',
      ].join('\n'),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.transactional).toBe(false);
    expect(parsed.value.note).toContain('partial index');
  });
});

describe('loadMigrationFiles', () => {
  it('loads 0001_bootstrap.sql with a stable checksum', () => {
    const loaded = loadMigrationFiles(MIGRATIONS_DIR);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value).toHaveLength(1);
    const first = loaded.value[0];
    expect(first).toBeDefined();
    if (first === undefined) return;
    expect(first.filename).toBe('0001_bootstrap.sql');
    expect(first.version).toBe(1);
    expect(first.transactional).toBe(true);
    expect(first.checksum).toBe(checksumMigrationSource(first.sql));
    expect(first.checksum).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('assertMigrationRunnerIdentity (SEC-01)', () => {
  it('allows bootstrap superuser for 0001', () => {
    const result = assertMigrationRunnerIdentity(1, 'postgres', 'postgres');
    expect(result.ok).toBe(true);
  });

  it('rejects managed roles for 0001', () => {
    const asMigrator = assertMigrationRunnerIdentity(1, 'afenda_migrator', 'afenda_migrator');
    expect(asMigrator.ok).toBe(false);
    if (asMigrator.ok) return;
    expect(asMigrator.error.code).toBe('MIGRATION_IDENTITY_FORBIDDEN');

    const asApp = assertMigrationRunnerIdentity(1, 'afenda_app', 'afenda_app');
    expect(asApp.ok).toBe(false);
  });

  it('requires afenda_migrator for post-0001 and rejects postgres / SET ROLE', () => {
    const okMigrator = assertMigrationRunnerIdentity(2, 'afenda_migrator', 'afenda_migrator');
    expect(okMigrator.ok).toBe(true);

    const asPostgres = assertMigrationRunnerIdentity(2, 'postgres', 'postgres');
    expect(asPostgres.ok).toBe(false);
    if (asPostgres.ok) return;
    expect(asPostgres.error.code).toBe('MIGRATION_IDENTITY_FORBIDDEN');

    // SET ROLE migrator while session remains postgres — still forbidden.
    const setRole = assertMigrationRunnerIdentity(2, 'afenda_migrator', 'postgres');
    expect(setRole.ok).toBe(false);

    const asApp = assertMigrationRunnerIdentity(2, 'afenda_app', 'afenda_app');
    expect(asApp.ok).toBe(false);
  });
});

describe('migrate() identity wiring (SEC-01)', () => {
  it('returns MIGRATION_IDENTITY_FORBIDDEN for pending post-0001 as postgres without applying SQL', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'afenda-migrate-'));
    tempDirs.push(dir);
    const sql1 = '-- bootstrap stub\nSELECT 1;\n';
    const sql2 = '-- next\nSELECT 2;\n';
    writeFileSync(path.join(dir, '0001_bootstrap.sql'), sql1, 'utf8');
    writeFileSync(path.join(dir, '0002_next.sql'), sql2, 'utf8');

    const pool = fakePool({
      currentUser: 'postgres',
      sessionUser: 'postgres',
      applied: [{ version: 1, name: 'bootstrap', checksum: checksumMigrationSource(sql1) }],
    });

    const result = await migrate(pool, { migrationsDir: dir, appliedBy: 'postgres' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('MIGRATION_IDENTITY_FORBIDDEN');
    expect((pool as Pool & { __appliedSql: () => boolean }).__appliedSql()).toBe(false);
  });

  it('rejects SET ROLE migrator while session_user remains postgres', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'afenda-migrate-'));
    tempDirs.push(dir);
    const sql1 = '-- bootstrap stub\nSELECT 1;\n';
    const sql2 = '-- next\nSELECT 2;\n';
    writeFileSync(path.join(dir, '0001_bootstrap.sql'), sql1, 'utf8');
    writeFileSync(path.join(dir, '0002_next.sql'), sql2, 'utf8');

    const pool = fakePool({
      currentUser: 'afenda_migrator',
      sessionUser: 'postgres',
      applied: [{ version: 1, name: 'bootstrap', checksum: checksumMigrationSource(sql1) }],
    });

    const result = await migrate(pool, { migrationsDir: dir, appliedBy: 'postgres' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('MIGRATION_IDENTITY_FORBIDDEN');
  });
});
