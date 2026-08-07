#!/usr/bin/env node
// Deterministic governance dispatcher: `pnpm gate`.
// Runs, in order: (1) authority build+integrity, (2) registry drift (delegated to
// step 1's own check), (3) toolchain baseline, (4) implemented static governance
// controls, (5) control-map completeness, (6) dependency pin policy, (7) generated
// agent-doc drift, (8) red-fixture registration.
//
// Distinguishes PASS / FAIL / NOT-YET-BUILT / NOT-APPLICABLE. A NOT-YET-BUILT or
// NOT-APPLICABLE control never counts as PASS and never fails the overall gate by
// itself; it is reported separately so it stays visible. Only a real FAIL among the
// steps below fails the gate.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { checkControlMapCompleteness, checkDependencyPinsAreExact } from './lib/control-map.ts';
import { renderAgentDocs } from './generate-agent-docs.ts';
import type { AuthorityIndex } from './lib/authority-parser.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

type StepStatus = 'PASS' | 'FAIL' | 'NOT-YET-BUILT' | 'NOT-APPLICABLE';
interface StepResult {
  step: string;
  status: StepStatus;
  detail: string;
}

function runNodeScript(scriptRelPath: string, args: string[] = []): { ok: boolean; output: string } {
  try {
    const output = execFileSync('node', [path.join(ROOT, scriptRelPath), ...args], {
      encoding: 'utf8',
      cwd: ROOT,
    });
    return { ok: true, output };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    return { ok: false, output: e.stdout ?? e.stderr ?? e.message };
  }
}

function runPnpmScript(scriptName: string): { ok: boolean; output: string } {
  try {
    const output = execFileSync('pnpm', ['run', scriptName], {
      encoding: 'utf8',
      cwd: ROOT,
      shell: true,
    });
    return { ok: true, output };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    return { ok: false, output: e.stdout ?? e.stderr ?? e.message };
  }
}

function checkAgentDocsDrift(): { ok: boolean; detail: string } {
  const authorityIndex = JSON.parse(readFileSync(path.join(ROOT, 'governance', 'authority-index.json'), 'utf8')) as AuthorityIndex;
  const fresh = renderAgentDocs(authorityIndex);
  const committed = {
    rulesJson: readFileSync(path.join(ROOT, 'governance', 'rules.json'), 'utf8'),
    cursorRule: readFileSync(path.join(ROOT, '.cursor', 'rules', 'afenda.mdc'), 'utf8'),
    agentsMd: readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8'),
  };
  const diffs: string[] = [];
  if (committed.rulesJson !== fresh.rulesJson) diffs.push('governance/rules.json');
  if (committed.cursorRule !== fresh.cursorRule) diffs.push('.cursor/rules/afenda.mdc');
  if (committed.agentsMd !== fresh.agentsMd) diffs.push('AGENTS.md');
  if (diffs.length > 0) {
    return { ok: false, detail: `committed file(s) differ from fresh \`pnpm agent-docs\` regeneration: ${diffs.join(', ')}` };
  }
  return { ok: true, detail: 'byte-identical to fresh regeneration' };
}

function main(): StepResult[] {
  const steps: StepResult[] = [];

  const build = runNodeScript('scripts/build-authority-registry.ts');
  steps.push({
    step: '1. authority-build (regenerate governance/*.json)',
    status: build.ok ? 'PASS' : 'FAIL',
    detail: build.ok ? 'regenerated' : build.output,
  });

  const integrity = runNodeScript('scripts/check-authority-integrity.ts');
  steps.push({
    step: '2. authority-integrity + generated-registry drift',
    status: integrity.ok ? 'PASS' : 'FAIL',
    detail: lastLine(integrity.output),
  });

  const toolchain = runNodeScript('scripts/verify-toolchain-baseline.ts');
  steps.push({
    step: '3. version/toolchain baseline',
    status: toolchain.ok ? 'PASS' : 'FAIL',
    detail: lastLine(toolchain.output),
  });

  const typecheckNative = runPnpmScript('typecheck:native');
  steps.push({
    step: '4a. static governance control: typecheck:native (SCC-01/02, full governance scope)',
    status: typecheckNative.ok ? 'PASS' : 'FAIL',
    detail: typecheckNative.ok ? 'clean' : typecheckNative.output,
  });

  const typecheckCompat = runPnpmScript('typecheck:compat');
  steps.push({
    step: '4b. static governance control: typecheck:compat (SCC-01, full governance scope)',
    status: typecheckCompat.ok ? 'PASS' : 'FAIL',
    detail: typecheckCompat.ok ? 'clean' : typecheckCompat.output,
  });

  const lint = runPnpmScript('lint');
  steps.push({
    step: '4c. static governance control: lint (SCC-01/02, full governance scope)',
    status: lint.ok ? 'PASS' : 'FAIL',
    detail: lint.ok ? 'clean' : lint.output,
  });

  const controlMap = JSON.parse(readFileSync(path.join(ROOT, 'governance', 'control-implementation.json'), 'utf8')) as unknown;
  const completeness = checkControlMapCompleteness(controlMap);
  steps.push({
    step: '5. control-map completeness (SCC-01..27 + V01..18 present exactly once, valid states)',
    status: completeness.ok ? 'PASS' : 'FAIL',
    detail: completeness.ok ? 'complete' : completeness.failures.join('; '),
  });

  const packageJson = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as Record<string, unknown>;
  const pinCheck = checkDependencyPinsAreExact(packageJson);
  steps.push({
    step: '5b. dependency pin policy (no ^/~/latest ranges in package.json)',
    status: pinCheck.ok ? 'PASS' : 'FAIL',
    detail: pinCheck.ok ? 'all exact' : pinCheck.failures.join('; '),
  });

  let agentDocsDrift: { ok: boolean; detail: string };
  try {
    agentDocsDrift = checkAgentDocsDrift();
  } catch (err) {
    agentDocsDrift = { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
  steps.push({
    step: '6. generated agent-doc drift (governance/rules.json, .cursor/rules/afenda.mdc, AGENTS.md vs fresh regeneration)',
    status: agentDocsDrift.ok ? 'PASS' : 'FAIL',
    detail: agentDocsDrift.detail,
  });

  const selfTest = runNodeScript('scripts/check-authority-integrity.ts', ['--self-test']);
  steps.push({
    step: '7. red-fixture registration (authority self-test; full harness via `pnpm red`)',
    status: selfTest.ok ? 'PASS' : 'FAIL',
    detail: lastLine(selfTest.output),
  });

  return steps;
}

function lastLine(output: string): string {
  const lines = output.trim().split('\n');
  return lines[lines.length - 1] ?? '';
}

interface ControlStateSummary {
  implemented: number;
  partial: number;
  notYetBuilt: number;
  blocked: number;
  notApplicable: number;
}

function summarizeControlStates(controlMap: unknown): ControlStateSummary {
  const obj = controlMap as Record<string, unknown>;
  const all = [
    ...((obj['stack_controls'] ?? []) as Record<string, unknown>[]),
    ...((obj['doctrine_verification_controls'] ?? []) as Record<string, unknown>[]),
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

const controlMapRaw = JSON.parse(readFileSync(path.join(ROOT, 'governance', 'control-implementation.json'), 'utf8')) as unknown;
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
