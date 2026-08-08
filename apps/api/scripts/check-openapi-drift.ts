#!/usr/bin/env node
// READ-ONLY: fails if committed openapi.json differs from fresh generation.
// Never writes. Wired into pnpm gate via scripts/check-openapi-drift.ts root shim
// or apps/api openapi:check.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMainModule } from '../src/lib/is-main.ts';
import { renderOpenApiJson } from './generate-openapi.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMMITTED = path.resolve(__dirname, '..', 'openapi.json');

export function checkOpenApiDrift(committedPath: string = COMMITTED): { ok: boolean; detail: string } {
  let committed: string;
  try {
    committed = readFileSync(committedPath, 'utf8');
  } catch {
    return { ok: false, detail: `missing committed OpenAPI at ${committedPath}` };
  }
  const fresh = renderOpenApiJson();
  if (committed === fresh) {
    return { ok: true, detail: 'openapi.json matches fresh deterministic generation' };
  }
  return {
    ok: false,
    detail: 'openapi.json drift: committed file differs from fresh generation (run pnpm --filter @afenda/api openapi:generate)',
  };
}

if (isMainModule(import.meta.url, 'check-openapi-drift.ts')) {
  const report = checkOpenApiDrift();
  console.log(report.detail);
  process.exitCode = report.ok ? 0 : 1;
}
