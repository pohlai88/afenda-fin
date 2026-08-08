#!/usr/bin/env node
// DB-integration gate lane (Phase 3C). Distinct from `pnpm gate` so cold
// Testcontainers startup and dual-major qualification never time out the
// fast authority/toolchain gate. Red fixtures for SCC-07/08/09/11 must invoke
// THIS script (or `pnpm run gate:db-integration`), not `pnpm gate`.

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function run(command: string, args: string[]): void {
  execFileSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
}

console.log('=== AFENDA DB-integration gate (pnpm gate:db-integration) ===\n');

try {
  console.log('[1/4] Digest-pinned image majors match postgres-pins.ts (SCC-07)');
  run('node', ['scripts/check-postgres-image-pins.ts']);
  console.log('[PASS] image-pin major check\n');

  console.log('[2/4] @afenda/db unit + PGlite fast tests (no Docker)');
  run('pnpm', ['--filter', '@afenda/db', 'run', 'test']);
  console.log('[PASS] unit/PGlite tests\n');

  console.log('[3/4] @afenda/db Testcontainers integration (PostgreSQL 18 + 17)');
  run('pnpm', ['--filter', '@afenda/db', 'run', 'test:integration']);
  console.log('[PASS] dual-major integration tests\n');

  console.log('[4/4] Kysely types drift vs Testcontainers PostgreSQL 18 (sole codegen source)');
  run('pnpm', ['--filter', '@afenda/db', 'run', 'check:types-drift']);
  console.log('[PASS] Kysely type drift\n');

  console.log('Overall DB-integration gate: PASS');
  process.exit(0);
} catch {
  console.error('Overall DB-integration gate: FAIL');
  process.exit(1);
}
