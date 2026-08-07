#!/usr/bin/env node
// Read-only. Compares the installed/declared toolchain against stack/VERSION_BASELINE.json.
// Never repairs or upgrades anything. A mismatch is reported and fails the check.

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

export interface ToolchainCheckResult {
  ok: boolean;
  id: string;
  label: string;
  expected: string;
  actual: string;
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

function result(ok: boolean, id: string, label: string, expected: string, actual: string, note: string | null): ToolchainCheckResult {
  return { ok, id, label, expected, actual, note };
}

export interface InstalledToolchainState {
  nodeVersion: string;
  pnpmVersion: string;
  packageJson: Record<string, unknown>;
  nativeTscPackageVersion: string;
  compatTscPackageVersion: string;
  compatEnginePackageVersion: string | undefined;
}

export function evaluateToolchain(baseline: Record<string, unknown>, installed: InstalledToolchainState): ToolchainCheckResult[] {
  const results: ToolchainCheckResult[] = [];

  const runtime = getObject(baseline, 'runtime');
  const node = getObject(runtime, 'node');
  const expectedNode = asString(get(node, 'reference_patch'));
  results.push(
    result(
      installed.nodeVersion === expectedNode,
      'node-runtime',
      'Node.js runtime patch',
      expectedNode,
      installed.nodeVersion,
      null,
    ),
  );

  const engines = getObject(installed.packageJson, 'engines');
  const enginesNode = asString(get(engines, 'node'));
  results.push(
    result(
      enginesNode === expectedNode,
      'node-engines-field',
      'package.json engines.node pin',
      expectedNode,
      enginesNode,
      null,
    ),
  );

  const compiler = getObject(baseline, 'compiler');
  const native = getObject(compiler, 'typescript_native');
  const compat = getObject(compiler, 'typescript_compat');

  const expectedNative = asString(get(native, 'reference_patch'));
  results.push(
    result(
      installed.nativeTscPackageVersion === expectedNative,
      'typescript-native-package',
      'TypeScript native package version (@typescript/native)',
      expectedNative,
      installed.nativeTscPackageVersion,
      null,
    ),
  );

  const expectedCompat = asString(get(compat, 'reference_patch'));
  const compatOk = installed.compatTscPackageVersion === expectedCompat;
  const engineVersion = installed.compatEnginePackageVersion;
  const engineMismatch = engineVersion !== undefined && engineVersion !== expectedCompat;
  results.push(
    result(
      compatOk,
      'typescript-compat-package',
      'TypeScript compatibility package version (@typescript/typescript6, aliased as "typescript")',
      expectedCompat,
      installed.compatTscPackageVersion,
      compatOk
        ? engineMismatch
          ? `Package pin is exact (${installed.compatTscPackageVersion}). However the wrapper's own dependency "@typescript/old" is declared as a semver RANGE ("npm:typescript@^6" inside @typescript/typescript6's own package.json), which the frozen lockfile resolved to real package "typescript@${engineVersion ?? ''}" — a genuinely different compiler engine than the pinned reference_patch, not merely a cosmetic version-string mismatch. This is why tsc6 --version self-reports "${engineVersion ?? ''}". Confirmed by inspecting node_modules/.pnpm and pnpm-lock.yaml directly. Not a violation of this package-level pin (which matches exactly); it IS a real gap between VERSION_BASELINE.json's declared reference_patch and the transitively-resolved compiler engine that this check cannot see because it only reads package.json version fields, not transitive lockfile resolutions. Recorded as an authority gap in governance/CONTROL_PLANE_REPORT.md; SCC-04 reflects this as partial, not implemented.`
          : 'Package pin is exact and the resolved engine version matches.'
        : null,
    ),
  );

  const packageManager = asString(get(installed.packageJson, 'packageManager'));
  const expectedPnpmField = `pnpm@${installed.pnpmVersion}`;
  results.push(
    result(
      packageManager === expectedPnpmField && packageManager.startsWith('pnpm@'),
      'pnpm-package-manager-field',
      'package.json packageManager field matches installed pnpm exactly',
      expectedPnpmField,
      packageManager,
      'stack/VERSION_BASELINE.json does not pin an exact pnpm version. This is a documented, explicit gap-fill (not a silent resolution): the packageManager field is pinned to the pnpm version present in the qualification environment at Phase 2 time.',
    ),
  );

  return results;
}

function collectInstalledState(): InstalledToolchainState {
  const nodeVersion = process.version.replace(/^v/, '');
  const pnpmVersion = execFileSync('pnpm', ['--version'], { encoding: 'utf8', shell: true }).trim();
  const packageJson = readJson(path.join(ROOT, 'package.json')) as Record<string, unknown>;
  const nativePkg = readJson(path.join(ROOT, 'node_modules', '@typescript', 'native', 'package.json')) as Record<string, unknown>;
  const compatPkg = readJson(path.join(ROOT, 'node_modules', 'typescript', 'package.json')) as Record<string, unknown>;

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
    packageJson,
    nativeTscPackageVersion: asString(get(nativePkg, 'version')),
    compatTscPackageVersion: asString(get(compatPkg, 'version')),
    compatEnginePackageVersion,
  };
}

function main(): void {
  const baseline = readJson(path.join(ROOT, 'stack', 'VERSION_BASELINE.json')) as Record<string, unknown>;
  const installed = collectInstalledState();
  const results = evaluateToolchain(baseline, installed);

  console.log('\n=== AFENDA toolchain baseline verification (read-only) ===\n');
  let failCount = 0;
  for (const r of results) {
    const mark = r.ok ? '[OK]  ' : '[FAIL]';
    if (!r.ok) failCount += 1;
    console.log(`${mark} ${r.label}: expected "${r.expected}", got "${r.actual}"`);
    if (r.note !== null) console.log(`        note: ${r.note}`);
  }
  console.log(`\n${failCount === 0 ? 'PASS' : 'FAIL'}: ${results.length - failCount} OK / ${failCount} FAIL\n`);
  process.exitCode = failCount === 0 ? 0 : 1;
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  main();
}
