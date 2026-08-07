#!/usr/bin/env node
// SCC-03 authoritative-money type-safety gate — scoped to packages/money/src
// (the only authoritative money surface that exists in this phase; no
// contracts/API package exists yet, so this cannot be full SCC-03 coverage —
// see governance/control-implementation.json for the honest PARTIAL state).
//
// Uses the real TypeScript compiler API (ts.createSourceFile + AST
// traversal) rather than a grep/regex heuristic, so doc-comments that merely
// *mention* "Number(" or "parseFloat" (e.g. this package's own invariant
// documentation) are never mistaken for real offending code — only genuine
// AST node shapes are flagged.
//
// Detected, at minimum (phase brief §12):
//   1. Bare `Number(...)` / `parseFloat(...)` / `parseInt(...)` calls
//      anywhere in packages/money/src (an authoritative-money package has no
//      legitimate reason to convert anything through a lossy float parser;
//      `Number.isSafeInteger(...)`-style static member calls are NOT
//      flagged — those are integer *checks*, not float conversions).
//   2. An object-literal property literally named `minorUnits` or `amount`
//      whose value is a numeric literal (`{ minorUnits: 12345 }`) — this is
//      exactly the "number serialization of MinorUnits" / "unsafe JSON
//      money shape" defect: canonical transport must be a string.
//   3. A type annotation of plain `number` on any parameter, variable, or
//      property whose name matches /amount|money|minorUnits/i — a
//      name-scoped (not global) check for "number-valued Money amount".

import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

export type MoneySafetyViolationKind = 'lossy-number-conversion' | 'unsafe-money-json-shape' | 'number-typed-money-field';

export interface MoneySafetyViolation {
  kind: MoneySafetyViolationKind;
  filePath: string;
  line: number;
  snippet: string;
}

const LOSSY_CONVERSION_NAMES = new Set(['Number', 'parseFloat', 'parseInt']);
const MONEY_NAME_PATTERN = /amount|money|minorunits/i;
const MONEY_JSON_KEY_PATTERN = /^(minorUnits|amount)$/;

function lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function isBareLossyConversionCall(node: ts.Node): node is ts.CallExpression {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && LOSSY_CONVERSION_NAMES.has(node.expression.text);
}

function propertyKeyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return undefined;
}

export function scanSourceForMoneySafetyViolations(sourceText: string, filePath: string): MoneySafetyViolation[] {
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const violations: MoneySafetyViolation[] = [];

  function visit(node: ts.Node): void {
    if (isBareLossyConversionCall(node)) {
      violations.push({
        kind: 'lossy-number-conversion',
        filePath,
        line: lineOf(sourceFile, node),
        snippet: node.getText(sourceFile).slice(0, 80),
      });
    }

    if (ts.isPropertyAssignment(node)) {
      const keyName = propertyKeyName(node.name);
      if (keyName !== undefined && MONEY_JSON_KEY_PATTERN.test(keyName) && ts.isNumericLiteral(node.initializer)) {
        violations.push({
          kind: 'unsafe-money-json-shape',
          filePath,
          line: lineOf(sourceFile, node),
          snippet: node.getText(sourceFile).slice(0, 80),
        });
      }
    }

    if ((ts.isParameter(node) || ts.isVariableDeclaration(node) || ts.isPropertySignature(node) || ts.isPropertyDeclaration(node)) && node.type?.kind === ts.SyntaxKind.NumberKeyword) {
      const name = ts.isIdentifier(node.name) ? node.name.text : undefined;
      if (name !== undefined && MONEY_NAME_PATTERN.test(name)) {
        violations.push({
          kind: 'number-typed-money-field',
          filePath,
          line: lineOf(sourceFile, node),
          snippet: node.getText(sourceFile).slice(0, 80),
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

export function checkMoneySafety(globPattern = 'packages/money/src/**/*.ts'): { ok: boolean; violations: MoneySafetyViolation[]; filesScanned: number } {
  const files = globSync(globPattern, { cwd: ROOT }).sort();
  const violations: MoneySafetyViolation[] = [];
  for (const relFile of files) {
    const text = readFileSync(path.join(ROOT, relFile), 'utf8');
    violations.push(...scanSourceForMoneySafetyViolations(text, relFile));
  }
  return { ok: violations.length === 0, violations, filesScanned: files.length };
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href;
if (invokedDirectly || process.argv[1]?.endsWith('check-money-safety.ts')) {
  const report = checkMoneySafety();
  console.log('\n=== AFENDA SCC-03 authoritative-money safety gate (PARTIAL: scoped to packages/money/src; no contracts/API exist yet) ===\n');
  console.log(`Files scanned: ${String(report.filesScanned)} (packages/money/src/**/*.ts)`);
  if (report.ok) {
    console.log('No violations found.');
  } else {
    console.log('VIOLATIONS:');
    for (const v of report.violations) {
      console.log(`  - [${v.kind}] ${v.filePath}:${String(v.line)} — ${v.snippet}`);
    }
  }
  process.exitCode = report.ok ? 0 : 1;
}
