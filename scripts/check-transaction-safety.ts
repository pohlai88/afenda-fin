#!/usr/bin/env node
// SCC-08 static helper: detect `pool.query(...)` misuse in packages/db/src.
// The sanctioned path is withTransaction + client.query on a checked-out client.

import ts from 'typescript';
import { readFileSync, globSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMainModule } from './lib/cli-main.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

export interface TransactionSafetyViolation {
  readonly filePath: string;
  readonly line: number;
  readonly snippet: string;
}

export interface TransactionSafetyReport {
  readonly ok: boolean;
  readonly filesScanned: number;
  readonly violations: TransactionSafetyViolation[];
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
): TransactionSafetyReport {
  const files = globPatterns.flatMap((pattern) => globSync(pattern, { cwd: ROOT })).sort();
  const violations: TransactionSafetyViolation[] = [];
  for (const relFile of files) {
    const normalizedRelFile = relFile.replace(/\\/g, '/');
    const absFile = path.join(ROOT, relFile);
    const sourceText = readFileSync(absFile, 'utf8');
    violations.push(...scanSourceForTransactionSafetyViolations(sourceText, normalizedRelFile));
  }
  // Empty scan cannot PASS — a broken/renamed glob would otherwise greenwash SCC-08.
  return {
    ok: files.length > 0 && violations.length === 0,
    filesScanned: files.length,
    violations,
  };
}

function main(): void {
  const report = checkTransactionSafety();
  if (report.filesScanned === 0) {
    console.error('SCC-08 transaction-safety: FAIL (scanned 0 files; empty glob cannot PASS)');
    process.exit(1);
  }
  if (report.violations.length > 0) {
    console.error('SCC-08 transaction-safety violations:');
    for (const v of report.violations) {
      console.error(`  ${v.filePath}:${String(v.line)}: ${v.snippet}`);
    }
    process.exit(1);
  }
  console.log(`SCC-08 transaction-safety: PASS (0 pool.query call sites in ${String(report.filesScanned)} files under packages/db/src)`);
}

if (isMainModule(import.meta.url, 'check-transaction-safety.ts')) {
  main();
}
