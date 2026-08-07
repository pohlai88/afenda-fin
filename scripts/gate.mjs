#!/usr/bin/env node
// Deterministic governance dispatcher: `pnpm gate`.
// Runs, in order: (1) authority build+integrity, (2) registry drift (delegated to
// step 1's own check), (3) toolchain baseline, (4) implemented static governance
// controls, (5) control-map completeness, (6) red-fixture registration.
//
// Distinguishes PASS / FAIL / NOT-YET-BUILT / NOT-APPLICABLE. A NOT-YET-BUILT or
// NOT-APPLICABLE control never counts as PASS and never fails the overall gate by
// itself; it is reported separately so it stays visible. Only a real FAIL among the
// steps below fails the gate.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { checkControlMapCompleteness, checkDependencyPinsAreExact } from './lib/control-map.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * @typedef {'PASS' | 'FAIL' | 'NOT-YET-BUILT' | 'NOT-APPLICABLE'} StepStatus
 * @typedef {{ step: string, status: StepStatus, detail: string }} StepResult
 */

/**
 * @param {string} scriptRelPath
 * @param {string[]} args
 * @returns {{ ok: boolean, output: string }}
 */
function runNodeScript(scriptRelPath, args = []) {
  try {
    const output = execFileSync('node', [path.join(ROOT, scriptRelPath), ...args], {
      encoding: 'utf8',
      cwd: ROOT,
    });
    return { ok: true, output };
  } catch (err) {
    const e = /** @type {{ stdout?: string, stderr?: string, message: string }} */ (err);
    return { ok: false, output: e.stdout ?? e.stderr ?? e.message };
  }
}

/**
 * @param {string} scriptName
 * @returns {{ ok: boolean, output: string }}
 */
function runPnpmScript(scriptName) {
  try {
    const output = execFileSync('pnpm', ['run', scriptName], {
      encoding: 'utf8',
      cwd: ROOT,
      shell: true,
    });
    return { ok: true, output };
  } catch (err) {
    const e = /** @type {{ stdout?: string, stderr?: string, message: string }} */ (err);
    return { ok: false, output: e.stdout ?? e.stderr ?? e.message };
  }
}

/**
 * @returns {StepResult[]}
 */
function main() {
  /** @type {StepResult[]} */
  const steps = [];

  const build = runNodeScript('scripts/build-authority-registry.mjs');
  steps.push({
    step: '1. authority-build (regenerate governance/*.json)',
    status: build.ok ? 'PASS' : 'FAIL',
    detail: build.ok ? 'regenerated' : build.output,
  });

  const integrity = runNodeScript('scripts/check-authority-integrity.mjs');
  steps.push({
    step: '2. authority-integrity + generated-registry drift',
    status: integrity.ok ? 'PASS' : 'FAIL',
    detail: lastLine(integrity.output),
  });

  const toolchain = runNodeScript('scripts/verify-toolchain-baseline.mjs');
  steps.push({
    step: '3. version/toolchain baseline',
    status: toolchain.ok ? 'PASS' : 'FAIL',
    detail: lastLine(toolchain.output),
  });

  const typecheckNative = runPnpmScript('typecheck:native');
  steps.push({
    step: '4a. static governance control: typecheck:native (SCC-01/02, partial scope)',
    status: typecheckNative.ok ? 'PASS' : 'FAIL',
    detail: typecheckNative.ok ? 'clean' : typecheckNative.output,
  });

  const typecheckCompat = runPnpmScript('typecheck:compat');
  steps.push({
    step: '4b. static governance control: typecheck:compat (SCC-01, partial scope)',
    status: typecheckCompat.ok ? 'PASS' : 'FAIL',
    detail: typecheckCompat.ok ? 'clean' : typecheckCompat.output,
  });

  const lint = runPnpmScript('lint');
  steps.push({
    step: '4c. static governance control: lint (SCC-01/02, partial scope)',
    status: lint.ok ? 'PASS' : 'FAIL',
    detail: lint.ok ? 'clean' : lint.output,
  });

  const controlMap = /** @type {unknown} */ (
    JSON.parse(readFileSync(path.join(ROOT, 'governance', 'control-implementation.json'), 'utf8'))
  );
  const completeness = checkControlMapCompleteness(controlMap);
  steps.push({
    step: '5. control-map completeness (SCC-01..27 + V01..18 present exactly once, valid states)',
    status: completeness.ok ? 'PASS' : 'FAIL',
    detail: completeness.ok ? 'complete' : completeness.failures.join('; '),
  });

  const packageJson = /** @type {Record<string, unknown>} */ (
    JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  );
  const pinCheck = checkDependencyPinsAreExact(packageJson);
  steps.push({
    step: '5b. dependency pin policy (no ^/~/latest ranges in package.json)',
    status: pinCheck.ok ? 'PASS' : 'FAIL',
    detail: pinCheck.ok ? 'all exact' : pinCheck.failures.join('; '),
  });

  const selfTest = runNodeScript('scripts/check-authority-integrity.mjs', ['--self-test']);
  steps.push({
    step: '6. red-fixture registration (authority self-test; full harness via `pnpm red`)',
    status: selfTest.ok ? 'PASS' : 'FAIL',
    detail: lastLine(selfTest.output),
  });

  return steps;
}

/**
 * @param {string} output
 * @returns {string}
 */
function lastLine(output) {
  const lines = output.trim().split('\n');
  return lines[lines.length - 1] ?? '';
}

/**
 * @param {unknown} controlMap
 * @returns {{ implemented: number, partial: number, notYetBuilt: number, blocked: number, notApplicable: number }}
 */
function summarizeControlStates(controlMap) {
  const obj = /** @type {Record<string, unknown>} */ (controlMap);
  const all = [
    .../** @type {Array<Record<string, unknown>>} */ (obj['stack_controls'] ?? []),
    .../** @type {Array<Record<string, unknown>>} */ (obj['doctrine_verification_controls'] ?? []),
  ];
  let implemented = 0;
  let partial = 0;
  let notYetBuilt = 0;
  let blocked = 0;
  let notApplicable = 0;
  for (const item of all) {
    const state = typeof item['state'] === 'string' ? item['state'] : '';
    if (state === 'implemented') implemented += 1;
    else if (state === 'partial') partial += 1;
    else if (state === 'not-yet-built') notYetBuilt += 1;
    else if (state === 'blocked') blocked += 1;
    else if (state === 'not-applicable-current-tree') notApplicable += 1;
  }
  return { implemented, partial, notYetBuilt, blocked, notApplicable };
}

const steps = main();
console.log('\n=== AFENDA governance gate (pnpm gate) ===\n');
let anyFail = false;
for (const s of steps) {
  if (s.status === 'FAIL') anyFail = true;
  console.log(`[${s.status}] ${s.step}`);
  if (s.status === 'FAIL') console.log(`        ${s.detail.split('\n').slice(0, 3).join('\n        ')}`);
}

const controlMapRaw = /** @type {unknown} */ (
  JSON.parse(readFileSync(path.join(ROOT, 'governance', 'control-implementation.json'), 'utf8'))
);
const summary = summarizeControlStates(controlMapRaw);
console.log('\n--- SCC-01..27 + V01..18 state summary (informational; does not gate this repository phase) ---');
console.log(`  implemented: ${summary.implemented}`);
console.log(`  partial: ${summary.partial}`);
console.log(`  not-yet-built: ${summary.notYetBuilt}`);
console.log(`  blocked: ${summary.blocked}`);
console.log(`  not-applicable-current-tree: ${summary.notApplicable}`);
console.log(
  '\nPolicy: not-yet-built/blocked/not-applicable controls are visible above and never counted as PASS. This governance-only repository phase does not claim application qualification.',
);

console.log(`\nOverall gate: ${anyFail ? 'FAIL' : 'PASS'}\n`);
process.exitCode = anyFail ? 1 : 0;
