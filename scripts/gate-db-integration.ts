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
  console.log('[1/2] @afenda/db unit tests (no containers)');
  run('pnpm', ['--filter', '@afenda/db', 'run', 'test']);
  console.log('[PASS] unit tests\n');

  console.log('[2/2] @afenda/db Testcontainers integration (PostgreSQL 18)');
  run('pnpm', ['--filter', '@afenda/db', 'run', 'test:integration']);
  console.log('[PASS] integration tests\n');

  console.log('Overall DB-integration gate: PASS');
  process.exit(0);
} catch {
  console.error('Overall DB-integration gate: FAIL');
  process.exit(1);
}
