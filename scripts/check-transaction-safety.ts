#!/usr/bin/env node
// SCC-08 static helper: detect `pool.query(...)` misuse in packages/db/src.
// The sanctioned path is withTransaction + client.query on a checked-out client.

import ts from 'typescript';
import { readFileSync, globSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

export interface TransactionSafetyViolation {
  readonly filePath: string;
  readonly line: number;
  readonly snippet: string;
}

function lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

export function scanSourceForTransactionSafetyViolations(sourceText: string, filePath: string): TransactionSafetyViolation[] {
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.ES2024, true, ts.ScriptKind.TS);
  const violations: TransactionSafetyViolation[] = [];

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'query' &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'pool'
    ) {
      violations.push({
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

export function checkTransactionSafety(
  globPatterns: string[] = ['packages/db/src/**/*.ts'],
): TransactionSafetyViolation[] {
  const files = globPatterns.flatMap((pattern) => globSync(pattern, { cwd: ROOT })).sort();
  const violations: TransactionSafetyViolation[] = [];
  for (const relFile of files) {
    const normalizedRelFile = relFile.replace(/\\/g, '/');
    const absFile = path.join(ROOT, relFile);
    const sourceText = readFileSync(absFile, 'utf8');
    violations.push(...scanSourceForTransactionSafetyViolations(sourceText, normalizedRelFile));
  }
  return violations;
}

function main(): void {
  const violations = checkTransactionSafety();
  if (violations.length > 0) {
    console.error('SCC-08 transaction-safety violations:');
    for (const v of violations) {
      console.error(`  ${v.filePath}:${v.line}: ${v.snippet}`);
    }
    process.exit(1);
  }
  console.log('SCC-08 transaction-safety: PASS (0 pool.query call sites in packages/db/src)');
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main();
}
