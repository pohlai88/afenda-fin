// Fail-closed CLI entry detection for Node type-stripping scripts.
// Prefer realpath equality; fall back to basename so symlink/pnpm shims
// never exit 0 without running main.

import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * True when this module is the process entrypoint for `expectedBasename`
 * (e.g. `check-money-safety.ts`). Returns false when argv[1] is missing.
 */
export function isMainModule(importMetaUrl: string, expectedBasename: string): boolean {
  const argv1 = process.argv[1];
  if (argv1 === undefined) return false;

  const expectedStem = expectedBasename.replace(/\.ts$/i, '');

  try {
    if (realpathSync(fileURLToPath(importMetaUrl)) === realpathSync(argv1)) {
      return true;
    }
  } catch {
    // Fall through to basename match.
  }

  const argvStem = path.basename(argv1).replace(/\.ts$/i, '');
  return argvStem === expectedStem;
}
