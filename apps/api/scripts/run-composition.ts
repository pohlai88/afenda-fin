#!/usr/bin/env node
// Qualification lane: HTTP→DB composition against Testcontainers PG18 + PG17.
// Not part of the fast `vitest run` / turbo test cadence.

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '..');

process.env['AFENDA_DB_LANE'] = 'testcontainers';

execFileSync('pnpm', ['exec', 'vitest', 'run', 'tests/composition'], {
  cwd: PACKAGE_ROOT,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});
