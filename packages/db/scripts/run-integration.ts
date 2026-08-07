import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '..');

process.env['AFENDA_DB_LANE'] = 'testcontainers';

const files = [
  'tests/persistence.integration.test.ts',
  'tests/dual-major.integration.test.ts',
  'tests/concurrency-lane.integration.test.ts',
];

execFileSync('pnpm', ['exec', 'vitest', 'run', ...files], {
  cwd: PACKAGE_ROOT,
  stdio: 'inherit',
  shell: true,
  env: process.env,
});
