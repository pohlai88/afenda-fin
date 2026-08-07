#!/usr/bin/env node
// Deterministic generator. Reads governance/authority-index.json and a small set of
// fixed Phase 2 control-plane policy statements, then writes:
//   governance/rules.json        (generated data projection)
//   .cursor/rules/afenda.mdc     (Cursor-facing rule, generated from rules.json)
//   AGENTS.md                    (generic agent-facing instructions, same source)
// Never hand-edit the two output files; edit this generator or its inputs and re-run
// `pnpm agent-docs`. Byte-stable: identical inputs always produce identical outputs.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * @typedef {{
 *   id: string,
 *   canonical_path: string,
 *   document_role: string,
 *   precedence: number,
 *   adoption_status_verbatim: Record<string, unknown>
 * }} AuthorityDocSummary
 */

/**
 * @typedef {{
 *   schema_version: number,
 *   generated_by: string,
 *   generated_from: string[],
 *   precedence: string[],
 *   authority_model: string[],
 *   current_layout: { path: string, role: string }[],
 *   before_finishing: string,
 *   stack_adoption_status: string
 * }} AgentRulesData
 */

/**
 * @param {string} p
 * @returns {unknown}
 */
function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

/**
 * @param {{ documents: AuthorityDocSummary[] }} authorityIndex
 * @returns {AgentRulesData}
 */
export function buildAgentRulesData(authorityIndex) {
  const byId = new Map(authorityIndex.documents.map((d) => [d.id, d]));
  const doctrine = byId.get('doctrine');
  const stack = byId.get('stack');
  const position = byId.get('position');
  if (!doctrine || !stack || !position) {
    throw new Error('authority-index.json is missing one of doctrine/stack/position entries');
  }

  return {
    schema_version: 1,
    generated_by: 'scripts/generate-agent-docs.mjs',
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
      { path: 'scripts/', role: 'Deterministic build/check/gate tooling. scripts/lib/ holds shared parsing logic used by both build and check scripts.' },
      { path: 'package.json, tsconfig*.json, pnpm-workspace.yaml, .node-version, turbo.json', role: 'Repository/tooling control-plane shell established in Phase 2. No apps/ or packages/ application code exists yet; see stack/STACK.md §8 for the target architecture at adoption.' },
    ],
    before_finishing: 'Run `pnpm gate`. If it fails, fix the code — never the gate, the test, the seals, or the canonical authority documents. A failing or NOT-YET-BUILT gate is information; report it and stop.',
    stack_adoption_status: 'architecturally approved; not yet adopted (stack/STACK_ADOPTION.md is intentionally unchecked pending mechanical evidence)',
  };
}

/**
 * @param {AgentRulesData} data
 * @returns {string}
 */
function renderMarkdownBody(data) {
  const lines = [];
  lines.push('# AFENDA rules');
  lines.push('');
  lines.push(
    'AFENDA is a vibe-code-first ERP under construction. This repository currently holds the sealed authority layer and its governance/tooling control plane; no application code exists yet.',
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

/**
 * @param {AgentRulesData} data
 * @returns {string}
 */
function renderCursorRule(data) {
  const banner = [
    '<!-- GENERATED FILE - DO NOT EDIT -->',
    `<!-- Source: governance/rules.json | Regenerate: pnpm agent-docs -->`,
    '<!-- A hand edit here will fail the AGENT-DOCS-DRIFT gate. -->',
    '',
  ].join('\n');
  return banner + renderMarkdownBody(data);
}

/**
 * @param {AgentRulesData} data
 * @returns {string}
 */
function renderAgentsMd(data) {
  const banner = [
    '<!-- GENERATED FILE - DO NOT EDIT -->',
    '<!-- Source: governance/rules.json | Regenerate: pnpm agent-docs -->',
    '<!-- A hand edit here will fail the AGENT-DOCS-DRIFT gate. -->',
    '',
  ].join('\n');
  return banner + renderMarkdownBody(data);
}

export function generate() {
  const authorityIndex = /** @type {{ documents: AuthorityDocSummary[] }} */ (
    readJson(path.join(ROOT, 'governance', 'authority-index.json'))
  );
  const data = buildAgentRulesData(authorityIndex);

  const rulesJsonPath = path.join(ROOT, 'governance', 'rules.json');
  const cursorRulePath = path.join(ROOT, '.cursor', 'rules', 'afenda.mdc');
  const agentsMdPath = path.join(ROOT, 'AGENTS.md');

  writeFileSync(rulesJsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  mkdirSync(path.dirname(cursorRulePath), { recursive: true });
  writeFileSync(cursorRulePath, renderCursorRule(data), 'utf8');
  writeFileSync(agentsMdPath, renderAgentsMd(data), 'utf8');

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
