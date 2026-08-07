#!/usr/bin/env node
// Generic red harness. Purpose: gate exists -> injected violation -> the real gate fails.
// Never mocks the control itself; always calls the same exported function the real
// gate/dispatcher calls, with a deliberately corrupted input.
//
// Authority-layer fixtures (byte mutation, missing rule, missing V-control, missing
// Forbidden item, duplicate doctrine authority, invalid SEL->SCC reference, Position
// taxonomy divergence, normative verbatim mutation, gist-only mutation) are preserved
// as-is inside scripts/check-authority-integrity.mjs --self-test and are invoked here,
// not duplicated.

import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { ESLint } from 'eslint';
import { evaluateToolchain } from './verify-toolchain-baseline.mjs';
import { checkControlMapCompleteness, checkDependencyPinsAreExact } from './lib/control-map.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * @typedef {{ name: string, expectFail: boolean, failed: boolean, error?: string }} RedFixtureResult
 */

/**
 * Reuses the existing, already-proven authority self-test suite rather than
 * duplicating its nine fixtures here.
 * @returns {RedFixtureResult}
 */
function runAuthoritySelfTest() {
  try {
    execFileSync('node', [path.join(ROOT, 'scripts', 'check-authority-integrity.mjs'), '--self-test'], {
      encoding: 'utf8',
      cwd: ROOT,
    });
    return { name: 'authority-self-test (9 fixtures, delegated)', expectFail: false, failed: false };
  } catch (err) {
    const e = /** @type {{ message: string }} */ (err);
    return { name: 'authority-self-test (9 fixtures, delegated)', expectFail: false, failed: true, error: e.message };
  }
}

/**
 * @returns {RedFixtureResult}
 */
function runToolchainMismatchFixture() {
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
  };
  const results = evaluateToolchain(fakeBaseline, fakeInstalled);
  const anyFail = results.some((r) => !r.ok);
  return { name: 'toolchain-mismatch (injected wrong reference_patch values)', expectFail: true, failed: anyFail };
}

/**
 * @returns {RedFixtureResult}
 */
function runControlMapIncompleteFixture() {
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

/**
 * @returns {RedFixtureResult}
 */
function runDependencyRangeFixture() {
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

/**
 * @returns {Promise<RedFixtureResult>}
 */
async function runLintTsSuppressionFixture() {
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

async function main() {
  /** @type {RedFixtureResult[]} */
  const results = [];
  results.push(runAuthoritySelfTest());
  results.push(runToolchainMismatchFixture());
  results.push(runControlMapIncompleteFixture());
  results.push(runDependencyRangeFixture());
  results.push(await runLintTsSuppressionFixture());

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
