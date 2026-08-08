#!/usr/bin/env node
// Deterministic generator. Inputs:
//   1. governance/authority-index.json (Zod-parsed at the boundary)
//   2. This file's embedded control-plane policy statements (authority_model,
//      current_layout, before_finishing, stack_adoption_status) — kept current
//      across phases as repository truth changes.
// Outputs:
//   governance/rules.json
//   .cursor/rules/afenda.mdc
//   AGENTS.md
// Never hand-edit the output files; edit this generator or authority-index.json
// and re-run `pnpm agent-docs`. Byte-stable: identical inputs always produce
// identical outputs.
//
// Layout paths are checked against the filesystem (every path exists; every
// packages/* directory appears in exactly one entry) so embedded layout truth
// cannot silently go stale the way an opaque digest can.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { z } from 'zod';
import { AUTHORITY_REGISTRY_SCHEMA_VERSION } from './lib/authority-parser.ts';
import { isMainModule } from './lib/cli-main.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/** Must match governance/authority-index.json schema_version. */
export const AUTHORITY_INDEX_SCHEMA_VERSION = AUTHORITY_REGISTRY_SCHEMA_VERSION;

/**
 * Boundary schema for the fields agent-docs actually consumes.
 * Unknown keys are retained (passthrough) but required fields cannot be missing
 * or empty — unlike `as AuthorityIndex`, which turns truncation into `undefined`
 * in the rendered precedence list.
 */
const AuthorityIndexDocumentSchema = z
  .object({
    id: z.string().min(1),
    canonical_path: z.string().min(1),
  })
  .passthrough();

const AuthorityIndexSchema = z
  .object({
    schema_version: z.number().int(),
    generated_by: z.string().min(1),
    documents: z.array(AuthorityIndexDocumentSchema).min(1),
  })
  .passthrough()
  .superRefine((value, ctx) => {
    if (value.schema_version !== AUTHORITY_INDEX_SCHEMA_VERSION) {
      ctx.addIssue({
        code: 'custom',
        message:
          `authority-index.json schema_version ${String(value.schema_version)} ` +
          `!== expected ${String(AUTHORITY_INDEX_SCHEMA_VERSION)}`,
        path: ['schema_version'],
      });
    }
  });

export type ParsedAuthorityIndex = z.infer<typeof AuthorityIndexSchema>;

export interface AgentLayoutEntry {
  /** One or more repo-relative paths sharing a role (dirs may end with `/`). */
  paths: string[];
  role: string;
}

export interface AgentRulesData {
  schema_version: number;
  generated_by: string;
  generated_from: string[];
  precedence: string[];
  authority_model: string[];
  current_layout: AgentLayoutEntry[];
  before_finishing: string;
  stack_adoption_status: string;
}

export function parseAuthorityIndex(raw: unknown): ParsedAuthorityIndex {
  return AuthorityIndexSchema.parse(raw);
}

export function loadAuthorityIndex(root: string = ROOT): ParsedAuthorityIndex {
  const raw: unknown = JSON.parse(readFileSync(path.join(root, 'governance', 'authority-index.json'), 'utf8'));
  return parseAuthorityIndex(raw);
}

function normalizeRepoPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/\/+$/, '');
}

function pathExistsAtRoot(root: string, repoPath: string): boolean {
  const normalized = normalizeRepoPath(repoPath);
  return existsSync(path.join(root, ...normalized.split('/')));
}

/**
 * Asserts current_layout describes the world: every listed path exists, and
 * every packages/* directory appears in exactly one entry (both directions).
 */
export function assertCurrentLayoutAgainstFilesystem(
  layout: readonly AgentLayoutEntry[],
  root: string = ROOT,
): void {
  const failures: string[] = [];
  const documentedPackageDirs = new Map<string, string>();

  for (const entry of layout) {
    if (entry.paths.length === 0) {
      failures.push(`layout entry has empty paths[] (role: ${entry.role})`);
      continue;
    }
    for (const repoPath of entry.paths) {
      if (!pathExistsAtRoot(root, repoPath)) {
        failures.push(`layout path does not exist on disk: ${repoPath}`);
      }
      const normalized = normalizeRepoPath(repoPath);
      const pkgMatch = /^packages\/([^/]+)$/.exec(normalized);
      if (pkgMatch?.[1] !== undefined) {
        const pkgName = pkgMatch[1];
        const prior = documentedPackageDirs.get(pkgName);
        if (prior !== undefined) {
          failures.push(`packages/${pkgName} appears in more than one layout entry (${prior} and ${entry.role})`);
        } else {
          documentedPackageDirs.set(pkgName, entry.role);
        }
      }
    }
  }

  const packagesRoot = path.join(root, 'packages');
  if (!existsSync(packagesRoot) || !statSync(packagesRoot).isDirectory()) {
    failures.push('packages/ directory is missing');
  } else {
    const onDisk = readdirSync(packagesRoot).filter((name) => {
      const full = path.join(packagesRoot, name);
      return statSync(full).isDirectory() && !name.startsWith('.');
    });
    for (const name of onDisk) {
      if (!documentedPackageDirs.has(name)) {
        failures.push(`packages/${name} exists on disk but is missing from current_layout`);
      }
    }
    for (const name of documentedPackageDirs.keys()) {
      if (!onDisk.includes(name)) {
        failures.push(`packages/${name} is in current_layout but missing on disk`);
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(`agent-docs current_layout failed filesystem assertion:\n  - ${failures.join('\n  - ')}`);
  }
}

export function buildAgentRulesData(authorityIndex: ParsedAuthorityIndex): AgentRulesData {
  const byId = new Map(authorityIndex.documents.map((d) => [d.id, d]));
  const doctrine = byId.get('doctrine');
  const stack = byId.get('stack');
  const position = byId.get('position');
  if (doctrine === undefined || stack === undefined || position === undefined) {
    throw new Error('authority-index.json is missing one of doctrine/stack/position entries');
  }

  return {
    schema_version: AUTHORITY_INDEX_SCHEMA_VERSION,
    generated_by: 'scripts/generate-agent-docs.ts',
    // Honest source set: the index plus this file's embedded policy/layout.
    generated_from: ['governance/authority-index.json', 'scripts/generate-agent-docs.ts'],
    precedence: [doctrine.canonical_path, stack.canonical_path, position.canonical_path],
    authority_model: [
      'Doctrine > Stack > Position. Doctrine governs what must be true; Stack governs the approved implementation shape subordinate to Doctrine; Position governs market claims and has no technical authority.',
      'Normative Markdown (doctrine/DOCTRINE.md, stack/STACK.md, position/POSITION.md) is canonical. Everything under governance/*.json is a generated, deterministic projection and is never independently authored authority.',
      'gist fields inside the generated registries are non-normative summaries. Never treat a gist as a substitute for rule_verbatim when deciding correctness.',
      // Prose policy until a red fixture proves otherwise: registry drift blocks
      // hand-edits to generated evidence_status, but phase reports can still overclaim.
      'Evidence state is not rule state. A doctrine rule can be rule_status: active while its evidence_status is historical-orphaned, specified, or otherwise short of proven. Do not upgrade evidence_status to make a report look better.',
      // Partially mechanical: control-map requires implemented ⇒ non-null gate + non-empty evidence;
      // gate summary never counts not-yet-built as PASS. Semantic honesty of "implemented" remains a judgment.
      'NOT-YET-BUILT is not PASS. A control with no executable check must be reported as not-yet-built, partial, or blocked — never silently marked implemented or folded into an overall green.',
      'The Stack (stack/STACK.md) is architecturally approved but not yet adopted. Adoption is a separate, explicit event gated by stack/STACK_ADOPTION.md being satisfied item-by-item with mechanical evidence, not by the existence of files.',
      'No agent may edit doctrine/DOCTRINE.md, stack/STACK.md, position/POSITION.md, their .sha256 seals, or the generated governance/*.json registries in order to make a check pass. Fix the implementation; never fix the authority.',
      'An authority conflict (Stack contradicting Doctrine, Position attempting to override Doctrine/Stack) requires an explicit governance decision and must be reported, not resolved by assumption.',
    ],
    current_layout: [
      { paths: ['doctrine/'], role: 'Normative doctrine authority (highest precedence).' },
      { paths: ['stack/'], role: 'Normative stack/implementation authority, subordinate to doctrine.' },
      { paths: ['position/'], role: 'Normative market-claim authority; not technical authority.' },
      { paths: ['governance/'], role: 'Generated JSON projections, integrity/control-plane reports, and archived history. Never hand-authored authority.' },
      {
        paths: ['scripts/'],
        role: 'Deterministic build/check/gate tooling, written in strict TypeScript and executed directly by Node (no build step). scripts/lib/ holds shared parsing logic used by both build and check scripts.',
      },
      {
        paths: ['packages/errors', 'packages/time', 'packages/money'],
        role: 'Phase 3A application kernel: canonical Result/error vocabulary, explicit temporal primitives (Instant/CivilDate/AsOf/Clock), and exact bigint-based money primitives (CurrencyCode/MinorUnits/Money/Rate/rounding). See governance/PHASE_3A_KERNEL_REPORT.md.',
      },
      {
        paths: ['packages/contracts'],
        role: 'Phase 3B external transport boundary: Zod 4 (exact pin 4.4.3) wire schemas and exact serialize/parse contracts for Money, Instant, CivilDate, AsOf and public-safe Result/Failure shapes. Depends on errors/time/money only; no Hono/API/OpenAPI dependency. See governance/PHASE_3B_CONTRACTS_REPORT.md.',
      },
      {
        paths: ['packages/db', 'db/migrations/'],
        role: 'Phase 3C persistence boundary: node-postgres pool/single-client transactions, exact type parsers (incl. forbidden OID 790 money), checksummed forward-only migrations bootstrapping role topology, dual-major Testcontainers PostgreSQL 18+17 integration lane via `pnpm gate:db-integration` (not folded into `pnpm gate`; Kysely codegen from PG18 only). Depends on `@afenda/errors` only until domain decode helpers exist. No ledger/business schema yet. See governance/PHASE_3C_DB_REPORT.md.',
      },
      {
        paths: ['apps/api'],
        role: 'Phase 3D thin Hono HTTP adapter (`@hono/node-server` + `@hono/zod-openapi`) over `@afenda/contracts`. Production `GET /health` plus labeled `/_afenda/verify/*` reference routes for Money/time HTTP evidence. No frontend, identity, worker, ledger, or packages/db coupling. See governance/PHASE_3D_API_REPORT.md.',
      },
      {
        paths: [
          'package.json',
          'tsconfig.json',
          'tsconfig.base.json',
          'pnpm-workspace.yaml',
          '.node-version',
          'turbo.json',
          'docker-compose.yml',
        ],
        role: 'Repository/tooling control-plane shell; Turborepo package tasks across errors/time/money/contracts/db/api; digest-pinned local Postgres 18/17 compose profile for development only.',
      },
    ],
    before_finishing:
      'Run `pnpm gate`. If it fails, fix the code — never the gate, the test, the seals, or the canonical authority documents. A failing or NOT-YET-BUILT gate is information; report it and stop.',
    stack_adoption_status:
      'architecturally approved; not yet adopted (stack/STACK_ADOPTION.md is intentionally unchecked pending mechanical evidence)',
  };
}

function renderMarkdownBody(data: AgentRulesData): string {
  const lines: string[] = [];
  lines.push('# AFENDA rules');
  lines.push('');
  lines.push(
    'AFENDA is a vibe-code-first ERP under construction. This repository currently holds the sealed authority layer, its governance/tooling control plane, a first application kernel (packages/errors, packages/time, packages/money), a first external transport boundary (packages/contracts), a first persistence boundary (packages/db + db/migrations), and a thin Hono HTTP adapter (apps/api) over contracts; no frontend, jobs, identity, ledger, or other business-module code exists yet.',
  );
  lines.push('');
  lines.push('## Precedence');
  lines.push('');
  data.precedence.forEach((p, i) => lines.push(`${i + 1}. \`${p}\``));
  lines.push('');
  lines.push('## Authority model');
  lines.push('');
  for (const stmt of data.authority_model) lines.push(`- ${stmt}`);
  lines.push('');
  lines.push('## Current repository layout');
  lines.push('');
  lines.push('| Path | Role |');
  lines.push('| --- | --- |');
  for (const entry of data.current_layout) {
    const pathCell = entry.paths.map((p) => `\`${p}\``).join(', ');
    lines.push(`| ${pathCell} | ${entry.role} |`);
  }
  lines.push('');
  lines.push('## Stack adoption status');
  lines.push('');
  lines.push(data.stack_adoption_status);
  lines.push('');
  lines.push('## Before finishing');
  lines.push('');
  lines.push(data.before_finishing);
  lines.push('');
  return lines.join('\n');
}

/** Single renderer for Cursor rule and AGENTS.md (same body + banner today). */
export function renderGenerated(data: AgentRulesData): string {
  const banner = [
    '<!-- GENERATED FILE - DO NOT EDIT -->',
    `<!-- Sources: ${data.generated_from.join(' + ')} | Regenerate: pnpm agent-docs -->`,
    '<!-- A hand edit here will fail the AGENT-DOCS-DRIFT gate. -->',
    '',
  ].join('\n');
  return banner + renderMarkdownBody(data);
}

export interface GeneratedAgentDocs {
  rulesJson: string;
  cursorRule: string;
  agentsMd: string;
}

/** Pure computation from already-built data — shared by writer and drift checker. */
export function renderAgentDocsFromData(data: AgentRulesData): GeneratedAgentDocs {
  const rendered = renderGenerated(data);
  return {
    rulesJson: `${JSON.stringify(data, null, 2)}\n`,
    cursorRule: rendered,
    agentsMd: rendered,
  };
}

/** Pure computation, no filesystem writes — used by the drift checker in scripts/gate.ts. */
export function renderAgentDocs(authorityIndex: ParsedAuthorityIndex): GeneratedAgentDocs {
  return renderAgentDocsFromData(buildAgentRulesData(authorityIndex));
}

export function generate(root: string = ROOT): { rulesJsonPath: string; cursorRulePath: string; agentsMdPath: string } {
  const authorityIndex = loadAuthorityIndex(root);
  const data = buildAgentRulesData(authorityIndex);
  assertCurrentLayoutAgainstFilesystem(data.current_layout, root);
  const docs = renderAgentDocsFromData(data);

  const rulesJsonPath = path.join(root, 'governance', 'rules.json');
  const cursorRulePath = path.join(root, '.cursor', 'rules', 'afenda.mdc');
  const agentsMdPath = path.join(root, 'AGENTS.md');

  mkdirSync(path.dirname(rulesJsonPath), { recursive: true });
  mkdirSync(path.dirname(cursorRulePath), { recursive: true });
  writeFileSync(rulesJsonPath, docs.rulesJson, 'utf8');
  writeFileSync(cursorRulePath, docs.cursorRule, 'utf8');
  writeFileSync(agentsMdPath, docs.agentsMd, 'utf8');

  return { rulesJsonPath, cursorRulePath, agentsMdPath };
}

if (isMainModule(import.meta.url, 'generate-agent-docs.ts')) {
  const written = generate();
  console.log('Generated agent-facing governance docs:');
  console.log(`  ${path.relative(ROOT, written.rulesJsonPath)}`);
  console.log(`  ${path.relative(ROOT, written.cursorRulePath)}`);
  console.log(`  ${path.relative(ROOT, written.agentsMdPath)}`);
}
