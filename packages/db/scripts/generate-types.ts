#!/usr/bin/env node
/**
 * Kysely type codegen — CanonicalCodegenSource only (Testcontainers PG18).
 * PGlite / PG17 helpers cannot mint that token, so they cannot write types.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { assertCanonicalCodegenSource } from '../src/codegen-source.ts';
import { codegenSourceFromPostgres18, MIGRATIONS_DIR, BOOTSTRAP_USER, POSTGRES_18_IMAGE } from '../tests/helpers/postgres-container.ts';
import { createBootstrapPool } from '../src/pool.ts';
import { migrate } from '../src/migrate.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '..');
const OUT_FILE = path.join(PACKAGE_ROOT, 'src', 'generated', 'database.ts');

async function main(): Promise<void> {
  process.env['AFENDA_DB_LANE'] = 'testcontainers';
  const container = await new PostgreSqlContainer(POSTGRES_18_IMAGE)
    .withUsername(BOOTSTRAP_USER)
    .withPassword('postgres')
    .withDatabase('afenda')
    .start();

  try {
    const source = codegenSourceFromPostgres18(container);
    assertCanonicalCodegenSource(source);

    const pool = createBootstrapPool({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
      applicationName: 'afenda-codegen',
    });
    try {
      const migrated = await migrate(pool, { migrationsDir: MIGRATIONS_DIR, appliedBy: BOOTSTRAP_USER });
      if (!migrated.ok) {
        throw new Error(`migrate failed: ${migrated.error.code}: ${migrated.error.message}`);
      }

      mkdirSync(path.dirname(OUT_FILE), { recursive: true });
      execFileSync(
        'pnpm',
        [
          'exec',
          'kysely-codegen',
          '--dialect',
          'postgres',
          '--url',
          source.connectionString,
          '--out-file',
          OUT_FILE,
        ],
        { cwd: PACKAGE_ROOT, stdio: 'inherit', shell: true, env: process.env },
      );

      // Banner reminding readers of the single canonical source.
      const generated = readFileSync(OUT_FILE, 'utf8');
      const banner = [
        '// GENERATED FILE — DO NOT HAND-EDIT.',
        '// Source: Testcontainers PostgreSQL 18 only (CanonicalCodegenSource).',
        '// Regenerate: pnpm --filter @afenda/db run generate:types',
        '// Drift check: pnpm --filter @afenda/db run check:types-drift',
        '',
      ].join('\n');
      if (!generated.startsWith('// GENERATED FILE')) {
        writeFileSync(OUT_FILE, banner + generated, 'utf8');
      }
      console.log(`Wrote ${OUT_FILE}`);
    } finally {
      await pool.end();
    }
  } finally {
    await container.stop();
  }
}

await main();
