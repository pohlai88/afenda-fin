#!/usr/bin/env node
// Compile-time negative-fixture harness (phase brief §6: "add compile-time
// negative fixtures", "each invalid fixture must fail for the intended
// reason").
//
// Every *.ts file directly under tests/type-invalid/ (except the leading
// underscore `_control-valid.ts`) is a fixture that MUST fail to compile under
// the real repository tsconfig chain, for a specific, named reason recorded in
// its own leading `// EXPECT_ERROR: <substring>` comment. `_control-valid.ts`
// is the opposite control: it MUST compile with zero diagnostics, so a broken
// tsconfig (which would make everything fail, for the wrong reason) cannot be
// mistaken for real fixture evidence.
//
// This runs the REAL `tsc --noEmit` command (not a mock/parsed-AST
// re-implementation of type checking) against tests/type-invalid/tsconfig.json,
// which itself extends the same tsconfig.base.json every package uses.

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TYPE_INVALID_DIR = path.join(ROOT, 'tests', 'type-invalid');
const CONTROL_FILE = '_control-valid.ts';

export interface FixtureExpectation {
  fileName: string;
  expectedSubstring: string;
}

export interface TypeInvalidReport {
  ok: boolean;
  failures: string[];
  fixtureCount: number;
}

function readExpectation(fileName: string): FixtureExpectation {
  const contents = readFileSync(path.join(TYPE_INVALID_DIR, fileName), 'utf8');
  const firstLine = contents.split('\n')[0] ?? '';
  const marker = '// EXPECT_ERROR:';
  if (!firstLine.startsWith(marker)) {
    throw new Error(`${fileName}: missing leading "${marker}" comment on line 1`);
  }
  return { fileName, expectedSubstring: firstLine.slice(marker.length).trim() };
}

function listFixtureFileNames(): string[] {
  return readdirSync(TYPE_INVALID_DIR)
    .filter((name) => name.endsWith('.ts'))
    .filter((name) => name !== CONTROL_FILE)
    .sort();
}

/** Runs the real `tsc --noEmit` compilation and returns its full stdout+stderr text, regardless of exit code. */
function runTypeInvalidCompilation(): { exitCode: number; output: string } {
  try {
    const output = execFileSync(
      'pnpm',
      ['exec', 'tsc', '--noEmit', '-p', path.join('tests', 'type-invalid', 'tsconfig.json'), '--pretty', 'false'],
      { encoding: 'utf8', cwd: ROOT, shell: true },
    );
    return { exitCode: 0, output };
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return { exitCode: e.status ?? 1, output: (e.stdout ?? '') + (e.stderr ?? '') };
  }
}

/** Diagnostic lines are of the form `path/to/file.ts(line,col): error TSxxxx: message`. */
function diagnosticLinesForFile(output: string, fileName: string): string[] {
  return output.split('\n').filter((line) => {
    const idx = line.indexOf('(');
    if (idx === -1) return false;
    const filePart = line.slice(0, idx).trim();
    return filePart.endsWith(fileName);
  });
}

export function checkTypeInvalidFixtures(): TypeInvalidReport {
  const failures: string[] = [];
  const fixtureFileNames = listFixtureFileNames();
  const expectations = fixtureFileNames.map(readExpectation);

  const { exitCode, output } = runTypeInvalidCompilation();

  if (exitCode === 0) {
    failures.push('tsc exited 0 (success) over tests/type-invalid, but fixtures exist that must fail to compile');
  }

  const controlDiagnostics = diagnosticLinesForFile(output, CONTROL_FILE);
  if (controlDiagnostics.length > 0) {
    failures.push(
      `${CONTROL_FILE} (the must-always-compile control) produced ${String(controlDiagnostics.length)} diagnostic(s): ${controlDiagnostics.join(' | ')}`,
    );
  }

  for (const expectation of expectations) {
    const diagnostics = diagnosticLinesForFile(output, expectation.fileName);
    if (diagnostics.length === 0) {
      failures.push(`${expectation.fileName}: expected at least one compiler diagnostic, got none`);
      continue;
    }
    const matched = diagnostics.some((line) => line.includes(expectation.expectedSubstring));
    if (!matched) {
      failures.push(
        `${expectation.fileName}: none of its diagnostics contained the expected substring ${JSON.stringify(expectation.expectedSubstring)}. Diagnostics: ${diagnostics.join(' | ')}`,
      );
    }
  }

  return { ok: failures.length === 0, failures, fixtureCount: expectations.length };
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href;
if (invokedDirectly || process.argv[1]?.endsWith('check-type-invalid.ts')) {
  const report = checkTypeInvalidFixtures();
  console.log(`\n=== AFENDA compile-time negative fixtures (tests/type-invalid) ===\n`);
  console.log(`Fixtures checked: ${String(report.fixtureCount)}`);
  if (report.ok) {
    console.log('All fixtures failed to compile for their declared reason; the control fixture compiled cleanly.');
  } else {
    console.log('FAILURES:');
    for (const f of report.failures) console.log(`  - ${f}`);
  }
  process.exitCode = report.ok ? 0 : 1;
}
