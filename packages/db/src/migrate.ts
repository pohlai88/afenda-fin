// Checksummed forward-only SQL migration runner (SEL-08 / SCC-11).
//
// Policy:
// - Migrations live under db/migrations/ as numbered `NNNN_name.sql` files.
// - Default transactional wrap (`BEGIN`/`COMMIT`); opt out with header
//   `-- afenda:transactional=false` plus a note on partial-application residue.
// - Checksums are SHA-256 of the on-disk file bytes; re-applying a changed file
//   after success is a hard failure (checksum mismatch).
// - 0001 must run as a bootstrap identity that is NOT `afenda_migrator` /
//   `afenda_app` (those roles are created by 0001). See
//   db/migrations/0001_bootstrap.sql header for the explicit statement.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Pool, PoolClient } from 'pg';
import { err, ok, type Result } from '@afenda/errors';

export type MigrationErrorCode =
  | 'MIGRATION_DIR_UNREADABLE'
  | 'MIGRATION_NAME_INVALID'
  | 'MIGRATION_ORDERING'
  | 'MIGRATION_CHECKSUM_MISMATCH'
  | 'MIGRATION_APPLY_FAILED'
  | 'MIGRATION_HEADER_INVALID';

export interface MigrationFile {
  readonly filename: string;
  readonly absolutePath: string;
  readonly version: number;
  readonly name: string;
  readonly sql: string;
  readonly checksum: string;
  readonly transactional: boolean;
  readonly nonTransactionalNote: string | null;
}

export interface AppliedMigration {
  readonly version: number;
  readonly name: string;
  readonly checksum: string;
}

const MIGRATION_FILENAME = /^(\d{4})_([a-z0-9_]+)\.sql$/;
const TRANSACTIONAL_FALSE = /^--\s*afenda:transactional\s*=\s*false\s*$/im;
const NON_TX_NOTE = /^--\s*afenda:non-transactional-note\s*:\s*(.+)$/im;

export function parseMigrationHeader(sql: string): Result<{ transactional: boolean; note: string | null }, MigrationErrorCode> {
  const transactional = !TRANSACTIONAL_FALSE.test(sql);
  if (transactional) {
    return ok({ transactional: true, note: null });
  }
  const noteMatch = NON_TX_NOTE.exec(sql);
  const note = noteMatch?.[1]?.trim() ?? '';
  if (note.length === 0) {
    return err(
      'MIGRATION_HEADER_INVALID',
      'non-transactional migration requires `-- afenda:non-transactional-note: ...` describing partial-application residue',
    );
  }
  return ok({ transactional: false, note });
}

export function checksumMigrationSource(sql: string): string {
  return createHash('sha256').update(sql, 'utf8').digest('hex');
}

export function loadMigrationFiles(migrationsDir: string): Result<MigrationFile[], MigrationErrorCode> {
  let entries: string[];
  try {
    entries = readdirSync(migrationsDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err('MIGRATION_DIR_UNREADABLE', message);
  }

  const files: MigrationFile[] = [];
  for (const filename of entries) {
    if (!filename.endsWith('.sql')) continue;
    const match = MIGRATION_FILENAME.exec(filename);
    if (!match) {
      return err('MIGRATION_NAME_INVALID', `migration filename must match NNNN_name.sql; got ${filename}`);
    }
    const versionText = match[1];
    const name = match[2];
    if (versionText === undefined || name === undefined) {
      return err('MIGRATION_NAME_INVALID', `failed to parse ${filename}`);
    }
    const absolutePath = path.join(migrationsDir, filename);
    const sql = readFileSync(absolutePath, 'utf8');
    const header = parseMigrationHeader(sql);
    if (!header.ok) return header;
    files.push({
      filename,
      absolutePath,
      version: Number.parseInt(versionText, 10),
      name,
      sql,
      checksum: checksumMigrationSource(sql),
      transactional: header.value.transactional,
      nonTransactionalNote: header.value.note,
    });
  }

  files.sort((a, b) => a.version - b.version || a.filename.localeCompare(b.filename));
  for (let i = 0; i < files.length; i += 1) {
    const expected = i + 1;
    const actual = files[i]?.version;
    if (actual !== expected) {
      return err('MIGRATION_ORDERING', `expected migration version ${expected}, found ${String(actual)}`);
    }
  }
  return ok(files);
}

async function historyTableExists(client: PoolClient): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'afenda_migration_history'
     ) AS exists`,
  );
  return result.rows[0]?.exists === true;
}

async function readAppliedMigrations(client: PoolClient): Promise<AppliedMigration[]> {
  if (!(await historyTableExists(client))) return [];
  const result = await client.query<{ version: string; name: string; checksum: string }>(
    `SELECT version::text AS version, name, checksum
       FROM afenda_migration_history
      ORDER BY version ASC`,
  );
  return result.rows.map((row) => ({
    version: Number.parseInt(row.version, 10),
    name: row.name,
    checksum: row.checksum,
  }));
}

async function applyOne(client: PoolClient, migration: MigrationFile, appliedBy: string): Promise<Result<void, MigrationErrorCode>> {
  try {
    if (migration.transactional) {
      await client.query('BEGIN');
    }
    await client.query(migration.sql);
    // After 0001, the history table and recorder function exist.
    if (migration.version === 1) {
      await client.query(
        `INSERT INTO afenda_migration_history (version, name, checksum, applied_by)
         VALUES ($1, $2, $3, $4)`,
        [migration.version, migration.name, migration.checksum, appliedBy],
      );
    } else {
      await client.query(`SELECT afenda_record_migration($1, $2, $3, $4)`, [
        migration.version,
        migration.name,
        migration.checksum,
        appliedBy,
      ]);
    }
    if (migration.transactional) {
      await client.query('COMMIT');
    }
    return ok(undefined);
  } catch (error) {
    if (migration.transactional) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Prefer the original apply error.
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    return err('MIGRATION_APPLY_FAILED', `${migration.filename}: ${message}`);
  }
}

export interface MigrateOptions {
  readonly migrationsDir: string;
  /** Identity recorded in afenda_migration_history.applied_by (bootstrap user for 0001). */
  readonly appliedBy: string;
}

export interface MigrateResult {
  readonly applied: string[];
  readonly alreadyApplied: string[];
}

/**
 * Applies pending migrations on `pool` using a single checked-out client for
 * the whole run (not one pool.query per statement).
 */
export async function migrate(pool: Pool, options: MigrateOptions): Promise<Result<MigrateResult, MigrationErrorCode>> {
  const loaded = loadMigrationFiles(options.migrationsDir);
  if (!loaded.ok) return loaded;

  const client = await pool.connect();
  try {
    const applied = await readAppliedMigrations(client);
    const appliedByVersion = new Map(applied.map((row) => [row.version, row]));

    for (const migration of loaded.value) {
      const prior = appliedByVersion.get(migration.version);
      if (prior !== undefined && prior.checksum !== migration.checksum) {
        return err(
          'MIGRATION_CHECKSUM_MISMATCH',
          `${migration.filename}: on-disk checksum ${migration.checksum} disagrees with applied ${prior.checksum}`,
        );
      }
    }

    const newlyApplied: string[] = [];
    const alreadyApplied: string[] = [];
    for (const migration of loaded.value) {
      if (appliedByVersion.has(migration.version)) {
        alreadyApplied.push(migration.filename);
        continue;
      }
      const appliedResult = await applyOne(client, migration, options.appliedBy);
      if (!appliedResult.ok) return appliedResult;
      newlyApplied.push(migration.filename);
    }
    return ok({ applied: newlyApplied, alreadyApplied });
  } finally {
    client.release();
  }
}
