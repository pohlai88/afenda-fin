#!/usr/bin/env node
// SCC-24 application architecture control — PARTIAL by design (phase brief §11:
// "If the control only detects a subset: mark SCC-24 partial").
//
// Scope: packages/*/src/**/*.ts — the actual AFENDA application kernel source
// that exists in this phase. Uses the real TypeScript compiler API
// (ts.createSourceFile + AST traversal), never a regex/grep heuristic, so a
// detected violation is a genuine syntactic fact about the source, not a
// string-match coincidence (e.g. the word "Reflect" inside a comment or
// string literal is never flagged; only real `Reflect.*` expressions are).
//
// Detected subset (each backed by a real AST node kind):
//   1. Decorator-driven DI            -> any `ts.isDecorator` node.
//   2. Class-based domain inheritance -> any `class X extends Y` heritage
//                                         clause (packages/* are function/
//                                         value-object only; doctrine forbids
//                                         class-based domain modelling here).
//   3. Runtime module discovery       -> `Reflect.*` property access, dynamic
//                                         `import(<non-string-literal>)`, or
//                                         any `require(...)` call (packages
//                                         are ESM; a bare `require` call is
//                                         itself already anomalous).
//   4. Ambient authoritative time     -> `Date.now()` or zero-argument
//                                         `new Date()` anywhere in
//                                         packages/*/src, EXCEPT the one
//                                         explicitly named, allow-listed
//                                         adapter packages/time/src/system-clock.ts
//                                         (TIM-03/TIM-04, Forbidden #13).
//                                         `new Date(<explicit value>)` used as
//                                         pure calendar-math on an
//                                         already-known field value (as
//                                         packages/time/src/instant.ts does)
//                                         is NOT ambient and is NOT flagged —
//                                         only the zero-argument, "give me
//                                         the current moment" form is.
//
// NOT detected (left honestly out of scope, hence "partial" not
// "implemented"): service-locator pattern (no single reliable AST shape),
// implicit transaction abstractions (no concrete syntactic signature yet
// exists to detect against).

import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const AMBIENT_CLOCK_ALLOWLISTED_PATH = 'packages/time/src/system-clock.ts';

export type ArchitectureViolationKind =
  | 'decorator-driven-di'
  | 'class-based-domain-inheritance'
  | 'runtime-module-discovery'
  | 'ambient-authoritative-time';

export interface ArchitectureViolation {
  kind: ArchitectureViolationKind;
  filePath: string;
  line: number;
  snippet: string;
}

const BUILTIN_EXTENDS_ALLOWLIST = new Set(['Error', 'TypeError', 'RangeError', 'SyntaxError']);

function lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function isNonLiteralDynamicImport(node: ts.Node): node is ts.CallExpression {
  if (!ts.isCallExpression(node) || node.expression.kind !== ts.SyntaxKind.ImportKeyword) return false;
  const firstArg = node.arguments[0];
  return firstArg !== undefined && !ts.isStringLiteralLike(firstArg);
}

function isRequireCall(node: ts.Node): node is ts.CallExpression {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require';
}

function isReflectAccess(node: ts.Node): boolean {
  return ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Reflect';
}

function isDateNowCall(node: ts.Node): boolean {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'Date' &&
    node.expression.name.text === 'now'
  );
}

/** Only the zero-argument form is ambient; `new Date(explicitValue)` is deterministic calendar math, not authoritative "now". */
function isZeroArgumentNewDate(node: ts.Node): boolean {
  return ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Date' && (node.arguments === undefined || node.arguments.length === 0);
}

export function scanSourceForArchitectureViolations(sourceText: string, filePath: string, allowAmbientClock = false): ArchitectureViolation[] {
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const violations: ArchitectureViolation[] = [];

  function visit(node: ts.Node): void {
    if (ts.isDecorator(node)) {
      violations.push({
        kind: 'decorator-driven-di',
        filePath,
        line: lineOf(sourceFile, node),
        snippet: node.getText(sourceFile).slice(0, 80),
      });
    }

    if (ts.isClassDeclaration(node) && node.heritageClauses) {
      for (const clause of node.heritageClauses) {
        if (clause.token !== ts.SyntaxKind.ExtendsKeyword) continue;
        for (const type of clause.types) {
          const baseName = type.expression.getText(sourceFile);
          if (!BUILTIN_EXTENDS_ALLOWLIST.has(baseName)) {
            violations.push({
              kind: 'class-based-domain-inheritance',
              filePath,
              line: lineOf(sourceFile, clause),
              snippet: `class ${node.name?.getText(sourceFile) ?? '<anonymous>'} extends ${baseName}`,
            });
          }
        }
      }
    }

    if (isReflectAccess(node) || isNonLiteralDynamicImport(node) || isRequireCall(node)) {
      violations.push({
        kind: 'runtime-module-discovery',
        filePath,
        line: lineOf(sourceFile, node),
        snippet: node.getText(sourceFile).slice(0, 80),
      });
    }

    if (!allowAmbientClock && (isDateNowCall(node) || isZeroArgumentNewDate(node))) {
      violations.push({
        kind: 'ambient-authoritative-time',
        filePath,
        line: lineOf(sourceFile, node),
        snippet: node.getText(sourceFile).slice(0, 80),
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

export function checkApplicationArchitecture(globPattern = 'packages/*/src/**/*.ts'): { ok: boolean; violations: ArchitectureViolation[]; filesScanned: number } {
  const files = globSync(globPattern, { cwd: ROOT }).sort();
  const violations: ArchitectureViolation[] = [];
  for (const relFile of files) {
    const normalizedRelFile = relFile.replace(/\\/g, '/');
    const absFile = path.join(ROOT, relFile);
    const text = readFileSync(absFile, 'utf8');
    const allowAmbientClock = normalizedRelFile === AMBIENT_CLOCK_ALLOWLISTED_PATH;
    violations.push(...scanSourceForArchitectureViolations(text, normalizedRelFile, allowAmbientClock));
  }
  return { ok: violations.length === 0, violations, filesScanned: files.length };
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href;
if (invokedDirectly || process.argv[1]?.endsWith('check-architecture.ts')) {
  const report = checkApplicationArchitecture();
  console.log('\n=== AFENDA SCC-24 application architecture control (PARTIAL: decorators, class-inheritance, module-discovery, ambient-clock subset) ===\n');
  console.log(`Files scanned: ${String(report.filesScanned)} (packages/*/src/**/*.ts)`);
  if (report.ok) {
    console.log('No violations of the detected subset found.');
  } else {
    console.log('VIOLATIONS:');
    for (const v of report.violations) {
      console.log(`  - [${v.kind}] ${v.filePath}:${String(v.line)} — ${v.snippet}`);
    }
  }
  process.exitCode = report.ok ? 0 : 1;
}
