import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checksumMigrationSource, loadMigrationFiles, parseMigrationHeader } from '../src/migrate.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../../../db/migrations');

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
