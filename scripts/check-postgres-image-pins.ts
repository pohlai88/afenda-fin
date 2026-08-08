#!/usr/bin/env node
// Mechanical SCC-07 pin check:
// 1. docker-compose.yml image refs + host ports match packages/db/src/postgres-pins.ts
// 2. each digest-pinned image's postgres --version + PG_MAJOR match the declared major
//
// A wrong-but-valid digest would otherwise silently qualify dual-major evidence
// against one major twice (false green). Compose drifting off the pin registry
// would leave local `pnpm db:up` on a different world than Testcontainers.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { POSTGRES_IMAGE_PINS } from '../packages/db/src/postgres-pins.ts';
import { isMainModule } from './lib/cli-main.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COMPOSE_PATH = path.join(ROOT, 'docker-compose.yml');

/**
 * Extract one top-level compose service block (2-space indent under `services:`).
 * Returns null when the service header is missing.
 */
export function extractComposeServiceBlock(composeText: string, serviceName: string): string | null {
  const header = `  ${serviceName}:`;
  const headerAtLine = new RegExp(`^${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
  const match = headerAtLine.exec(composeText);
  if (match === null || match.index === undefined) return null;

  const start = match.index;
  const afterHeader = composeText.slice(start + match[0].length);
  const nextService = /\n {2}[A-Za-z0-9_-]+:\s*\n/.exec(afterHeader);
  if (nextService === null || nextService.index === undefined) {
    return composeText.slice(start);
  }
  return composeText.slice(start, start + match[0].length + nextService.index);
}

export function assertComposeMatchesPins(composeText: string): string[] {
  const failures: string[] = [];
  for (const pin of Object.values(POSTGRES_IMAGE_PINS)) {
    // Service-scoped: image/port must appear inside that service's block so a
    // swapped cross-service paste cannot false-green the whole-file check.
    const block = extractComposeServiceBlock(composeText, pin.composeService);
    if (block === null) {
      failures.push(`docker-compose.yml missing service ${pin.composeService}`);
      continue;
    }
    if (!block.includes(`image: ${pin.imageRef}`)) {
      failures.push(`docker-compose.yml service ${pin.composeService}: image does not match pin (${pin.imageRef})`);
    }
    const portBinding = `127.0.0.1:${String(pin.composeHostPort)}:${String(pin.containerPort)}`;
    if (!block.includes(`"${portBinding}"`) && !block.includes(`'${portBinding}'`)) {
      failures.push(`docker-compose.yml service ${pin.composeService}: missing host port binding ${portBinding}`);
    }
  }
  return failures;
}

function dockerPostgresVersion(imageRef: string): string {
  return execFileSync('docker', ['run', '--rm', imageRef, 'postgres', '--version'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();
}

function dockerPgMajorEnv(imageRef: string): string | undefined {
  const envBlock = execFileSync(
    'docker',
    ['image', 'inspect', imageRef, '--format', '{{range .Config.Env}}{{println .}}{{end}}'],
    {
      cwd: ROOT,
      encoding: 'utf8',
    },
  );
  for (const line of envBlock.split(/\r?\n/)) {
    if (line.startsWith('PG_MAJOR=')) {
      return line.slice('PG_MAJOR='.length).trim();
    }
  }
  return undefined;
}

function ensureImage(imageRef: string): void {
  try {
    execFileSync('docker', ['image', 'inspect', imageRef], { cwd: ROOT, stdio: 'pipe' });
  } catch {
    console.log(`  pulling ${imageRef} ...`);
    execFileSync('docker', ['pull', imageRef], { cwd: ROOT, stdio: 'inherit' });
  }
}

export function main(): void {
  console.log('=== AFENDA PostgreSQL image-pin major check (SCC-07) ===\n');
  let failed = false;

  console.log('[compose ↔ pins]');
  const composeText = readFileSync(COMPOSE_PATH, 'utf8');
  const composeFailures = assertComposeMatchesPins(composeText);
  if (composeFailures.length > 0) {
    failed = true;
    for (const f of composeFailures) console.error(`  FAIL: ${f}`);
  } else {
    console.log('  PASS: docker-compose.yml images and host ports match postgres-pins.ts');
  }
  console.log('');

  for (const pin of Object.values(POSTGRES_IMAGE_PINS)) {
    ensureImage(pin.imageRef);

    const versionLine = dockerPostgresVersion(pin.imageRef);
    const pgMajorEnv = dockerPgMajorEnv(pin.imageRef);
    const versionMatch = /PostgreSQL\)\s+(\d+)\./.exec(versionLine);
    const versionMajor = versionMatch?.[1] !== undefined ? Number.parseInt(versionMatch[1], 10) : NaN;

    console.log(`  ${pin.imageRef}`);
    console.log(`    declared major: ${String(pin.major)} (${pin.resolvedFromTag}, resolved ${pin.resolvedAt})`);
    console.log(`    postgres --version: ${versionLine}`);
    console.log(`    image PG_MAJOR env: ${pgMajorEnv ?? '(missing)'}`);

    if (versionMajor !== pin.major) {
      console.error(`    FAIL: postgres --version major ${String(versionMajor)} !== declared ${String(pin.major)}`);
      failed = true;
    }
    if (pgMajorEnv !== String(pin.major)) {
      console.error(`    FAIL: image PG_MAJOR=${pgMajorEnv ?? 'missing'} !== declared ${String(pin.major)}`);
      failed = true;
    }
    if (versionMajor === pin.major && pgMajorEnv === String(pin.major)) {
      console.log('    PASS');
    }
    console.log('');
  }

  if (failed) {
    console.error('PostgreSQL image-pin major check: FAIL');
    console.error(
      'A digest/compose mismatch would false-green dual-major qualification or hand db:up a different world than Testcontainers.',
    );
    process.exit(1);
  }
  console.log('PostgreSQL image-pin major check: PASS');
}

if (isMainModule(import.meta.url, 'check-postgres-image-pins.ts')) {
  main();
}
