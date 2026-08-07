// Shared deterministic parser/registry-builder for the AFENDA authority layer.
//
// Both scripts/build-authority-registry.mjs (writer) and
// scripts/check-authority-integrity.mjs (read-only verifier) import this
// module so the two can never drift apart: the checker always compares
// committed JSON against a *fresh call* to the exact same buildRegistries()
// function the writer uses.
//
// This module never rewrites, summarizes, or "improves" normative wording.
// It only slices verbatim source text and derives small non-normative helper
// fields (gist, sha256, line anchors, status labels).

import { createHash } from 'node:crypto';

export function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export function lineOf(fullText, index) {
  if (index < 0) return null;
  return fullText.slice(0, index).split('\n').length;
}

function mustIndexOf(text, needle, label) {
  const idx = text.indexOf(needle);
  if (idx === -1) {
    throw new Error(`Deterministic parser anchor not found (${label}): ${JSON.stringify(needle)}`);
  }
  return idx;
}

function sliceBetween(text, startAnchor, endAnchor, label) {
  const startIdx = mustIndexOf(text, startAnchor, `${label}:start`);
  const from = startIdx + startAnchor.length;
  if (endAnchor === null) return text.slice(from);
  const endIdx = text.indexOf(endAnchor, from);
  if (endIdx === -1) {
    throw new Error(`Deterministic parser end-anchor not found (${label}:end): ${JSON.stringify(endAnchor)}`);
  }
  return text.slice(from, endIdx);
}

function splitRow(line) {
  let l = line.trim();
  if (l.startsWith('|')) l = l.slice(1);
  if (l.endsWith('|')) l = l.slice(0, -1);
  return l.split('|').map((c) => c.trim());
}

export function stripBold(s) {
  return s.replace(/\*\*/g, '').trim();
}

export function stripInlineCode(s) {
  return s.replace(/`/g, '').trim();
}

function parseTableAt(text, anchorText, label) {
  const anchorIdx = mustIndexOf(text, anchorText, label);
  const after = text.slice(anchorIdx);
  const lines = after.split('\n');
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('|')) {
      start = i;
      break;
    }
  }
  if (start === -1) throw new Error(`No table located after anchor (${label})`);
  let end = start;
  while (end < lines.length && lines[end].trim().startsWith('|')) end++;
  const tableLines = lines.slice(start, end);
  const header = splitRow(tableLines[0]);
  const rows = tableLines.slice(2).map(splitRow);
  return rows.map((cols) => {
    const obj = {};
    header.forEach((h, i) => {
      obj[h] = (cols[i] ?? '').trim();
    });
    return obj;
  });
}

function findNumberedList(text, anchorText, endAnchorText, label) {
  const region = sliceBetween(text, anchorText, endAnchorText, label);
  const items = [];
  const re = /^(\d{1,2})\.\s+(.+)$/gm;
  let m;
  while ((m = re.exec(region))) {
    items.push({ number: Number(m[1]), text: m[2].trim() });
  }
  return items;
}

function findBulletList(text, anchorText, endAnchorText, label) {
  const region = sliceBetween(text, anchorText, endAnchorText, label);
  const items = [];
  const re = /^-\s+(.+)$/gm;
  let m;
  while ((m = re.exec(region))) items.push(m[1].trim());
  return items;
}

// Deterministic, offline, non-normative gist. Never used as an authority
// input; derives one-directionally from the verbatim text supplied to it.
export function gistify(rawText, maxLen = 140) {
  if (!rawText) return '';
  const plain = rawText.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
  const firstSentence = (plain.match(/^[^.!?]*[.!?]/) || [plain])[0];
  const dropWords = new Set(['a', 'an', 'the', 'shall', 'should', 'that']);
  const words = firstSentence
    .split(/\s+/)
    .filter((w) => !dropWords.has(w.toLowerCase().replace(/[.,;:]+$/, '')));
  let s = words.join(' ').trim();
  if (s.length > maxLen) s = `${s.slice(0, maxLen - 1).trim()}…`;
  return s;
}

export function classifyEvidenceStatus(gradeRaw) {
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

export function parseDoctrine(text, sha) {
  const authorityClasses = parseTableAt(text, '| Marker | Meaning | Change threshold |', 'doctrine:authority-classes').map(
    (r) => ({
      marker: stripInlineCode(r.Marker),
      meaning: r.Meaning,
      change_threshold: r['Change threshold'],
    }),
  );

  const evidenceGradeRows = parseTableAt(text, '| Grade | Name | What it means |', 'doctrine:evidence-grades').map((r) => ({
    grade: stripBold(r.Grade),
    name: r.Name,
    meaning: r['What it means'],
  }));
  const modifiers = findBulletList(text, 'Modifiers:', 'Only **E6** may be described as **battle-proven**.', 'doctrine:modifiers').map(
    (line) => {
      const m = line.match(/^\*\*(`[^`]+`)\s*([^:]*):\*\*\s*(.+)$/) || line.match(/^\*\*(`[^`]+`):\*\*\s*(.+)$/);
      if (m && m.length === 4) return { token: stripInlineCode(m[1]), name: m[2].trim(), meaning: m[3].trim() };
      if (m && m.length === 3) return { token: stripInlineCode(m[1]), name: '', meaning: m[2].trim() };
      return { token: '', name: '', meaning: stripBold(line) };
    },
  );

  const rulesRegionStart = mustIndexOf(text, '# THE RULES', 'doctrine:rules-region-start');
  const rulesRegionEnd = mustIndexOf(text, '# 14. Minimum executable verification spine', 'doctrine:rules-region-end');
  const rulesRegion = text.slice(rulesRegionStart, rulesRegionEnd);
  const regionOffset = rulesRegionStart;

  const sectionHeadingRe = /^# (\d+)\. (.+)$/gm;
  const sectionHeadings = [];
  let sm;
  while ((sm = sectionHeadingRe.exec(rulesRegion))) {
    sectionHeadings.push({ index: sm.index, number: sm[1], title: sm[2].trim() });
  }
  function sectionTitleFor(idx) {
    let current = null;
    for (const h of sectionHeadings) {
      if (h.index <= idx) current = h;
      else break;
    }
    return current ? `${current.number}. ${current.title}` : null;
  }

  const ruleHeaderRe = /^### ([A-Z]{3}-\d{2}) — (.+?)\s*`([^`]+)`\s*$/gm;
  const headers = [];
  let hm;
  while ((hm = ruleHeaderRe.exec(rulesRegion))) {
    headers.push({ id: hm[1], title: hm[2].trim(), authority: hm[3].trim(), index: hm.index, end: hm.index + hm[0].length });
  }

  const labelOrder = [
    ['rule_verbatim', '**Rule.**'],
    ['why_justified', '**Why this method is justified.**'],
    ['required_method', '**Required implementation.**'],
    ['red_test', '**Required turn-red evidence.**'],
    ['qualification_evidence', '**Qualification evidence.**'],
    ['declared_evidence_grade_raw', '**Current AFENDA evidence grade.**'],
    ['source_basis_raw', '**Source basis.**'],
  ];

  function extractLabeledFields(block) {
    const positions = labelOrder.map(([key, marker]) => ({ key, marker, idx: block.indexOf(marker) }));
    const result = {};
    for (let i = 0; i < positions.length; i++) {
      const { key, marker, idx } = positions[i];
      if (idx === -1) {
        result[key] = null;
        continue;
      }
      const start = idx + marker.length;
      let end = block.length;
      for (let j = i + 1; j < positions.length; j++) {
        if (positions[j].idx !== -1) {
          end = positions[j].idx;
          break;
        }
      }
      let value = block.slice(start, end);
      value = value.split(/\n---/)[0].split(/\n# \d+\./)[0];
      result[key] = value.trim();
    }
    return result;
  }

  const rules = headers.map((h, i) => {
    const blockStart = h.end;
    const blockEnd = i + 1 < headers.length ? headers[i + 1].index : rulesRegion.length;
    const block = rulesRegion.slice(blockStart, blockEnd);
    const fields = extractLabeledFields(block);

    const declaredGrade = stripBold(fields.declared_evidence_grade_raw || '');
    const sourceBasis = [...(fields.source_basis_raw || '').matchAll(/\[S(\d+)\]/g)].map((m) => `S${m[1]}`);
    const absoluteIndex = regionOffset + h.index;

    return {
      id: h.id,
      section: sectionTitleFor(h.index),
      title: h.title,
      authority: h.authority,
      rule_verbatim: fields.rule_verbatim,
      gist: gistify(fields.rule_verbatim),
      source_basis: sourceBasis,
      required_method: fields.required_method,
      red_test: fields.red_test,
      qualification_evidence: fields.qualification_evidence,
      declared_evidence_grade: declaredGrade,
      rule_status: 'active',
      evidence_status: classifyEvidenceStatus(declaredGrade),
      historical_orphan_refs: [],
      source_anchor: `doctrine/DOCTRINE.md:${lineOf(text, absoluteIndex)}`,
      source_document_sha256: sha,
      rule_text_sha256: sha256(fields.rule_verbatim || ''),
    };
  });

  const vRows = parseTableAt(text, '| Control | Primary rules | Must prove | Required red condition |', 'doctrine:v-controls');
  const verificationControls = vRows.map((r) => {
    const controlCell = stripBold(r.Control);
    const idMatch = controlCell.match(/^(V\d{2})\s+(.+)$/);
    return {
      id: idMatch ? idMatch[1] : controlCell,
      title: idMatch ? idMatch[2] : '',
      primary_rules: r['Primary rules'].split(',').map((s) => s.trim()).filter(Boolean),
      must_prove: r['Must prove'],
      required_red_condition: r['Required red condition'],
    };
  });

  const gateRows = parseTableAt(text, '| Gate | Contents | Trigger |', 'doctrine:gate-cadence');
  const gateCadence = gateRows.map((r) => ({
    gate: stripBold(r.Gate),
    contents: r.Contents,
    trigger: r.Trigger,
  }));

  const redRows = parseTableAt(
    text,
    '| Red ID | Mapped rules | Finding | Required proof of closure |',
    'doctrine:red-findings',
  );
  const historicalOrphanFindings = redRows.map((r) => ({
    red_id: stripBold(r['Red ID']),
    mapped_rules: r['Mapped rules'].split(',').map((s) => s.trim()).filter(Boolean),
    finding: r.Finding,
    required_proof_of_closure: r['Required proof of closure'],
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
  const forbidden = forbiddenItems.map((item) => ({ number: item.number, text: item.text }));

  // EXT-02 extension-kind taxonomy, extracted independently for cross-document
  // consistency checking against POSITION.md §4.
  const ext02 = rules.find((r) => r.id === 'EXT-02');
  const extKindsSource = ext02 ? `${ext02.rule_verbatim} ${ext02.required_method}` : '';
  const extKindsMatch = extKindsSource.match(/Default kinds:\s*([^.]+)\./);
  const extensionKinds = extKindsMatch
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

export function parseStack(text, sha) {
  const selRegionStart = mustIndexOf(text, '## 4. Detailed selection records', 'stack:sel-region-start');
  const selRegionEnd = mustIndexOf(text, '## 5. Explicit rejections', 'stack:sel-region-end');
  const selRegion = text.slice(selRegionStart, selRegionEnd);
  const selOffset = selRegionStart;

  const selHeaderRe = /^### (SEL-\d{2}) — (.+?)\s*`([^`]+)`\s*$/gm;
  const headers = [];
  let hm;
  while ((hm = selHeaderRe.exec(selRegion))) {
    headers.push({ id: hm[1], title: hm[2].trim(), authority: hm[3].trim(), index: hm.index, end: hm.index + hm[0].length });
  }

  const labelOrder = [
    ['vibe_grade', '**Vibe grade:**'],
    ['current_evidence', '**Current evidence:**'],
    ['source_basis_raw', '**Source basis:**'],
    ['executable_controls_raw', '**Executable controls:**'],
    ['decision_verbatim', '**Decision.**'],
    ['agent_case', '**Agent case.**'],
    ['engineering_case', '**Engineering case.**'],
    ['binding_constraints', '**Binding constraints.**'],
    ['revisit_trigger', '**Revisit trigger.**'],
  ];

  function extractLabeledFields(block) {
    const positions = labelOrder.map(([key, marker]) => ({ key, marker, idx: block.indexOf(marker) }));
    const result = {};
    for (let i = 0; i < positions.length; i++) {
      const { key, marker, idx } = positions[i];
      if (idx === -1) {
        result[key] = null;
        continue;
      }
      const start = idx + marker.length;
      let end = block.length;
      for (let j = i + 1; j < positions.length; j++) {
        if (positions[j].idx !== -1) {
          end = positions[j].idx;
          break;
        }
      }
      let value = block.slice(start, end);
      value = value.split(/\n---/)[0].split(/\n## \d+\./)[0];
      result[key] = value.trim();
    }
    return result;
  }

  const selections = headers.map((h, i) => {
    const blockStart = h.end;
    const blockEnd = i + 1 < headers.length ? headers[i + 1].index : selRegion.length;
    const block = selRegion.slice(blockStart, blockEnd);
    const fields = extractLabeledFields(block);
    const absoluteIndex = selOffset + h.index;

    return {
      id: h.id,
      title: h.title,
      authority: h.authority,
      vibe_grade: stripBold(fields.vibe_grade || ''),
      current_evidence: stripBold(fields.current_evidence || ''),
      source_basis: (fields.source_basis_raw || '').split(',').map((s) => s.trim()).filter(Boolean),
      executable_controls: (fields.executable_controls_raw || '').split(',').map((s) => s.trim()).filter(Boolean),
      decision_verbatim: fields.decision_verbatim,
      gist: gistify(fields.decision_verbatim),
      agent_case: fields.agent_case,
      engineering_case: fields.engineering_case,
      binding_constraints: fields.binding_constraints,
      revisit_trigger: fields.revisit_trigger,
      source_anchor: `stack/STACK.md:${lineOf(text, absoluteIndex)}`,
      source_document_sha256: sha,
      rule_text_sha256: sha256(fields.decision_verbatim || ''),
    };
  });

  const controlRows = parseTableAt(text, '| Control | Name | Applies to | Required outcome |', 'stack:controls');
  const controls = controlRows.map((r) => ({
    id: stripBold(r.Control),
    name: r.Name,
    applies_to: r['Applies to'].split(',').map((s) => s.trim()).filter(Boolean),
    required_outcome: r['Required outcome'],
  }));

  const rejectionRows = parseTableAt(text, '| Rejected option | Reason |', 'stack:rejections');
  const explicitRejections = rejectionRows.map((r) => ({
    rejected_option: stripBold(r['Rejected option']),
    reason: r.Reason,
  }));

  const escRegionStart = mustIndexOf(text, '## 6. Escape hatches', 'stack:esc-region-start');
  const escRegionEnd = mustIndexOf(text, '## 7. Executable selection controls', 'stack:esc-region-end');
  const escRegion = text.slice(escRegionStart, escRegionEnd);
  const escHeaderRe = /^### (ESC-\d{2}) — (.+)$/gm;
  const escHeaders = [];
  let em;
  while ((em = escHeaderRe.exec(escRegion))) {
    escHeaders.push({ id: em[1], title: em[2].trim(), index: em.index, end: em.index + em[0].length });
  }
  const escapeHatches = escHeaders.map((h, i) => {
    const blockStart = h.end;
    const blockEnd = i + 1 < escHeaders.length ? escHeaders[i + 1].index : escRegion.length;
    const body = escRegion.slice(blockStart, blockEnd).split(/\n---/)[0].trim();
    return { id: h.id, title: h.title, text_verbatim: body, gist: gistify(body) };
  });

  const archRegionStart = mustIndexOf(text, '## 8. Required repository architecture', 'stack:arch-start');
  const archRegionEnd = mustIndexOf(text, '## 9. Required gates', 'stack:arch-end');
  const archRegion = text.slice(archRegionStart, archRegionEnd);
  const fencedBlocks = [...archRegion.matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1]);
  const architectureConstraints = {
    repository_tree: fencedBlocks[0] || null,
    application_flow: fencedBlocks[1] || null,
  };

  const stackGateRows = parseTableAt(text, '| Gate | Required contents | Trigger |', 'stack:gate-cadence');
  const gateCadence = stackGateRows.map((r) => ({
    gate: stripBold(r.Gate),
    required_contents: r['Required contents'],
    trigger: r.Trigger,
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

export function parsePosition(text, sha) {
  const posRegionStart = mustIndexOf(text, '## 5. Product obligations created by the position', 'position:pos-start');
  const posRegionEnd = mustIndexOf(
    text,
    '## 6. Proving the claim before the market can prove it for us',
    'position:pos-end',
  );
  const posRegion = text.slice(posRegionStart, posRegionEnd);
  const posOffset = posRegionStart;
  const posHeaderRe = /^### (POS-\d{2}) — (.+)$/gm;
  const posHeaders = [];
  let pm;
  while ((pm = posHeaderRe.exec(posRegion))) {
    posHeaders.push({ id: pm[1], title: pm[2].trim(), index: pm.index, end: pm.index + pm[0].length });
  }
  const obligations = posHeaders.map((h, i) => {
    const blockStart = h.end;
    const blockEnd = i + 1 < posHeaders.length ? posHeaders[i + 1].index : posRegion.length;
    const body = posRegion.slice(blockStart, blockEnd).split(/\n---/)[0].trim();
    const absoluteIndex = posOffset + h.index;
    return {
      id: h.id,
      title: h.title,
      text_verbatim: body,
      gist: gistify(body),
      source_anchor: `position/POSITION.md:${lineOf(text, absoluteIndex)}`,
      source_document_sha256: sha,
      rule_text_sha256: sha256(body),
    };
  });

  const resultClassRows = parseTableAt(text, '| Result | Meaning | Upgrade treatment |', 'position:result-classes');
  const compatibilityResultClasses = resultClassRows.map((r) => ({
    result: stripBold(r.Result),
    meaning: r.Meaning,
    upgrade_treatment: r['Upgrade treatment'],
  }));

  const ladderRows = parseTableAt(
    text,
    '| Grade | Required evidence | Permitted public wording |',
    'position:evidence-ladder',
  );
  const evidenceLadderGrades = ladderRows.map((r) => ({
    grade: stripBold(r.Grade),
    required_evidence: r['Required evidence'],
    permitted_public_wording: stripBold(r['Permitted public wording']),
  }));
  const currentGradeRows = parseTableAt(text, '| Item | Grade |', 'position:current-grade');
  const currentGradeAtAdoption = currentGradeRows.map((r) => ({ item: r.Item, grade: stripBold(r.Grade) }));

  const permittedClaimWording = evidenceLadderGrades.map((g) => ({
    grade: g.grade,
    permitted_public_wording: g.permitted_public_wording,
  }));

  const messagingRegionStart = mustIndexOf(text, '## 13. Approved messaging', 'position:messaging-start');
  const messagingRegionEnd = mustIndexOf(text, '## 14. Revisit triggers', 'position:messaging-end');
  const messagingRegion = text.slice(messagingRegionStart, messagingRegionEnd);
  const messagingHeaderRe = /^### (13\.\d) (.+)$/gm;
  const messagingHeaders = [];
  let mm;
  while ((mm = messagingHeaderRe.exec(messagingRegion))) {
    messagingHeaders.push({ id: mm[1], title: mm[2].trim(), index: mm.index, end: mm.index + mm[0].length });
  }
  const approvedMessaging = messagingHeaders.map((h, i) => {
    const blockStart = h.end;
    const blockEnd = i + 1 < messagingHeaders.length ? messagingHeaders[i + 1].index : messagingRegion.length;
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
  const falsifierMetrics = falsifierMetricRows.map((r) => ({ metric: r.Metric, target: stripBold(r.Target) }));
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
  const extensionKinds = [...section4.matchAll(/`([a-z-]+)`/g)].map((m) => m[1].toLowerCase());

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

export function buildRegistries({ doctrineText, stackText, positionText }) {
  const doctrineSha = sha256(doctrineText);
  const stackSha = sha256(stackText);
  const positionSha = sha256(positionText);

  const d = parseDoctrine(doctrineText, doctrineSha);
  const s = parseStack(stackText, stackSha);
  const p = parsePosition(positionText, positionSha);

  const doctrineRegistry = {
    schema_version: 1,
    generated_by: 'scripts/build-authority-registry.mjs',
    generated_from: { path: 'doctrine/DOCTRINE.md', sha256: doctrineSha },
    authority_classes: d.authorityClasses,
    evidence_grade_definitions: { grades: d.evidenceGradeRows, modifiers: d.modifiers },
    rules: d.rules,
    verification_controls: d.verificationControls,
    forbidden: d.forbidden,
    gate_cadence: d.gateCadence,
    historical_orphan_findings: d.historicalOrphanFindings,
  };

  const stackRegistry = {
    schema_version: 1,
    generated_by: 'scripts/build-authority-registry.mjs',
    generated_from: { path: 'stack/STACK.md', sha256: stackSha },
    selections: s.selections,
    controls: s.controls,
    explicit_rejections: s.explicitRejections,
    escape_hatches: s.escapeHatches,
    version_policies: s.versionPolicies,
    architecture_constraints: s.architectureConstraints,
    gate_cadence: s.gateCadence,
  };

  const positionRegistry = {
    schema_version: 1,
    generated_by: 'scripts/build-authority-registry.mjs',
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

  const authorityIndex = {
    schema_version: 1,
    generated_by: 'scripts/build-authority-registry.mjs',
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

export function toJsonBytes(obj) {
  return `${JSON.stringify(obj, null, 2)}\n`;
}
