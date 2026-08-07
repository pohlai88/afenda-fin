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
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { ESLint } from 'eslint';
import { evaluateToolchain } from './verify-toolchain-baseline.ts';
import { checkControlMapCompleteness, checkDependencyPinsAreExact } from './lib/control-map.ts';
import { checkApplicationArchitecture } from './check-architecture.ts';
import { checkMoneySafety } from './check-money-safety.ts';

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

/**
 * A "clean" baseline/installed pair that matches in every field, used as the base
 * for each isolated single-field-mismatch fixture below. Each fixture mutates
 * exactly one field so a failure can be attributed to exactly one component,
 * proving the real production `evaluateToolchain` checker (not a mock) catches
 * that specific class of drift.
 */
function cleanFixturePair(): { baseline: Record<string, unknown>; installed: Parameters<typeof evaluateToolchain>[1] } {
  return {
    baseline: {
      runtime: { node: { reference_patch: '24.18.0' } },
      compiler: {
        typescript_native: { reference_patch: '7.0.2' },
        typescript_compat: { reference_patch: '6.0.2' },
      },
      packages: {
        pnpm: { reference_patch: '11.20.0' },
        turborepo: { reference_patch: '2.10.8' },
      },
    },
    installed: {
      nodeVersion: '24.18.0',
      pnpmVersion: '11.20.0',
      turboVersion: '2.10.8',
      packageJson: {
        engines: { node: '24.18.0' },
        packageManager: 'pnpm@11.20.0',
        devDependencies: { turbo: '2.10.8' },
      },
      nativeTscPackageVersion: '7.0.2',
      compatTscPackageVersion: '6.0.2',
      compatEnginePackageVersion: '6.0.2',
    },
  };
}

function statusOf(results: ReturnType<typeof evaluateToolchain>, id: string): string | undefined {
  return results.find((r) => r.id === id)?.status;
}

function runNodePinMismatchFixture(): RedFixtureResult {
  const { baseline, installed } = cleanFixturePair();
  installed.packageJson['engines'] = { node: '20.0.0' };
  const results = evaluateToolchain(baseline, installed, 'test');
  return { name: 'toolchain: Node pin mismatch (package.json engines.node drifted)', expectFail: true, failed: statusOf(results, 'node-runtime') === 'fail' };
}

function runPnpmPackageManagerMismatchFixture(): RedFixtureResult {
  const { baseline, installed } = cleanFixturePair();
  installed.packageJson['packageManager'] = 'pnpm@9.0.0';
  const results = evaluateToolchain(baseline, installed, 'test');
  return { name: 'toolchain: pnpm packageManager field mismatch', expectFail: true, failed: statusOf(results, 'pnpm-package-manager') === 'fail' };
}

function runNativeTsPackageMismatchFixture(): RedFixtureResult {
  const { baseline, installed } = cleanFixturePair();
  installed.nativeTscPackageVersion = '8.0.0';
  const results = evaluateToolchain(baseline, installed, 'test');
  return { name: 'toolchain: native TypeScript package mismatch', expectFail: true, failed: statusOf(results, 'typescript-native-package') === 'fail' };
}

function runCompatTsPackageMismatchFixture(): RedFixtureResult {
  const { baseline, installed } = cleanFixturePair();
  installed.compatTscPackageVersion = '5.0.0';
  const results = evaluateToolchain(baseline, installed, 'test');
  return { name: 'toolchain: compatibility TypeScript package mismatch', expectFail: true, failed: statusOf(results, 'typescript-compat-package') === 'fail' };
}

function runTurboPackageMismatchFixture(): RedFixtureResult {
  const { baseline, installed } = cleanFixturePair();
  installed.turboVersion = '1.0.0';
  const results = evaluateToolchain(baseline, installed, 'test');
  return { name: 'toolchain: Turborepo package mismatch', expectFail: true, failed: statusOf(results, 'turborepo-package') === 'fail' };
}

/**
 * Confirms the real compat-engine discrepancy (@typescript/typescript6@6.0.2's
 * own dependency range resolving to a different compiler engine patch) is
 * reported as 'discrepancy-recorded', never silently upgraded to 'ok' nor
 * mis-reported as a hard 'fail' that would block an otherwise-correct pin.
 */
function runCompatEngineDiscrepancyIsRecordedNotHiddenFixture(): RedFixtureResult {
  const { baseline, installed } = cleanFixturePair();
  installed.compatEnginePackageVersion = '6.0.3'; // matches this repo's actual real-world resolution
  const results = evaluateToolchain(baseline, installed, 'test');
  const status = statusOf(results, 'typescript-compat-package');
  // "failed" here means the fixture behaved WRONG: either silently 'ok' (hidden) or 'fail' (over-blocked).
  const behavedWrong = status !== 'discrepancy-recorded';
  return { name: 'toolchain: compat-engine discrepancy is recorded, not hidden and not over-blocked', expectFail: false, failed: behavedWrong };
}

function runToolchainMismatchFixture(): RedFixtureResult {
  const { baseline } = cleanFixturePair();
  const fakeBaseline = {
    ...baseline,
    runtime: { node: { reference_patch: '99.99.99' } },
    compiler: {
      typescript_native: { reference_patch: '99.0.0' },
      typescript_compat: { reference_patch: '99.0.0' },
    },
  };
  const fakeInstalled = {
    nodeVersion: '24.18.0',
    pnpmVersion: '11.20.0',
    turboVersion: '2.10.8',
    packageJson: { engines: { node: '24.18.0' }, packageManager: 'pnpm@11.20.0', devDependencies: { turbo: '2.10.8' } },
    nativeTscPackageVersion: '7.0.2',
    compatTscPackageVersion: '6.0.2',
    compatEnginePackageVersion: undefined,
  };
  const results = evaluateToolchain(fakeBaseline, fakeInstalled, 'test');
  const anyFail = results.some((r) => r.status === 'fail');
  return { name: 'toolchain-mismatch (injected wrong reference_patch values, combined)', expectFail: true, failed: anyFail };
}

/**
 * Mutates the real package.json in place, expects the real production
 * `pnpm install --frozen-lockfile` command to reject the disagreement, then
 * restores the original file byte-for-byte in a `finally` block regardless of
 * outcome. Proves the actual frozen-lockfile discipline the gate/CI rely on,
 * not a helper-function reimplementation of it.
 */
function runLockfileDisagreementFixture(): RedFixtureResult {
  const packageJsonPath = path.join(ROOT, 'package.json');
  const original = readFileSync(packageJsonPath, 'utf8');
  try {
    const mutated = JSON.parse(original) as Record<string, unknown>;
    const devDeps = mutated['devDependencies'] as Record<string, unknown>;
    devDeps['turbo'] = '2.10.9'; // exact-looking, but disagrees with the frozen lockfile's resolved 2.10.8
    writeFileSync(packageJsonPath, `${JSON.stringify(mutated, null, 2)}\n`, 'utf8');
    execFileSync('pnpm', ['install', '--frozen-lockfile'], { encoding: 'utf8', cwd: ROOT, shell: true });
    return { name: 'lockfile-package-disagreement (package.json devDependency vs frozen pnpm-lock.yaml)', expectFail: true, failed: false };
  } catch {
    return { name: 'lockfile-package-disagreement (package.json devDependency vs frozen pnpm-lock.yaml)', expectFail: true, failed: true };
  } finally {
    writeFileSync(packageJsonPath, original, 'utf8');
  }
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

/**
 * Writes `relativeFiles` (relative to ROOT) with the given contents, invokes
 * `runCheck`, then unconditionally removes every written file — even on
 * failure — so a red fixture can never leave a disposable file in the
 * working tree. `runCheck`'s own boolean return means "the real check
 * reported the tree clean" (i.e. did NOT catch the violation).
 */
function withDisposableFixtureFiles(relativeFiles: Record<string, string>, runCheck: () => boolean): boolean {
  const absolutePaths = Object.keys(relativeFiles).map((rel) => path.join(ROOT, rel));
  try {
    for (const [rel, contents] of Object.entries(relativeFiles)) {
      const abs = path.join(ROOT, rel);
      mkdirSync(path.dirname(abs), { recursive: true });
      writeFileSync(abs, contents, 'utf8');
    }
    return runCheck();
  } finally {
    for (const abs of absolutePaths) rmSync(abs, { force: true });
  }
}

/** Injects a cross-package internal-subpath import (money reaching into errors/src/*.ts directly) and invokes the REAL dependency-cruiser CLI (SCC-05). */
function runDepCruiseInternalImportFixture(): RedFixtureResult {
  const caughtByDepCruise = withDisposableFixtureFiles(
    {
      'packages/money/src/__red_fixture_internal_import__.ts': "import { ok } from '../../errors/src/result.ts';\nexport { ok };\n",
    },
    () => {
      try {
        execFileSync('pnpm', ['run', 'boundary:check'], { encoding: 'utf8', cwd: ROOT, shell: true });
        return false; // depcruise exited 0: did NOT catch it.
      } catch {
        return true; // depcruise exited non-zero: caught it.
      }
    },
  );
  return { name: 'SCC-05: cross-package internal-subpath import (money -> errors/src/result.ts)', expectFail: true, failed: caughtByDepCruise };
}

/** Injects a same-package dependency cycle (two files importing each other) and invokes the REAL dependency-cruiser CLI (SCC-05). */
function runDepCruiseCycleFixture(): RedFixtureResult {
  const caughtByDepCruise = withDisposableFixtureFiles(
    {
      'packages/money/src/__red_fixture_cycle_a__.ts': "import { b } from './__red_fixture_cycle_b__.ts';\nexport const a = 1;\nexport { b };\n",
      'packages/money/src/__red_fixture_cycle_b__.ts': "import { a } from './__red_fixture_cycle_a__.ts';\nexport const b = 1;\nexport { a };\n",
    },
    () => {
      try {
        execFileSync('pnpm', ['run', 'boundary:check'], { encoding: 'utf8', cwd: ROOT, shell: true });
        return false;
      } catch {
        return true;
      }
    },
  );
  return { name: 'SCC-05: dependency cycle (two files in packages/money/src importing each other)', expectFail: true, failed: caughtByDepCruise };
}

/** Injects a real decorator, class-based inheritance, runtime-module-discovery and ambient-clock violation and invokes the REAL SCC-24 AST control, once each. */
function runArchitectureFixtures(): RedFixtureResult[] {
  const results: RedFixtureResult[] = [];

  const decoratorCaught = withDisposableFixtureFiles(
    { 'packages/errors/src/__red_fixture_decorator__.ts': '@Injectable()\nexport class RedFixtureService {}\n' },
    () => !checkApplicationArchitecture().ok,
  );
  results.push({ name: 'SCC-24: decorator-driven DI (@Injectable() class)', expectFail: true, failed: decoratorCaught });

  const inheritanceCaught = withDisposableFixtureFiles(
    { 'packages/errors/src/__red_fixture_inheritance__.ts': 'export class RedFixtureDomainThing extends RedFixtureBase {}\n' },
    () => !checkApplicationArchitecture().ok,
  );
  results.push({ name: 'SCC-24: class-based domain inheritance (class extends non-builtin)', expectFail: true, failed: inheritanceCaught });

  const moduleDiscoveryCaught = withDisposableFixtureFiles(
    { 'packages/errors/src/__red_fixture_module_discovery__.ts': 'export const x = Reflect.get({}, "a");\n' },
    () => !checkApplicationArchitecture().ok,
  );
  results.push({ name: 'SCC-24: runtime module discovery (Reflect.get(...))', expectFail: true, failed: moduleDiscoveryCaught });

  const ambientClockCaught = withDisposableFixtureFiles(
    { 'packages/time/src/__red_fixture_ambient_clock__.ts': 'export const now = Date.now();\n' },
    () => !checkApplicationArchitecture().ok,
  );
  results.push({ name: 'SCC-24: ambient authoritative time (Date.now() outside system-clock.ts)', expectFail: true, failed: ambientClockCaught });

  return results;
}

/** Injects an unsafe Money JSON shape and a lossy-number-conversion call and invokes the REAL SCC-03 AST control, once each. */
function runMoneySafetyFixtures(): RedFixtureResult[] {
  const results: RedFixtureResult[] = [];

  const jsonShapeCaught = withDisposableFixtureFiles(
    { 'packages/money/src/__red_fixture_unsafe_json_shape__.ts': 'export const shape = { currency: "MYR", minorUnits: 12345 };\n' },
    () => !checkMoneySafety().ok,
  );
  results.push({ name: 'SCC-03: unsafe Money JSON shape (minorUnits as a JSON number literal)', expectFail: true, failed: jsonShapeCaught });

  const lossyConversionCaught = withDisposableFixtureFiles(
    { 'packages/money/src/__red_fixture_lossy_conversion__.ts': 'export const amount = Number("12345");\n' },
    () => !checkMoneySafety().ok,
  );
  results.push({ name: 'SCC-03: lossy number conversion (bare Number(...) call in packages/money/src)', expectFail: true, failed: lossyConversionCaught });

  return results;
}

/**
 * Delegates to the compile-time negative-fixture harness (tests/type-invalid),
 * which already proves — via the REAL `tsc --noEmit` command, not a mock —
 * that Money/MinorUnits reject `number` and Money/AsOf reject a missing
 * required field. Not duplicated here; see scripts/check-type-invalid.ts.
 */
function runTypeInvalidDelegatedFixture(): RedFixtureResult {
  try {
    execFileSync('node', [path.join(ROOT, 'scripts', 'check-type-invalid.ts')], { encoding: 'utf8', cwd: ROOT });
    return { name: 'compile-time negative fixtures (5 fixtures + control, delegated to tests/type-invalid)', expectFail: false, failed: false };
  } catch (err) {
    const e = err as { message: string };
    return { name: 'compile-time negative fixtures (5 fixtures + control, delegated to tests/type-invalid)', expectFail: false, failed: true, error: e.message };
  }
}

/**
 * Mutates the real `addMoney` currency-equality guard in packages/money/src/money.ts
 * out of existence, runs the REAL production `pnpm --filter @afenda/money test`
 * command, and confirms Vitest's own currency-mismatch test turns red — then
 * restores the file byte-for-byte in a `finally` block regardless of outcome.
 */
function runMoneyCurrencyGuardMutationFixture(): RedFixtureResult {
  const filePath = path.join(ROOT, 'packages', 'money', 'src', 'money.ts');
  const original = readFileSync(filePath, 'utf8');
  const guard = "  if (a.currency !== b.currency) {\n    return err('CURRENCY_MISMATCH', `cannot add ${a.currency} to ${b.currency}`);\n  }\n";
  if (!original.includes(guard)) {
    return { name: 'mutation-kill: addMoney currency-equality guard removed', expectFail: true, failed: true, error: 'guard snippet not found verbatim in money.ts; fixture is stale' };
  }
  try {
    const mutated = original.replace(guard, '');
    writeFileSync(filePath, mutated, 'utf8');
    execFileSync('pnpm', ['--filter', '@afenda/money', 'test'], { encoding: 'utf8', cwd: ROOT, shell: true });
    return { name: 'mutation-kill: addMoney currency-equality guard removed', expectFail: true, failed: false };
  } catch {
    return { name: 'mutation-kill: addMoney currency-equality guard removed', expectFail: true, failed: true };
  } finally {
    writeFileSync(filePath, original, 'utf8');
  }
}

/**
 * Mutates the real `toMinorUnits` range guard in packages/money/src/minor-units.ts
 * out of existence, runs the REAL production `pnpm --filter @afenda/money test`
 * command, and confirms Vitest's own range-boundary test turns red — then
 * restores the file byte-for-byte in a `finally` block regardless of outcome.
 */
function runMoneyRangeGuardMutationFixture(): RedFixtureResult {
  const filePath = path.join(ROOT, 'packages', 'money', 'src', 'minor-units.ts');
  const original = readFileSync(filePath, 'utf8');
  const guard = 'if (value < MIN_MINOR_UNITS || value > MAX_MINOR_UNITS) {';
  if (!original.includes(guard)) {
    return { name: 'mutation-kill: toMinorUnits range guard disabled', expectFail: true, failed: true, error: 'guard snippet not found verbatim in minor-units.ts; fixture is stale' };
  }
  try {
    const mutated = original.replace(guard, 'if (false) {');
    writeFileSync(filePath, mutated, 'utf8');
    execFileSync('pnpm', ['--filter', '@afenda/money', 'test'], { encoding: 'utf8', cwd: ROOT, shell: true });
    return { name: 'mutation-kill: toMinorUnits range guard disabled', expectFail: true, failed: false };
  } catch {
    return { name: 'mutation-kill: toMinorUnits range guard disabled', expectFail: true, failed: true };
  } finally {
    writeFileSync(filePath, original, 'utf8');
  }
}

async function main(): Promise<void> {
  const results: RedFixtureResult[] = [];
  results.push(runAuthoritySelfTest());
  results.push(runToolchainMismatchFixture());
  results.push(runNodePinMismatchFixture());
  results.push(runPnpmPackageManagerMismatchFixture());
  results.push(runNativeTsPackageMismatchFixture());
  results.push(runCompatTsPackageMismatchFixture());
  results.push(runTurboPackageMismatchFixture());
  results.push(runCompatEngineDiscrepancyIsRecordedNotHiddenFixture());
  results.push(runControlMapIncompleteFixture());
  results.push(runDependencyRangeFixture());
  results.push(runLockfileDisagreementFixture());
  results.push(await runLintTsSuppressionFixture());
  results.push(runTypecheckFixture('typecheck:native', 'typecheck-native-injected-type-error (genuine string-as-number defect)'));
  results.push(runTypecheckFixture('typecheck:compat', 'typecheck-compat-injected-type-error (same genuine defect, compatibility lane)'));
  results.push(runTypeInvalidDelegatedFixture());
  results.push(runDepCruiseInternalImportFixture());
  results.push(runDepCruiseCycleFixture());
  results.push(...runArchitectureFixtures());
  results.push(...runMoneySafetyFixtures());
  results.push(runMoneyCurrencyGuardMutationFixture());
  results.push(runMoneyRangeGuardMutationFixture());

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
