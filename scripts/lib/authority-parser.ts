// Shared deterministic parser/registry-builder for the AFENDA authority layer.
//
// Both scripts/build-authority-registry.ts (writer) and
// scripts/check-authority-integrity.ts (read-only verifier) import this
// module so the two can never drift apart: the checker always compares
// committed JSON against a *fresh call* to the exact same buildRegistries()
// function the writer uses.
//
// This module never rewrites, summarizes, or "improves" normative wording.
// It only slices verbatim source text and derives small non-normative helper
// fields (gist, sha256, line anchors, status labels).

import { createHash } from 'node:crypto';

/** Schema version written into every generated governance/*.json registry. */
export const AUTHORITY_REGISTRY_SCHEMA_VERSION = 1;

export function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export function lineOf(fullText: string, index: number): number | null {
  if (index < 0) return null;
  return fullText.slice(0, index).split('\n').length;
}

function mustIndexOf(text: string, needle: string, label: string): number {
  const idx = text.indexOf(needle);
  if (idx === -1) {
    throw new Error(`Deterministic parser anchor not found (${label}): ${JSON.stringify(needle)}`);
  }
  return idx;
}

function sliceBetween(text: string, startAnchor: string, endAnchor: string | null, label: string): string {
  const startIdx = mustIndexOf(text, startAnchor, `${label}:start`);
  const from = startIdx + startAnchor.length;
  if (endAnchor === null) return text.slice(from);
  const endIdx = text.indexOf(endAnchor, from);
  if (endIdx === -1) {
    throw new Error(`Deterministic parser end-anchor not found (${label}:end): ${JSON.stringify(endAnchor)}`);
  }
  return text.slice(from, endIdx);
}

function splitRow(line: string): string[] {
  let l = line.trim();
  if (l.startsWith('|')) l = l.slice(1);
  if (l.endsWith('|')) l = l.slice(0, -1);
  return l.split('|').map((c) => c.trim());
}

export function stripBold(s: string): string {
  return s.replace(/\*\*/g, '').trim();
}

export function stripInlineCode(s: string): string {
  return s.replace(/`/g, '').trim();
}

function parseTableAt(text: string, anchorText: string, label: string): Record<string, string>[] {
  const anchorIdx = mustIndexOf(text, anchorText, label);
  const after = text.slice(anchorIdx);
  const lines = after.split('\n');
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line !== undefined && line.trim().startsWith('|')) {
      start = i;
      break;
    }
  }
  if (start === -1) throw new Error(`No table located after anchor (${label})`);
  let end = start;
  while (end < lines.length) {
    const line = lines[end];
    if (line === undefined || !line.trim().startsWith('|')) break;
    end++;
  }
  const tableLines = lines.slice(start, end);
  const headerLine = tableLines[0];
  if (headerLine === undefined) throw new Error(`Empty table after anchor (${label})`);
  const header = splitRow(headerLine);
  const rows = tableLines.slice(2).map(splitRow);
  return rows.map((cols) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => {
      obj[h] = (cols[i] ?? '').trim();
    });
    return obj;
  });
}

interface NumberedListItem {
  number: number;
  text: string;
}

function findNumberedList(text: string, anchorText: string, endAnchorText: string, label: string): NumberedListItem[] {
  const region = sliceBetween(text, anchorText, endAnchorText, label);
  const items: NumberedListItem[] = [];
  const re = /^(\d{1,2})\.\s+(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(region))) {
    const num = m[1];
    const body = m[2];
    if (num === undefined || body === undefined) continue;
    items.push({ number: Number(num), text: body.trim() });
  }
  return items;
}

function findBulletList(text: string, anchorText: string, endAnchorText: string, label: string): string[] {
  const region = sliceBetween(text, anchorText, endAnchorText, label);
  const items: string[] = [];
  const re = /^-\s+(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(region))) {
    const body = m[1];
    if (body === undefined) continue;
    items.push(body.trim());
  }
  return items;
}

// Deterministic, offline, non-normative gist. Never used as an authority
// input; derives one-directionally from the verbatim text supplied to it.
export function gistify(rawText: string | null, maxLen = 140): string {
  if (!rawText) return '';
  const plain = rawText.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
  const firstSentenceMatch = plain.match(/^[^.!?]*[.!?]/);
  const firstSentence = firstSentenceMatch ? firstSentenceMatch[0] : plain;
  const dropWords = new Set(['a', 'an', 'the', 'shall', 'should', 'that']);
  const words = firstSentence
    .split(/\s+/)
    .filter((w) => !dropWords.has(w.toLowerCase().replace(/[.,;:]+$/, '')));
  let s = words.join(' ').trim();
  if (s.length > maxLen) s = `${s.slice(0, maxLen - 1).trim()}\u2026`;
  return s;
}

export function classifyEvidenceStatus(gradeRaw: string | null): string {
  const g = (gradeRaw || '').toUpperCase();
  if (g.startsWith('RED')) return 'red';
  if (g.includes('-R')) return 'reported-unverified';
  if (g.includes('PARTIAL')) return 'partial';
  if (g.startsWith('E')) return 'specified';
  return 'unclassified';
}

// ---------------------------------------------------------------------------
// DOCTRINE.md parsing
// ---------------------------------------------------------------------------

export interface AuthorityClass {
  marker: string;
  meaning: string;
  change_threshold: string;
}

export interface EvidenceGradeRow {
  grade: string;
  name: string;
  meaning: string;
}

export interface EvidenceGradeModifier {
  token: string;
  name: string;
  meaning: string;
}

export interface HistoricalOrphanRef {
  red_id: string;
  finding: string;
}

export interface DoctrineRule {
  id: string;
  section: string | null;
  title: string;
  authority: string;
  rule_verbatim: string | null;
  gist: string;
  source_basis: string[];
  required_method: string | null;
  red_test: string | null;
  qualification_evidence: string | null;
  declared_evidence_grade: string;
  rule_status: string;
  evidence_status: string;
  historical_orphan_refs: HistoricalOrphanRef[];
  source_anchor: string;
  source_document_sha256: string;
  rule_text_sha256: string;
}

export interface VerificationControl {
  id: string;
  title: string;
  primary_rules: string[];
  must_prove: string;
  required_red_condition: string;
}

export interface GateCadenceRow {
  gate: string;
  contents: string;
  trigger: string;
}

export interface ForbiddenItem {
  number: number;
  text: string;
}

export interface HistoricalOrphanFinding {
  red_id: string;
  mapped_rules: string[];
  finding: string;
  required_proof_of_closure: string;
}

export interface DoctrineParsed {
  authorityClasses: AuthorityClass[];
  evidenceGradeRows: EvidenceGradeRow[];
  modifiers: EvidenceGradeModifier[];
  rules: DoctrineRule[];
  verificationControls: VerificationControl[];
  gateCadence: GateCadenceRow[];
  historicalOrphanFindings: HistoricalOrphanFinding[];
  forbidden: ForbiddenItem[];
  extensionKinds: string[];
}

interface LabeledFieldSpec {
  key: string;
  marker: string;
}

function extractLabeledFields(block: string, labelOrder: LabeledFieldSpec[], stopAnchors: RegExp[]): Record<string, string | null> {
  const positions = labelOrder.map(({ key, marker }) => ({ key, marker, idx: block.indexOf(marker) }));
  const result: Record<string, string | null> = {};
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    if (pos === undefined) continue;
    const { key, marker, idx } = pos;
    if (idx === -1) {
      result[key] = null;
      continue;
    }
    const start = idx + marker.length;
    let end = block.length;
    for (let j = i + 1; j < positions.length; j++) {
      const next = positions[j];
      if (next !== undefined && next.idx !== -1) {
        end = next.idx;
        break;
      }
    }
    let value = block.slice(start, end);
    for (const stopAnchor of stopAnchors) {
      const parts = value.split(stopAnchor);
      const first = parts[0];
      if (first !== undefined) value = first;
    }
    result[key] = value.trim();
  }
  return result;
}

export function parseDoctrine(text: string, sha: string): DoctrineParsed {
  const authorityClasses = parseTableAt(text, '| Marker | Meaning | Change threshold |', 'doctrine:authority-classes').map(
    (r): AuthorityClass => ({
      marker: stripInlineCode(r['Marker'] ?? ''),
      meaning: r['Meaning'] ?? '',
      change_threshold: r['Change threshold'] ?? '',
    }),
  );

  const evidenceGradeRows = parseTableAt(text, '| Grade | Name | What it means |', 'doctrine:evidence-grades').map(
    (r): EvidenceGradeRow => ({
      grade: stripBold(r['Grade'] ?? ''),
      name: r['Name'] ?? '',
      meaning: r['What it means'] ?? '',
    }),
  );
  const modifiers = findBulletList(text, 'Modifiers:', 'Only **E6** may be described as **battle-proven**.', 'doctrine:modifiers').map(
    (line): EvidenceGradeModifier => {
      const m = line.match(/^\*\*(`[^`]+`)\s*([^:]*):\*\*\s*(.+)$/) || line.match(/^\*\*(`[^`]+`):\*\*\s*(.+)$/);
      if (m && m.length === 4 && m[1] !== undefined && m[2] !== undefined && m[3] !== undefined) {
        return { token: stripInlineCode(m[1]), name: m[2].trim(), meaning: m[3].trim() };
      }
      if (m && m.length === 3 && m[1] !== undefined && m[2] !== undefined) {
        return { token: stripInlineCode(m[1]), name: '', meaning: m[2].trim() };
      }
      return { token: '', name: '', meaning: stripBold(line) };
    },
  );

  const rulesRegionStart = mustIndexOf(text, '# THE RULES', 'doctrine:rules-region-start');
  const rulesRegionEnd = mustIndexOf(text, '# 14. Minimum executable verification spine', 'doctrine:rules-region-end');
  const rulesRegion = text.slice(rulesRegionStart, rulesRegionEnd);
  const regionOffset = rulesRegionStart;

  const sectionHeadingRe = /^# (\d+)\. (.+)$/gm;
  const sectionHeadings: { index: number; number: string; title: string }[] = [];
  let sm: RegExpExecArray | null;
  while ((sm = sectionHeadingRe.exec(rulesRegion))) {
    const number = sm[1];
    const title = sm[2];
    if (number === undefined || title === undefined) continue;
    sectionHeadings.push({ index: sm.index, number, title: title.trim() });
  }
  function sectionTitleFor(idx: number): string | null {
    let current: { index: number; number: string; title: string } | null = null;
    for (const h of sectionHeadings) {
      if (h.index <= idx) current = h;
      else break;
    }
    return current ? `${current.number}. ${current.title}` : null;
  }

  const ruleHeaderRe = /^### ([A-Z]{3}-\d{2}) \u2014 (.+?)\s*`([^`]+)`\s*$/gm;
  const headers: { id: string; title: string; authority: string; index: number; end: number }[] = [];
  let hm: RegExpExecArray | null;
  while ((hm = ruleHeaderRe.exec(rulesRegion))) {
    const id = hm[1];
    const title = hm[2];
    const authority = hm[3];
    if (id === undefined || title === undefined || authority === undefined) continue;
    headers.push({ id, title: title.trim(), authority: authority.trim(), index: hm.index, end: hm.index + hm[0].length });
  }

  const labelOrder: LabeledFieldSpec[] = [
    { key: 'rule_verbatim', marker: '**Rule.**' },
    { key: 'why_justified', marker: '**Why this method is justified.**' },
    { key: 'required_method', marker: '**Required implementation.**' },
    { key: 'red_test', marker: '**Required turn-red evidence.**' },
    { key: 'qualification_evidence', marker: '**Qualification evidence.**' },
    { key: 'declared_evidence_grade_raw', marker: '**Current AFENDA evidence grade.**' },
    { key: 'source_basis_raw', marker: '**Source basis.**' },
  ];
  const stopAnchors = [/\n---/, /\n# \d+\./];

  const rules: DoctrineRule[] = headers.map((h, i) => {
    const blockStart = h.end;
    const next = headers[i + 1];
    const blockEnd = next !== undefined ? next.index : rulesRegion.length;
    const block = rulesRegion.slice(blockStart, blockEnd);
    const fields = extractLabeledFields(block, labelOrder, stopAnchors);

    const declaredGrade = stripBold(fields['declared_evidence_grade_raw'] || '');
    const sourceBasisRaw = fields['source_basis_raw'] || '';
    const sourceBasis = [...sourceBasisRaw.matchAll(/\[S(\d+)\]/g)].map((m) => `S${m[1] ?? ''}`);
    const absoluteIndex = regionOffset + h.index;
    const ruleVerbatim = fields['rule_verbatim'] ?? null;

    return {
      id: h.id,
      section: sectionTitleFor(h.index),
      title: h.title,
      authority: h.authority,
      rule_verbatim: ruleVerbatim,
      gist: gistify(ruleVerbatim),
      source_basis: sourceBasis,
      required_method: fields['required_method'] ?? null,
      red_test: fields['red_test'] ?? null,
      qualification_evidence: fields['qualification_evidence'] ?? null,
      declared_evidence_grade: declaredGrade,
      rule_status: 'active',
      evidence_status: classifyEvidenceStatus(declaredGrade),
      historical_orphan_refs: [],
      source_anchor: `doctrine/DOCTRINE.md:${String(lineOf(text, absoluteIndex))}`,
      source_document_sha256: sha,
      rule_text_sha256: sha256(ruleVerbatim || ''),
    };
  });

  const vRows = parseTableAt(text, '| Control | Primary rules | Must prove | Required red condition |', 'doctrine:v-controls');
  const verificationControls: VerificationControl[] = vRows.map((r) => {
    const controlCell = stripBold(r['Control'] ?? '');
    const idMatch = controlCell.match(/^(V\d{2})\s+(.+)$/);
    return {
      id: idMatch && idMatch[1] !== undefined ? idMatch[1] : controlCell,
      title: idMatch && idMatch[2] !== undefined ? idMatch[2] : '',
      primary_rules: (r['Primary rules'] ?? '').split(',').map((s) => s.trim()).filter(Boolean),
      must_prove: r['Must prove'] ?? '',
      required_red_condition: r['Required red condition'] ?? '',
    };
  });

  const gateRows = parseTableAt(text, '| Gate | Contents | Trigger |', 'doctrine:gate-cadence');
  const gateCadence: GateCadenceRow[] = gateRows.map((r) => ({
    gate: stripBold(r['Gate'] ?? ''),
    contents: r['Contents'] ?? '',
    trigger: r['Trigger'] ?? '',
  }));

  const redRows = parseTableAt(
    text,
    '| Red ID | Mapped rules | Finding | Required proof of closure |',
    'doctrine:red-findings',
  );
  const historicalOrphanFindings: HistoricalOrphanFinding[] = redRows.map((r) => ({
    red_id: stripBold(r['Red ID'] ?? ''),
    mapped_rules: (r['Mapped rules'] ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    finding: r['Finding'] ?? '',
    required_proof_of_closure: r['Required proof of closure'] ?? '',
  }));

  for (const finding of historicalOrphanFindings) {
    for (const ruleId of finding.mapped_rules) {
      const rule = rules.find((r) => r.id === ruleId);
      if (!rule) continue;
      rule.evidence_status = 'historical-orphaned';
      rule.historical_orphan_refs.push({ red_id: finding.red_id, finding: finding.finding });
    }
  }

  const forbiddenItems = findNumberedList(text, '# 16. The Forbidden', '# 17. Ratification', 'doctrine:forbidden');
  const forbidden: ForbiddenItem[] = forbiddenItems.map((item) => ({ number: item.number, text: item.text }));

  // EXT-02 extension-kind taxonomy, extracted independently for cross-document
  // consistency checking against POSITION.md §4.
  const ext02 = rules.find((r) => r.id === 'EXT-02');
  const extKindsSource = ext02 ? `${ext02.rule_verbatim ?? ''} ${ext02.required_method ?? ''}` : '';
  const extKindsMatch = extKindsSource.match(/Default kinds:\s*([^.]+)\./);
  const extensionKinds = extKindsMatch && extKindsMatch[1] !== undefined
    ? extKindsMatch[1].split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : [];

  return {
    authorityClasses,
    evidenceGradeRows,
    modifiers,
    rules,
    verificationControls,
    gateCadence,
    historicalOrphanFindings,
    forbidden,
    extensionKinds,
  };
}

// ---------------------------------------------------------------------------
// STACK.md parsing
// ---------------------------------------------------------------------------

export interface StackSelection {
  id: string;
  title: string;
  authority: string;
  vibe_grade: string;
  current_evidence: string;
  source_basis: string[];
  executable_controls: string[];
  decision_verbatim: string | null;
  gist: string;
  agent_case: string | null;
  engineering_case: string | null;
  binding_constraints: string | null;
  revisit_trigger: string | null;
  source_anchor: string;
  source_document_sha256: string;
  rule_text_sha256: string;
}

export interface StackControl {
  id: string;
  name: string;
  applies_to: string[];
  required_outcome: string;
}

export interface StackRejection {
  rejected_option: string;
  reason: string;
}

export interface EscapeHatch {
  id: string;
  title: string;
  text_verbatim: string;
  gist: string;
}

export interface ArchitectureConstraints {
  repository_tree: string | null;
  application_flow: string | null;
}

export interface StackGateCadenceRow {
  gate: string;
  required_contents: string;
  trigger: string;
}

export interface StackParsed {
  selections: StackSelection[];
  controls: StackControl[];
  explicitRejections: StackRejection[];
  escapeHatches: EscapeHatch[];
  architectureConstraints: ArchitectureConstraints;
  gateCadence: StackGateCadenceRow[];
  versionPolicies: string[];
}

export function parseStack(text: string, sha: string): StackParsed {
  const selRegionStart = mustIndexOf(text, '## 4. Detailed selection records', 'stack:sel-region-start');
  const selRegionEnd = mustIndexOf(text, '## 5. Explicit rejections', 'stack:sel-region-end');
  const selRegion = text.slice(selRegionStart, selRegionEnd);
  const selOffset = selRegionStart;

  const selHeaderRe = /^### (SEL-\d{2}) \u2014 (.+?)\s*`([^`]+)`\s*$/gm;
  const headers: { id: string; title: string; authority: string; index: number; end: number }[] = [];
  let hm: RegExpExecArray | null;
  while ((hm = selHeaderRe.exec(selRegion))) {
    const id = hm[1];
    const title = hm[2];
    const authority = hm[3];
    if (id === undefined || title === undefined || authority === undefined) continue;
    headers.push({ id, title: title.trim(), authority: authority.trim(), index: hm.index, end: hm.index + hm[0].length });
  }

  const labelOrder: LabeledFieldSpec[] = [
    { key: 'vibe_grade', marker: '**Vibe grade:**' },
    { key: 'current_evidence', marker: '**Current evidence:**' },
    { key: 'source_basis_raw', marker: '**Source basis:**' },
    { key: 'executable_controls_raw', marker: '**Executable controls:**' },
    { key: 'decision_verbatim', marker: '**Decision.**' },
    { key: 'agent_case', marker: '**Agent case.**' },
    { key: 'engineering_case', marker: '**Engineering case.**' },
    { key: 'binding_constraints', marker: '**Binding constraints.**' },
    { key: 'revisit_trigger', marker: '**Revisit trigger.**' },
  ];
  const stopAnchors = [/\n---/, /\n## \d+\./];

  const selections: StackSelection[] = headers.map((h, i) => {
    const blockStart = h.end;
    const next = headers[i + 1];
    const blockEnd = next !== undefined ? next.index : selRegion.length;
    const block = selRegion.slice(blockStart, blockEnd);
    const fields = extractLabeledFields(block, labelOrder, stopAnchors);
    const absoluteIndex = selOffset + h.index;
    const decisionVerbatim = fields['decision_verbatim'] ?? null;

    return {
      id: h.id,
      title: h.title,
      authority: h.authority,
      vibe_grade: stripBold(fields['vibe_grade'] || ''),
      current_evidence: stripBold(fields['current_evidence'] || ''),
      source_basis: (fields['source_basis_raw'] || '').split(',').map((s) => s.trim()).filter(Boolean),
      executable_controls: (fields['executable_controls_raw'] || '').split(',').map((s) => s.trim()).filter(Boolean),
      decision_verbatim: decisionVerbatim,
      gist: gistify(decisionVerbatim),
      agent_case: fields['agent_case'] ?? null,
      engineering_case: fields['engineering_case'] ?? null,
      binding_constraints: fields['binding_constraints'] ?? null,
      revisit_trigger: fields['revisit_trigger'] ?? null,
      source_anchor: `stack/STACK.md:${String(lineOf(text, absoluteIndex))}`,
      source_document_sha256: sha,
      rule_text_sha256: sha256(decisionVerbatim || ''),
    };
  });

  const controlRows = parseTableAt(text, '| Control | Name | Applies to | Required outcome |', 'stack:controls');
  const controls: StackControl[] = controlRows.map((r) => ({
    id: stripBold(r['Control'] ?? ''),
    name: r['Name'] ?? '',
    applies_to: (r['Applies to'] ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    required_outcome: r['Required outcome'] ?? '',
  }));

  const rejectionRows = parseTableAt(text, '| Rejected option | Reason |', 'stack:rejections');
  const explicitRejections: StackRejection[] = rejectionRows.map((r) => ({
    rejected_option: stripBold(r['Rejected option'] ?? ''),
    reason: r['Reason'] ?? '',
  }));

  const escRegionStart = mustIndexOf(text, '## 6. Escape hatches', 'stack:esc-region-start');
  const escRegionEnd = mustIndexOf(text, '## 7. Executable selection controls', 'stack:esc-region-end');
  const escRegion = text.slice(escRegionStart, escRegionEnd);
  const escHeaderRe = /^### (ESC-\d{2}) \u2014 (.+)$/gm;
  const escHeaders: { id: string; title: string; index: number; end: number }[] = [];
  let em: RegExpExecArray | null;
  while ((em = escHeaderRe.exec(escRegion))) {
    const id = em[1];
    const title = em[2];
    if (id === undefined || title === undefined) continue;
    escHeaders.push({ id, title: title.trim(), index: em.index, end: em.index + em[0].length });
  }
  const escapeHatches: EscapeHatch[] = escHeaders.map((h, i) => {
    const blockStart = h.end;
    const next = escHeaders[i + 1];
    const blockEnd = next !== undefined ? next.index : escRegion.length;
    const bodyParts = escRegion.slice(blockStart, blockEnd).split(/\n---/);
    const body = (bodyParts[0] ?? '').trim();
    return { id: h.id, title: h.title, text_verbatim: body, gist: gistify(body) };
  });

  const archRegionStart = mustIndexOf(text, '## 8. Required repository architecture', 'stack:arch-start');
  const archRegionEnd = mustIndexOf(text, '## 9. Required gates', 'stack:arch-end');
  const archRegion = text.slice(archRegionStart, archRegionEnd);
  const fencedBlocks = [...archRegion.matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1] ?? '');
  const architectureConstraints: ArchitectureConstraints = {
    repository_tree: fencedBlocks[0] ?? null,
    application_flow: fencedBlocks[1] ?? null,
  };

  const stackGateRows = parseTableAt(text, '| Gate | Required contents | Trigger |', 'stack:gate-cadence');
  const gateCadence: StackGateCadenceRow[] = stackGateRows.map((r) => ({
    gate: stripBold(r['Gate'] ?? ''),
    required_contents: r['Required contents'] ?? '',
    trigger: r['Trigger'] ?? '',
  }));

  const versionPolicies = findBulletList(
    text,
    '## 10. Version and pinning policy',
    '## 11. Current evidence ledger',
    'stack:version-policy',
  );

  return { selections, controls, explicitRejections, escapeHatches, architectureConstraints, gateCadence, versionPolicies };
}

// ---------------------------------------------------------------------------
// POSITION.md parsing
// ---------------------------------------------------------------------------

export interface PositionObligation {
  id: string;
  title: string;
  text_verbatim: string;
  gist: string;
  source_anchor: string;
  source_document_sha256: string;
  rule_text_sha256: string;
}

export interface CompatibilityResultClass {
  result: string;
  meaning: string;
  upgrade_treatment: string;
}

export interface EvidenceLadderGrade {
  grade: string;
  required_evidence: string;
  permitted_public_wording: string;
}

export interface CurrentGradeItem {
  item: string;
  grade: string;
}

export interface PermittedClaimWording {
  grade: string;
  permitted_public_wording: string;
}

export interface ApprovedMessagingItem {
  id: string;
  title: string;
  text_verbatim: string;
}

export interface FalsifierMetric {
  metric: string;
  target: string;
}

export interface PositionParsed {
  obligations: PositionObligation[];
  compatibilityResultClasses: CompatibilityResultClass[];
  evidenceLadderGrades: EvidenceLadderGrade[];
  currentGradeAtAdoption: CurrentGradeItem[];
  permittedClaimWording: PermittedClaimWording[];
  approvedMessaging: ApprovedMessagingItem[];
  prohibitedItems: string[];
  falsifierMetrics: FalsifierMetric[];
  falsifierSteps: string[];
  revisitTriggers: string[];
  adoptedItems: string[];
  pendingDecisionItems: string[];
  extensionKinds: string[];
}

export function parsePosition(text: string, sha: string): PositionParsed {
  const posRegionStart = mustIndexOf(text, '## 5. Product obligations created by the position', 'position:pos-start');
  const posRegionEnd = mustIndexOf(
    text,
    '## 6. Proving the claim before the market can prove it for us',
    'position:pos-end',
  );
  const posRegion = text.slice(posRegionStart, posRegionEnd);
  const posOffset = posRegionStart;
  const posHeaderRe = /^### (POS-\d{2}) \u2014 (.+)$/gm;
  const posHeaders: { id: string; title: string; index: number; end: number }[] = [];
  let pm: RegExpExecArray | null;
  while ((pm = posHeaderRe.exec(posRegion))) {
    const id = pm[1];
    const title = pm[2];
    if (id === undefined || title === undefined) continue;
    posHeaders.push({ id, title: title.trim(), index: pm.index, end: pm.index + pm[0].length });
  }
  const obligations: PositionObligation[] = posHeaders.map((h, i) => {
    const blockStart = h.end;
    const next = posHeaders[i + 1];
    const blockEnd = next !== undefined ? next.index : posRegion.length;
    const bodyParts = posRegion.slice(blockStart, blockEnd).split(/\n---/);
    const body = (bodyParts[0] ?? '').trim();
    const absoluteIndex = posOffset + h.index;
    return {
      id: h.id,
      title: h.title,
      text_verbatim: body,
      gist: gistify(body),
      source_anchor: `position/POSITION.md:${String(lineOf(text, absoluteIndex))}`,
      source_document_sha256: sha,
      rule_text_sha256: sha256(body),
    };
  });

  const resultClassRows = parseTableAt(text, '| Result | Meaning | Upgrade treatment |', 'position:result-classes');
  const compatibilityResultClasses: CompatibilityResultClass[] = resultClassRows.map((r) => ({
    result: stripBold(r['Result'] ?? ''),
    meaning: r['Meaning'] ?? '',
    upgrade_treatment: r['Upgrade treatment'] ?? '',
  }));

  const ladderRows = parseTableAt(
    text,
    '| Grade | Required evidence | Permitted public wording |',
    'position:evidence-ladder',
  );
  const evidenceLadderGrades: EvidenceLadderGrade[] = ladderRows.map((r) => ({
    grade: stripBold(r['Grade'] ?? ''),
    required_evidence: r['Required evidence'] ?? '',
    permitted_public_wording: stripBold(r['Permitted public wording'] ?? ''),
  }));
  const currentGradeRows = parseTableAt(text, '| Item | Grade |', 'position:current-grade');
  const currentGradeAtAdoption: CurrentGradeItem[] = currentGradeRows.map((r) => ({
    item: r['Item'] ?? '',
    grade: stripBold(r['Grade'] ?? ''),
  }));

  const permittedClaimWording: PermittedClaimWording[] = evidenceLadderGrades.map((g) => ({
    grade: g.grade,
    permitted_public_wording: g.permitted_public_wording,
  }));

  const messagingRegionStart = mustIndexOf(text, '## 13. Approved messaging', 'position:messaging-start');
  const messagingRegionEnd = mustIndexOf(text, '## 14. Revisit triggers', 'position:messaging-end');
  const messagingRegion = text.slice(messagingRegionStart, messagingRegionEnd);
  const messagingHeaderRe = /^### (13\.\d) (.+)$/gm;
  const messagingHeaders: { id: string; title: string; index: number; end: number }[] = [];
  let mm: RegExpExecArray | null;
  while ((mm = messagingHeaderRe.exec(messagingRegion))) {
    const id = mm[1];
    const title = mm[2];
    if (id === undefined || title === undefined) continue;
    messagingHeaders.push({ id, title: title.trim(), index: mm.index, end: mm.index + mm[0].length });
  }
  const approvedMessaging: ApprovedMessagingItem[] = messagingHeaders.map((h, i) => {
    const blockStart = h.end;
    const next = messagingHeaders[i + 1];
    const blockEnd = next !== undefined ? next.index : messagingRegion.length;
    const body = messagingRegion.slice(blockStart, blockEnd).trim();
    return { id: h.id, title: h.title, text_verbatim: body };
  });

  const prohibitedItems = findBulletList(
    text,
    '## 12. What AFENDA does not claim',
    '## 13. Approved messaging',
    'position:prohibited-claims',
  );

  const falsifierMetricRows = parseTableAt(text, '| Metric | Target |', 'position:falsifiers');
  const falsifierMetrics: FalsifierMetric[] = falsifierMetricRows.map((r) => ({
    metric: r['Metric'] ?? '',
    target: stripBold(r['Target'] ?? ''),
  }));
  const falsifierStepsRaw = findNumberedList(
    text,
    'A false-compatible result is the direct falsifier:',
    '## 9. Partner position',
    'position:falsifier-steps',
  );

  const revisitItems = findNumberedList(
    text,
    '## 14. Revisit triggers',
    '## 15. Adoption status and open decisions',
    'position:revisit-triggers',
  );

  const adoptedItems = findBulletList(
    text,
    '### Adopted',
    '### Must be decided before first public release',
    'position:adopted',
  );
  const pendingDecisionItems = findNumberedList(
    text,
    '### Must be decided before first public release',
    '## 16. Source basis',
    'position:pending-decisions',
  );

  // §4 extension-kind taxonomy, extracted independently for cross-document
  // consistency checking against doctrine EXT-02.
  const section4 = sliceBetween(text, '## 4. Why AFENDA can make this structural', '### 4.1', 'position:section4');
  const extensionKinds = [...section4.matchAll(/`([a-z-]+)`/g)].map((m) => (m[1] ?? '').toLowerCase());

  return {
    obligations,
    compatibilityResultClasses,
    evidenceLadderGrades,
    currentGradeAtAdoption,
    permittedClaimWording,
    approvedMessaging,
    prohibitedItems,
    falsifierMetrics,
    falsifierSteps: falsifierStepsRaw.map((s) => s.text),
    revisitTriggers: revisitItems.map((r) => r.text),
    adoptedItems,
    pendingDecisionItems: pendingDecisionItems.map((p) => p.text),
    extensionKinds,
  };
}

// ---------------------------------------------------------------------------
// Full registry assembly — the single shared source of truth for both the
// writer script and the integrity checker.
// ---------------------------------------------------------------------------

export interface GeneratedFrom {
  path: string;
  sha256: string;
}

export interface DoctrineRegistry {
  schema_version: number;
  generated_by: string;
  generated_from: GeneratedFrom;
  authority_classes: AuthorityClass[];
  evidence_grade_definitions: { grades: EvidenceGradeRow[]; modifiers: EvidenceGradeModifier[] };
  rules: DoctrineRule[];
  verification_controls: VerificationControl[];
  forbidden: ForbiddenItem[];
  gate_cadence: GateCadenceRow[];
  historical_orphan_findings: HistoricalOrphanFinding[];
}

export interface StackRegistry {
  schema_version: number;
  generated_by: string;
  generated_from: GeneratedFrom;
  selections: StackSelection[];
  controls: StackControl[];
  explicit_rejections: StackRejection[];
  escape_hatches: EscapeHatch[];
  version_policies: string[];
  architecture_constraints: ArchitectureConstraints;
  gate_cadence: StackGateCadenceRow[];
}

export interface PositionRegistry {
  schema_version: number;
  generated_by: string;
  generated_from: GeneratedFrom;
  document_role: string;
  technical_normativity: boolean;
  obligations: PositionObligation[];
  compatibility_result_classes: CompatibilityResultClass[];
  evidence_ladder: { grades: EvidenceLadderGrade[]; current_grade_at_adoption: CurrentGradeItem[] };
  permitted_claim_wording: PermittedClaimWording[];
  prohibited_or_limited_claims: { items: string[] };
  falsifiers: { metrics: FalsifierMetric[]; response_steps: string[] };
  approved_messaging: ApprovedMessagingItem[];
  revisit_triggers: string[];
  adoption_status_source: { adopted_items: string[]; pending_before_release_items: string[] };
}

export interface AuthorityIndexDocument {
  id: string;
  canonical_path: string;
  document_role: string;
  precedence: number;
  precedence_source_quote: string;
  precedence_source_quote_origin: string;
  version_declared: string;
  sha256: string;
  seal_path: string;
  content_status: string;
  adoption_status_verbatim: Record<string, unknown>;
  machine_projection_path: string;
  extracted_object_counts: Record<string, number>;
}

export interface AuthorityIndex {
  schema_version: number;
  generated_by: string;
  documents: AuthorityIndexDocument[];
}

export interface BuildRegistriesInput {
  doctrineText: string;
  stackText: string;
  positionText: string;
}

export interface BuildRegistriesResult {
  doctrineRegistry: DoctrineRegistry;
  stackRegistry: StackRegistry;
  positionRegistry: PositionRegistry;
  authorityIndex: AuthorityIndex;
  parsed: { d: DoctrineParsed; s: StackParsed; p: PositionParsed };
}

export function buildRegistries({ doctrineText, stackText, positionText }: BuildRegistriesInput): BuildRegistriesResult {
  const doctrineSha = sha256(doctrineText);
  const stackSha = sha256(stackText);
  const positionSha = sha256(positionText);

  const d = parseDoctrine(doctrineText, doctrineSha);
  const s = parseStack(stackText, stackSha);
  const p = parsePosition(positionText, positionSha);

  const doctrineRegistry: DoctrineRegistry = {
    schema_version: AUTHORITY_REGISTRY_SCHEMA_VERSION,
    generated_by: 'scripts/build-authority-registry.ts',
    generated_from: { path: 'doctrine/DOCTRINE.md', sha256: doctrineSha },
    authority_classes: d.authorityClasses,
    evidence_grade_definitions: { grades: d.evidenceGradeRows, modifiers: d.modifiers },
    rules: d.rules,
    verification_controls: d.verificationControls,
    forbidden: d.forbidden,
    gate_cadence: d.gateCadence,
    historical_orphan_findings: d.historicalOrphanFindings,
  };

  const stackRegistry: StackRegistry = {
    schema_version: AUTHORITY_REGISTRY_SCHEMA_VERSION,
    generated_by: 'scripts/build-authority-registry.ts',
    generated_from: { path: 'stack/STACK.md', sha256: stackSha },
    selections: s.selections,
    controls: s.controls,
    explicit_rejections: s.explicitRejections,
    escape_hatches: s.escapeHatches,
    version_policies: s.versionPolicies,
    architecture_constraints: s.architectureConstraints,
    gate_cadence: s.gateCadence,
  };

  const positionRegistry: PositionRegistry = {
    schema_version: AUTHORITY_REGISTRY_SCHEMA_VERSION,
    generated_by: 'scripts/build-authority-registry.ts',
    generated_from: { path: 'position/POSITION.md', sha256: positionSha },
    document_role: 'market_claim_authority',
    technical_normativity: false,
    obligations: p.obligations,
    compatibility_result_classes: p.compatibilityResultClasses,
    evidence_ladder: { grades: p.evidenceLadderGrades, current_grade_at_adoption: p.currentGradeAtAdoption },
    permitted_claim_wording: p.permittedClaimWording,
    prohibited_or_limited_claims: { items: p.prohibitedItems },
    falsifiers: { metrics: p.falsifierMetrics, response_steps: p.falsifierSteps },
    approved_messaging: p.approvedMessaging,
    revisit_triggers: p.revisitTriggers,
    adoption_status_source: { adopted_items: p.adoptedItems, pending_before_release_items: p.pendingDecisionItems },
  };

  const authorityIndex: AuthorityIndex = {
    schema_version: AUTHORITY_REGISTRY_SCHEMA_VERSION,
    generated_by: 'scripts/build-authority-registry.ts',
    documents: [
      {
        id: 'doctrine',
        canonical_path: 'doctrine/DOCTRINE.md',
        document_role: 'normative_authority',
        precedence: 1,
        precedence_source_quote:
          'DOCTRINE.md governs what must be true. The AFENDA Stack Selection Record governs the approved implementation stack. This document governs what AFENDA may claim, to whom, and on what evidence.',
        precedence_source_quote_origin: 'position/POSITION.md (front matter)',
        version_declared: 'Version 1.0',
        sha256: doctrineSha,
        seal_path: 'doctrine/DOCTRINE.sha256',
        content_status: 'verbatim-canonical-copy-of-source',
        adoption_status_verbatim: {
          source_section: '17.1 Ratification',
          quote:
            'Upon adoption, this file becomes the only doctrine authority. Record its SHA-256 in repository governance and require the hash before loading it as standing context.',
        },
        machine_projection_path: 'governance/doctrine-registry.json',
        extracted_object_counts: {
          rules: d.rules.length,
          verification_controls: d.verificationControls.length,
          forbidden: d.forbidden.length,
          authority_classes: d.authorityClasses.length,
          evidence_grades: d.evidenceGradeRows.length,
          gate_cadence: d.gateCadence.length,
          historical_orphan_findings: d.historicalOrphanFindings.length,
        },
      },
      {
        id: 'stack',
        canonical_path: 'stack/STACK.md',
        document_role: 'implementation_authority_subordinate_to_doctrine',
        precedence: 2,
        precedence_source_quote:
          'DOCTRINE.md governs what must be true. This record governs the approved tools and implementation shape used to make those truths executable. Where the two conflict, the doctrine wins.',
        precedence_source_quote_origin: 'stack/STACK.md §1',
        version_declared: 'Version 2.0',
        sha256: stackSha,
        seal_path: 'stack/STACK.sha256',
        content_status: 'verbatim-canonical-copy-of-source',
        adoption_status_verbatim: {
          source_section: '12. Adoption and freeze',
          quote:
            'This record is ready for adoption after the checklist in `ADOPTION_CHECKLIST.md` is completed and `STACK.sha256` is committed.',
        },
        machine_projection_path: 'governance/stack-registry.json',
        extracted_object_counts: {
          selections: s.selections.length,
          controls: s.controls.length,
          explicit_rejections: s.explicitRejections.length,
          escape_hatches: s.escapeHatches.length,
          gate_cadence: s.gateCadence.length,
        },
      },
      {
        id: 'position',
        canonical_path: 'position/POSITION.md',
        document_role: 'market_claim_authority',
        precedence: 3,
        precedence_source_quote:
          'This is not a third technical authority. It cannot amend the doctrine, relax a control, choose a technology, or create a customer exception. Where this document conflicts with the doctrine or stack record, this document loses.',
        precedence_source_quote_origin: 'position/POSITION.md (front matter)',
        version_declared: 'v1.0',
        sha256: positionSha,
        seal_path: 'position/POSITION.sha256',
        content_status: 'verbatim-canonical-copy-of-source',
        adoption_status_verbatim: {
          source_section: '15. Adoption status and open decisions',
          adopted_items_count: p.adoptedItems.length,
          pending_before_release_items_count: p.pendingDecisionItems.length,
        },
        machine_projection_path: 'governance/position-registry.json',
        extracted_object_counts: {
          obligations: p.obligations.length,
          compatibility_result_classes: p.compatibilityResultClasses.length,
          evidence_ladder_grades: p.evidenceLadderGrades.length,
          revisit_triggers: p.revisitTriggers.length,
        },
      },
    ],
  };

  return { doctrineRegistry, stackRegistry, positionRegistry, authorityIndex, parsed: { d, s, p } };
}

export function toJsonBytes(obj: unknown): string {
  return `${JSON.stringify(obj, null, 2)}\n`;
}
