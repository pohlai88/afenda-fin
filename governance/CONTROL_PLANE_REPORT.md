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
