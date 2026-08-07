# AFENDA Authority-Layer Consolidation Report

**Date:** 2026-08-08
**Scope:** Documentation/governance layer only (doctrine, stack, position, and their machine projections). No file under `packages/`, `apps/`, or `db/` existed at consolidation time and none was created by this work.
**Operator:** Cursor agent, on explicit instruction.

---

## 1. Summary

The prior state was a flat `.reference-docs/` folder holding three independently-produced authority documents (`AFENDA_EVIDENCE_BACKED_DOCTRINE.md`, `AFENDA_FINAL_TECH_STACK/STACK.md`, `POSITION.md`) plus a bundle of supporting adoption/validation/rendering artifacts. Two of the three documents had no integrity seal. The doctrine document's own internal cross-references called itself `DOCTRINE.md`, but the file on disk was named `AFENDA_EVIDENCE_BACKED_DOCTRINE.md` — a live filename drift against the doctrine's own §17.1 ratification instructions and §20 (Forbidden #20: "Loading a doctrine authority other than this hash-matched file").

This consolidation:

- Established `doctrine/`, `stack/`, `position/` as the three canonical, sealed, verbatim source-of-truth locations.
- Generated `governance/*.json` as deterministic, byte-stable, read-only projections of that verbatim text — never independently authored.
- Wrote a deterministic writer (`scripts/build-authority-registry.mjs`) and a read-only verifier (`scripts/check-authority-integrity.mjs`) that share one parsing module (`scripts/lib/authority-parser.mjs`) so the two can never drift apart.
- Archived the entire original bundle byte-for-byte under `governance/history/2026-08-07-stack-bundle/` before touching anything.
- Removed the old standing-authority discovery path (`.reference-docs/`) only after the integrity gate passed cleanly against the new canonical layout.

No normative wording was rewritten, summarized, or "improved" anywhere in this consolidation.

---

## 2. Every rename

| Old path | New path | Verified |
|---|---|---|
| `.reference-docs/AFENDA_EVIDENCE_BACKED_DOCTRINE.md` | `doctrine/DOCTRINE.md` | SHA-256 byte-identical |

This is the only rename. It resolves the filename drift the doctrine text itself calls out (the doctrine refers to itself as `DOCTRINE.md` throughout §17 and §20, Forbidden #20).

## 3. Every file moved (copied verbatim, byte-identical)

| Old path | New path |
|---|---|
| `.reference-docs/POSITION.md` | `position/POSITION.md` |
| `.reference-docs/AFENDA_FINAL_TECH_STACK/STACK.md` | `stack/STACK.md` |
| `.reference-docs/AFENDA_FINAL_TECH_STACK/STACK.sha256` | `stack/STACK.sha256` |
| `.reference-docs/AFENDA_FINAL_TECH_STACK/STACK_CONTROL_MAP.json` | `stack/STACK_CONTROL_MAP.json` |
| `.reference-docs/AFENDA_FINAL_TECH_STACK/VERSION_BASELINE.json` | `stack/VERSION_BASELINE.json` |
| `.reference-docs/AFENDA_FINAL_TECH_STACK/SOURCE_REGISTER.md` | `stack/SOURCE_REGISTER.md` |

Every one of these six copies was verified byte-identical (SHA-256 match against the source) before the original was ever deleted.

## 4. Every file created (new, not a move)

| Path | Purpose |
|---|---|
| `doctrine/DOCTRINE.sha256` | Missing integrity seal, generated (doctrine had none in the source bundle) |
| `position/POSITION.sha256` | Missing integrity seal, generated (position had none in the source bundle) |
| `stack/STACK_ADOPTION.md` | Consolidation of `README.md` + `FINAL_APPROVAL.md` + `VALIDATION.md` + `ADOPTION_CHECKLIST.md`, qualifiers preserved verbatim, not caveman-compressed |
| `governance/authority-index.json` | Generated projection |
| `governance/doctrine-registry.json` | Generated projection |
| `governance/stack-registry.json` | Generated projection |
| `governance/position-registry.json` | Generated projection |
| `governance/CONSOLIDATION_REPORT.md` | This file |
| `scripts/lib/authority-parser.mjs` | Shared deterministic parser used by both the writer and the checker |
| `scripts/build-authority-registry.mjs` | Deterministic writer |
| `scripts/check-authority-integrity.mjs` | Read-only integrity gate + negative-fixture self-test |
| `README.md` (repository root) | Top-level navigation index |

## 5. Every file removed from live authority

| Path | Disposition |
|---|---|
| `.reference-docs/AFENDA_EVIDENCE_BACKED_DOCTRINE.md` | Removed from live tree; retained verbatim under `governance/history/2026-08-07-stack-bundle/AFENDA_EVIDENCE_BACKED_DOCTRINE.md` |
| `.reference-docs/POSITION.md` | Removed from live tree; retained verbatim under `governance/history/2026-08-07-stack-bundle/POSITION.md` |
| `.reference-docs/AFENDA_FINAL_TECH_STACK/**` (all 12 files, incl. `.docx`, `.pdf`, `BUNDLE_MANIFEST.json`, `README.md`, `FINAL_APPROVAL.md`, `VALIDATION.md`, `ADOPTION_CHECKLIST.md`) | Removed from live tree; retained verbatim under `governance/history/2026-08-07-stack-bundle/AFENDA_FINAL_TECH_STACK/` |
| `.reference-docs/AFENDA_FINAL_TECH_STACK.zip.sha256` | Removed from live tree; retained verbatim under `governance/history/2026-08-07-stack-bundle/AFENDA_FINAL_TECH_STACK.zip.sha256` |

Deletion order followed the required sequence: (1) build registries, (2) run the integrity gate, (3) confirm 0 omissions/duplications across every completeness check, (4) only then remove `.reference-docs/`. The gate was run once with `.reference-docs/` still present (1 failure: `single-doctrine-authority`, correctly detecting the still-live duplicate) and once immediately after removal (0 failures). See §9.

## 6. Every historical artifact retained

The complete, unmodified original bundle (14 files) is preserved at `governance/history/2026-08-07-stack-bundle/`, verified byte-identical to the pre-consolidation `.reference-docs/` tree at archive time. This includes the two generated renditions (`.docx`, `.pdf`), the old `BUNDLE_MANIFEST.json`, and the dangling ZIP checksum file (§8). Nothing was silently deleted; everything that left the live tree exists in this archive.

## 7. Doctrine filename drift

Documented in §2 above. The doctrine's own text (§1 front matter, §17.1, and Forbidden #20) refers to the canonical file as `DOCTRINE.md`. The supplied file was named `AFENDA_EVIDENCE_BACKED_DOCTRINE.md`. This is now resolved: `doctrine/DOCTRINE.md` is the sole live doctrine authority, and `scripts/check-authority-integrity.mjs` gates on there being exactly one file matching a doctrine-authority name pattern outside `governance/history/`.

## 8. Missing Doctrine/Position seals (as found) and orphaned §15 implementation evidence

- **Missing seals at intake:** `AFENDA_EVIDENCE_BACKED_DOCTRINE.md` and `POSITION.md` had no `.sha256` seal file anywhere in the supplied bundle. Only `STACK.md` had one (`STACK.sha256`). This consolidation generated `doctrine/DOCTRINE.sha256` and `position/POSITION.sha256` in the same `<sha256>␠␠<filename>` format as the pre-existing `STACK.sha256`.
- **Doctrine §15.4 orphaned evidence:** the doctrine's own §15 ("Evidence and honesty") records 9 RED findings (RED-01 through RED-09) against a prior implementation snapshot that is not present anywhere in this repository (no `packages/`, `apps/`, or `db/` exist). These findings map to 15 constitutional rules: `GOV-05, LED-01, LED-04, LED-05, LED-06, LED-07, LED-08, LED-09, MON-01, MON-06, SEC-01, SEC-03, SEC-04, DET-06, OPS-01`. Per the user's explicit instruction, each of these rules keeps `rule_status: "active"` (the constitutional rule itself is never marked orphaned) while its `evidence_status` is set to `"historical-orphaned"` in `governance/doctrine-registry.json`, with the originating RED-finding text attached under `historical_orphan_refs`. `scripts/check-authority-integrity.mjs` reports this every run as a non-failing note; it does not gate on it.

## 9. Dangling ZIP checksum

`.reference-docs/AFENDA_FINAL_TECH_STACK.zip.sha256` recorded a SHA-256 for `AFENDA_FINAL_TECH_STACK.zip`, a file that did not exist anywhere in the supplied bundle (only the unzipped `AFENDA_FINAL_TECH_STACK/` folder was present). This is an orphaned checksum with no target. It has been preserved verbatim at `governance/history/2026-08-07-stack-bundle/AFENDA_FINAL_TECH_STACK.zip.sha256` and is no longer discoverable from the live tree. While `.reference-docs/` still existed, the integrity gate reported this as a non-failing note on every run; after removal, the note no longer fires because the file is no longer live (this is expected and correct — the note is scoped to live-tree discovery, not to history).

## 10. Cross-document checks performed

| Check | Method | Result |
|---|---|---|
| Doctrine SHA-256 seal | Recompute vs. `doctrine/DOCTRINE.sha256` | Match |
| Stack SHA-256 seal | Recompute vs. `stack/STACK.sha256` | Match |
| Position SHA-256 seal | Recompute vs. `position/POSITION.sha256` | Match |
| Exactly one live doctrine authority | Filesystem scan (excludes `governance/history/`) | Pass |
| Generated registries vs. fresh regeneration | Byte comparison, 4 files | Byte-identical, all 4 |
| Doctrine rule completeness (no omission/duplication) | ID-set comparison, source parse vs. committed registry | 63/63, no gaps, no dupes |
| V01–V18 completeness | Exact-range check | 18/18 present exactly once |
| Forbidden #1–#20 completeness | Exact-range check | 20/20 present exactly once |
| SEL-01…27 completeness | Exact-range check | 27/27 present exactly once |
| SCC-01…27 completeness | Exact-range check | 27/27 present exactly once |
| SEL→SCC / SCC→SEL dangling references | Bidirectional graph check | No dangling references |
| Rule/selection/obligation text self-consistency | `rule_text_sha256 === sha256(verbatim)` for all 97 entries | All consistent |
| Rule/selection/obligation text vs. fresh source parse | Direct string equality, all 97 entries | All match |
| `gist` never authoritative | `gist.length <= verbatim.length` for all 97 entries | Holds for all |
| Stack precedence vs. doctrine | Verbatim substring check: "Where the two conflict, the doctrine wins." in `stack/STACK.md` | Present |
| Position non-override vs. doctrine/stack | Verbatim substring check: "not a third technical authority" / "this document loses" in `position/POSITION.md` | Present |
| EXT-02 (doctrine) vs. §4 (position) extension taxonomy | Independent extraction from both documents, set comparison | Identical 6-item set: `hook, policy, field-extension, view-slot, document-type, scheduled-operation` |

Negative-fixture self-test (`node scripts/check-authority-integrity.mjs --self-test`), 9/9 fixtures behaved as required, in-memory only (no file on disk was ever mutated):

| Fixture | Expected | Observed |
|---|---|---|
| Alter one byte of doctrine text | Seal check fails | Failed as expected |
| Omit LED-04 from registry | Completeness check fails | Failed as expected |
| Alter `rule_verbatim`, leave stale hash | Self-consistency check fails | Failed as expected |
| Omit V08 | V01–V18 range check fails | Failed as expected |
| Omit Forbidden #4 | 1–20 range check fails | Failed as expected |
| Add a second live `DOCTRINE.md` | Single-authority check fails | Failed as expected |
| Remove one kind from Position §4 taxonomy | EXT-02 cross-check fails | Failed as expected |
| Map `SEL-01` to nonexistent `SCC-99` | Dangling-reference check fails | Failed as expected |
| Change `gist` only, leave verbatim/hash untouched | No check fails (gist is non-normative) | No failure, as expected |

## 11. Final generated object counts

| Registry | Counts |
|---|---|
| `governance/doctrine-registry.json` | 63 rules, 18 verification controls (V01–V18), 20 forbidden items, 4 authority classes, 7 evidence grades, 5 gate-cadence rows, 9 historical-orphan findings |
| `governance/stack-registry.json` | 27 selections (SEL-01…27), 27 controls (SCC-01…27), 13 explicit rejections, 4 escape hatches, 6 version-policy items, 5 gate-cadence rows |
| `governance/position-registry.json` | 7 obligations (POS-01…07), 6 compatibility result classes, 7 evidence-ladder grades, 4 approved-messaging sections, 8 revisit triggers |
| `governance/authority-index.json` | 3 documents indexed (doctrine, stack, position) |

## 12. Final SHA-256 values

| File | SHA-256 |
|---|---|
| `doctrine/DOCTRINE.md` | `a2dc5e59ed36293f3678622d4c2a2518863e739525a054a39e6f3dc456042ec2` |
| `stack/STACK.md` | `0db072117f1eac486e4cc56b1472b8b192c290ac42c7653a00349ebe93c10b65` |
| `position/POSITION.md` | `03846a9754277fbd7e7f5f2c99d8f1029d83b7cf2feb8ad1471a60a9c9ee5221` |

(`stack/STACK.md`'s hash is unchanged from the original `STACK.sha256` supplied in the bundle — recomputation confirmed the pre-existing seal, it was not regenerated with a new value.)

## 13. Commands executed and exit codes

| Command | Exit code | Notes |
|---|---|---|
| `node scripts/build-authority-registry.mjs` (first run) | 0 | Generated all 4 registries |
| `node scripts/build-authority-registry.mjs` (re-run, determinism check) | 0 | Byte-identical to first run |
| `node scripts/build-authority-registry.mjs` (re-run, post-refactor to shared lib) | 0 | Byte-identical to pre-refactor output |
| `node scripts/check-authority-integrity.mjs --self-test` (first run) | 0 | 9/9 fixtures passed |
| `node scripts/check-authority-integrity.mjs` (with `.reference-docs/` still live) | 1 | 21 pass / 2 fail — `single-doctrine-authority` (expected, old path still live) and `position-non-override` (checker bug: markdown bold not stripped) |
| `node scripts/check-authority-integrity.mjs --self-test` (after fixing markdown-bold handling) | 0 | 9/9 fixtures still passed |
| `node scripts/check-authority-integrity.mjs` (with `.reference-docs/` still live, after fix) | 1 | 22 pass / 1 fail — only `single-doctrine-authority` remained, as expected |
| `Remove-Item -Recurse -Force ".reference-docs"` | 0 | Executed only after the above confirmed no normative object was missing |
| `node scripts/check-authority-integrity.mjs` (final, post-prune) | 0 | 23 pass / 0 fail / 2 report-only notes |

## 14. Unresolved ambiguity

None that changes normative authority. One item worth flagging for a human decision, not resolved here because it does not affect authority precedence or rule content:

- **Stack adoption is not yet complete.** `stack/STACK_ADOPTION.md` §3 (the adoption checklist) has every item unchecked, exactly as supplied in the original `ADOPTION_CHECKLIST.md`. This consolidation did not check any item and does not claim the stack is repository authority — per `stack/STACK.md` §12 and the authority rule stated by the user, that requires completing the checklist and enforcing `stack/STACK.sha256` in CI, which is outside this consolidation's scope (no CI pipeline exists yet in this repository).
