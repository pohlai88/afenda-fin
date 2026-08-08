import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** Fail-closed CLI entry detection (realpath, then basename). */
export function isMainModule(importMetaUrl: string, expectedBasename: string): boolean {
  const argv1 = process.argv[1];
  if (argv1 === undefined) return false;
  const expectedStem = expectedBasename.replace(/\.ts$/i, '');
  try {
    if (realpathSync(fileURLToPath(importMetaUrl)) === realpathSync(argv1)) return true;
  } catch {
    // fall through
  }
  return path.basename(argv1).replace(/\.ts$/i, '') === expectedStem;
}
