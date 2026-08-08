#!/usr/bin/env node
// SCC-03 authoritative-money type-safety gate — scoped to
// packages/money/src and packages/contracts/src (the two authoritative
// money-JSON surfaces). packages/db type parsers and future API handlers are
// out of this gate's scope — see governance/control-implementation.json for
// the honest SCC-03 state.
//
// Uses the real TypeScript compiler API (ts.createSourceFile + AST
// traversal) rather than a grep/regex heuristic, so doc-comments that merely
// *mention* "Number(" or "parseFloat" (e.g. this package's own invariant
// documentation) are never mistaken for real offending code — only genuine
// AST node shapes are flagged.
//
// Detected, at minimum (phase brief §12; Phase 3B §11 extends this scope to
// packages/contracts/src and adds the numeric-Zod-schema/unary-coercion
// detectors below):
//   1. Bare `Number(...)` / `parseFloat(...)` / `parseInt(...)` calls, or a
//      unary `+value` numeric coercion, anywhere in the scanned surfaces (an
//      authoritative-money surface has no legitimate reason to convert
//      anything through a lossy float parser or unary coercion;
//      `Number.isSafeInteger(...)`-style static member calls are NOT
//      flagged — those are integer *checks*, not float conversions).
//   2. An object-literal property literally named `minorUnits` or `amount`
//      whose value is a numeric literal (`{ minorUnits: 12345 }`) — this is
//      exactly the "number serialization of MinorUnits" / "unsafe JSON
//      money shape" defect: canonical transport must be a string.
//   3. A type annotation of plain `number` on any parameter, variable, or
//      property whose name matches /amount|money|minorUnits/i — a
//      name-scoped (not global) check for "number-valued Money amount".
//   4. A Zod schema property literally named `minorUnits` or `amount` whose
//      value is (or is built from, e.g. `z.number().int()`) a `z.number()`
//      call — the authoritative-money analogue of (2) at the schema-authoring
//      level, scoped to the same money-named keys, never to `z.number()` in
//      general (ordinary non-authoritative numeric transport fields remain
//      unaffected).

import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { isMainModule } from './lib/cli-main.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

export type MoneySafetyViolationKind =
  | 'lossy-number-conversion'
  | 'unsafe-money-json-shape'
  | 'number-typed-money-field'
  | 'numeric-zod-money-schema';

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

/** `+value` — unary numeric coercion. Structurally distinct from `Number(value)` but an equally lossy path to a float. */
function isUnaryPlusCoercion(node: ts.Node): node is ts.PrefixUnaryExpression {
  return ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.PlusToken;
}

function propertyKeyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return undefined;
}

/**
 * Walks a call/member-access chain (e.g. `z.number().int().positive()`) down
 * to its root, looking for a `z.number` property access anywhere in the
 * chain. Only the shape of the expression is inspected — no type checker is
 * involved — so this is a structural, not semantic, detector; it is scoped to
 * money-named keys (see caller) specifically so it cannot misfire on an
 * ordinary `z.number()` used for a non-money field elsewhere.
 */
function isZodNumberSchemaExpression(node: ts.Node): boolean {
  let current: ts.Node = node;
  for (;;) {
    if (ts.isCallExpression(current)) {
      current = current.expression;
      continue;
    }
    if (ts.isPropertyAccessExpression(current)) {
      if (ts.isIdentifier(current.expression) && current.expression.text === 'z' && current.name.text === 'number') {
        return true;
      }
      current = current.expression;
      continue;
    }
    return false;
  }
}

export function scanSourceForMoneySafetyViolations(sourceText: string, filePath: string): MoneySafetyViolation[] {
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const violations: MoneySafetyViolation[] = [];

  function visit(node: ts.Node): void {
    if (isBareLossyConversionCall(node) || isUnaryPlusCoercion(node)) {
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
      if (keyName !== undefined && MONEY_JSON_KEY_PATTERN.test(keyName) && isZodNumberSchemaExpression(node.initializer)) {
        violations.push({
          kind: 'numeric-zod-money-schema',
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

const DEFAULT_GLOB_PATTERNS = ['packages/money/src/**/*.ts', 'packages/contracts/src/**/*.ts'];

export function checkMoneySafety(globPatterns: string[] = DEFAULT_GLOB_PATTERNS): { ok: boolean; violations: MoneySafetyViolation[]; filesScanned: number } {
  const files = globPatterns.flatMap((pattern) => globSync(pattern, { cwd: ROOT })).sort();
  const violations: MoneySafetyViolation[] = [];
  for (const relFile of files) {
    const text = readFileSync(path.join(ROOT, relFile), 'utf8');
    violations.push(...scanSourceForMoneySafetyViolations(text, relFile));
  }
  // Empty scan cannot PASS — a broken/renamed glob would otherwise greenwash SCC-03.
  return { ok: files.length > 0 && violations.length === 0, violations, filesScanned: files.length };
}

if (isMainModule(import.meta.url, 'check-money-safety.ts')) {
  const report = checkMoneySafety();
  console.log(
    '\n=== AFENDA SCC-03 authoritative-money safety gate (scoped to packages/money/src and packages/contracts/src; API money-JSON surfaces and packages/db parsers are out of this gate\'s scope) ===\n',
  );
  console.log(`Files scanned: ${String(report.filesScanned)} (${DEFAULT_GLOB_PATTERNS.join(', ')})`);
  if (report.filesScanned === 0) {
    console.log('FAIL: scanned 0 files (empty glob cannot PASS).');
  } else if (report.ok) {
    console.log('No violations found.');
  } else {
    console.log('VIOLATIONS:');
    for (const v of report.violations) {
      console.log(`  - [${v.kind}] ${v.filePath}:${String(v.line)} — ${v.snippet}`);
    }
  }
  process.exitCode = report.ok ? 0 : 1;
}
