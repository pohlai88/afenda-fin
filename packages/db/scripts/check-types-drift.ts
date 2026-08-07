#!/usr/bin/env node
/**
 * Regenerates Kysely types from CanonicalCodegenSource (PG18 Testcontainers)
 * into a temp file and diffs against the committed packages/db/src/generated/database.ts.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { assertCanonicalCodegenSource } from '../src/codegen-source.ts';
import {
  BOOTSTRAP_USER,
  MIGRATIONS_DIR,
  POSTGRES_18_IMAGE,
  codegenSourceFromPostgres18,
} from '../tests/helpers/postgres-container.ts';
import { createBootstrapPool } from '../src/pool.ts';
import { migrate } from '../src/migrate.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '..');
const COMMITTED = path.join(PACKAGE_ROOT, 'src', 'generated', 'database.ts');

/** Compare from the first import/export so banners and kysely boilerplate comments do not false-fail. */
function normalizeGenerated(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n');
  const idx = normalized.search(/^(import|export)\b/m);
  return (idx >= 0 ? normalized.slice(idx) : normalized).trim();
}

async function main(): Promise<void> {
  if (!existsSync(COMMITTED)) {
    console.error(`missing committed types at ${COMMITTED}; run pnpm --filter @afenda/db run generate:types`);
    process.exit(1);
  }

  process.env['AFENDA_DB_LANE'] = 'testcontainers';
  const container = await new PostgreSqlContainer(POSTGRES_18_IMAGE)
    .withUsername(BOOTSTRAP_USER)
    .withPassword('postgres')
    .withDatabase('afenda')
    .start();

  const tempDir = mkdtempSync(path.join(tmpdir(), 'afenda-kysely-'));
  const tempOut = path.join(tempDir, 'database.ts');

  try {
    const source = codegenSourceFromPostgres18(container);
    assertCanonicalCodegenSource(source);

    const pool = createBootstrapPool({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
      applicationName: 'afenda-codegen-drift',
    });
    try {
      const migrated = await migrate(pool, { migrationsDir: MIGRATIONS_DIR, appliedBy: BOOTSTRAP_USER });
      if (!migrated.ok) {
        throw new Error(`migrate failed: ${migrated.error.code}: ${migrated.error.message}`);
      }

      execFileSync(
        'pnpm',
        ['exec', 'kysely-codegen', '--dialect', 'postgres', '--url', source.connectionString, '--out-file', tempOut],
        { cwd: PACKAGE_ROOT, stdio: 'pipe', shell: true, env: process.env },
      );

      const committed = normalizeGenerated(readFileSync(COMMITTED, 'utf8'));
      const fresh = normalizeGenerated(readFileSync(tempOut, 'utf8'));
      if (committed !== fresh) {
        console.error('Kysely type drift detected: committed packages/db/src/generated/database.ts disagrees with fresh PG18 codegen.');
        console.error('Regenerate with: pnpm --filter @afenda/db run generate:types');
        process.exit(1);
      }
      console.log('Kysely type drift check: PASS (matches Testcontainers PostgreSQL 18)');
    } finally {
      await pool.end();
    }
  } finally {
    await container.stop();
    rmSync(tempDir, { recursive: true, force: true });
  }
}

await main();
