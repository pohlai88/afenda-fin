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

---

# AFENDA Phase 2.2 — Toolchain Authority and CI-Evidence Reconciliation

**Phase:** close or accurately classify the remaining toolchain authority/CI-evidence gaps (pnpm/Turborepo baseline omission, TypeScript-6 package/engine discrepancy, no observed live CI) before application reconstruction.
**Date:** 2026-08-08
**Baseline used:** commit `756977a9d6783250c2032b3a929fde58a6b4c6cc` ("refactor(governance): harden AFENDA control plane"), parent `2ca9f13...` , `authority-baseline-v1` tag unmoved at `09e7e6e...`. Preflight confirmed clean tree, `pnpm install --frozen-lockfile` up to date, `pnpm gate` PASS, `pnpm red` (7/7 top-level fixtures, PASS).
**Explicit statement, unchanged from Phase 2/2.1:** this phase establishes tooling/governance infrastructure only. It does **not** establish E5 deployment qualification or E6 operational proof, and it does **not** constitute application readiness. No `apps/`, `packages/`, or `db/` code was created. **Stack adoption is not declared by this phase.** `doctrine/DOCTRINE.md`, `position/POSITION.md`, and `stack/STACK.md` (and all three `.sha256` seals) are byte-identical to before this phase — confirmed by re-running `pnpm run gate:authority` (23 PASS / 0 FAIL / 2 notes, unchanged) and by `git diff` showing zero lines touched in any of those six files.

## 24. Authority classification matrix (§2 of the task)

For each toolchain component: where the release line/exact pin come from, what is actually installed/resolved/executed, whether `stack/VERSION_BASELINE.json` covers it, whether `STACK.md` makes it constitutional, and whether SCC-04 currently requires it.

| Component | Release-line authority | Exact-pin authority | Installed package | Lockfile resolution | Executed version | VERSION_BASELINE covers it? | STACK.md makes it constitutional? | SCC-04 requires it? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Node | STACK.md SEL-03 `[C]` | `.node-version` / `package.json engines.node` | n/a (runtime, not npm package) | n/a | `v24.18.0` | Yes (`runtime.node.reference_patch`) | Yes (SEL-03 `[C]`) | Yes |
| pnpm | STACK.md SEL-04 `[D]` | `package.json packageManager` field | n/a (corepack-managed) | n/a | `11.20.0` | **No before this phase; yes after** (`packages.pnpm.reference_patch`, added Phase 2.2) | Yes (SEL-04 names pnpm) | Yes |
| Turborepo | STACK.md SEL-04 `[D]` | `package.json devDependencies.turbo` exact | `turbo@2.10.8` | `turbo@2.10.8` (exact, no range anywhere) | `2.10.8` | **No before this phase; yes after** (`packages.turborepo.reference_patch`, added Phase 2.2) | Yes (SEL-04 names Turborepo) | Yes |
| TypeScript native | STACK.md SEL-02 `[D]` | `package.json devDependencies["@typescript/native"]` exact | `typescript@7.0.2` (real package, no wrapper) | `typescript@7.0.2` | `tsc --version` → `7.0.2` | Yes (`compiler.typescript_native.reference_patch`) | Yes (SEL-02) | Yes |
| TypeScript compatibility **package** | STACK.md SEL-02 `[D]` | `package.json devDependencies.typescript` exact (aliased) | `@typescript/typescript6@6.0.2` | `@typescript/typescript6@6.0.2` (exact) | `require('typescript').version` → `6.0.2` | Yes (`compiler.typescript_compat.reference_patch`) | Yes (SEL-02) | Yes |
| TypeScript compatibility **engine** (`@typescript/old`) | Not separately named in STACK.md — implied by "TypeScript 6... compatibility tooling" | **None** — the wrapper's own `package.json` declares a semver range (`npm:typescript@^6`), which this repository's `package.json` does not reference or control at all | `typescript@6.0.3` (a second, distinct real package) | `typescript@6.0.3` (pinned exactly by *our* frozen lockfile, but that lockfile entry is itself downstream of the wrapper's range, not of anything in our own `package.json`) | `tsc6 --version` → `Version 6.0.3` | **No before this phase; yes after, as a distinct fact** (`compiler.typescript_compat.compiler_engine`, added Phase 2.2) | Not by name (STACK.md never names `@typescript/old`) | Ambiguous — see §25/§28 |
| ESLint | Not a STACK.md selection; implements the "type-aware lint" clause of SCC-01/02 | `package.json devDependencies.eslint` exact | `eslint@10.8.0` | exact | n/a (library, invoked via `eslint .`) | No | No (no SEL entry names ESLint) | No |
| typescript-eslint | Same as ESLint | `package.json devDependencies["typescript-eslint"]` exact | `typescript-eslint@8.66.0` | exact | n/a | No | No | No |
| dependency-cruiser | Not a STACK.md selection; implements SCC-05's module-boundary check, once module code exists | `package.json devDependencies["dependency-cruiser"]` exact | `dependency-cruiser@18.1.1` | exact | n/a | No | No | No (SCC-05 is not in SCC-04's `applies_to`) |

**Reading the matrix:** Node/pnpm/Turborepo/TypeScript-native/TypeScript-compat-package are all cleanly, mechanically exact at every level that matters, and (after this phase) all have an explicit `VERSION_BASELINE.json` declared reference to check against. The one cell that is not clean is the **TypeScript compatibility engine** row — the only component in the whole matrix where "exact-pin authority" is genuinely absent (not merely undocumented) because the exactness decision belongs to an upstream package we do not control. ESLint/typescript-eslint/dependency-cruiser are correctly outside `SCC-04`'s scope: `STACK.md` never elevates them to a numbered selection, so their exactness (already mechanically true via `checkDependencyPinsAreExact`) is a good implementation practice, not a constitutional requirement.

## 25. TypeScript-6 `6.0.2` → engine `6.0.3`: exact chain and independent reproduction (§3–§4 of the task)

**Dependency chain, established mechanically, not assumed:**

1. `pnpm why "@typescript/typescript6"` shows it is a peer/dev dependency of `typescript-eslint`'s toolchain and of `afenda-fin` itself (`devDependencies`).
2. `pnpm list typescript --depth 10` shows directly: `typescript@npm:@typescript/typescript6@6.0.2 └── @typescript/old@npm:typescript@6.0.3` — the resolved sub-dependency is printed by pnpm itself, not inferred.
3. Installed wrapper manifest (`node_modules/.pnpm/@typescript+typescript6@6.0.2/node_modules/@typescript/typescript6/package.json`): `"dependencies": { "@typescript/old": "npm:typescript@^6" }` — confirmed verbatim, a semver RANGE, entirely inside the upstream package's own manifest.
4. Resolved engine manifest (`node_modules/.pnpm/@typescript+typescript6@6.0.2/node_modules/@typescript/old/package.json`): `"name": "typescript", "version": "6.0.3"`.
5. Delegation mechanism, read directly from the installed files: `bin/tsc6` → `require('../lib/tsc.js')` → `lib/tsc.js`: `require("@typescript/old/lib/tsc.js")` → `lib/typescript.js`: `module.exports = require("@typescript/old")`. Three hops, all confirmed by reading the actual installed files, not by assumption.
6. `pnpm-lock.yaml` snapshot section (line 980–982): `'@typescript/typescript6@6.0.2': dependencies: '@typescript/old': typescript@6.0.3` — the frozen lockfile's own resolution record, independent of `node_modules` layout.
7. `pnpm exec tsc6 --version` → `Version 6.0.3` (matches all of the above; not used as the *sole* basis for the classification, per the task's explicit instruction not to classify from the version string alone).

**Independent reproduction (§4):** a disposable directory outside this repository, containing only `{"devDependencies": {"typescript": "npm:@typescript/typescript6@6.0.2"}}` and nothing else, was `pnpm install`ed from scratch against the same registry/toolchain. Result: `pnpm list typescript --depth 5` showed the identical resolution — `@typescript/old@npm:typescript@6.0.3` — and `tsc6 --version` again reported `6.0.3`. **This reproduces independently of this repository's lockfile, dependency graph, or any local state.** It rules out local lockfile drift/contamination (task's option "does not reproduce → investigate local contamination" is excluded) and confirms the discrepancy is an intrinsic property of the published `@typescript/typescript6@6.0.2` package.

**Classification (of the task's four options A/B/C/D):** closest to **A** (upstream package behavior) combined with **C** (a latent gap in `VERSION_BASELINE.json`'s own assumption), stated precisely: the wrapper package does not "intentionally" hard-code `6.0.3` — it deliberately delegates its real compiler engine to *whatever satisfies* `^6` at resolution time, which happened to be `6.0.3` when this lockfile was generated and remains `6.0.3` deterministically for this repository's tree because the lockfile is frozen. **B is explicitly ruled out**: pnpm did not violate anything; it resolved the range exactly as declared by the upstream package. **D is not needed**; A+C fully explains the observed fact. `stack/VERSION_BASELINE.json`'s pre-Phase-2.2 schema conflated "package pin" and "compiler pin" into one `reference_patch` field for `typescript_compat`; that conflation was the real gap, now closed (§27).

## 26. pnpm / Turborepo authority classification (§5 of the task) — four questions answered separately

1. **Is the existing repository behavior mechanically pinned?** Yes, for both. pnpm: `package.json packageManager: "pnpm@11.20.0"` (exact, no range) + Corepack assertion step in `.github/workflows/gate.yml` (`corepack enable`, which reads and enforces the `packageManager` field) + frozen `pnpm-lock.yaml`. Turborepo: `package.json devDependencies.turbo: "2.10.8"` (exact, no range, confirmed no wrapper indirection unlike TypeScript-6) + frozen lockfile + `checkDependencyPinsAreExact` rejecting any future range for either.
2. **Is `VERSION_BASELINE.json` incomplete relative to its own stated purpose?** Yes, before this phase. Its own `policy` field says it "selects release lines and verified reference patches" for the toolchain, and it did so for `runtime.node` and both `compiler.*` entries, but had no entry at all for the two tools SEL-04 names by title ("pnpm workspaces and Turborepo"). This was a real omission relative to the file's own stated scope, not an intentional design choice recorded anywhere.
3. **Does any binding text explicitly require pnpm/Turbo to be present there by name?** No single sentence in `STACK.md` says "pnpm and Turborepo exact versions must appear in VERSION_BASELINE.json." But §10 says "`package.json`, `pnpm-lock.yaml`, `.node-version`, container digests and CI image constants must agree with `VERSION_BASELINE.json`" — which presumes `VERSION_BASELINE.json` is the cross-check source those files are measured against. For a tool with no entry there, there was nothing to "agree with," which is a gap in the registry's completeness relative to §10's evident intent, not a contradiction of §10's literal text.
4. **Would adding them constitute evidence completion, machine-authority correction, or a stack normative amendment?** **Evidence completion / machine-authority correction.** `stack/VERSION_BASELINE.json` has no `.sha256` seal (confirmed: only `STACK.sha256` exists in `stack/`; `VERSION_BASELINE.json` and `STACK_CONTROL_MAP.json` are unsealed). It is explicitly described by `STACK.md`'s own front matter as machine authority ("Current version baseline: `VERSION_BASELINE.json`"), not sealed normative prose. Recording an already-true, already-enforced fact (pnpm is 11.20.0; Turborepo is 2.10.8) in a previously-silent field is documentation of existing constraint, not creation of new policy — and it required zero change to `STACK.md`'s text, tags, or binding constraints. **Decision: added, without touching `STACK.md`.** See `stack/VERSION_BASELINE.json` `packages.pnpm` / `packages.turborepo` (schema_version bumped 1→2, with an inline `schema_version_history` explaining exactly what changed and why, so this edit is itself auditable).

## 27. `VERSION_BASELINE.json` changes made (schema_version 1 → 2)

Two additions, both evidence completion as classified in §25–26, neither touching `STACK.md`:

1. **`packages.pnpm`** and **`packages.turborepo`**: `reference_patch` values (`11.20.0`, `2.10.8`) matching what was already mechanically pinned and enforced; `pin_files` listing the existing enforcement mechanisms; a `note` on each explaining this is Phase 2.2 evidence completion, not a new requirement.
2. **`compiler.typescript_compat.compiler_engine`**: a new object recording, as machine authority rather than only checker-runtime prose, the exact fact established in §25 — the wrapper's own semver-range dependency, the observed `6.0.3` resolution, the resolution evidence (lockfile line + installed-file inspection), the independent-reproduction result, an explicit classification sentence, and the SCC-04 effect. Nothing in `compiler.typescript_native`, `database.*`, `frontend.*`, `identity.*`, or `libraries.*` was touched.

`git diff stack/VERSION_BASELINE.json` shows only additions (no existing field's value was changed; `typescript_compat.reference_patch` is still `6.0.2`, exactly as before — Phase 2.2 did not "fix" the number to make it agree with `6.0.3`, per the explicit instruction not to change versions to make them aesthetically agree).

## 28. Decision: no `STACK.md` normative amendment required; no `STACK_AMENDMENT_PROPOSAL.md` created

Per the task's own instruction ("Only if the evidence establishes a genuine authority contradiction/omission that cannot be resolved through implementation metadata, prepare an amendment proposal"): both investigated gaps — the TypeScript-6 engine discrepancy and the pnpm/Turborepo baseline omission — were fully resolved through implementation metadata (`stack/VERSION_BASELINE.json` schema extension + `scripts/verify-toolchain-baseline.ts` restructuring + new red fixtures), without requiring any change to `STACK.md`'s selection text, tags, binding constraints, or executable-control definitions. Neither gap contradicts anything `STACK.md` actually asserts:

- SEL-02's "exact versions" binding constraint does not specify package-level vs. engine-level granularity, and the frozen lockfile does make the engine version deterministic and reproducible for this repository's tree — it is a real gap in what could be *directly read off* the package-level pin, not a violation of SEL-02's text.
- SEL-04's binding constraints ("exact packageManager field, frozen lockfile...") were already fully satisfied before `VERSION_BASELINE.json` had pnpm/Turborepo entries; the entries make an already-true fact checkable, they do not change what SEL-04 requires.

**Therefore no `governance/STACK_AMENDMENT_PROPOSAL.md` was created this phase**, and this section itself is the recorded justification for that decision, satisfying the task's "if no amendment is prepared, explain why" implicit requirement.

## 29. Live CI evidence (§7 of the task)

`git remote -v` was run from the repository root and returned **empty output** (exit 0, zero lines). **This repository has no configured Git remote in this environment.** There is therefore no GitHub (or any other) hosting endpoint that could have received a push and triggered `.github/workflows/gate.yml`, and no API/UI this environment could query for a run result even in principle — the absence is at the "is there a remote at all" level, prior to any question of authentication or run-fetching capability. `scripts/verify-toolchain-baseline.ts` now detects and reports this dynamically (`detectCiObservedStatus()`) rather than hardcoding a claim, so if a remote is added in a future phase the tool's own report will change accordingly instead of silently going stale.

**No CI evidence is claimed. SCC-04 remains `partial` for this reason among others (§30).**

## 30. SCC-04 final state: `partial` (unchanged from Phase 2.1, more precisely evidenced)

Per the task's own decision rule ("Do not weaken SCC-04... It may become IMPLEMENTED only if its full currently-applicable required outcome is established, including CI verification"): SCC-04 **remains `partial`**. Two of its required-outcome clauses are not both established:

- "Runtime, compilers, package manager, dependencies and lockfile are exact" — true at the level this repository's own `package.json`/lockfile control (Node, pnpm, Turborepo, TypeScript-native, TypeScript-compat-package all pin exactly and are red-fixture-proven to catch drift as of this phase). **Not fully true** at the deepest "compiler engine actually executed" level, because `@typescript/old`'s version is controlled by an upstream range this repository cannot pin from its own `package.json` (§25).
- "...and CI-verified" — **not established**: no remote exists to run CI against (§29).

`governance/control-implementation.json`'s SCC-04 entry was updated with this phase's full evidence (exact chain, reproduction result, VERSION_BASELINE.json schema fields, new red fixtures) — see the entry itself for the complete text. **SCC-01, SCC-02, and SCC-27 were re-checked and remain `implemented`**: `pnpm run typecheck:native`, `typecheck:compat`, and `lint` all still report zero errors after this phase's script edits, and `pnpm run gate:authority` still reports 23 PASS / 0 FAIL / 2 notes. **V14 was re-checked and remains `partial`**, with evidence sharpened (independent reproduction, completed baseline) but explicitly not expanded into application-layer provenance, per the task's own instruction not to broaden V14's scope.

SCC/V combined state totals are **unchanged** by this phase, because no control's classification actually flipped:

| State | Before Phase 2.2 | After Phase 2.2 |
| --- | --- | --- |
| implemented | 3 | 3 |
| partial | 2 | 2 |
| not-yet-built | 39 | 39 |
| blocked | 0 | 0 |
| not-applicable-current-tree | 1 | 1 |
| **Total** | **45** | **45** |

This is the expected, honest outcome of an evidence-precision phase that did not close either underlying gap (no remote appeared; the upstream package's range did not change) — only sharpened how each gap is described, checked, and red-fixture-proven.

## 31. Toolchain checker restructuring (§8 of the task)

`scripts/verify-toolchain-baseline.ts` was rewritten so every component reports five distinct fields — **DECLARED / PINNED / RESOLVED / EXECUTED / CI-OBSERVED** — instead of one collapsed boolean, per the task's explicit requirement not to hide this behind a single misleading PASS number. Sample live output for the one component with a real, disclosed discrepancy:

```
[DISCREPANCY-NOTED] TypeScript compatibility package (@typescript/typescript6, aliased as "typescript")
                     declared:    6.0.2
                     pinned:      6.0.2
                     resolved:    6.0.2
                     executed:    package 6.0.2; compiler engine 6.0.3
                     ci-observed: not observed (no git remote configured in this environment; ...)
                     note:        Package pin is exact (6.0.2) and this check reports [OK]/no-fail for it. However...
```

A component's `status` is one of `ok`, `discrepancy-recorded` (package-level pin exact, but a deeper resolution fact diverges — never silently hidden, never treated as a hard failure), or `fail` (a real pin/version mismatch). `verify:toolchain` still exits `0` for the current, correctly-pinned repository state — a `discrepancy-recorded` status does not fail the command, exactly as the task specifies ("The command may still exit 0 where repository pinning is correct but an explicitly tolerated/reported upstream discrepancy exists"). The checker was also extended to cover `pnpm` and `turborepo`, which it did not check at all before this phase.

## 32. New red fixtures added (§9 of the task) — 24 total distinct fixtures, up from 17

Six new isolated toolchain fixtures were added to `scripts/red.ts`, each mutating exactly one field of a "clean" baseline/installed pair and calling the real, production `evaluateToolchain()` function (not a mock) to prove that exactly one component's drift is caught in isolation — a stronger claim than the pre-existing combined `toolchain-mismatch` fixture, which mutated several fields at once and only proved "some failure occurs somewhere":

- **Node pin mismatch** — `engines.node` drifted; `node-runtime` component alone reports `fail`.
- **pnpm packageManager field mismatch** — `packageManager` drifted; `pnpm-package-manager` component alone reports `fail`.
- **Native TypeScript package mismatch** — `@typescript/native`'s installed version drifted; `typescript-native-package` alone reports `fail`.
- **Compatibility TypeScript package mismatch** — the compat package's installed version drifted; `typescript-compat-package` alone reports `fail`.
- **Turborepo package mismatch** — `turbo`'s installed version drifted; `turborepo-package` alone reports `fail`.
- **Compat-engine discrepancy is recorded, not hidden** — a companion fixture proving the *real* 6.0.3-vs-6.0.2 fact is reported as `discrepancy-recorded`, not silently promoted to `ok` and not incorrectly escalated to a blocking `fail`. This directly guards against a future edit accidentally papering over the disclosed gap.

One new fixture uses the actual production command rather than a helper function, per the task's explicit instruction:

- **`lockfile-package-disagreement`** — mutates the real `package.json` (`devDependencies.turbo` to a value that disagrees with the frozen `pnpm-lock.yaml`), invokes the actual `pnpm install --frozen-lockfile` command, confirms it fails with `ERR_PNPM_OUTDATED_LOCKFILE`, and restores `package.json` byte-for-byte in a `finally` block regardless of outcome. `git diff package.json` after a full `pnpm red` run shows zero lines changed, confirming the restore is exact.

Total distinct fixtures: 11 (authority, delegated from `check-authority-integrity.ts --self-test`) + 13 top-level (`toolchain-mismatch` combined, 5 new isolated toolchain fixtures, compat-engine-recorded, `control-map-incomplete`, `dependency-range-injected`, `lockfile-package-disagreement`, `lint-ts-suppression`, `typecheck-native-injected-type-error`, `typecheck-compat-injected-type-error`) = **24**, up from 17 at the end of Phase 2.1. `pnpm red` result: **ALL FIXTURES BEHAVED AS EXPECTED**.

## 33. Adoption checklist — no changes this phase

Per the task's instruction to review only items affected by this phase and not touch unrelated ones: the toolchain checklist items in `stack/STACK_ADOPTION.md` §3 were re-examined. **None changed.** "Pin Node 24 LTS exactly in `.node-version`, CI and container image" correctly remains unchecked — the `.node-version`/CI clauses are satisfied but no container image exists in this tree yet (compound requirement, not fully met). "Pin pnpm exactly in `packageManager`; commit the frozen lockfile" and "Reject unapproved dependency ranges and lockfile drift" were already checked before this phase and remain checked — this phase added *more* red-fixture evidence for the second item (the new `lockfile-package-disagreement` fixture) but did not need to newly satisfy it, since it was already true. The SCC-01..27 dispatcher checkbox (reverted to unchecked in Phase 2.1) was **not** restored: 22 of 27 controls are still `not-yet-built`, so the stricter reading of that checklist item's wording is still not satisfied.

## 34. Full verification run (commands and exit codes)

```
git status --short (preflight)                                    -> clean
git rev-parse HEAD (preflight)                                     -> 756977a9d6783250c2032b3a929fde58a6b4c6cc
git log --oneline --decorate -4 (preflight)                        -> confirms HEAD/parent/authority-baseline-v1 chain
pnpm install --frozen-lockfile (preflight)                         -> exit 0, "Already up to date"
pnpm gate (preflight)                                               -> exit 0 (PASS)
pnpm red (preflight)                                                -> exit 0 (7/7 top-level fixtures PASS)

pnpm why "@typescript/typescript6"                                  -> exit 0 (dependency graph printed)
pnpm list typescript --depth 10                                     -> exit 0 (@typescript/old@npm:typescript@6.0.3 shown directly)
(disposable dir) pnpm install --no-frozen-lockfile (repro)          -> exit 0; @typescript/old resolved to typescript@6.0.3 independently
(disposable dir) pnpm exec tsc6 --version (repro)                   -> "Version 6.0.3"
(disposable dir) pnpm install --no-frozen-lockfile (frozen-lockfile fixture rehearsal) -> exit 0
(disposable dir) pnpm install --frozen-lockfile after package.json mutation -> exit 1, ERR_PNPM_OUTDATED_LOCKFILE (proves the production check works before wiring it into scripts/red.ts)
git remote -v                                                        -> exit 0, empty output (no remote configured)

(edited stack/VERSION_BASELINE.json, scripts/verify-toolchain-baseline.ts, scripts/red.ts, governance/control-implementation.json)

node -e "JSON.parse(...)" on stack/VERSION_BASELINE.json             -> "valid JSON"
pnpm run typecheck:native                                            -> exit 0, 0 errors
pnpm run typecheck:compat                                            -> exit 0, 0 errors
pnpm run lint                                                        -> exit 0, 0 errors/warnings
node scripts/verify-toolchain-baseline.ts                            -> exit 0 (4 ok / 1 discrepancy-recorded / 0 FAIL)
node scripts/red.ts                                                  -> exit 0 (14/14 top-level fixtures PASS; git status clean immediately after — package.json restore confirmed byte-identical via git diff)
pnpm gate                                                            -> exit 0 (PASS; SCC/V summary unchanged: implemented 3 / partial 2 / not-yet-built 39 / not-applicable 1)
node -e "JSON.parse(...)" on governance/control-implementation.json  -> "valid JSON"
pnpm gate (re-run after control-implementation.json edit)            -> exit 0 (PASS)
```

Full final verification suite (§14 of the task — frozen install, authority build/integrity/self-test, verify:toolchain, typecheck×3, lint, agent-docs, gate→red→gate contamination check, git diff/status) is run and recorded in full immediately below this section before the commit boundary.

## 35. Unresolved findings carried forward from this phase

1. **No git remote configured** — a prerequisite even before CI-observation tooling/authentication questions arise. Adding one and observing an actual workflow run is required before SCC-04's "CI-verified" clause can ever be established from this environment.
2. **TypeScript-6 compatibility engine range** — `@typescript/old`'s version remains controlled by an upstream `^6` range inside `@typescript/typescript6@6.0.2`'s own manifest. Closing this (e.g., via a pnpm `overrides`/`resolutions` entry forcing an exact `@typescript/old` version, or an explicit governance decision to revise `VERSION_BASELINE.json`'s `reference_patch` to describe the engine instead of the wrapper) was investigated and fully documented but **not applied** in this phase, since doing so would be a toolchain-pinning change requiring its own qualification, not an evidence-recording exercise.
3. **`turbo.json` still orchestrates 0 tasks; `pnpm-workspace.yaml` still matches 0 packages** — unchanged; `pnpm gate` still invokes scripts directly rather than through `turbo run`. This remains accurate and is not newly discovered by this phase.
4. **`.dependency-cruiser.cjs` remains a rule scaffold only** — unchanged; SCC-05 remains `not-yet-built`.

None of these require a normative-authority decision to *record* (all recorded above); finding 2, if ever *resolved*, would require an explicit governance decision between two named options, not a default assumption.

**No application readiness claim. No stack adoption. No E5/E6 claim.**
