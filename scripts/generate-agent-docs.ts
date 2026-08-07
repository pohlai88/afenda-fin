#!/usr/bin/env node
// Deterministic generator. Reads governance/authority-index.json and a small set of
// fixed control-plane policy statements (kept current across phases as repository
// truth changes — see governance/PHASE_3A_KERNEL_REPORT.md for the latest), then writes:
//   governance/rules.json        (generated data projection)
//   .cursor/rules/afenda.mdc     (Cursor-facing rule, generated from rules.json)
//   AGENTS.md                    (generic agent-facing instructions, same source)
// Never hand-edit the two output files; edit this generator or its inputs and re-run
// `pnpm agent-docs`. Byte-stable: identical inputs always produce identical outputs.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import type { AuthorityIndex } from './lib/authority-parser.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

export interface AgentLayoutEntry {
  path: string;
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

function readJson(p: string): unknown {
  return JSON.parse(readFileSync(p, 'utf8'));
}

export function buildAgentRulesData(authorityIndex: AuthorityIndex): AgentRulesData {
  const byId = new Map(authorityIndex.documents.map((d) => [d.id, d]));
  const doctrine = byId.get('doctrine');
  const stack = byId.get('stack');
  const position = byId.get('position');
  if (!doctrine || !stack || !position) {
    throw new Error('authority-index.json is missing one of doctrine/stack/position entries');
  }

  return {
    schema_version: 1,
    generated_by: 'scripts/generate-agent-docs.ts',
    generated_from: ['governance/authority-index.json'],
    precedence: [doctrine.canonical_path, stack.canonical_path, position.canonical_path],
    authority_model: [
      'Doctrine > Stack > Position. Doctrine governs what must be true; Stack governs the approved implementation shape subordinate to Doctrine; Position governs market claims and has no technical authority.',
      'Normative Markdown (doctrine/DOCTRINE.md, stack/STACK.md, position/POSITION.md) is canonical. Everything under governance/*.json is a generated, deterministic projection and is never independently authored authority.',
      'gist fields inside the generated registries are non-normative summaries. Never treat a gist as a substitute for rule_verbatim when deciding correctness.',
      'Evidence state is not rule state. A doctrine rule can be rule_status: active while its evidence_status is historical-orphaned, specified, or otherwise short of proven. Do not upgrade evidence_status to make a report look better.',
      'NOT-YET-BUILT is not PASS. A control with no executable check must be reported as not-yet-built, partial, or blocked — never silently marked implemented or folded into an overall green.',
      'The Stack (stack/STACK.md) is architecturally approved but not yet adopted. Adoption is a separate, explicit event gated by stack/STACK_ADOPTION.md being satisfied item-by-item with mechanical evidence, not by the existence of files.',
      'No agent may edit doctrine/DOCTRINE.md, stack/STACK.md, position/POSITION.md, their .sha256 seals, or the generated governance/*.json registries in order to make a check pass. Fix the implementation; never fix the authority.',
      'An authority conflict (Stack contradicting Doctrine, Position attempting to override Doctrine/Stack) requires an explicit governance decision and must be reported, not resolved by assumption.',
    ],
    current_layout: [
      { path: 'doctrine/', role: 'Normative doctrine authority (highest precedence).' },
      { path: 'stack/', role: 'Normative stack/implementation authority, subordinate to doctrine.' },
      { path: 'position/', role: 'Normative market-claim authority; not technical authority.' },
      { path: 'governance/', role: 'Generated JSON projections, integrity/control-plane reports, and archived history. Never hand-authored authority.' },
      { path: 'scripts/', role: 'Deterministic build/check/gate tooling, written in strict TypeScript and executed directly by Node (no build step). scripts/lib/ holds shared parsing logic used by both build and check scripts.' },
      { path: 'packages/errors, packages/time, packages/money', role: 'Phase 3A application kernel: canonical Result/error vocabulary, explicit temporal primitives (Instant/CivilDate/AsOf/Clock), and exact bigint-based money primitives (CurrencyCode/MinorUnits/Money/Rate/rounding). No apps/, database, API, or business-module code exists yet; see governance/PHASE_3A_KERNEL_REPORT.md for full evidence and stack/STACK.md §8 for the target architecture at adoption.' },
      { path: 'package.json, tsconfig*.json, pnpm-workspace.yaml, .node-version, turbo.json', role: 'Repository/tooling control-plane shell established in Phase 2/2.1/2.2 and populated with real Turborepo package tasks in Phase 3A.' },
    ],
    before_finishing: 'Run `pnpm gate`. If it fails, fix the code — never the gate, the test, the seals, or the canonical authority documents. A failing or NOT-YET-BUILT gate is information; report it and stop.',
    stack_adoption_status: 'architecturally approved; not yet adopted (stack/STACK_ADOPTION.md is intentionally unchecked pending mechanical evidence)',
  };
}

function renderMarkdownBody(data: AgentRulesData): string {
  const lines: string[] = [];
  lines.push('# AFENDA rules');
  lines.push('');
  lines.push(
    'AFENDA is a vibe-code-first ERP under construction. This repository currently holds the sealed authority layer, its governance/tooling control plane, and a first application kernel (packages/errors, packages/time, packages/money); no API, frontend, database, jobs, identity, ledger, or other business-module code exists yet.',
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
  for (const entry of data.current_layout) lines.push(`| \`${entry.path}\` | ${entry.role} |`);
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

function renderCursorRule(data: AgentRulesData): string {
  const banner = [
    '<!-- GENERATED FILE - DO NOT EDIT -->',
    `<!-- Source: governance/rules.json | Regenerate: pnpm agent-docs -->`,
    '<!-- A hand edit here will fail the AGENT-DOCS-DRIFT gate. -->',
    '',
  ].join('\n');
  return banner + renderMarkdownBody(data);
}

function renderAgentsMd(data: AgentRulesData): string {
  const banner = [
    '<!-- GENERATED FILE - DO NOT EDIT -->',
    '<!-- Source: governance/rules.json | Regenerate: pnpm agent-docs -->',
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

/** Pure computation, no filesystem writes — used by the drift checker in scripts/gate.ts. */
export function renderAgentDocs(authorityIndex: AuthorityIndex): GeneratedAgentDocs {
  const data = buildAgentRulesData(authorityIndex);
  return {
    rulesJson: `${JSON.stringify(data, null, 2)}\n`,
    cursorRule: renderCursorRule(data),
    agentsMd: renderAgentsMd(data),
  };
}

export function generate(): { rulesJsonPath: string; cursorRulePath: string; agentsMdPath: string } {
  const authorityIndex = readJson(path.join(ROOT, 'governance', 'authority-index.json')) as AuthorityIndex;
  const docs = renderAgentDocs(authorityIndex);

  const rulesJsonPath = path.join(ROOT, 'governance', 'rules.json');
  const cursorRulePath = path.join(ROOT, '.cursor', 'rules', 'afenda.mdc');
  const agentsMdPath = path.join(ROOT, 'AGENTS.md');

  writeFileSync(rulesJsonPath, docs.rulesJson, 'utf8');
  mkdirSync(path.dirname(cursorRulePath), { recursive: true });
  writeFileSync(cursorRulePath, docs.cursorRule, 'utf8');
  writeFileSync(agentsMdPath, docs.agentsMd, 'utf8');

  return { rulesJsonPath, cursorRulePath, agentsMdPath };
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const written = generate();
  console.log('Generated agent-facing governance docs:');
  console.log(`  ${path.relative(ROOT, written.rulesJsonPath)}`);
  console.log(`  ${path.relative(ROOT, written.cursorRulePath)}`);
  console.log(`  ${path.relative(ROOT, written.agentsMdPath)}`);
}
