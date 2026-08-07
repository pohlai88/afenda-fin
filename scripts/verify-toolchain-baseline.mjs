#!/usr/bin/env node
// Read-only. Compares the installed/declared toolchain against stack/VERSION_BASELINE.json.
// Never repairs or upgrades anything. A mismatch is reported and fails the check.

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * @typedef {{ ok: boolean, id: string, label: string, expected: string, actual: string, note: string | null }} ToolchainCheckResult
 */

/**
 * @param {string} p
 * @returns {unknown}
 */
function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

/**
 * @param {unknown} v
 * @returns {string}
 */
function asString(v) {
  return typeof v === 'string' ? v : '';
}

/**
 * Bracket-style property read for a Record<string, unknown>, avoiding
 * noPropertyAccessFromIndexSignature while keeping call sites readable.
 * @param {Record<string, unknown> | undefined} obj
 * @param {string} key
 * @returns {unknown}
 */
function get(obj, key) {
  if (obj === undefined) return undefined;
  return obj[key];
}

/**
 * @param {Record<string, unknown>} obj
 * @param {string} key
 * @returns {Record<string, unknown>}
 */
function getObject(obj, key) {
  const v = get(obj, key);
  return /** @type {Record<string, unknown>} */ (v ?? {});
}

/**
 * @param {ToolchainCheckResult['ok']} ok
 * @param {string} id
 * @param {string} label
 * @param {string} expected
 * @param {string} actual
 * @param {string | null} note
 * @returns {ToolchainCheckResult}
 */
function result(ok, id, label, expected, actual, note) {
  return { ok, id, label, expected, actual, note };
}

/**
 * @param {Record<string, unknown>} baseline
 * @param {{
 *   nodeVersion: string,
 *   pnpmVersion: string,
 *   packageJson: Record<string, unknown>,
 *   nativeTscPackageVersion: string,
 *   compatTscPackageVersion: string
 * }} installed
 * @returns {ToolchainCheckResult[]}
 */
export function evaluateToolchain(baseline, installed) {
  /** @type {ToolchainCheckResult[]} */
  const results = [];

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
  results.push(
    result(
      compatOk,
      'typescript-compat-package',
      'TypeScript compatibility package version (@typescript/typescript6, aliased as "typescript")',
      expectedCompat,
      installed.compatTscPackageVersion,
      compatOk
        ? 'Package pin is exact. Note: the tsc6 binary self-reports "Version 6.0.3" even though the pinned npm package version is 6.0.2 — this is an upstream wrapper/compiler version discrepancy, not a pin violation. Recorded, not silently hidden.'
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

/**
 * @returns {{
 *   nodeVersion: string,
 *   pnpmVersion: string,
 *   packageJson: Record<string, unknown>,
 *   nativeTscPackageVersion: string,
 *   compatTscPackageVersion: string
 * }}
 */
function collectInstalledState() {
  const nodeVersion = process.version.replace(/^v/, '');
  const pnpmVersion = execFileSync('pnpm', ['--version'], { encoding: 'utf8', shell: true }).trim();
  const packageJson = /** @type {Record<string, unknown>} */ (
    readJson(path.join(ROOT, 'package.json'))
  );
  const nativePkg = /** @type {Record<string, unknown>} */ (
    readJson(path.join(ROOT, 'node_modules', '@typescript', 'native', 'package.json'))
  );
  const compatPkg = /** @type {Record<string, unknown>} */ (
    readJson(path.join(ROOT, 'node_modules', 'typescript', 'package.json'))
  );
  return {
    nodeVersion,
    pnpmVersion,
    packageJson,
    nativeTscPackageVersion: asString(get(nativePkg, 'version')),
    compatTscPackageVersion: asString(get(compatPkg, 'version')),
  };
}

function main() {
  const baseline = /** @type {Record<string, unknown>} */ (
    readJson(path.join(ROOT, 'stack', 'VERSION_BASELINE.json'))
  );
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
