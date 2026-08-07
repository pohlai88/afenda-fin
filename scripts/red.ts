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
import { checkTransactionSafety } from './check-transaction-safety.ts';

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

/**
 * Phase 3B.1 (governance/PHASE_3B1_LINT_REPORT.md): the lint-fixture bug this
 * harness is built to never repeat. `eslint.lintText` against an invented
 * path (`scripts/__red_fixture__.mjs`, never written to disk) reports
 * `errorCount: 1` — but the ONE message is `{ ruleId: null, fatal: true,
 * message: "...was not found by the project service..." }`, a projectService
 * parser failure, not `no-explicit-any`/`ban-ts-comment` actually firing.
 * Confirmed by running CLEAN source (`export const x = 1;`) through the exact
 * same invented path: it reports the IDENTICAL `errorCount: 1` fatal parser
 * error. A naive `errorCount > 0` assertion therefore could not distinguish
 * "the rule fired" from "the file does not exist" — false-red evidence.
 *
 * The fix below never repeats this shape: every lint fixture (1) writes a
 * REAL file to a REAL on-disk path already covered by `tsconfig.json`'s
 * `include`, (2) asserts every expected ruleId is present among the fired
 * messages, (3) asserts NO message is `fatal`/`ruleId: null` (a parser/config
 * failure can never substitute for rule sensitivity), and (4) proves clean
 * source at the exact same path lints with zero errors — then removes the
 * fixture file in a `finally` block, even on failure.
 */
interface LintRuleFixtureSpec {
  /** Repository-relative path; MUST already fall under a real tsconfig.json include (e.g. scripts/**\/*.ts). */
  relativePath: string;
  /** Source that must trigger every id in `expectedRuleIds` and nothing that looks like a parser/config failure. */
  badSource: string;
  /** Every one of these ruleIds must appear among the messages fired against `badSource`. */
  expectedRuleIds: string[];
  /** Source that, written to the SAME path, must lint with zero errors — proving the fixture path/config itself is not just broken. */
  cleanSource: string;
}

async function runLintRuleFixture(name: string, spec: LintRuleFixtureSpec): Promise<RedFixtureResult> {
  const absolutePath = path.join(ROOT, spec.relativePath);
  const eslint = new ESLint({ cwd: ROOT });
  try {
    writeFileSync(absolutePath, spec.badSource, 'utf8');
    const [badReport] = await eslint.lintFiles([spec.relativePath]);
    const badMessages = badReport?.messages ?? [];
    const anyFatalOrParserFailure = badMessages.some((m) => m.fatal === true || m.ruleId === null);
    const firedRuleIds = new Set(badMessages.map((m) => m.ruleId).filter((id): id is string => id !== null));
    const allExpectedRuleIdsFired = spec.expectedRuleIds.every((id) => firedRuleIds.has(id));
    if (anyFatalOrParserFailure) {
      return { name, expectFail: true, failed: false, error: `parser/config failure substituted for rule detection: ${JSON.stringify(badMessages)}` };
    }
    if (!allExpectedRuleIdsFired) {
      return { name, expectFail: true, failed: false, error: `expected ruleIds ${JSON.stringify(spec.expectedRuleIds)} not all present; got ${JSON.stringify([...firedRuleIds])}` };
    }

    writeFileSync(absolutePath, spec.cleanSource, 'utf8');
    const [cleanReport] = await eslint.lintFiles([spec.relativePath]);
    const cleanErrorCount = cleanReport?.errorCount ?? -1;
    if (cleanErrorCount !== 0) {
      return { name, expectFail: true, failed: false, error: `clean source at the same real path did not lint clean: ${JSON.stringify(cleanReport?.messages ?? [])}` };
    }

    return { name, expectFail: true, failed: true };
  } catch (err) {
    const e = err as { message: string };
    return { name, expectFail: true, failed: false, error: e.message };
  } finally {
    rmSync(absolutePath, { force: true });
  }
}

function runLintTsSuppressionFixture(): Promise<RedFixtureResult> {
  return runLintRuleFixture('lint-ts-suppression (@ts-ignore + explicit any, real on-disk path, exact rule IDs)', {
    relativePath: path.join('scripts', '__red_fixture_lint_suppression__.ts'),
    badSource: ['// @ts-ignore', 'export const redFixtureLintSuppression: any = 1;', ''].join('\n'),
    expectedRuleIds: ['@typescript-eslint/ban-ts-comment', '@typescript-eslint/no-explicit-any'],
    cleanSource: ['export const redFixtureLintSuppressionClean: number = 1;', ''].join('\n'),
  });
}

/** Phase 3B.1: proves @typescript-eslint/no-unsafe-assignment actually fires on an untrusted JSON.parse() value assigned into a typed authoritative shape. */
function runUnsafeAssignmentLintFixture(): Promise<RedFixtureResult> {
  return runLintRuleFixture('lint: no-unsafe-assignment fires on untrusted JSON.parse() assigned to a typed shape', {
    relativePath: path.join('scripts', '__red_fixture_unsafe_assignment__.ts'),
    badSource: [
      'interface RedFixtureShape {',
      '  amount: string;',
      '}',
      'declare const raw: string;',
      'export const redFixtureUnsafeAssignment: RedFixtureShape = JSON.parse(raw);',
      '',
    ].join('\n'),
    expectedRuleIds: ['@typescript-eslint/no-unsafe-assignment'],
    cleanSource: [
      'interface RedFixtureShape {',
      '  amount: string;',
      '}',
      'declare const raw: RedFixtureShape;',
      'export const redFixtureUnsafeAssignmentClean: RedFixtureShape = raw;',
      '',
    ].join('\n'),
  });
}

/** Phase 3B.1: proves @typescript-eslint/no-unsafe-argument actually fires when an untrusted JSON.parse()-derived value is passed to a typed function parameter. */
function runUnsafeArgumentLintFixture(): Promise<RedFixtureResult> {
  return runLintRuleFixture('lint: no-unsafe-argument fires on untrusted JSON.parse() value passed to a typed parameter', {
    relativePath: path.join('scripts', '__red_fixture_unsafe_argument__.ts'),
    badSource: [
      'function redFixtureTypedFunction(value: string): string {',
      '  return value;',
      '}',
      'declare const raw: string;',
      'export const redFixtureUnsafeArgument = redFixtureTypedFunction(JSON.parse(raw).value);',
      '',
    ].join('\n'),
    expectedRuleIds: ['@typescript-eslint/no-unsafe-argument'],
    cleanSource: [
      'function redFixtureTypedFunction(value: string): string {',
      '  return value;',
      '}',
      'declare const raw: string;',
      'export const redFixtureUnsafeArgumentClean = redFixtureTypedFunction(raw);',
      '',
    ].join('\n'),
  });
}

/**
 * Phase 3B.1 §7 — the business-facing proof. An untrusted `JSON.parse()`
 * value flowing straight into a domain Money constructor (bypassing
 * packages/contracts's Zod schema entirely) must fail lint for real
 * (no-unsafe-assignment for the untyped JSON.parse() binding,
 * no-unsafe-argument for the two `any`-typed member accesses passed into
 * `moneyFromParts`). The SANCTIONED path — the same untrusted JSON.parse()
 * value passed straight into `decodeMoneyTransport` (whose parameter type is
 * `unknown`, not `any`) — must lint perfectly clean, proving Zod is a real,
 * mechanically-enforced ingress boundary and not merely a naming convention.
 */
function runMoneyJsonIngressLintFixture(): Promise<RedFixtureResult> {
  return runLintRuleFixture('lint: untrusted JSON->Money ingress fails without Zod; decodeMoneyTransport(JSON.parse(...)) lints clean', {
    relativePath: path.join('scripts', '__red_fixture_money_json_ingress__.ts'),
    badSource: [
      "import { moneyFromParts } from '@afenda/money';",
      'declare const raw: string;',
      'const incoming = JSON.parse(raw);',
      'export const redFixtureMoneyIngressUnsafe = moneyFromParts(incoming.currency, incoming.minorUnits);',
      '',
    ].join('\n'),
    expectedRuleIds: ['@typescript-eslint/no-unsafe-assignment', '@typescript-eslint/no-unsafe-argument'],
    cleanSource: [
      "import { decodeMoneyTransport } from '@afenda/contracts';",
      'declare const raw: string;',
      'export const redFixtureMoneyIngressClean = decodeMoneyTransport(JSON.parse(raw));',
      '',
    ].join('\n'),
  });
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

/**
 * Phase 3B: injects a cross-package internal-subpath import from the NEW
 * packages/contracts package (contracts reaching into money/src/*.ts directly
 * instead of money's package.json exports root) and invokes the REAL
 * dependency-cruiser CLI (SCC-05, `no-cross-package-internal-import`), proving
 * the existing generic rule also covers the newly-added 4th package.
 */
function runDepCruiseContractsInternalImportFixture(): RedFixtureResult {
  const caughtByDepCruise = withDisposableFixtureFiles(
    {
      'packages/contracts/src/__red_fixture_internal_import__.ts': "import { addMoney } from '../../money/src/money.ts';\nexport { addMoney };\n",
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
  return { name: 'SCC-05: cross-package internal-subpath import (contracts -> money/src/money.ts)', expectFail: true, failed: caughtByDepCruise };
}

/**
 * Phase 3B: injects the reverse dependency the whole contracts boundary
 * exists to forbid — packages/money importing packages/contracts — and
 * invokes the REAL dependency-cruiser CLI (SCC-05, the new
 * `no-kernel-depends-on-contracts` rule). contracts is allowed to depend on
 * money/time/errors; the reverse must never be permitted to compile clean.
 */
function runDepCruiseReverseDependencyFixture(): RedFixtureResult {
  const caughtByDepCruise = withDisposableFixtureFiles(
    {
      'packages/money/src/__red_fixture_reverse_dependency__.ts': "import { encodeMoneyTransport } from '../../contracts/src/index.ts';\nexport { encodeMoneyTransport };\n",
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
  return { name: 'SCC-05: reverse dependency (money -> contracts, no-kernel-depends-on-contracts rule)', expectFail: true, failed: caughtByDepCruise };
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

  // Phase 3B: same three detector classes, now proven against the NEW
  // packages/contracts surface the AST control was extended to cover.
  const contractsJsonShapeCaught = withDisposableFixtureFiles(
    { 'packages/contracts/src/__red_fixture_unsafe_json_shape__.ts': 'export const shape = { currency: "MYR", minorUnits: 12345 };\n' },
    () => !checkMoneySafety().ok,
  );
  results.push({ name: 'SCC-03: unsafe Money JSON shape in packages/contracts (minorUnits as a JSON number literal)', expectFail: true, failed: contractsJsonShapeCaught });

  const contractsNumericZodSchemaCaught = withDisposableFixtureFiles(
    {
      'packages/contracts/src/__red_fixture_numeric_zod_schema__.ts':
        "import { z } from 'zod';\nexport const BadMoneyWireSchema = z.object({ currency: z.string(), minorUnits: z.number() });\n",
    },
    () => !checkMoneySafety().ok,
  );
  results.push({ name: 'SCC-03: numeric Zod schema for an authoritative money field (z.number() for minorUnits)', expectFail: true, failed: contractsNumericZodSchemaCaught });

  const contractsUnaryPlusCaught = withDisposableFixtureFiles(
    { 'packages/contracts/src/__red_fixture_unary_plus__.ts': 'declare const minorUnits: string;\nexport const amount = +minorUnits;\n' },
    () => !checkMoneySafety().ok,
  );
  results.push({ name: 'SCC-03: unary numeric coercion (+minorUnits) in packages/contracts', expectFail: true, failed: contractsUnaryPlusCaught });

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

/**
 * Phase 3B: widens the real canonical-integer-string pattern in
 * packages/money/src/minor-units.ts (the domain parser packages/contracts
 * delegates to) so decimal-notation strings like "1.0" pass the format
 * check, runs the REAL production `pnpm --filter @afenda/contracts test`
 * command, and confirms the transport-boundary malformed-input test turns
 * red — then restores the file byte-for-byte in a `finally` block
 * regardless of outcome.
 */
function runMoneyTransportDecimalGuardMutationFixture(): RedFixtureResult {
  const filePath = path.join(ROOT, 'packages', 'money', 'src', 'minor-units.ts');
  const original = readFileSync(filePath, 'utf8');
  const guard = 'const CANONICAL_INTEGER_STRING_PATTERN = /^-?[0-9]+$/;';
  if (!original.includes(guard)) {
    return { name: 'mutation-kill: canonical-integer-string pattern widened to accept decimals', expectFail: true, failed: true, error: 'guard snippet not found verbatim in minor-units.ts; fixture is stale' };
  }
  try {
    const mutated = original.replace(guard, 'const CANONICAL_INTEGER_STRING_PATTERN = /^-?[0-9]+(\\.[0-9]+)?$/;');
    writeFileSync(filePath, mutated, 'utf8');
    execFileSync('pnpm', ['--filter', '@afenda/contracts', 'run', 'test'], { encoding: 'utf8', cwd: ROOT, shell: true });
    return { name: 'mutation-kill: canonical-integer-string pattern widened to accept decimals', expectFail: true, failed: false };
  } catch {
    return { name: 'mutation-kill: canonical-integer-string pattern widened to accept decimals', expectFail: true, failed: true };
  } finally {
    writeFileSync(filePath, original, 'utf8');
  }
}

/**
 * Phase 3B: mutates the real `encodeMoneyTransport` in
 * packages/contracts/src/money-transport.ts to round the bigint minorUnits
 * through a JavaScript `number` (an exact, real precision-loss defect at the
 * 2^53 boundary) instead of delegating to the domain's exact
 * `serializeMoney`, runs the REAL production `pnpm --filter @afenda/contracts
 * test` command, and confirms the exact-round-trip/property tests turn red —
 * then restores the file byte-for-byte in a `finally` block regardless of
 * outcome.
 */
function runMoneyTransportPrecisionLossMutationFixture(): RedFixtureResult {
  const filePath = path.join(ROOT, 'packages', 'contracts', 'src', 'money-transport.ts');
  const original = readFileSync(filePath, 'utf8');
  const guard = 'export function encodeMoneyTransport(money: Money): MoneyWire {\n  return serializeMoney(money);\n}';
  if (!original.includes(guard)) {
    return { name: 'mutation-kill: encodeMoneyTransport routed through lossy Number(bigint)', expectFail: true, failed: true, error: 'guard snippet not found verbatim in money-transport.ts; fixture is stale' };
  }
  try {
    const mutated = original.replace(
      guard,
      'export function encodeMoneyTransport(money: Money): MoneyWire {\n  return { currency: money.currency, minorUnits: Number(money.minorUnits).toString() };\n}',
    );
    writeFileSync(filePath, mutated, 'utf8');
    execFileSync('pnpm', ['--filter', '@afenda/contracts', 'run', 'test'], { encoding: 'utf8', cwd: ROOT, shell: true });
    return { name: 'mutation-kill: encodeMoneyTransport routed through lossy Number(bigint)', expectFail: true, failed: false };
  } catch {
    return { name: 'mutation-kill: encodeMoneyTransport routed through lossy Number(bigint)', expectFail: true, failed: true };
  } finally {
    writeFileSync(filePath, original, 'utf8');
  }
}

/**
 * Phase 3B: disables the real calendar-round-trip guard in
 * packages/time/src/instant.ts (the domain parser packages/contracts
 * delegates to) so a numerically-out-of-range but structurally-shaped
 * calendar instant (e.g. "2026-02-30T00:00:00.000Z") would be silently
 * normalized and accepted, runs the REAL production `pnpm --filter
 * @afenda/contracts test` command, and confirms the malformed-Instant
 * negative test turns red — then restores the file byte-for-byte in a
 * `finally` block regardless of outcome.
 */
function runInstantTransportCalendarGuardMutationFixture(): RedFixtureResult {
  const filePath = path.join(ROOT, 'packages', 'time', 'src', 'instant.ts');
  const original = readFileSync(filePath, 'utf8');
  const guard = 'if (instantToCanonicalString(candidate) !== canonical) {';
  if (!original.includes(guard)) {
    return { name: 'mutation-kill: Instant calendar round-trip guard disabled', expectFail: true, failed: true, error: 'guard snippet not found verbatim in instant.ts; fixture is stale' };
  }
  try {
    const mutated = original.replace(guard, 'if (false) {');
    writeFileSync(filePath, mutated, 'utf8');
    execFileSync('pnpm', ['--filter', '@afenda/contracts', 'run', 'test'], { encoding: 'utf8', cwd: ROOT, shell: true });
    return { name: 'mutation-kill: Instant calendar round-trip guard disabled', expectFail: true, failed: false };
  } catch {
    return { name: 'mutation-kill: Instant calendar round-trip guard disabled', expectFail: true, failed: true };
  } finally {
    writeFileSync(filePath, original, 'utf8');
  }
}

/**
 * Phase 3C: SCC-08 static control must catch a real `pool.query(...)` call site
 * injected into packages/db/src (the production checkTransactionSafety scanner).
 */
function runDbPoolQueryStaticFixture(): RedFixtureResult {
  const fixturePath = path.join(ROOT, 'packages', 'db', 'src', '__red_pool_query__.ts');
  try {
    writeFileSync(
      fixturePath,
      [
        "import type { Pool } from 'pg';",
        'export async function redFixturePoolQuery(pool: Pool): Promise<void> {',
        "  await pool.query('SELECT 1');",
        '}',
        '',
      ].join('\n'),
      'utf8',
    );
    const violations = checkTransactionSafety();
    const failed = violations.some((v) => v.filePath.includes('__red_pool_query__'));
    return { name: 'SCC-08: pool.query call site detected in packages/db/src', expectFail: true, failed };
  } catch (err) {
    const e = err as { message: string };
    return { name: 'SCC-08: pool.query call site detected in packages/db/src', expectFail: true, failed: false, error: e.message };
  } finally {
    rmSync(fixturePath, { force: true });
  }
}

/**
 * Phase 3C: mutate withTransaction to BEGIN on the pool (wrong client). Invokes
 * the DB-integration gate lane specifically — not `pnpm gate`.
 */
function runDbTransactionPoolBeginMutationFixture(): RedFixtureResult {
  const filePath = path.join(ROOT, 'packages', 'db', 'src', 'transaction.ts');
  const original = readFileSync(filePath, 'utf8');
  const target = "await client.query('BEGIN');";
  if (!original.includes(target)) {
    return {
      name: 'mutation-kill: withTransaction BEGIN routed through pool.query',
      expectFail: true,
      failed: true,
      error: 'BEGIN snippet not found; fixture is stale',
    };
  }
  try {
    writeFileSync(filePath, original.replace(target, "await pool.query('BEGIN');"), 'utf8');
    execFileSync('pnpm', ['--filter', '@afenda/db', 'run', 'test:integration'], {
      encoding: 'utf8',
      cwd: ROOT,
      shell: true,
    });
    return { name: 'mutation-kill: withTransaction BEGIN routed through pool.query', expectFail: true, failed: false };
  } catch {
    return { name: 'mutation-kill: withTransaction BEGIN routed through pool.query', expectFail: true, failed: true };
  } finally {
    writeFileSync(filePath, original, 'utf8');
  }
}

/**
 * Phase 3C: register a lossy int8 parser (the correct mutant direction — defaults
 * already return strings). Invokes DB-integration lane.
 */
function runDbLossyInt8ParserMutationFixture(): RedFixtureResult {
  const filePath = path.join(ROOT, 'packages', 'db', 'src', 'type-parsers.ts');
  const original = readFileSync(filePath, 'utf8');
  const target = 'pg.types.setTypeParser(PG_OID.INT8, identityString);';
  const mutant = 'pg.types.setTypeParser(PG_OID.INT8, (value: string) => Number.parseInt(value, 10));';
  if (!original.includes(target)) {
    return {
      name: 'mutation-kill: lossy int8 TypeParser registered (parseInt)',
      expectFail: true,
      failed: true,
      error: 'INT8 identity registration not found; fixture is stale',
    };
  }
  try {
    writeFileSync(filePath, original.replace(target, mutant), 'utf8');
    execFileSync('pnpm', ['--filter', '@afenda/db', 'run', 'test:integration'], {
      encoding: 'utf8',
      cwd: ROOT,
      shell: true,
    });
    return { name: 'mutation-kill: lossy int8 TypeParser registered (parseInt)', expectFail: true, failed: false };
  } catch {
    return { name: 'mutation-kill: lossy int8 TypeParser registered (parseInt)', expectFail: true, failed: true };
  } finally {
    writeFileSync(filePath, original, 'utf8');
  }
}

/**
 * Phase 3C: disable checksum mismatch detection in migrate.ts; the integration
 * test that mutates an applied migration file must then fail to observe a reject.
 */
function runDbMigrationChecksumGuardMutationFixture(): RedFixtureResult {
  const filePath = path.join(ROOT, 'packages', 'db', 'src', 'migrate.ts');
  const original = readFileSync(filePath, 'utf8');
  const target = 'if (prior !== undefined && prior.checksum !== migration.checksum) {';
  if (!original.includes(target)) {
    return {
      name: 'mutation-kill: migration checksum mismatch guard disabled',
      expectFail: true,
      failed: true,
      error: 'checksum guard snippet not found; fixture is stale',
    };
  }
  try {
    writeFileSync(filePath, original.replace(target, 'if (prior !== undefined && false && prior.checksum !== migration.checksum) {'), 'utf8');
    execFileSync('pnpm', ['--filter', '@afenda/db', 'run', 'test:integration'], {
      encoding: 'utf8',
      cwd: ROOT,
      shell: true,
    });
    return { name: 'mutation-kill: migration checksum mismatch guard disabled', expectFail: true, failed: false };
  } catch {
    return { name: 'mutation-kill: migration checksum mismatch guard disabled', expectFail: true, failed: true };
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
  results.push(await runUnsafeAssignmentLintFixture());
  results.push(await runUnsafeArgumentLintFixture());
  results.push(await runMoneyJsonIngressLintFixture());
  results.push(runTypecheckFixture('typecheck:native', 'typecheck-native-injected-type-error (genuine string-as-number defect)'));
  results.push(runTypecheckFixture('typecheck:compat', 'typecheck-compat-injected-type-error (same genuine defect, compatibility lane)'));
  results.push(runTypeInvalidDelegatedFixture());
  results.push(runDepCruiseInternalImportFixture());
  results.push(runDepCruiseCycleFixture());
  results.push(runDepCruiseContractsInternalImportFixture());
  results.push(runDepCruiseReverseDependencyFixture());
  results.push(...runArchitectureFixtures());
  results.push(...runMoneySafetyFixtures());
  results.push(runMoneyCurrencyGuardMutationFixture());
  results.push(runMoneyRangeGuardMutationFixture());
  results.push(runMoneyTransportDecimalGuardMutationFixture());
  results.push(runMoneyTransportPrecisionLossMutationFixture());
  results.push(runInstantTransportCalendarGuardMutationFixture());
  results.push(runDbPoolQueryStaticFixture());
  results.push(runDbTransactionPoolBeginMutationFixture());
  results.push(runDbLossyInt8ParserMutationFixture());
  results.push(runDbMigrationChecksumGuardMutationFixture());

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
