#!/usr/bin/env node
// SCC-12: Only @hono/node-server and @hono/zod-openapi (plus required hono core)
// appear in authoritative API code; Hono RPC and alternate adapters are prohibited.
// Scans actual imports in apps/api/src — not package.json alone.

import ts from 'typescript';
import { readFileSync, globSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMainModule } from './lib/cli-main.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const ALLOWED_PACKAGE_PREFIXES = [
  'hono',
  '@hono/node-server',
  '@hono/zod-openapi',
  '@afenda/contracts',
  '@afenda/errors',
  'zod',
] as const;

const FORBIDDEN_EXACT = new Set([
  '@hono/zod-validator', // not the OpenAPI path
  'hono/client',
  '@hono/client',
  'express',
  'fastify',
  'next',
  // Domain/persistence must enter via @afenda/contracts only (SCC-12).
  '@afenda/db',
  '@afenda/time',
  '@afenda/money',
  'pg',
  'kysely',
]);

const FORBIDDEN_PREFIXES = [
  '@hono/cloudflare',
  '@hono/vercel',
  '@hono/aws',
  '@hono/netlify',
  '@hono/deno',
  '@hono/bun',
  'hono/jsx/dom', // RSC-adjacent; not our API path
];

export interface HonoApiPathViolation {
  readonly kind: 'forbidden-import' | 'sql-in-route' | 'pool-query';
  readonly filePath: string;
  readonly line: number;
  readonly snippet: string;
}

function lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function isAllowedSpecifier(spec: string): boolean {
  if (spec.startsWith('.') || spec.startsWith('/')) return true;
  if (FORBIDDEN_EXACT.has(spec)) return false;
  for (const p of FORBIDDEN_PREFIXES) {
    if (spec === p || spec.startsWith(`${p}/`) || spec.startsWith(`${p}-`)) return false;
  }
  for (const allowed of ALLOWED_PACKAGE_PREFIXES) {
    if (spec === allowed || spec.startsWith(`${allowed}/`)) return true;
  }
  // node: builtins ok
  if (spec.startsWith('node:')) return true;
  return false;
}

export function scanSourceForHonoApiPathViolations(sourceText: string, filePath: string): HonoApiPathViolation[] {
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.ES2024, true, ts.ScriptKind.TS);
  const violations: HonoApiPathViolation[] = [];

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text;
      if (!isAllowedSpecifier(spec)) {
        violations.push({
          kind: 'forbidden-import',
          filePath,
          line: lineOf(sourceFile, node),
          snippet: node.getText(sourceFile).slice(0, 120),
        });
      }
    }

    // SQL / persistence shortcuts in API source
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      if (
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === 'pool' &&
        node.expression.name.text === 'query'
      ) {
        violations.push({
          kind: 'pool-query',
          filePath,
          line: lineOf(sourceFile, node),
          snippet: node.getText(sourceFile).slice(0, 80),
        });
      }
    }

    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'sql') {
      violations.push({
        kind: 'sql-in-route',
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

export function checkHonoApiPath(
  globPatterns: string[] = ['apps/api/src/**/*.ts'],
): { ok: boolean; filesScanned: number; violations: HonoApiPathViolation[] } {
  const files = globPatterns.flatMap((pattern) => globSync(pattern, { cwd: ROOT })).sort();
  const violations: HonoApiPathViolation[] = [];
  for (const rel of files) {
    const normalized = rel.replace(/\\/g, '/');
    const text = readFileSync(path.join(ROOT, rel), 'utf8');
    violations.push(...scanSourceForHonoApiPathViolations(text, normalized));
  }
  return {
    ok: files.length > 0 && violations.length === 0,
    filesScanned: files.length,
    violations,
  };
}

if (isMainModule(import.meta.url, 'check-hono-api-path.ts')) {
  const report = checkHonoApiPath();
  console.log('\n=== AFENDA SCC-12 Hono runtime/contract path ===\n');
  console.log(`Files scanned: ${String(report.filesScanned)}`);
  if (report.filesScanned === 0) {
    console.log('FAIL: scanned 0 files (empty glob cannot PASS).');
  } else if (report.ok) {
    console.log('No violations: only sanctioned Hono Node + Zod/OpenAPI imports; no RPC/SQL shortcuts.');
  } else {
    console.log('VIOLATIONS:');
    for (const v of report.violations) {
      console.log(`  - [${v.kind}] ${v.filePath}:${String(v.line)} — ${v.snippet}`);
    }
  }
  process.exitCode = report.ok ? 0 : 1;
}
