#!/usr/bin/env node
// Generic red harness. Purpose: gate exists -> injected violation -> the real gate fails.
// Never mocks the control itself; always calls the same exported function (or, for the
// TypeScript-lane fixtures, the same production `pnpm run typecheck:*` command) the real
// gate/dispatcher calls, with a deliberately corrupted input.
//
// Authority-layer fixtures (byte mutation of doctrine/stack/position, missing rule,
// missing V-control, missing Forbidden item, duplicate doctrine authority, invalid
// SEL->SCC reference, Position taxonomy divergence, normative verbatim mutation,
// gist-only mutation) are preserved as-is inside scripts/check-authority-integrity.ts
// --self-test and are invoked here, not duplicated.

import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { ESLint } from 'eslint';
import { evaluateToolchain } from './verify-toolchain-baseline.ts';
import { checkControlMapCompleteness, checkDependencyPinsAreExact } from './lib/control-map.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

interface RedFixtureResult {
  name: string;
  expectFail: boolean;
  failed: boolean;
  error?: string;
}

/**
 * Reuses the existing, already-proven authority self-test suite rather than
 * duplicating its fixtures here.
 */
function runAuthoritySelfTest(): RedFixtureResult {
  try {
    execFileSync('node', [path.join(ROOT, 'scripts', 'check-authority-integrity.ts'), '--self-test'], {
      encoding: 'utf8',
      cwd: ROOT,
    });
    return { name: 'authority-self-test (11 fixtures, delegated)', expectFail: false, failed: false };
  } catch (err) {
    const e = err as { message: string };
    return { name: 'authority-self-test (11 fixtures, delegated)', expectFail: false, failed: true, error: e.message };
  }
}

function runToolchainMismatchFixture(): RedFixtureResult {
  const fakeBaseline = {
    runtime: { node: { reference_patch: '99.99.99' } },
    compiler: {
      typescript_native: { reference_patch: '99.0.0' },
      typescript_compat: { reference_patch: '99.0.0' },
    },
  };
  const fakeInstalled = {
    nodeVersion: '24.18.0',
    pnpmVersion: '11.20.0',
    packageJson: { engines: { node: '24.18.0' }, packageManager: 'pnpm@11.20.0' },
    nativeTscPackageVersion: '7.0.2',
    compatTscPackageVersion: '6.0.2',
    compatEnginePackageVersion: undefined,
  };
  const results = evaluateToolchain(fakeBaseline, fakeInstalled);
  const anyFail = results.some((r) => !r.ok);
  return { name: 'toolchain-mismatch (injected wrong reference_patch values)', expectFail: true, failed: anyFail };
}

function runControlMapIncompleteFixture(): RedFixtureResult {
  const fake = {
    stack_controls: [{ control_id: 'SCC-01', state: 'implemented' }],
    doctrine_verification_controls: [{ control_id: 'V01', state: 'not-yet-built' }],
  };
  const report = checkControlMapCompleteness(fake);
  return {
    name: 'control-map-incomplete (only SCC-01 and V01 present)',
    expectFail: true,
    failed: !report.ok,
  };
}

function runDependencyRangeFixture(): RedFixtureResult {
  const fakePackageJson = {
    dependencies: {},
    devDependencies: { typescript: '^7.0.2', turbo: 'latest' },
  };
  const report = checkDependencyPinsAreExact(fakePackageJson);
  return {
    name: 'dependency-range-injected (^7.0.2 and "latest")',
    expectFail: true,
    failed: !report.ok,
  };
}

async function runLintTsSuppressionFixture(): Promise<RedFixtureResult> {
  const eslint = new ESLint({ cwd: ROOT });
  const badCode = [
    '// @ts-ignore',
    '/** @type {any} */',
    'const x = 1;',
    'console.log(x);',
    '',
  ].join('\n');
  const [report] = await eslint.lintText(badCode, {
    filePath: path.join(ROOT, 'scripts', '__red_fixture__.mjs'),
  });
  const failed = report !== undefined && report.errorCount > 0;
  return { name: 'lint-ts-suppression (@ts-ignore + JSDoc any)', expectFail: true, failed };
}

/**
 * Injects a genuine type error into a disposable fixture file inside the real
 * tsconfig.json include scope (scripts/**\/*.ts), then invokes the actual
 * production `pnpm run typecheck:*` command — not a helper function — and
 * confirms it turns red. The fixture file is always removed afterward, even
 * on failure, so this never leaves the working tree dirty.
 */
function runTypecheckFixture(scriptName: 'typecheck:native' | 'typecheck:compat', label: string): RedFixtureResult {
  const fixturePath = path.join(ROOT, 'scripts', `__red_type_fixture_${scriptName === 'typecheck:native' ? 'native' : 'compat'}__.ts`);
  const badSource = [
    '// Disposable red-harness fixture: a genuine type error, removed immediately after use.',
    'export function redFixtureShouldNotTypecheck(): number {',
    "  return 'this is a string, not a number';",
    '}',
    '',
  ].join('\n');
  writeFileSync(fixturePath, badSource, 'utf8');
  try {
    execFileSync('pnpm', ['run', scriptName], { encoding: 'utf8', cwd: ROOT, shell: true });
    return { name: label, expectFail: true, failed: false };
  } catch {
    return { name: label, expectFail: true, failed: true };
  } finally {
    rmSync(fixturePath, { force: true });
  }
}

async function main(): Promise<void> {
  const results: RedFixtureResult[] = [];
  results.push(runAuthoritySelfTest());
  results.push(runToolchainMismatchFixture());
  results.push(runControlMapIncompleteFixture());
  results.push(runDependencyRangeFixture());
  results.push(await runLintTsSuppressionFixture());
  results.push(runTypecheckFixture('typecheck:native', 'typecheck-native-injected-type-error (genuine string-as-number defect)'));
  results.push(runTypecheckFixture('typecheck:compat', 'typecheck-compat-injected-type-error (same genuine defect, compatibility lane)'));

  console.log('\n=== AFENDA red harness (gate exists -> injected violation -> real gate fails) ===\n');
  let allOk = true;
  for (const r of results) {
    const behavedAsExpected = r.failed === r.expectFail;
    if (!behavedAsExpected) allOk = false;
    const expectedLabel = r.expectFail ? 'FAIL-detected' : 'no-fail';
    const gotLabel = r.failed ? 'FAIL-detected' : 'no-fail';
    console.log(`  [${behavedAsExpected ? 'PASS' : 'FAIL'}] ${r.name} (expected ${expectedLabel}, got ${gotLabel})`);
    if (r.error) console.log(`         ${r.error.split('\n')[0]}`);
  }
  console.log(`\nRed harness result: ${allOk ? 'ALL FIXTURES BEHAVED AS EXPECTED' : 'SOME FIXTURES DID NOT BEHAVE AS EXPECTED'}\n`);
  process.exitCode = allOk ? 0 : 1;
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  await main();
}
