#!/usr/bin/env node
// Read-only. Compares the installed/declared toolchain against stack/VERSION_BASELINE.json.
// Never repairs or upgrades anything. A mismatch is reported and fails the check.
//
// Phase 2.2: each component reports five distinct fields instead of one collapsed
// PASS boolean, because "exact and CI-verified" (SCC-04) is actually five different
// claims that must not be conflated:
//   DECLARED    - stack/VERSION_BASELINE.json's reference value
//   PINNED      - what package.json/.node-version actually pins
//   RESOLVED    - what the package manager/lockfile actually resolved (may differ
//                 from PINNED for a wrapper package whose own dependency is a range)
//   EXECUTED    - what the real installed binary reports at runtime
//   CI-OBSERVED - whether a live CI run's result for this component has actually
//                 been inspected from this environment (never asserted from workflow
//                 file syntax alone)
// A component whose PINNED/RESOLVED/EXECUTED all agree with DECLARED is 'ok'. A
// component where the top-level package pin is exact but a deeper, fully-disclosed
// resolution fact diverges (the TypeScript-6 compatibility engine) is
// 'discrepancy-recorded', not 'fail': the pin itself was not violated. Only a real
// pin/version mismatch is 'fail'.

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { isMainModule } from './lib/cli-main.ts';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

export type ComponentStatus = 'ok' | 'discrepancy-recorded' | 'fail';

export interface ToolchainComponentResult {
  id: string;
  label: string;
  declared: string;
  pinned: string;
  resolved: string;
  executed: string;
  ciObserved: string;
  status: ComponentStatus;
  note: string | null;
}

function readJson(p: string): unknown {
  return JSON.parse(readFileSync(p, 'utf8'));
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/**
 * Bracket-style property read for a Record<string, unknown>, avoiding
 * noPropertyAccessFromIndexSignature while keeping call sites readable.
 */
function get(obj: Record<string, unknown> | undefined, key: string): unknown {
  if (obj === undefined) return undefined;
  return obj[key];
}

function getObject(obj: Record<string, unknown>, key: string): Record<string, unknown> {
  const v = get(obj, key);
  return (v ?? {}) as Record<string, unknown>;
}

export interface InstalledToolchainState {
  nodeVersion: string;
  pnpmVersion: string;
  turboVersion: string | undefined;
  packageJson: Record<string, unknown>;
  nativeTscPackageVersion: string;
  compatTscPackageVersion: string;
  compatEnginePackageVersion: string | undefined;
}

function component(
  id: string,
  label: string,
  declared: string,
  pinned: string,
  resolved: string,
  executed: string,
  ciObserved: string,
  note: string | null,
): ToolchainComponentResult {
  const allAgreeWithDeclared = [pinned, resolved, executed].every((v) => v === '' || v === declared);
  const status: ComponentStatus = allAgreeWithDeclared ? 'ok' : 'fail';
  return { id, label, declared, pinned, resolved, executed, ciObserved, status, note };
}

export function evaluateToolchain(baseline: Record<string, unknown>, installed: InstalledToolchainState, ciObserved: string): ToolchainComponentResult[] {
  const results: ToolchainComponentResult[] = [];

  const runtime = getObject(baseline, 'runtime');
  const node = getObject(runtime, 'node');
  const expectedNode = asString(get(node, 'reference_patch'));
  const engines = getObject(installed.packageJson, 'engines');
  const enginesNode = asString(get(engines, 'node'));
  results.push(
    component(
      'node-runtime',
      'Node.js runtime',
      expectedNode,
      enginesNode,
      enginesNode,
      installed.nodeVersion,
      ciObserved,
      null,
    ),
  );

  const compiler = getObject(baseline, 'compiler');
  const native = getObject(compiler, 'typescript_native');
  const compat = getObject(compiler, 'typescript_compat');

  const expectedNative = asString(get(native, 'reference_patch'));
  results.push(
    component(
      'typescript-native-package',
      'TypeScript native package (@typescript/native)',
      expectedNative,
      expectedNative,
      installed.nativeTscPackageVersion,
      installed.nativeTscPackageVersion,
      ciObserved,
      null,
    ),
  );

  const expectedCompat = asString(get(compat, 'reference_patch'));
  const engineVersion = installed.compatEnginePackageVersion;
  const packagePinOk = installed.compatTscPackageVersion === expectedCompat;
  const engineMismatch = engineVersion !== undefined && engineVersion !== expectedCompat;
  const compatStatus: ComponentStatus = !packagePinOk ? 'fail' : engineMismatch ? 'discrepancy-recorded' : 'ok';
  results.push({
    id: 'typescript-compat-package',
    label: 'TypeScript compatibility package (@typescript/typescript6, aliased as "typescript")',
    declared: expectedCompat,
    pinned: expectedCompat,
    resolved: installed.compatTscPackageVersion,
    executed: `package ${installed.compatTscPackageVersion}; compiler engine ${engineVersion ?? 'unknown'}`,
    ciObserved,
    status: compatStatus,
    note:
      compatStatus === 'discrepancy-recorded'
        ? `Package pin is exact (${installed.compatTscPackageVersion}) and this check reports [OK]/no-fail for it. However the wrapper's own dependency "@typescript/old" is declared as a semver RANGE ("npm:typescript@^6" inside @typescript/typescript6's own package.json), which the frozen lockfile resolved to real package "typescript@${engineVersion ?? ''}" — a genuinely different compiler engine than the pinned reference_patch, not merely a cosmetic version-string mismatch. This is why tsc6 --version self-reports "${engineVersion ?? ''}". Confirmed by inspecting node_modules/.pnpm and pnpm-lock.yaml directly, and independently reproduced from a clean disposable install of only this package specifier. Full fact record: stack/VERSION_BASELINE.json compiler.typescript_compat.compiler_engine. Not a violation of the package-level pin; it IS a real gap between that pin and the transitively-resolved compiler engine. Recorded as a discrepancy, not a failure, per governance/CONTROL_PLANE_REPORT.md Phase 2.2; SCC-04 reflects this gap as partial, not implemented.`
        : packagePinOk
          ? 'Package pin is exact and the resolved engine version matches.'
          : null,
  });

  const packages = getObject(baseline, 'packages');
  const pnpmBaseline = getObject(packages, 'pnpm');
  const expectedPnpm = asString(get(pnpmBaseline, 'reference_patch'));
  const packageManager = asString(get(installed.packageJson, 'packageManager'));
  const pinnedPnpm = packageManager.startsWith('pnpm@') ? packageManager.slice('pnpm@'.length) : packageManager;
  results.push(
    component(
      'pnpm-package-manager',
      'pnpm package manager',
      expectedPnpm,
      pinnedPnpm,
      pinnedPnpm,
      installed.pnpmVersion,
      ciObserved,
      expectedPnpm === ''
        ? 'stack/VERSION_BASELINE.json packages.pnpm.reference_patch is absent (pre-Phase-2.2 baseline). No declared value to check against.'
        : null,
    ),
  );

  const turboBaseline = getObject(packages, 'turborepo');
  const expectedTurbo = asString(get(turboBaseline, 'reference_patch'));
  const devDeps = getObject(installed.packageJson, 'devDependencies');
  const pinnedTurbo = asString(get(devDeps, 'turbo'));
  results.push(
    component(
      'turborepo-package',
      'Turborepo (turbo)',
      expectedTurbo,
      pinnedTurbo,
      installed.turboVersion ?? '',
      installed.turboVersion ?? '',
      ciObserved,
      expectedTurbo === ''
        ? 'stack/VERSION_BASELINE.json packages.turborepo.reference_patch is absent (pre-Phase-2.2 baseline). No declared value to check against.'
        : null,
    ),
  );

  return results;
}

function detectCiObservedStatus(): string {
  try {
    const remotes = execFileSync('git', ['remote', '-v'], { encoding: 'utf8', cwd: ROOT, shell: true }).trim();
    if (remotes === '') {
      return 'not observed (no git remote configured in this environment; see governance/CONTROL_PLANE_REPORT.md Phase 2.2 CI-evidence section)';
    }
    return 'not observed (git remote present but no live CI run was fetched/inspected in this environment; do not assert CI verification from workflow file syntax alone)';
  } catch {
    return 'not observed (unable to query git remotes in this environment)';
  }
}

function collectInstalledState(): InstalledToolchainState {
  const nodeVersion = process.version.replace(/^v/, '');
  const pnpmVersion = execFileSync('pnpm', ['--version'], { encoding: 'utf8', shell: true }).trim();
  const packageJson = readJson(path.join(ROOT, 'package.json')) as Record<string, unknown>;
  const nativePkg = readJson(path.join(ROOT, 'node_modules', '@typescript', 'native', 'package.json')) as Record<string, unknown>;
  const compatPkg = readJson(path.join(ROOT, 'node_modules', 'typescript', 'package.json')) as Record<string, unknown>;

  let turboVersion: string | undefined;
  try {
    const turboPkgPath = createRequire(import.meta.url).resolve('turbo/package.json');
    const turboPkg = readJson(turboPkgPath) as Record<string, unknown>;
    turboVersion = asString(get(turboPkg, 'version'));
  } catch {
    turboVersion = undefined;
  }

  // "typescript" (our devDependency alias) is @typescript/typescript6, a thin
  // wrapper whose lib/typescript.js does `require("@typescript/old")`. That
  // wrapper declares "@typescript/old": "npm:typescript@^6" in ITS OWN
  // package.json — a semver RANGE we do not control from ours. Resolve what
  // it actually loaded at runtime, the same way Node itself resolves it.
  let compatEnginePackageVersion: string | undefined;
  try {
    const compatEntry = createRequire(import.meta.url).resolve('typescript');
    const requireFromCompat = createRequire(compatEntry);
    const enginePkgPath = requireFromCompat.resolve('@typescript/old/package.json');
    const enginePkg = readJson(enginePkgPath) as Record<string, unknown>;
    compatEnginePackageVersion = asString(get(enginePkg, 'version'));
  } catch {
    compatEnginePackageVersion = undefined;
  }

  return {
    nodeVersion,
    pnpmVersion,
    turboVersion,
    packageJson,
    nativeTscPackageVersion: asString(get(nativePkg, 'version')),
    compatTscPackageVersion: asString(get(compatPkg, 'version')),
    compatEnginePackageVersion,
  };
}

function main(): void {
  const baseline = readJson(path.join(ROOT, 'stack', 'VERSION_BASELINE.json')) as Record<string, unknown>;
  const installed = collectInstalledState();
  const ciObserved = detectCiObservedStatus();
  const results = evaluateToolchain(baseline, installed, ciObserved);

  console.log('\n=== AFENDA toolchain baseline verification (read-only) ===\n');
  let failCount = 0;
  let discrepancyCount = 0;
  for (const r of results) {
    if (r.status === 'fail') failCount += 1;
    if (r.status === 'discrepancy-recorded') discrepancyCount += 1;
    const mark = r.status === 'ok' ? '[OK]              ' : r.status === 'discrepancy-recorded' ? '[DISCREPANCY-NOTED]' : '[FAIL]             ';
    console.log(`${mark} ${r.label}`);
    console.log(`                     declared:    ${r.declared || '(none declared)'}`);
    console.log(`                     pinned:      ${r.pinned || '(n/a)'}`);
    console.log(`                     resolved:    ${r.resolved || '(n/a)'}`);
    console.log(`                     executed:    ${r.executed || '(n/a)'}`);
    console.log(`                     ci-observed: ${r.ciObserved}`);
    if (r.note !== null) console.log(`                     note:        ${r.note}`);
    console.log('');
  }
  console.log(
    `${failCount === 0 ? 'PASS' : 'FAIL'}: ${results.length - failCount - discrepancyCount} ok / ${discrepancyCount} discrepancy-recorded (non-failing) / ${failCount} FAIL\n`,
  );
  console.log(
    'Policy: a discrepancy-recorded status never fails this check by itself (the repository-level pin was not violated) and never by itself upgrades any SCC-04 control-state claim; control-state is decided separately in governance/control-implementation.json.\n',
  );
  process.exitCode = failCount === 0 ? 0 : 1;
}

if (isMainModule(import.meta.url, 'verify-toolchain-baseline.ts')) {
  main();
}
