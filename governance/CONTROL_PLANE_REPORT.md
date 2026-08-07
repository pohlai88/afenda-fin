# AFENDA Phase 2 — Control Plane Report

**Phase:** establish the minimal repository control plane required for evidence-based stack adoption.
**Date:** 2026-08-08
**Baseline used:** commit `09e7e6ed7eb3e202fd78f1e08dc93a8a5fb1be26`, tag `authority-baseline-v1` (clean tree, authority integrity 23 PASS / 0 FAIL / 2 report-only notes at start).
**Explicit statement:** This phase establishes tooling/governance infrastructure only. It does **not** establish E5 deployment qualification or E6 operational proof, and it does **not** constitute application readiness. No `apps/`, `packages/`, or `db/` code was created. Stack adoption is **not** declared by this phase.

---

## 1. Files introduced (20 changed; 19 new, 1 modified)

| Path | Purpose |
| --- | --- |
| `package.json` | Root manifest: exact `engines.node`, exact `packageManager`, exact-pinned devDependencies, script wiring. |
| `pnpm-lock.yaml` | Frozen lockfile (committed). |
| `pnpm-workspace.yaml` | Forward-declared workspace globs (`apps/*`, `packages/*`); 0 packages currently match. |
| `.node-version` | `24.18.0`, exact match to `stack/VERSION_BASELINE.json`. |
| `turbo.json` | Task graph scaffold (schema-valid; see §4 caveat — currently orchestrates 0 tasks). |
| `tsconfig.base.json` | SEL-01 binding-constraint compiler options (strict family + `noEmit`). |
| `tsconfig.json` | Project scope: Phase 2 tooling only (see §3). |
| `eslint.config.mjs` | Type-aware flat ESLint config (`typescript-eslint` recommendedTypeChecked), scoped to Phase 2 tooling. |
| `.dependency-cruiser.cjs` | SCC-05 rule scaffold; not yet exercised (no packages exist). |
| `.github/workflows/gate.yml` | CI workflow: exact Node assertion, frozen install, `pnpm gate`, `pnpm red`. |
| `scripts/verify-toolchain-baseline.mjs` | Executable SCC-04 check against `stack/VERSION_BASELINE.json`. |
| `scripts/gate.mjs` | Control dispatcher (`pnpm gate`). |
| `scripts/red.mjs` | Red harness (`pnpm red`). |
| `scripts/lib/control-map.mjs` | Shared, read-only control-map/dependency-pin structural checks. |
| `scripts/generate-agent-docs.mjs` | Deterministic generator for `governance/rules.json`, `.cursor/rules/afenda.mdc`, `AGENTS.md`. |
| `governance/rules.json` | Generated agent-facing rules data (source for the two files below). |
| `.cursor/rules/afenda.mdc` | Generated Cursor rule (superseding a stale cached rule from before the repository reset — see §8). |
| `AGENTS.md` | Generated generic agent instructions (same source as the Cursor rule). |
| `governance/control-implementation.json` | SCC-01..27 and V01..18 implementation-state matrix. |
| `stack/STACK_ADOPTION.md` (modified) | 9 checklist items ticked with evidence; new §6 appended. Original wording untouched. |

`doctrine/DOCTRINE.md`, `stack/STACK.md`, `position/POSITION.md` and their seals were **not** modified. `governance/doctrine-registry.json`, `stack-registry.json`, `position-registry.json`, `authority-index.json` regenerate byte-identically (verified — see §6).

---

## 2. Toolchain versions selected

| Component | Pin | Source |
| --- | --- | --- |
| Node.js | `24.18.0` (exact) | `stack/VERSION_BASELINE.json` `runtime.node.reference_patch` |
| TypeScript native (`tsc`, package `@typescript/native`) | `npm:typescript@7.0.2` (exact) | `stack/VERSION_BASELINE.json` `compiler.typescript_native.reference_patch` |
| TypeScript compat (`tsc6`, package `typescript` aliased) | `npm:@typescript/typescript6@6.0.2` (exact) | `stack/VERSION_BASELINE.json` `compiler.typescript_compat.reference_patch` |
| pnpm | `11.20.0` (exact) | **Not pinned by VERSION_BASELINE.json.** Explicit, documented gap-fill: pinned to the version present in the qualification environment. Recorded here and in `scripts/verify-toolchain-baseline.mjs` output, not silently resolved. |
| Turborepo | `2.10.8` (exact) | Not pinned by VERSION_BASELINE.json either; same documented gap-fill policy. Current npm-registry release at Phase 2 time. |
| eslint / @eslint/js / typescript-eslint / dependency-cruiser / @types/node / globals | `10.8.0` / `10.0.1` / `8.66.0` / `18.1.1` / `24.9.2` / `17.9.0` (all exact) | Governed by `VERSION_BASELINE.json`'s catch-all `"libraries": "... exact patch from lockfile"` policy — these are tooling libraries outside the named list; each is pinned to the current npm-registry release at install time and committed exactly in `pnpm-lock.yaml`. |

**Open finding, recorded not hidden:** the installed `@typescript/typescript6@6.0.2` package's `tsc6` binary self-reports `Version 6.0.3`, even though the npm package version pin is exactly `6.0.2` as required. This is an upstream wrapper/compiler discrepancy. `scripts/verify-toolchain-baseline.mjs` checks the npm package version (which matches exactly) and prints this discrepancy as a note; it does not hide it and does not fail the check on it, since the authority's binding requirement is the exact package pin, which is satisfied.

**Open finding, recorded not hidden:** `turbo.json` is schema-valid (`turbo run gate:authority --dry` succeeds) but currently orchestrates **0 tasks**, because `pnpm-workspace.yaml` matches 0 packages. `pnpm gate` therefore invokes the underlying scripts directly via `node`/`pnpm run`, not via `turbo run`. Turborepo will become functional once `apps/`/`packages/` exist.

---

## 3. TypeScript `noEmit` conflict — resolved without contradiction

SEL-01's binding constraints (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `useUnknownInCatchVariables`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`, `verbatimModuleSyntax`, `isolatedModules`, `noEmit`) are all enabled exactly in `tsconfig.base.json`. No tool in this phase required emit or project-reference output: the governance scripts run directly as `.mjs` (Node's native ESM loader), and `checkJs`/`allowJs` let TypeScript type-check them under `noEmit: true` with zero build step. **No conflict was found; nothing was stopped or deferred on this axis.**

A real, separate finding did surface during typechecking (see §5): running strict `checkJs` against the pre-existing Phase 1 authority scripts (`scripts/build-authority-registry.mjs`, `scripts/check-authority-integrity.mjs`, `scripts/lib/authority-parser.mjs`) produces roughly 180 genuine implicit-`any` / unchecked-index errors, because those files predate this governance-language requirement. `tsconfig.json`'s `include` list deliberately excludes them, with the reason recorded in the config file itself and in §5 below — this is a documented scope decision, not a silent one, and not a `noEmit`/emit conflict.

---

## 4. SCC-01..SCC-27 state matrix

Full detail with gate commands, evidence paths and red fixtures: `governance/control-implementation.json`.

| State | Count | IDs |
| --- | --- | --- |
| implemented | 2 | SCC-04, SCC-27 |
| partial | 2 | SCC-01, SCC-02 |
| not-yet-built | 22 | SCC-03, SCC-06..SCC-21, SCC-23..SCC-26 |
| blocked | 0 | — |
| not-applicable-current-tree | 1 | SCC-22 |

## 5. V01..V18 state matrix

| State | Count | IDs |
| --- | --- | --- |
| implemented | 0 | — |
| partial | 1 | V14 (governance-registry layer only; see note below) |
| not-yet-built | 17 | V01..V13, V15..V18 |
| blocked | 0 | — |
| not-applicable-current-tree | 0 | — |

**V14 note:** "Provenance and reproducibility" (must prove: complete bundle and byte-stable deterministic expansion) is genuinely satisfied for the governance-registry generation layer — `scripts/build-authority-registry.mjs` regenerates `governance/*.json` byte-identically from the committed doctrine/stack/position Markdown, and `scripts/check-authority-integrity.mjs`'s registry-drift checks are the executable red condition. It is explicitly **not** satisfied for the application/financial layer (no migrations, no ledger, no generators exist there yet). Marking the whole doctrine control "implemented" would overstate reality; `partial` is the accurate state.

**Combined summary:** implemented 2, partial 3, not-yet-built 39, blocked 0, not-applicable-current-tree 1 (out of 45 total controls). This matches the live output of `pnpm gate`.

---

## 6. Executable gates now present

| Command | Purpose |
| --- | --- |
| `pnpm run build:authority-registry` | Regenerate the 4 Phase 1 governance registries (unchanged logic). |
| `pnpm run gate:authority` | Read-only authority integrity check (unchanged logic; now also a package script). |
| `pnpm run gate:authority:self-test` | 9 authority negative fixtures (unchanged logic; now also a package script). |
| `pnpm run verify:toolchain` | SCC-04: exact toolchain pins vs `stack/VERSION_BASELINE.json`. |
| `pnpm run typecheck:native` | `tsc` (TypeScript 7.0.2 native), strict, against Phase 2 tooling scope. |
| `pnpm run typecheck:native:single` | Same, with `--singleThreaded` (SEL-02 single-threaded parity lane; flag confirmed via `tsc --help --all`). |
| `pnpm run typecheck:compat` | `tsc6` (TypeScript 6 compatibility), same scope. |
| `pnpm run lint` | Type-aware ESLint (`@typescript-eslint/no-explicit-any`, `ban-ts-comment`, etc.), same scope. |
| `pnpm run agent-docs` | Deterministic regeneration of `governance/rules.json`, `.cursor/rules/afenda.mdc`, `AGENTS.md`. |
| `pnpm gate` | Dispatcher: authority build+integrity, toolchain baseline, static governance controls, control-map completeness, dependency-pin policy, red-fixture registration. Distinguishes PASS/FAIL and reports the SCC/V state summary as non-gating information. |
| `pnpm red` | Red harness: delegates to the 9 authority self-test fixtures, plus 4 new Phase 2 fixtures (toolchain-mismatch, control-map-incomplete, dependency-range-injected, lint-ts-suppression). |

**Verification run immediately before writing this report (all commands, in order, with exit codes):**

```
node scripts/build-authority-registry.mjs                       -> exit 0
node scripts/check-authority-integrity.mjs                       -> exit 0 (23 PASS / 0 FAIL / 2 notes)
node scripts/check-authority-integrity.mjs --self-test           -> exit 0 (9/9 fixtures as expected)
pnpm run gate:authority                                           -> exit 0
pnpm run gate:authority:self-test                                 -> exit 0
pnpm run verify:toolchain                                          -> exit 0 (5/5 OK)
pnpm run typecheck:native                                         -> exit 0
pnpm run typecheck:native:single                                  -> exit 0
pnpm run typecheck:compat                                         -> exit 0
pnpm run lint                                                      -> exit 0
pnpm run agent-docs (run twice, byte-identical by sha256)          -> exit 0
pnpm gate                                                          -> exit 0 (Overall gate: PASS)
pnpm red                                                           -> exit 0 (13/13 fixtures as expected)
```

Full authority registries were re-diffed against a fresh regeneration and are byte-identical; `doctrine/DOCTRINE.md`, `stack/STACK.md`, `position/POSITION.md` and their `.sha256` seals are untouched (seal hashes identical to the Phase 1 baseline report).

---

## 7. Red fixtures present (13 total)

Delegated, unchanged from Phase 1 (`check-authority-integrity.mjs --self-test`): alter doctrine byte; omit LED-04; alter `rule_verbatim`; omit V08; omit Forbidden #4; add second live `DOCTRINE.md`; change Position §4 taxonomy; map SEL-01 to nonexistent SCC-99; change gist only (must **not** fail).

New in Phase 2 (`scripts/red.mjs`): toolchain-mismatch (injected wrong `reference_patch` values); control-map-incomplete (only SCC-01/V01 present); dependency-range-injected (`^7.0.2`, `"latest"`); lint-ts-suppression (`@ts-ignore` + JSDoc `any`).

**Coverage gap, recorded not hidden:** no fixture specifically corrupts `STACK.sha256` or `POSITION.sha256` by name (only the doctrine-named one is explicit in the self-test list), even though the same `checkSeal` code path seals all three documents. `typecheck:native`/`typecheck:compat` also have no dedicated fixture proving an injected *type* error is caught (only the lint-suppression fixture exists for that control). Both gaps are recorded in `governance/control-implementation.json` (`SCC-27`, `SCC-01`) with a `revisit_trigger`.

---

## 8. Discrepancy found and corrected: stale cached agent rule

At the start of this phase, an `.cursor/rules/afenda.mdc` rule was present in the assistant's injected context, declaring itself generated from `governance/rules.json` via `pnpm agent-docs`. Neither the file nor `governance/rules.json` existed anywhere in the actual working tree (confirmed by direct filesystem search) — it was a stale artifact from a prior session, predating the repository deletion described in earlier phases. This phase built the real mechanism it described: `scripts/generate-agent-docs.mjs` now deterministically produces `governance/rules.json`, `.cursor/rules/afenda.mdc`, and `AGENTS.md` from `governance/authority-index.json`, scoped to the *current* repository reality (no `packages/domain` etc. references, since none exist) rather than reproducing the stale file's aspirational, already-built-out layout table.

---

## 9. Stack adoption checklist — item-by-item outcome

**Ticked in this phase (9 items), each with mechanical evidence, cross-referenced above:**

- [x] Commit `STACK.md`, `STACK.sha256`, `STACK_CONTROL_MAP.json`, `VERSION_BASELINE.json` and `SOURCE_REGISTER.md` under one canonical `stack/` path. — `git ls-tree -r 09e7e6ed7eb3e202fd78f1e08dc93a8a5fb1be26 stack/` shows all five, unchanged since Phase 1.
- [x] Add a CI check that rejects any stack authority whose SHA-256 differs from `STACK.sha256`. — `.github/workflows/gate.yml` runs `pnpm gate` → `check-authority-integrity.mjs`'s `seal:stack` check; the shared `checkSeal` code path is proven to fail on mutation via the self-test's doctrine-seal fixture (see §7 coverage-gap note: no *stack*-named fixture yet).
- [x] Mark prior stack drafts as non-authoritative or remove them from standing-context discovery. — Done in Phase 1 (`.reference-docs` removed, old bundle archived under `governance/history/`); reconfirmed still true (`single-doctrine-authority` and equivalent checks still pass).
- [x] Install exact TypeScript 7 native and TypeScript 6 compatibility aliases. — §2 above; `pnpm run verify:toolchain` PASS.
- [x] Add `typecheck:native`, `typecheck:native:single`, `typecheck:compat` and type-aware lint scripts. — All four exist in `package.json` and pass (§6).
- [x] Pin pnpm exactly in `packageManager`; commit the frozen lockfile. — `package.json` `packageManager: "pnpm@11.20.0"`; `pnpm-lock.yaml` committed.
- [x] Reject unapproved dependency ranges and lockfile drift. — `scripts/lib/control-map.mjs` `checkDependencyPinsAreExact`, wired into `pnpm gate` step 5b, red-fixture-proven; `pnpm install --frozen-lockfile` in CI rejects drift.
- [x] Add SCC-01 through SCC-27 to CI or a machine-readable governance dispatcher. — `governance/control-implementation.json` (all 27 present) + `scripts/gate.mjs` (dispatcher) + `.github/workflows/gate.yml` (CI wiring). This ticks the *tracking/wiring* requirement; it does not claim the controls are all green (22 of 27 are honestly `not-yet-built`).

**Explicitly left unchecked, with reason:**

- [ ] Record the adopter, date and repository commit. — No ratification event has occurred; this is a human act, not a file-existence fact.
- [ ] Pin Node 24 LTS exactly in `.node-version`, CI and container image. — 2 of 3 sub-requirements met (`.node-version`, CI assertion); no container image exists in this phase, so the compound item is not fully satisfied.
- All Database, API/frontend, Identity/jobs/effects items — no db/api/frontend/identity/worker/outbox code exists.
- Verification section's remaining items (PGlite, Testcontainers, mutants, Playwright, clean qualification from lockfile+digests) — none of that infrastructure exists yet.
- All Deployment/BI/operations items — no containers, no reporting schemas, no BI role, no OpenTelemetry integration exist.
- All Final adoption items, including the ratifier signature block — no ratification event; `VALIDATION.md`'s §4 results are Phase 1 document-only results, not re-run against new implementation.

**This is not a stack adoption event.** See `stack/STACK_ADOPTION.md` §6, appended this phase.

---

## 10. Unresolved findings (carried forward, not resolved by assumption)

1. `stack/VERSION_BASELINE.json` does not pin an exact pnpm or Turborepo version — resolved for this phase with documented, visible gap-fill pins (§2), not silently.
2. `@typescript/typescript6@6.0.2`'s `tsc6` binary self-reports `Version 6.0.3` — recorded, not investigated upstream in this phase.
3. Phase 1 authority scripts are not yet strict-TypeScript/checkJs-covered — real ~180-error finding, deliberately scoped out this phase rather than risking behavioral drift in load-bearing logic (§3, §5, `governance/control-implementation.json` SCC-01).
4. `turbo.json` currently orchestrates 0 tasks (0 workspace packages exist) — scaffolded, not functional yet (§2).
5. `.dependency-cruiser.cjs` is a rule scaffold only; SCC-05 remains `not-yet-built` because there is no module graph to exercise it against (a trivial zero-violation run over an empty tree is not counted as evidence).
6. `.github/workflows/gate.yml` has not been observed executing on a live GitHub Actions runner from this environment — the workflow file is present and its commands are identical to what was verified locally, but "CI-verified" in SCC-04's evidence is qualified with this caveat.
7. No dedicated red fixture corrupts `STACK.sha256`/`POSITION.sha256` by name, and no dedicated red fixture proves `typecheck:native`/`typecheck:compat` catch a real injected type error (only lint-suppression is fixture-proven for SCC-01) — both recorded as `revisit_trigger`s in `governance/control-implementation.json`.

None of these findings required a normative-authority decision (Doctrine/Stack/Position wording), so none were escalated as authority conflicts; all are repository-tooling findings recorded for the next phase.

---

# AFENDA Phase 2.1 — Control Plane Hardening Addendum

**Phase:** close or accurately downgrade the remaining Phase 2 control-plane findings before application reconstruction.
**Date:** 2026-08-08
**Baseline used:** commit `2ca9f1398116a5f3b6c472dec30edee29175b2e3` ("build(governance): establish AFENDA control plane"), parent `09e7e6ed7eb3e202fd78f1e08dc93a8a5fb1be26` (tag `authority-baseline-v1`, unmoved). Preflight confirmed clean tree, `pnpm gate` PASS, `pnpm red` 13/13, authority integrity 23 PASS / 0 FAIL / 2 report-only notes.
**Explicit statement, unchanged from Phase 2:** this phase establishes tooling/governance infrastructure only. It does **not** establish E5 deployment qualification or E6 operational proof, and it does **not** constitute application readiness. No `apps/`, `packages/`, or `db/` code was created. **Stack adoption is not declared by this phase.**

## 11. SCC-01 through SCC-27 stack-adoption checkbox — decision reversed

Re-read the exact wording of the checklist item: *"Add SCC-01 through SCC-27 to CI or a machine-readable governance dispatcher."*

Phase 2 ticked this item on the reasoning that all 27 states are registered in `governance/control-implementation.json`, reported by `scripts/gate.ts`, and wired into `.github/workflows/gate.yml`. Re-examined in Phase 2.1: the wording supports two readings —

1. **Registration/reporting reading:** all 27 controls are represented, tracked, and visible via a machine-readable dispatcher. Satisfied.
2. **Executable-dispatch reading:** all 27 controls are actually dispatched (i.e., each one has a real, running check as part of `pnpm gate`/CI). **Not satisfied** — 22 of 27 are honestly `not-yet-built` with `gate: null`, because the underlying implementation (database, API, frontend, identity, jobs, outbox, etc.) does not exist yet.

The wording does not clearly say which reading is intended, and stretching it toward reading 1 to preserve a checkbox would itself be exactly the kind of assumption the governing instructions prohibit. **Decision: reverted to unchecked** in `stack/STACK_ADOPTION.md` §3 (with a footnote) and §7 (new section explaining the reversal). This is evidence correction, not a regression — the underlying `governance/control-implementation.json` and `scripts/gate.ts` are unchanged in capability by this decision; only the checklist interpretation was corrected.

## 12. SEL-01 governance-language alignment — `.mjs` → `.ts` migration completed

**Finding investigated:** SEL-01 requires strict TypeScript for "domain, API, worker, transport schemas, metadata, generators, frontend, tests AND GOVERNANCE." All 8 governance scripts were `.mjs` with JSDoc-based `checkJs` typing (Phase 2 scripts) or completely untyped (Phase 1 scripts, deliberately excluded from `tsconfig.json`). Strict `checkJs` is useful evidence but does not make JavaScript into TypeScript; this was a real, not cosmetic, alignment gap.

**Investigation (disposable fixture, outside the repository, at `%TEMP%\afenda_ts_probe`):**

1. `node --version` → `v24.18.0`. `node --help` shows `--experimental-strip-types, --no-strip-types` — the `--no-` negation form indicates the feature is **enabled by default**, not opt-in.
2. Ran a `.ts` file with `interface`, exported `type`, a relative import of another local `.ts` file using an **explicit `.ts` extension**, `fs.readFileSync` + `JSON.parse` for JSON data, and a user-defined type guard — with **zero CLI flags** — under `node probe.ts`. Exit 0, correct output, and the probe directory contained **no emitted artifacts** afterward (confirmed by directory listing).
3. Ran a second probe exercising a `class` with typed fields, a generic function, and a union type alias (`Maybe<T>`) — same result, zero flags, exit 0.
4. Pointed the repository's own pinned compilers (`tsc` 7.0.2 native, `tsc6` 6.0.3-engine compat) at the probe files with the exact `tsconfig.base.json` strict option set plus `noEmit: true`. Both **failed** on `TS5097: An import path can only end with a '.ts' extension when 'allowImportingTsExtensions' is enabled` — proving the feature must be explicitly turned on for our strict config, which is exactly what TypeScript's own gating for this workflow expects.
5. Added `"allowImportingTsExtensions": true` (permitted together with `noEmit: true`, which was already set) → both `tsc` and `tsc6` typecheck the cross-file `.ts`-extension imports cleanly (exit 0), **and** `node probe.ts` still runs the identical files directly with zero flags and zero emit. This is the exact combination SEL-01/SEL-02 require: no build step, both compiler lanes pass, `noEmit` honored.

**Conclusion: migration is viable and was completed**, not stopped as a conflict. `allowImportingTsExtensions: true` was added to `tsconfig.base.json` (evidence, not authority — no `STACK.md` edit). All 8 files were converted:

| Old (`.mjs`) | New (`.ts`) |
| --- | --- |
| `scripts/build-authority-registry.mjs` | `scripts/build-authority-registry.ts` |
| `scripts/check-authority-integrity.mjs` | `scripts/check-authority-integrity.ts` |
| `scripts/verify-toolchain-baseline.mjs` | `scripts/verify-toolchain-baseline.ts` |
| `scripts/generate-agent-docs.mjs` | `scripts/generate-agent-docs.ts` |
| `scripts/gate.mjs` | `scripts/gate.ts` |
| `scripts/red.mjs` | `scripts/red.ts` |
| `scripts/lib/authority-parser.mjs` | `scripts/lib/authority-parser.ts` |
| `scripts/lib/control-map.mjs` | `scripts/lib/control-map.ts` |

The old `.mjs` files were deleted (`git rm`), not left alongside the new ones. `package.json` scripts, `tsconfig.json`'s `include`, and `eslint.config.mjs`'s `ignores` were updated to point at the `.ts` files.

## 13. All governance source under one strict tsconfig scope — completed, not deferred

`tsconfig.json` now reads `"include": ["scripts/**/*.ts"]` with no per-file exclusion list and no comment excusing any file. This includes the three Phase 1 authority files (`build-authority-registry.ts`, `check-authority-integrity.ts`, `lib/authority-parser.ts`) that Phase 2 had deliberately excluded because a real `checkJs` run produced roughly 180 implicit-`any`/unchecked-index errors against them.

**Those ~180 errors were fixed for real, not suppressed:**

- Every parsed Markdown object (doctrine rules, V-controls, forbidden items, stack selections/controls, position obligations, etc.) now has a named `interface` in `scripts/lib/authority-parser.ts` (`DoctrineRule`, `StackSelection`, `PositionObligation`, `DoctrineRegistry`, `AuthorityIndex`, …) instead of being implicitly `any`.
- `noPropertyAccessFromIndexSignature` violations (table-row objects like `{ Grade: string; Name: string }` parsed as `Record<string, string>`) were fixed by switching every access to bracket notation (`r['Grade']`), not by disabling the rule.
- `checkRuleTextIntegrity`/`checkGistNeverExceedsSource` in the integrity checker needed to operate generically across `DoctrineRule` / `StackSelection` / `PositionObligation` on a caller-chosen verbatim-field name; this was solved with a real generic constraint (`<K extends string, T extends { id: string; rule_text_sha256: string } & Record<K, string | null>>`), not a cast to `any` or `Record<string, unknown>`.
- `exactOptionalPropertyTypes` violations (an optional field explicitly assigned `undefined`, e.g. the TS6-engine-version note and a self-test fixture's `error` field) were fixed by typing those fields as `T | undefined` (always present, possibly undefined) instead of `?: T` (possibly absent) — the correct fix per the compiler's own suggestion, not a suppression.
- Zero `any`, zero unchecked casts introduced to make the compiler quiet, zero `@ts-ignore`/`@ts-nocheck`/`@ts-expect-error` (grep-verified across `scripts/**/*.ts`; the only string containing the text `@ts-ignore` is red-fixture test *data* inside `scripts/red.ts`, not a live suppression).

**Result:** `pnpm run typecheck:native` (`tsc` 7.0.2) and `pnpm run typecheck:compat` (`tsc6`, 6.0.3 engine) both report **0 errors** across all 8 files, and `pnpm run lint` reports **0 errors/warnings**.

## 14. Behavior preservation — verified, one disclosed byte-level exception

Per-script verification, each command run directly before and compared after migration:

| Check | Before (Phase 2, `.mjs`) | After (Phase 2.1, `.ts`) | Result |
| --- | --- | --- | --- |
| `node scripts/check-authority-integrity.ts` (formerly `.mjs`) | 23 PASS / 0 FAIL / 2 notes | 23 PASS / 0 FAIL / 2 notes | Identical |
| `node scripts/check-authority-integrity.ts --self-test` | 9/9 fixtures as expected | 11/11 fixtures as expected (2 new stack/position-seal fixtures added, see §15) | Same 9 unchanged + 2 new, all correct |
| `node scripts/build-authority-registry.ts` → 4 governance JSON registries | committed bytes | **byte-identical except the `generated_by` provenance string**, which changed from `"scripts/build-authority-registry.mjs"` to `"scripts/build-authority-registry.ts"` in all 4 files | Disclosed, not hidden — `git diff` shows exactly one changed line per file, confirmed with the exact diff reproduced below |
| `node scripts/generate-agent-docs.ts` → `governance/rules.json`, `.cursor/rules/afenda.mdc`, `AGENTS.md` | committed bytes | Same `generated_by` provenance-string change, **plus two deliberate copy edits** (mentioning the `.ts` migration and "Phase 2/2.1" instead of "Phase 2") — an intentional content update, not migration drift | Disclosed |
| `pnpm gate` | PASS | PASS (see §16 for the updated step list and SCC/V summary) | Same overall verdict, richer step list |
| `pnpm red` | 13/13 | 17/17 (2 new authority seal fixtures + 2 new TypeScript-lane fixtures, see §15) | Same-shape verdict, more fixtures |

Exact diff of the only change in the 4 generated registries (all four are identical in shape to this):

```diff
   "schema_version": 1,
-  "generated_by": "scripts/build-authority-registry.mjs",
+  "generated_by": "scripts/build-authority-registry.ts",
```

**Why this is not "silently changing governance meaning":** the field's purpose is provenance — which script produced this file — and the script's filename genuinely changed. Reporting the new, correct filename is the honest choice; freezing the field at a now-inaccurate value to claim byte-identity would itself be a governance-meaning change (a false provenance claim). No rule text, hash, id, count, or any other field changed in any of the four registries.

## 15. New red fixtures (17 total, up from 13)

Added to `scripts/check-authority-integrity.ts --self-test` (now 11 fixtures, up from 9), using the exact same production `checkSeal` function the live gate calls — not a mock:

- **STACK seal corruption:** mutate one byte of `STACK.md` in memory, call `checkSeal` with the real `stack/STACK.sha256` → fails specifically (`seal-hash:stack`).
- **POSITION seal corruption:** same for `POSITION.md` / `POSITION.sha256` → fails specifically (`seal-hash:position`).

Added to `scripts/red.ts` (now 7 top-level fixtures, up from 5; the authority self-test delegate now represents 11 rather than 9), invoking the actual `pnpm run typecheck:native` / `pnpm run typecheck:compat` commands (not a helper-function call) against a disposable fixture file written into the real `tsconfig.json` include scope, then removed in a `finally` block regardless of outcome:

- **Native TypeScript failure:** `__red_type_fixture_native__.ts` returns a string from a function declared to return `number`. `pnpm run typecheck:native` exits non-zero. Fixture removed; `git status --short` confirmed clean immediately after.
- **Compatibility TypeScript failure:** same defect, `pnpm run typecheck:compat`. Exits non-zero. Fixture removed; tree clean.

Total: 11 (authority, delegated) + 6 (Phase 2 originals: toolchain-mismatch, control-map-incomplete, dependency-range-injected, lint-ts-suppression — counted as 4 distinct top-level fixtures, the self-test delegate is the 5th top-level entry) + 2 (new typecheck fixtures) = **17 distinct negative fixtures**, all passing (`ALL FIXTURES BEHAVED AS EXPECTED`).

## 16. `pnpm gate` — new step and updated SCC/V summary

A sixth dispatcher step was added: **generated agent-doc drift**. It regenerates `governance/rules.json`, `.cursor/rules/afenda.mdc`, and `AGENTS.md` **in memory** (via a new pure function, `renderAgentDocs`, exported from `scripts/generate-agent-docs.ts` — no filesystem write) and byte-compares the result against the three committed files. It fails if they differ. This is the pattern required: generation is not used as the check; a fresh, non-destructive regeneration is compared against committed state, so `pnpm gate` cannot silently repair stale agent instructions and then report PASS.

Updated SCC-01..27 / V01..18 state summary (`pnpm gate` live output):

| State | Count (Phase 2) | Count (Phase 2.1) | Change |
| --- | --- | --- | --- |
| implemented | 2 (SCC-04, SCC-27) | 3 (SCC-01, SCC-02, SCC-27) | SCC-01/SCC-02 upgraded (governance-scope typecheck+lint now complete with red fixtures); SCC-04 downgraded (see §17) |
| partial | 3 (SCC-01, SCC-02, V14) | 2 (SCC-04, V14) | SCC-01/SCC-02 moved to implemented; SCC-04 moved in from implemented |
| not-yet-built | 39 | 39 | Unchanged — no application code was added this phase |
| blocked | 0 | 0 | Unchanged |
| not-applicable-current-tree | 1 (SCC-22) | 1 (SCC-22) | Unchanged |
| **Total** | **45** | **45** | — |

`pnpm gate` overall result: **PASS** (unchanged verdict; the step list is now 7 steps instead of 6, and step 4a/4b/4c cover the full governance scope instead of a partial one).

## 17. SCC-04 — downgraded from `implemented` to `partial`

Two concrete, locally-proven reasons, both required by SCC-04's own wording ("Runtime, compilers, package manager, dependencies and lockfile are exact and **CI-verified**"):

1. **No observed live CI execution.** `.github/workflows/gate.yml` exists and its commands are identical to what was run locally, but this environment cannot observe a GitHub Actions run. "CI-verified" was previously asserted from file presence alone; that is not sufficient evidence for "implemented."
2. **TypeScript-6 compatibility engine does not exactly match the declared baseline — a real resolution finding, not a cosmetic string mismatch.** Full investigation (see §18) found that `@typescript/typescript6@6.0.2` (our exact devDependency pin) is a thin wrapper whose own `package.json` declares `"@typescript/old": "npm:typescript@^6"` — **a semver range**, not an exact pin, for the actual compiler engine it `require()`s at runtime. The frozen lockfile resolved that range to real package `typescript@6.0.3`. `stack/VERSION_BASELINE.json`'s `typescript_compat.reference_patch` says `6.0.2`. The engine our tooling actually executes is `6.0.3`. `scripts/verify-toolchain-baseline.ts`'s package-level check still (correctly) reports `[OK]` for the wrapper's own version, because that pin genuinely is exact — but it now also surfaces this engine-resolution gap explicitly in its note text, where Phase 2's version only described it as "an upstream wrapper/compiler discrepancy."

Both findings are recorded verbatim in `governance/control-implementation.json`'s SCC-04 entry, including the exact `pnpm-lock.yaml` line and the `require()` chain that proves it (`typescript6/lib/tsc.js` → `require("@typescript/old/lib/tsc.js")`).

**SCC-04 remaining evidence that is genuinely still solid and unaffected:** Node runtime pin (exact, matches `.node-version`, `engines.node`, and the runtime `process.version`), TypeScript-native pin (exact — `@typescript/native` resolves straight to real `typescript@7.0.2`, no wrapper indirection, `tsc --version` reports `7.0.2` exactly), `packageManager` field, frozen lockfile, and the dependency-range-rejection gate (`checkDependencyPinsAreExact`). Only the CI-observation gap and the compat-engine gap are new/sharpened findings; the rest of the control's evidence is unchanged.

`pnpm gate` remains able to PASS with SCC-04 `partial`, exactly as required — the dispatcher does not treat a `partial` control-map entry as a gate failure; only the six-and-later executable steps (build, integrity, toolchain check, typecheck×2, lint, control-map completeness, dependency-pin policy, agent-doc drift, self-test) determine PASS/FAIL, and `scripts/verify-toolchain-baseline.ts`'s own checks are all still `[OK]` for what they mechanically assert (package-level pins), which is a narrower claim than "SCC-04 fully implemented."

## 18. TypeScript-6 package/binary discrepancy — full investigation, facts recorded

| Fact | Value |
| --- | --- |
| `package.json` devDependency (ours) | `"typescript": "npm:@typescript/typescript6@6.0.2"` (exact) |
| Installed wrapper package version (`node_modules/typescript/package.json`) | `6.0.2` — matches our pin exactly |
| Wrapper's own dependency on its compiler engine (`@typescript/typescript6`'s package.json) | `"@typescript/old": "npm:typescript@^6"` — **a semver range**, not controlled by our `package.json` |
| Resolved engine package (`pnpm-lock.yaml`, `@typescript/typescript6@6.0.2.dependencies['@typescript/old']`) | `typescript@6.0.3` |
| Engine binary self-report (`tsc6 --version`) | `Version 6.0.3` |
| Delegation mechanism (`node_modules/.../@typescript/typescript6/lib/tsc.js`) | `require("@typescript/old/lib/tsc.js")` — confirmed by reading the file directly |
| Native side, for contrast (`@typescript/native` → `npm:typescript@7.0.2`) | Resolves straight to the real `typescript` package at `7.0.2`, no wrapper/range indirection; `tsc --version` reports `7.0.2` exactly, matching the pin with zero gap |

**Classification:** this is **not** simply "the wrapper package intentionally contains a different compiler version" (that would imply the discrepancy is fixed/declared behavior of `@typescript/typescript6@6.0.2` specifically). It is a **range resolution outcome**: the wrapper's own manifest asks for "any 6.x," and the lockfile — frozen and reproducible for *this* lockfile — happened to capture `6.0.3` at generation time. A different lockfile generation run (before this one was committed) could have captured a different 6.x patch. Per the task's own classification rubric, this falls under **"resolution is actually pulling another compiler"**, not "upstream packaging behavior harmlessly containing a fixed different version." Recorded in `scripts/verify-toolchain-baseline.ts`'s note text and `governance/control-implementation.json`'s SCC-04 entry; **no version was upgraded, downgraded, or otherwise changed** to make the numbers agree, and `stack/VERSION_BASELINE.json` was not touched.

## 19. pnpm / Turborepo version governance — conclusion: genuine authority gap, not resolved

Investigated whether `stack/VERSION_BASELINE.json`'s silence on pnpm/Turborepo exact versions is already fully compensated by machine authority elsewhere:

- **Reproducibility is mechanically real:** `packageManager: "pnpm@11.20.0"` (exact) plus Corepack assertion in `.github/workflows/gate.yml`, and Turborepo pinned exactly (`"turbo": "2.10.8"`, no range) plus the frozen `pnpm-lock.yaml`, plus `checkDependencyPinsAreExact` rejecting any future range. A given commit's toolchain is reproducible.
- **But there is no doctrine/stack-declared reference value to check drift against over time.** `stack/VERSION_BASELINE.json` has no `pnpm` or `turborepo` key at all. SEL-02 explicitly calls TypeScript/compiler upgrades "qualification events" for TypeScript; there is no equivalent statement anywhere in `STACK.md` for pnpm or Turborepo. If someone bumps `packageManager` or the `turbo` devDependency tomorrow, nothing in the authority layer would flag it as requiring a qualification event the way a TypeScript bump would — `scripts/verify-toolchain-baseline.ts` would simply report the new value as the "expected" pnpm version (since it derives its own expectation from the *installed* pnpm binary for that one field, exactly as documented) and pass.

**Conclusion: this is a genuine, unresolved authority gap**, not something already fully governed. It is recorded here and in `governance/control-implementation.json` SCC-04; `stack/VERSION_BASELINE.json` was **not** amended to fill it — that would require an explicit governance decision (adding pnpm/Turborepo to the normative baseline, or explicitly declaring them ungoverned by design), which is out of scope for this phase.

## 20. Migration/typecheck/lint verification run (all commands, in order, with exit codes)

```
git status --short                                                -> clean at preflight
git rev-parse HEAD                                                -> 2ca9f1398116a5f3b6c472dec30edee29175b2e3
node scripts/build-authority-registry.mjs (preflight, old script) -> exit 0
node scripts/check-authority-integrity.mjs (preflight)             -> exit 0 (23 PASS / 0 FAIL / 2 notes)
node scripts/check-authority-integrity.mjs --self-test (preflight) -> exit 0 (9/9)
pnpm gate (preflight)                                              -> exit 0 (PASS)
pnpm red (preflight)                                               -> exit 0 (13/13)

--- disposable Node .ts execution probe, outside the repository ---
node probe.ts (no flags)                                           -> exit 0, "PROBE_OK", zero emitted artifacts
node probe2.ts (classes/generics/unions, no flags)                 -> exit 0, "PROBE2_OK"
tsc --noEmit -p tsconfig.json (repo's native compiler, probe)      -> exit 0 (after allowImportingTsExtensions)
tsc6 --noEmit -p tsconfig.json (repo's compat compiler, probe)     -> exit 0 (after allowImportingTsExtensions)
node probe.ts (re-run after tsc-extension imports proven)          -> exit 0

--- migration ---
git rm --cached (8 old .mjs governance scripts)                   -> removed from index
(8 new .ts files written with full types)

pnpm run typecheck:native                                          -> exit 0, 0 errors
pnpm run typecheck:compat                                          -> exit 0, 0 errors
pnpm run lint                                                      -> exit 0, 0 errors/warnings
node scripts/build-authority-registry.ts                          -> exit 0
node scripts/check-authority-integrity.ts                         -> exit 0 (23 PASS / 0 FAIL / 2 notes, unchanged)
node scripts/check-authority-integrity.ts --self-test              -> exit 0 (11/11)
git diff -- governance/*-registry.json governance/authority-index.json
                                                                    -> only "generated_by" line changed, in all 4 files
node scripts/verify-toolchain-baseline.ts                          -> exit 0 (5 OK / 0 FAIL; TS6-engine finding surfaced as a note)
node scripts/generate-agent-docs.ts                                -> exit 0
node scripts/gate.ts                                               -> exit 0 (PASS; 7 steps; SCC/V summary implemented 3 / partial 2 / not-yet-built 39 / not-applicable 1)
node scripts/red.ts                                                -> exit 0 (7/7 top-level fixtures; 17 total including delegated authority fixtures)
git status --short (after red.ts)                                  -> clean (fixture files removed in `finally`)
```

## 21. Combined SCC + V-control counts, before vs. after this phase

| State | Before (end of Phase 2) | After (end of Phase 2.1) |
| --- | --- | --- |
| implemented | 2 | 3 |
| partial | 3 | 2 |
| not-yet-built | 39 | 39 |
| blocked | 0 | 0 |
| not-applicable-current-tree | 1 | 1 |
| **Total** | **45** | **45** |

## 22. Adoption checklist — net effect

One item reverted from checked to unchecked (§11 above: "Add SCC-01 through SCC-27 to CI or a machine-readable governance dispatcher"). No other checklist item was changed. **This phase does not tick any new checklist item and does not claim stack adoption.** `stack/STACK_ADOPTION.md` §7 records the reversal with reasoning.

## 23. Remaining findings carried forward (not resolved by assumption)

1. **SCC-04 compat-engine gap (§17, §18)** — not resolved; requires an explicit governance decision (pin `@typescript/old` exactly via a pnpm override/resolution, or revise `VERSION_BASELINE.json`'s declared reference_patch to match an intentionally-chosen engine version). Neither action was taken in this phase.
2. **No live CI observation (§17)** — the workflow file is present and identical in content to what was verified locally; an actual GitHub Actions run has still not been observed from this environment.
3. **pnpm/Turborepo authority gap (§19)** — recorded, not resolved; `VERSION_BASELINE.json` left unchanged pending an explicit decision.
4. **`turbo.json` still orchestrates 0 tasks** — unchanged from Phase 2; `pnpm-workspace.yaml` still matches 0 packages.
5. **`.dependency-cruiser.cjs` remains a rule scaffold only** — unchanged from Phase 2; SCC-05 remains `not-yet-built`, no module graph exists to exercise it.
6. **SCC-01/SCC-02's application-layer proof remains deferred** — the governance-tooling-layer proof is now complete (§12–§16), but "application any is rejected," etc. still has no application code to exercise it against; both controls' `revisit_trigger` names this explicitly.

None of these findings required a normative-authority decision (Doctrine/Stack/Position wording) to *record*; where a decision **would** be required to *resolve* one (findings 1 and 3), that decision was explicitly not made in this phase and is named as outstanding, not silently assumed.

**No application readiness claim. No stack adoption. No E5/E6 claim.**
