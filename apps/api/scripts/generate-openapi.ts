#!/usr/bin/env node
// Writer: regenerates apps/api/openapi.json from createApi() route registry.
// Deterministic: no timestamps, no environment embedding.

import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMainModule } from '../src/lib/is-main.ts';
import { buildOpenApiDocument } from '../src/create-api.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '..', 'openapi.json');

export function renderOpenApiJson(): string {
  const doc = buildOpenApiDocument();
  // Stable stringify: sorted top-level keys only is insufficient for nested
  // objects; JSON.stringify insertion order from the generator is used, and
  // we append a trailing newline for POSIX text stability.
  return `${JSON.stringify(doc, null, 2)}\n`;
}

export function writeOpenApiDocument(outPath: string = OUT): string {
  const text = renderOpenApiJson();
  writeFileSync(outPath, text, 'utf8');
  return outPath;
}

if (isMainModule(import.meta.url, 'generate-openapi.ts')) {
  const written = writeOpenApiDocument();
  console.log(`Wrote ${written}`);
}
