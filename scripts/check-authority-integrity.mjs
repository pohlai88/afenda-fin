#!/usr/bin/env node
// READ-ONLY authority integrity gate. Never repairs, never writes.
//
// Exits non-zero on any authority-integrity failure. Prints a report section
// for conditions that must be visible but must NOT fail the gate (historical/
// orphaned evidence, dangling old artifacts, missing historical files).
//
// Run negative-fixture self-tests with: node scripts/check-authority-integrity.mjs --self-test

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildRegistries, sha256, parseDoctrine, parsePosition, toJsonBytes } from './lib/authority-parser.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PATHS = {
  doctrine: path.join(ROOT, 'doctrine', 'DOCTRINE.md'),
  doctrineSeal: path.join(ROOT, 'doctrine', 'DOCTRINE.sha256'),
  stack: path.join(ROOT, 'stack', 'STACK.md'),
  stackSeal: path.join(ROOT, 'stack', 'STACK.sha256'),
  position: path.join(ROOT, 'position', 'POSITION.md'),
  positionSeal: path.join(ROOT, 'position', 'POSITION.sha256'),
  outAuthorityIndex: path.join(ROOT, 'governance', 'authority-index.json'),
  outDoctrine: path.join(ROOT, 'governance', 'doctrine-registry.json'),
  outStack: path.join(ROOT, 'governance', 'stack-registry.json'),
  outPosition: path.join(ROOT, 'governance', 'position-registry.json'),
};

const EXCLUDED_DIRS = new Set(['node_modules', '.git', 'governance', '.turbo']);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Result collector
// ---------------------------------------------------------------------------

class Report {
  constructor() {
    this.failures = [];
    this.reportsOnly = [];
    this.passes = [];
  }
  fail(check, detail) {
    this.failures.push({ check, detail });
  }
  ok(check, detail) {
    this.passes.push({ check, detail });
  }
  note(check, detail) {
    this.reportsOnly.push({ check, detail });
  }
}

// ---------------------------------------------------------------------------
// Pure validators (used by both the live gate and the self-test fixtures)
// ---------------------------------------------------------------------------

function checkSeal(report, label, docText, sealRaw, expectedFilename) {
  const actual = sha256(docText);
  const m = sealRaw.trim().match(/^([0-9a-f]{64})\s{2}(.+)$/);
  if (!m) {
    report.fail(`seal-format:${label}`, `Seal file is not in "<sha256>  <filename>" format: ${JSON.stringify(sealRaw)}`);
    return false;
  }
  const [, recordedHash, recordedName] = m;
  if (recordedName !== expectedFilename) {
    report.fail(`seal-filename:${label}`, `Seal names "${recordedName}", expected "${expectedFilename}"`);
    return false;
  }
  if (recordedHash !== actual) {
    report.fail(`seal-hash:${label}`, `Seal records ${recordedHash}, actual content hash is ${actual}`);
    return false;
  }
  report.ok(`seal:${label}`, `${expectedFilename} sha256 matches seal (${actual})`);
  return true;
}

function checkOnlyOneDoctrineAuthority(report, filePaths) {
  const candidates = filePaths.filter((f) => /(^|[\\/])DOCTRINE\.md$/i.test(f) || /AFENDA_EVIDENCE_BACKED_DOCTRINE\.md$/i.test(f));
  const canonical = candidates.filter((f) => f.replace(/\\/g, '/').endsWith('doctrine/DOCTRINE.md'));
  const rogue = candidates.filter((f) => !f.replace(/\\/g, '/').endsWith('doctrine/DOCTRINE.md'));
  if (canonical.length !== 1) {
    report.fail('single-doctrine-authority', `Expected exactly one doctrine/DOCTRINE.md, found ${canonical.length}`);
    return false;
  }
  if (rogue.length > 0) {
    report.fail('single-doctrine-authority', `Found doctrine-named file(s) outside doctrine/: ${rogue.join(', ')}`);
    return false;
  }
  report.ok('single-doctrine-authority', 'Exactly one live doctrine authority: doctrine/DOCTRINE.md');
  return true;
}

function idSet(items, key = 'id') {
  return items.map((i) => i[key]);
}

function checkNoOmissionOrDuplication(report, label, committedIds, freshIds) {
  const committedSet = new Set(committedIds);
  const freshSet = new Set(freshIds);
  let ok = true;
  if (committedSet.size !== committedIds.length) {
    report.fail(`duplicate:${label}`, `Committed registry has duplicate ids`);
    ok = false;
  }
  const missing = freshIds.filter((id) => !committedSet.has(id));
  const extra = committedIds.filter((id) => !freshSet.has(id));
  if (missing.length > 0) {
    report.fail(`omitted:${label}`, `Missing from committed registry: ${missing.join(', ')}`);
    ok = false;
  }
  if (extra.length > 0) {
    report.fail(`extraneous:${label}`, `Present in committed registry but not in source: ${extra.join(', ')}`);
    ok = false;
  }
  if (ok) report.ok(`completeness:${label}`, `${freshIds.length} ids present, no omission or duplication`);
  return ok;
}

function checkExactIdRange(report, label, ids, prefix, count) {
  const expected = new Set(Array.from({ length: count }, (_, i) => `${prefix}${String(i + 1).padStart(2, '0')}`));
  const actual = new Set(ids);
  const missing = [...expected].filter((id) => !actual.has(id));
  const dupes = ids.length !== actual.size;
  if (missing.length > 0 || dupes) {
    report.fail(`exact-range:${label}`, `Missing: [${missing.join(', ')}], duplicates: ${dupes}`);
    return false;
  }
  report.ok(`exact-range:${label}`, `All ${count} ${prefix}* items present exactly once`);
  return true;
}

function checkExactNumberRange(report, label, numbers, min, max) {
  const expected = new Set(Array.from({ length: max - min + 1 }, (_, i) => min + i));
  const actual = new Set(numbers);
  const missing = [...expected].filter((n) => !actual.has(n));
  const dupes = numbers.length !== actual.size;
  if (missing.length > 0 || dupes) {
    report.fail(`exact-number-range:${label}`, `Missing: [${missing.join(', ')}], duplicates: ${dupes}`);
    return false;
  }
  report.ok(`exact-number-range:${label}`, `All ${min}-${max} present exactly once`);
  return true;
}

function checkDanglingControlRefs(report, selections, controls) {
  const controlIds = new Set(controls.map((c) => c.id));
  const selIds = new Set(selections.map((s) => s.id));
  let ok = true;
  for (const sel of selections) {
    for (const cid of sel.executable_controls) {
      if (!controlIds.has(cid)) {
        report.fail('dangling-control-ref', `${sel.id} references nonexistent control ${cid}`);
        ok = false;
      }
    }
  }
  for (const ctrl of controls) {
    for (const sid of ctrl.applies_to) {
      if (sid === 'All') continue;
      if (!selIds.has(sid)) {
        report.fail('dangling-selection-ref', `${ctrl.id} applies_to references nonexistent selection ${sid}`);
        ok = false;
      }
    }
  }
  if (ok) report.ok('control-reference-graph', 'No dangling SEL<->SCC references');
  return ok;
}

function checkRuleTextIntegrity(report, label, registryItems, sourceItems, verbatimKey) {
  const bySourceId = new Map(sourceItems.map((r) => [r.id, r]));
  let ok = true;
  for (const item of registryItems) {
    const expectedHash = sha256(item[verbatimKey] || '');
    if (item.rule_text_sha256 !== expectedHash) {
      report.fail(`rule-text-self-consistency:${label}`, `${item.id}: rule_text_sha256 does not match sha256(${verbatimKey})`);
      ok = false;
      continue;
    }
    const src = bySourceId.get(item.id);
    if (!src) continue;
    if (src[verbatimKey] !== item[verbatimKey]) {
      report.fail(`rule-text-source-match:${label}`, `${item.id}: ${verbatimKey} does not match freshly parsed source`);
      ok = false;
    }
  }
  if (ok) report.ok(`rule-text-integrity:${label}`, `${registryItems.length} entries self-consistent and match source verbatim`);
  return ok;
}

function checkGistNeverExceedsSource(report, label, items, verbatimKey) {
  let ok = true;
  for (const item of items) {
    if ((item.gist || '').length > (item[verbatimKey] || '').length) {
      report.fail(`gist-not-authoritative:${label}`, `${item.id}: gist is longer than ${verbatimKey}; gist must never expand toward becoming normative text`);
      ok = false;
    }
  }
  if (ok) report.ok(`gist-not-authoritative:${label}`, 'gist fields remain compressed, non-expansive relative to verbatim text');
  return ok;
}

function checkPrecedenceStatements(report, stackText, positionText) {
  let ok = true;
  const stackPlain = stackText.replace(/\*\*/g, '');
  const positionPlain = positionText.replace(/\*\*/g, '');
  if (!stackPlain.includes('Where the two conflict, the doctrine wins.')) {
    report.fail('stack-precedence', 'stack/STACK.md no longer states that doctrine wins on conflict');
    ok = false;
  } else {
    report.ok('stack-precedence', 'stack/STACK.md affirms doctrine precedence verbatim');
  }
  if (!positionPlain.includes('not a third technical authority') || !positionPlain.includes('this document loses')) {
    report.fail('position-non-override', 'position/POSITION.md no longer states its subordinate, non-normative role');
    ok = false;
  } else {
    report.ok('position-non-override', 'position/POSITION.md affirms it cannot override doctrine/stack verbatim');
  }
  return ok;
}

function checkExtensionTaxonomyMatch(report, doctrineKinds, positionKinds) {
  const a = [...doctrineKinds].sort();
  const b = [...positionKinds].sort();
  const same = a.length === b.length && a.every((v, i) => v === b[i]);
  if (!same) {
    report.fail('ext02-vs-position4', `Doctrine EXT-02 kinds [${a.join(', ')}] != Position §4 kinds [${b.join(', ')}]`);
    return false;
  }
  report.ok('ext02-vs-position4', `Extension taxonomy matches: [${a.join(', ')}]`);
  return true;
}

function checkRegistryMatchesFreshRegen(report, label, committedBytes, freshBytes) {
  if (committedBytes !== freshBytes) {
    report.fail('registry-drift', `${label}: committed governance JSON differs from fresh deterministic regeneration`);
    return false;
  }
  report.ok('registry-drift', `${label}: byte-identical to fresh regeneration`);
  return true;
}

// ---------------------------------------------------------------------------
// Live gate
// ---------------------------------------------------------------------------

function runLiveGate() {
  const report = new Report();

  const doctrineText = readFileSync(PATHS.doctrine, 'utf8');
  const stackText = readFileSync(PATHS.stack, 'utf8');
  const positionText = readFileSync(PATHS.position, 'utf8');
  const doctrineSeal = readFileSync(PATHS.doctrineSeal, 'utf8');
  const stackSeal = readFileSync(PATHS.stackSeal, 'utf8');
  const positionSeal = readFileSync(PATHS.positionSeal, 'utf8');

  checkSeal(report, 'doctrine', doctrineText, doctrineSeal, 'DOCTRINE.md');
  checkSeal(report, 'stack', stackText, stackSeal, 'STACK.md');
  checkSeal(report, 'position', positionText, positionSeal, 'POSITION.md');

  const allFiles = walk(ROOT);
  checkOnlyOneDoctrineAuthority(report, allFiles);

  const fresh = buildRegistries({ doctrineText, stackText, positionText });
  const committed = {
    doctrine: JSON.parse(readFileSync(PATHS.outDoctrine, 'utf8')),
    stack: JSON.parse(readFileSync(PATHS.outStack, 'utf8')),
    position: JSON.parse(readFileSync(PATHS.outPosition, 'utf8')),
    authorityIndex: JSON.parse(readFileSync(PATHS.outAuthorityIndex, 'utf8')),
  };

  checkRegistryMatchesFreshRegen(report, 'doctrine-registry.json', readFileSync(PATHS.outDoctrine, 'utf8'), toJsonBytes(fresh.doctrineRegistry));
  checkRegistryMatchesFreshRegen(report, 'stack-registry.json', readFileSync(PATHS.outStack, 'utf8'), toJsonBytes(fresh.stackRegistry));
  checkRegistryMatchesFreshRegen(report, 'position-registry.json', readFileSync(PATHS.outPosition, 'utf8'), toJsonBytes(fresh.positionRegistry));
  checkRegistryMatchesFreshRegen(report, 'authority-index.json', readFileSync(PATHS.outAuthorityIndex, 'utf8'), toJsonBytes(fresh.authorityIndex));

  checkNoOmissionOrDuplication(report, 'doctrine-rules', idSet(committed.doctrine.rules), idSet(fresh.doctrineRegistry.rules));
  checkExactIdRange(report, 'verification-controls', idSet(committed.doctrine.verification_controls), 'V', 18);
  checkExactNumberRange(report, 'forbidden', committed.doctrine.forbidden.map((f) => f.number), 1, 20);
  checkExactIdRange(report, 'selections', idSet(committed.stack.selections), 'SEL-', 27);
  checkExactIdRange(report, 'controls', idSet(committed.stack.controls), 'SCC-', 27);

  checkDanglingControlRefs(report, committed.stack.selections, committed.stack.controls);

  checkRuleTextIntegrity(report, 'doctrine-rules', committed.doctrine.rules, fresh.doctrineRegistry.rules, 'rule_verbatim');
  checkRuleTextIntegrity(report, 'stack-selections', committed.stack.selections, fresh.stackRegistry.selections, 'decision_verbatim');
  checkRuleTextIntegrity(report, 'position-obligations', committed.position.obligations, fresh.positionRegistry.obligations, 'text_verbatim');

  checkGistNeverExceedsSource(report, 'doctrine-rules', committed.doctrine.rules, 'rule_verbatim');
  checkGistNeverExceedsSource(report, 'stack-selections', committed.stack.selections, 'decision_verbatim');
  checkGistNeverExceedsSource(report, 'position-obligations', committed.position.obligations, 'text_verbatim');

  checkPrecedenceStatements(report, stackText, positionText);
  checkExtensionTaxonomyMatch(report, fresh.parsed.d.extensionKinds, fresh.parsed.p.extensionKinds);

  // Report-only diagnostics — never fail the gate on these.
  const orphanCount = committed.doctrine.historical_orphan_findings.length;
  report.note(
    'historical-orphaned-evidence',
    `${orphanCount} RED findings from doctrine §15.4 map to rules whose evidence_status is historical-orphaned: ` +
      committed.doctrine.rules.filter((r) => r.evidence_status === 'historical-orphaned').map((r) => r.id).join(', '),
  );

  const historicalImplFiles = ['spine.mjs', 'mutants.mjs', '001_ledger.sql', 'CLAUDE.md'];
  const liveMatches = allFiles.filter((f) => historicalImplFiles.includes(path.basename(f)) && !f.replace(/\\/g, '/').includes('governance/history/'));
  report.note(
    'missing-historical-implementation-files',
    `Doctrine §15.1 references ${historicalImplFiles.join(', ')} as a prior supplied snapshot. Live matches outside governance/history/: ${liveMatches.length === 0 ? 'none (expected — these were never part of this bundle)' : liveMatches.join(', ')}`,
  );

  const zipSealPath = allFiles.find((f) => path.basename(f) === 'AFENDA_FINAL_TECH_STACK.zip.sha256');
  const zipPath = allFiles.find((f) => path.basename(f) === 'AFENDA_FINAL_TECH_STACK.zip');
  if (zipSealPath) {
    report.note(
      'dangling-zip-checksum',
      `${path.relative(ROOT, zipSealPath)} exists and hashes AFENDA_FINAL_TECH_STACK.zip, but that file ${zipPath ? 'exists at ' + path.relative(ROOT, zipPath) : 'does not exist anywhere in the repository'}. Retained under governance/history for provenance; not treated as live authority.`,
    );
  }

  return report;
}

function printReport(report, { title }) {
  console.log(`\n=== ${title} ===`);
  console.log(`PASS: ${report.passes.length}  FAIL: ${report.failures.length}  NOTES: ${report.reportsOnly.length}`);
  if (report.failures.length > 0) {
    console.log('\nFailures:');
    for (const f of report.failures) console.log(`  [FAIL] ${f.check}: ${f.detail}`);
  }
  if (report.reportsOnly.length > 0) {
    console.log('\nReport-only (not gating):');
    for (const n of report.reportsOnly) console.log(`  [NOTE] ${n.check}: ${n.detail}`);
  }
  console.log('\nPasses:');
  for (const p of report.passes) console.log(`  [OK] ${p.check}: ${p.detail}`);
}

// ---------------------------------------------------------------------------
// Negative-fixture self-test — proves the checks can fail. Pure in-memory:
// never writes to or mutates any real file on disk.
// ---------------------------------------------------------------------------

function selfTest() {
  const doctrineText = readFileSync(PATHS.doctrine, 'utf8');
  const stackText = readFileSync(PATHS.stack, 'utf8');
  const positionText = readFileSync(PATHS.position, 'utf8');
  const fresh = buildRegistries({ doctrineText, stackText, positionText });

  const results = [];
  function fixture(name, expectFail, fn) {
    const r = new Report();
    let threw = null;
    try {
      fn(r);
    } catch (e) {
      threw = e;
    }
    const failed = r.failures.length > 0 || threw !== null;
    const pass = expectFail ? failed : !failed;
    results.push({ name, expectFail, failed, pass, error: threw?.message });
  }

  // 1. alter doctrine byte -> fail
  fixture('alter doctrine byte -> seal check fails', true, (r) => {
    const mutated = `${doctrineText.slice(0, 100)}X${doctrineText.slice(101)}`;
    checkSeal(r, 'doctrine', mutated, readFileSync(PATHS.doctrineSeal, 'utf8'), 'DOCTRINE.md');
  });

  // 2. omit LED-04 from registry -> fail
  fixture('omit LED-04 from registry -> completeness fails', true, (r) => {
    const withoutLed04 = fresh.doctrineRegistry.rules.filter((x) => x.id !== 'LED-04');
    checkNoOmissionOrDuplication(r, 'doctrine-rules', idSet(withoutLed04), idSet(fresh.doctrineRegistry.rules));
  });

  // 3. alter rule_verbatim -> fail
  fixture('alter rule_verbatim, stale hash -> self-consistency fails', true, (r) => {
    const mutated = fresh.doctrineRegistry.rules.map((x) => (x.id === 'LED-04' ? { ...x, rule_verbatim: `${x.rule_verbatim} TAMPERED` } : x));
    checkRuleTextIntegrity(r, 'doctrine-rules', mutated, fresh.doctrineRegistry.rules, 'rule_verbatim');
  });

  // 4. omit V08 -> fail
  fixture('omit V08 -> V01-V18 completeness fails', true, (r) => {
    const withoutV08 = fresh.doctrineRegistry.verification_controls.filter((x) => x.id !== 'V08');
    checkExactIdRange(r, 'verification-controls', idSet(withoutV08), 'V', 18);
  });

  // 5. omit Forbidden #4 -> fail
  fixture('omit Forbidden #4 -> 1-20 completeness fails', true, (r) => {
    const withoutFour = fresh.doctrineRegistry.forbidden.filter((x) => x.number !== 4);
    checkExactNumberRange(r, 'forbidden', withoutFour.map((x) => x.number), 1, 20);
  });

  // 6. add second live DOCTRINE.md -> fail
  fixture('add second live DOCTRINE.md -> single-authority fails', true, (r) => {
    const fakeFiles = [...walk(ROOT), path.join(ROOT, 'packages', 'domain', 'DOCTRINE.md')];
    checkOnlyOneDoctrineAuthority(r, fakeFiles);
  });

  // 7. change Position extension taxonomy -> fail
  fixture('change Position §4 taxonomy -> EXT-02 mismatch fails', true, (r) => {
    const mutatedPositionKinds = fresh.parsed.p.extensionKinds.filter((k) => k !== 'view-slot');
    checkExtensionTaxonomyMatch(r, fresh.parsed.d.extensionKinds, mutatedPositionKinds);
  });

  // 8. map SEL to nonexistent SCC -> fail
  fixture('map SEL-01 to nonexistent SCC-99 -> dangling ref fails', true, (r) => {
    const mutatedSelections = fresh.stackRegistry.selections.map((x) =>
      x.id === 'SEL-01' ? { ...x, executable_controls: [...x.executable_controls, 'SCC-99'] } : x,
    );
    checkDanglingControlRefs(r, mutatedSelections, fresh.stackRegistry.controls);
  });

  // 9. change gist only -> must NOT fail (gist is non-normative)
  fixture('change gist only -> normative checks stay green', false, (r) => {
    const mutated = fresh.doctrineRegistry.rules.map((x) => (x.id === 'LED-04' ? { ...x, gist: 'completely different compressed text' } : x));
    checkRuleTextIntegrity(r, 'doctrine-rules', mutated, fresh.doctrineRegistry.rules, 'rule_verbatim');
    checkGistNeverExceedsSource(r, 'doctrine-rules', mutated, 'rule_verbatim');
  });

  console.log('\n=== Negative-fixture self-test (in-memory only; no files touched) ===');
  let allPass = true;
  for (const res of results) {
    const status = res.pass ? 'PASS' : 'FAIL';
    if (!res.pass) allPass = false;
    console.log(`  [${status}] ${res.name} (expected ${res.expectFail ? 'FAIL-detected' : 'no-fail'}, got ${res.failed ? 'FAIL-detected' : 'no-fail'})`);
  }
  console.log(`\nSelf-test result: ${allPass ? 'ALL FIXTURES BEHAVED AS EXPECTED' : 'SOME FIXTURES DID NOT BEHAVE AS EXPECTED'}`);
  return allPass;
}

// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
if (args.includes('--self-test')) {
  const ok = selfTest();
  process.exit(ok ? 0 : 1);
} else {
  const report = runLiveGate();
  printReport(report, { title: 'AFENDA authority integrity gate' });
  process.exit(report.failures.length === 0 ? 0 : 1);
}
