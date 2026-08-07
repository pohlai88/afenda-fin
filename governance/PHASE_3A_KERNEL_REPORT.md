# AFENDA Phase 3A — Kernel Report

**Baseline commit:** `6bf2800` (`fix(governance): reconcile AFENDA toolchain evidence`), parent `756977a`. `authority-baseline-v1` remains at `09e7e6e`, unmoved by this phase.

**Scope:** the first doctrine-bearing application kernel — `packages/errors`, `packages/time`, `packages/money` — plus activation of the real workspace/module-boundary/architecture toolchain (Turborepo, dependency-cruiser, a static architecture control, a static money-safety control, and a compile-time negative-fixture harness). This is **not** an ERP feature phase: no API, frontend, database, jobs, identity, accounting ledger, or business module was created. No PostgreSQL, Kysely, `pg`, migrations, PGlite, or Testcontainers were introduced.

This report records what was built and, precisely, what was **not**. It does not claim application readiness or stack adoption.

---

## 1. Packages created

### Dependency graph (actual, mechanically enforced by `.dependency-cruiser.cjs`)

```
packages/errors   (no dependencies)
      ^
      |
packages/time     packages/money
(depends on errors only; time and money do NOT depend on each other)
```

### `packages/errors` — canonical typed failure/result vocabulary

Public API (`src/index.ts`): `ok`, `err`, `isOk`, `isErr`, `mapOk`, `mapErr`, `unwrapOr`, `matchResult`, `toPublicJson`, and the types `Result<T, C>`, `Ok<T>`, `Err<C>`, `ErrorShape<C>`, `PublicErrorJson<C>`, `PublicErrorDetails`, `PublicErrorDetailValue`.

Invariants:
- `Result<T, C>` is a discriminated union (`{ ok: true, value }` / `{ ok: false, error }`) — code-narrowable, immutable, exhaustively matchable via `matchResult`.
- `PublicErrorDetailValue = string | number | boolean | null` — JSON-safe by construction. `toPublicJson` strips `cause` (diagnostic-only) from the public shape; a dedicated property test (`result.property.test.ts`) asserts this for every generated `Err`.
- The public generic-`number` detail slot is explicitly documented as **not** an authoritative-money channel: `packages/money`'s `Money`/`MinorUnits` types cannot be assigned into it (they are branded, non-`number` types), and `scripts/check-money-safety.ts` independently forbids a numeric `minorUnits`/`amount` shape anywhere in `packages/money/src`.
- No thrown exceptions for ordinary control flow; `err(...)` is the only failure path domain functions use.

Tests: `tests/result.test.ts` (12 tests: ok/err narrowing, code preservation, public/diagnostic separation, JSON-safe structure, exhaustive matching), `tests/result.property.test.ts` (4 fast-check properties).

### `packages/time` — explicit temporal primitives

Public API (`src/index.ts`): `Instant`, `instantFromEpochMillis`, `instantToCanonicalString`, `parseInstant`, `compareInstants`, `MIN_EPOCH_MILLIS`, `MAX_EPOCH_MILLIS`; `CivilDate`, `civilDateFromParts`, `civilDateToCanonicalString`, `parseCivilDate`, `compareCivilDates`; `AsOf`, `makeAsOf`; `Clock`, `fixedClock`; `systemClock`.

Invariants:
- `Instant` is an absolute UTC instant, canonicalized to exactly one RFC 3339 form (`YYYY-MM-DDTHH:mm:ss.sssZ`), bounded to four-digit civil years (`MIN_EPOCH_MILLIS`..`MAX_EPOCH_MILLIS`) so the canonical string is always fixed-width. `parseInstant` round-trips its own output to reject calendar-invalid-but-numeric input (e.g. `2026-02-30`).
- `CivilDate` is a distinct `{ year, month, day }` type — never conflated with `Instant`, no timezone conversion, pure integer leap-year arithmetic.
- `AsOf` requires **both** `businessAsOf` and `knowledgeAsOf`; neither is optional. Proven at compile time (see §3) and by `tests/as-of.test.ts`.
- `Clock` is an explicit capability (`{ now(): Instant }`). `systemClock` (the one sanctioned ambient-clock adapter, calling `Date.now()`) exists only in `packages/time/src/system-clock.ts` and is never imported implicitly by any other module in this repository — mechanically enforced by `scripts/check-architecture.ts` (§6).

Tests: `instant.test.ts` (20), `civil-date.test.ts` (18), `as-of.test.ts` (2), `clock.test.ts` (2), `time.property.test.ts` (3 fast-check properties). 45 tests total.

**Honesty note:** these are primitives only. TIM-01/TIM-02/TIM-04 full qualification (bitemporal resolution against real stored facts, replay) is **not** claimed — see `governance/control-implementation.json` V10.

### `packages/money` — exact authoritative monetary primitives

Public API (`src/index.ts`): `CurrencyCode`, `toCurrencyCode`, `isValidCurrencyCode`; `MinorUnits`, `toMinorUnits`, `parseMinorUnits`, `minorUnitsToCanonicalString`, `addMinorUnits`, `subtractMinorUnits`, `signOfMinorUnits`, `MIN_MINOR_UNITS`, `MAX_MINOR_UNITS`; `Money`, `CanonicalMoney`, `makeMoney`, `moneyFromParts`, `serializeMoney`, `parseMoney`, `addMoney`, `subtractMoney`, `moneyEquals`; `Rate`, `toRate`, `rateEquals`, `signOfRate`; `ROUNDING_BOUNDARY_IDS`, `RoundingBoundaryId`, `roundExactRateToMinorUnits`.

Invariants:
- `MinorUnits` is a branded `bigint` — there is no code path, overload, or cast accepting a `number`. Explicitly bounded to PostgreSQL's `bigint` range `[-9223372036854775808, 9223372036854775807]` — a deliberate forward-compatibility decision (no database exists yet) recorded so the type never silently drifts wider than a future `bigint` column could store.
- `Money = { currency: CurrencyCode, minorUnits: MinorUnits }`. `parseMoney` rejects a JSON `number` for `minorUnits` (does not coerce it). `serializeMoney`/`parseMoney` round-trip exactly through the canonical shape `{ currency: string, minorUnits: string }`.
- No `parseFloat`, no `Number(...)`, no implicit float arithmetic anywhere in `packages/money/src` — mechanically enforced by `scripts/check-money-safety.ts` (§5), not just asserted in prose.
- `addMoney`/`subtractMoney` require matching currency (`CURRENCY_MISMATCH` otherwise) and propagate `RANGE_OVERFLOW` explicitly rather than wrapping/truncating.
- `Rate` is an exact bigint numerator/denominator, normalized to lowest terms with a strictly positive, provably non-zero denominator.
- `roundExactRateToMinorUnits` implements exactly one named, registered rounding boundary (`KERNEL.DEMO.HALF_EVEN.v1`, half-to-even) — deliberately not a generic hidden `.round()` helper. MON-04 full qualification is **not** claimed from one demo boundary.
- Required boundary corpus is present and tested: `2^53 - 1`, `2^53`, `2^53 + 1`, PostgreSQL `bigint` extrema, and one-beyond-range on both ends.

Tests: `currency.test.ts` (7), `minor-units.test.ts` (29), `money.test.ts` (15), `rate.test.ts` (9), `rounding.test.ts` (14), `money.property.test.ts` (6), `rate.property.test.ts` (5), `rounding.property.test.ts` (3). **88 tests total.**

**Independent oracle:** `tests/oracles/rounding-oracle.ts` implements `independentHalfEvenRoundOracle` — a second, separately-authored calculation path (magnitude-first-then-reapply-sign) for half-even rounding that never calls the production `roundExactRateToMinorUnits`. `rounding.test.ts` and `rounding.property.test.ts` both assert production/oracle agreement. This is the one critical calculation in this phase that needed a second path; addition/subtraction are exact by construction and do not need one. V13 is marked **partial**, not implemented, because oracle diversity exists for exactly one calculation domain, not a domain-wide corpus.

### `packages/testing` — not created

No reusable testing/oracle infrastructure justified a fourth package; the one oracle that exists (`tests/oracles/rounding-oracle.ts`) lives alongside its consumer in `packages/money/tests/` per the phase brief's "do not create empty placeholder packages" instruction.

---

## 2. Test-library pins (exact, committed in `pnpm-lock.yaml`)

Each of the three packages declares, in its own `package.json` `devDependencies` (not a shared root pin, so `pnpm run <script>` inside a package resolves its own local binaries):

| Package | Version | Source |
| --- | --- | --- |
| `vitest` | `4.1.10` | npm |
| `fast-check` | `4.9.0` | npm |
| `@typescript/native` | `npm:typescript@7.0.2` | npm alias (matches existing root pin) |
| `typescript` | `npm:@typescript/typescript6@6.0.2` | npm alias (matches existing root pin) |

No caret/tilde/`latest` anywhere. `pnpm gate` step 5b (`checkDependencyPinsAreExact`) now scans the root `package.json` **and every `packages/*/package.json`**, not just root — this scope was extended in this phase.

StrykerJS was **not** added. Per the phase brief ("Add StrykerJS only if you actually execute meaningful mutation evidence... do not install it merely to check a checklist box"), the meaningful mutation evidence this phase actually produced (two hand-authored mutants of real domain-critical guards, proven killed by the existing Vitest suite — §7) used the toolchain that already existed rather than adding a new dependency to satisfy a checklist item.

---

## 3. Compile-time negative fixtures (`tests/type-invalid/`)

A dedicated harness, `scripts/check-type-invalid.ts`, invokes the **real** `tsc --noEmit -p tests/type-invalid/tsconfig.json` command (that tsconfig extends the same `tsconfig.base.json` every package uses) and asserts each fixture fails to compile for its declared reason (a leading `// EXPECT_ERROR: <substring>` comment, matched against the actual compiler diagnostic).

| Fixture | Proves |
| --- | --- |
| `money-cannot-accept-number.ts` | `Money` cannot accept a `number` literal |
| `minor-units-cannot-accept-number.ts` | `MinorUnits` cannot accept a `number` literal |
| `money-currency-cannot-be-omitted.ts` | `Money.currency` is required, not optional |
| `asof-missing-business-boundary.ts` | `AsOf.businessAsOf` is required, not optional |
| `asof-missing-knowledge-boundary.ts` | `AsOf.knowledgeAsOf` is required, not optional |
| `_control-valid.ts` | Must compile with **zero** diagnostics — a broken tsconfig/program (which would make every fixture fail for the wrong reason) is distinguished from real fixture evidence by this control file. |

Run standalone: `node scripts/check-type-invalid.ts` — **5/5 fixtures failed for their declared reason; control fixture compiled clean.** Wired into `pnpm gate` (step 4h) and delegated into `pnpm red` (`runTypeInvalidDelegatedFixture`).

---

## 4. Real module-boundary control (SCC-05) — `.dependency-cruiser.cjs`

Now graphs the real, non-empty `packages/{errors,time,money}` tree: **30 modules, 59 dependencies cruised, zero violations.**

| Rule | Justification |
| --- | --- |
| `no-cross-package-internal-import` | Uses dependency-cruiser's documented capturing-group backreference (`from: { path: '^packages/([^/]+)/' }`, `to: { path: '^packages/([^/]+)/src/', pathNot: '^packages/$1/src/' }`) — forbids any package reaching into another package's `src/*` directly while still permitting a package's own internal imports. Enforces "root public API only". |
| `no-errors-depends-upward` | `packages/errors` is the graph's base; must never depend on `time` or `money`. |
| `no-money-depends-on-time` / `no-time-depends-on-money` | Enforces the brief's preferred direction: money and time are independent leaves over errors. |
| `no-circular` | No dependency cycles anywhere in the graph. |
| `no-domain-to-adapter` | Kept, explicitly marked forward-declared in its own comment — `packages/domain`/`apps/*`/`packages/db` do not exist yet. **Not** counted as current evidence. |

Red fixtures (`scripts/red.ts`, real `pnpm run boundary:check` CLI invocation, disposable files removed after):
- **A. internal-subpath import:** `packages/money/src/__red_fixture_internal_import__.ts` imports `../../errors/src/result.ts` directly (correct direction, wrong access path) — caught.
- **B. dependency cycle:** two files in `packages/money/src` importing each other — caught by `no-circular` in isolation (verified manually during implementation that this does **not** simultaneously trip a direction rule, so the cycle evidence is clean).

Manually verified (not committed as a fixture, to avoid duplicating the two committed ones): an import against the *forbidden* direction (`errors` reaching into `money/src`) trips **two** rules simultaneously (`no-errors-depends-upward` and `no-cross-package-internal-import`), confirming the rules compose rather than mask each other.

**State change: SCC-05 not-yet-built → implemented** (for the current, actual 3-package graph only).

---

## 5. SCC-03 — authoritative-money safety gate (`scripts/check-money-safety.ts`)

A real TypeScript-compiler-API (AST traversal, not grep/regex) static gate scoped to `packages/money/src/**/*.ts`. Rejects, at minimum:

1. Bare `Number(...)` / `parseFloat(...)` / `parseInt(...)` calls (`Number.isSafeInteger(...)`-style static member calls are correctly **not** flagged).
2. An object-literal `minorUnits`/`amount` property with a numeric-literal initializer (unsafe JSON money shape) — a string-valued `minorUnits` is correctly **not** flagged.
3. A plain `number` type annotation on a parameter/variable/property whose name matches `/amount|money|minorunits/i` (an unrelated `sign: number` field is correctly **not** flagged).

Verified via inline test cases (not committed, to keep the script self-contained) that all three detectors fire on real violations and produce zero false positives against this package's own doc-comments, which mention the strings "Number(" and "parseFloat" in prose — a naive grep would have flagged its own documentation; the AST approach does not.

Run standalone: `node scripts/check-money-safety.ts` over the real package — **0 violations, 6 files scanned.**

Red fixtures (`scripts/red.ts`, real `checkMoneySafety()` invocation): unsafe JSON shape (`{ minorUnits: 12345 }`), lossy conversion (`Number("12345")`) — both injected as disposable files, both caught, both removed.

**State change: SCC-03 not-yet-built → partial.** Full SCC-03 scope requires `packages/contracts`/an API boundary, neither of which exists yet.

---

## 6. SCC-24 — application architecture control (`scripts/check-architecture.ts`)

A real TypeScript-compiler-API static control scoped to `packages/*/src/**/*.ts`, detecting exactly 4 AST-verifiable patterns:

1. **Decorator-driven DI** — any `ts.isDecorator` node.
2. **Class-based domain inheritance** — any `class X extends Y` heritage clause where `Y` is not `Error`/`TypeError`/`RangeError`/`SyntaxError`.
3. **Runtime module discovery** — `Reflect.*` property access, non-string-literal dynamic `import(...)`, or bare `require(...)`.
4. **Ambient authoritative time** — `Date.now()` or zero-argument `new Date()` anywhere in `packages/*/src`, except the one explicitly named `packages/time/src/system-clock.ts` adapter. `new Date(<explicit value>)` (pure calendar math on an already-known value, as `instant.ts` uses twice) is correctly **not** flagged.

Run standalone: `node scripts/check-architecture.ts` over the real 14-file `packages/*/src` tree — **0 violations.**

Red fixtures (`scripts/red.ts`, real `checkApplicationArchitecture()` invocation), one per detected pattern, each injected as a disposable file and removed after: `@Injectable() class` (decorator), `class X extends Y` (inheritance), `Reflect.get(...)` (module discovery), `Date.now()` outside `system-clock.ts` (ambient time). All 4 caught.

**Explicitly NOT detected** (named in the script's own header, not silently omitted): service-locator pattern (no single reliable AST shape identified), implicit transaction abstractions (no concrete syntactic signature exists yet to detect against).

**State change: SCC-24 not-yet-built → partial.**

---

## 7. Mutation-kill fixtures (testing category)

Two hand-authored mutants of real domain-critical guards in `packages/money/src`, each proven killed by the existing Vitest suite via the real production `pnpm --filter @afenda/money test` command (not a helper reimplementation), with the mutated file restored byte-for-byte in a `finally` block:

1. **`runMoneyCurrencyGuardMutationFixture`** — deletes `addMoney`'s currency-equality guard (`if (a.currency !== b.currency) { return err('CURRENCY_MISMATCH', ...) }`) from `money.ts`. Result: Vitest's own currency-mismatch tests fail (mutant killed). `money.ts` carries an inline comment naming this exact fixture, co-locating the guard with its kill-proof.
2. **`runMoneyRangeGuardMutationFixture`** — replaces `toMinorUnits`'s range check (`if (value < MIN_MINOR_UNITS || value > MAX_MINOR_UNITS) { ... }`) with `if (false) { ... }` in `minor-units.ts`. Result: Vitest's own range-boundary tests fail (mutant killed).

**State change: SCC-18 not-yet-built → partial; V12 not-yet-built → partial.** This is real, executed, narrow evidence — two guards, not a StrykerJS domain-wide run.

---

## 8. Turborepo — real orchestration

`turbo.json` already had `typecheck:native`/`typecheck:compat`/`test`/`lint` task declarations from a prior phase, but they orchestrated **zero** real tasks (no workspace packages existed). This phase closes that finding:

```
$ pnpm exec turbo run typecheck:native typecheck:compat test --dry=json
```
lists 9 real `taskId`s: `@afenda/{errors,time,money}#{typecheck:native,typecheck:compat,test}`.

```
$ pnpm exec turbo run typecheck:native typecheck:compat test
...
 Tasks:    9 successful, 9 total
```

Wired into `pnpm gate` as step 4d (`runTurbo(['typecheck:native','typecheck:compat','test'])`), so the governance gate now actually exercises Turborepo, not just the root-level `pnpm run` scripts.

**Root package tasks are intentionally not included** in this turbo invocation — turbo does not include the root package's own scripts by default (verified: a plain `turbo run typecheck:native --dry=json` with no filter lists only the 3 package tasks, not a 4th root one), so root-level `scripts/**/*.ts` typecheck/lint remain separate `pnpm gate` steps (4a-4c) rather than being folded into the turbo step.

---

## 9. Control and doctrine-evidence state changes

All changes are recorded with full evidence/notes in `governance/control-implementation.json`; summarized here:

| Control | Before | After | Why |
| --- | --- | --- | --- |
| SCC-01 | implemented | implemented (evidence extended) | Packages now typecheck/lint under the same strict config, orchestrated by Turbo. |
| SCC-02 | implemented | implemented (evidence extended) | Packages carry zero `any`/unsafe-cast debt except one sanctioned brand-cast per smart constructor. |
| SCC-03 | not-yet-built | **partial** | Real AST gate + red fixtures over `packages/money/src`; no contracts/API boundary yet. |
| SCC-05 | not-yet-built | **implemented** | Real 3-package graph, all currently-applicable rules mechanically checked, 2 red fixtures. |
| SCC-18 | not-yet-built | **partial** | 2 real, executed mutation-kill fixtures; not a StrykerJS run. |
| SCC-24 | not-yet-built | **partial** | 4 of 6 named patterns detected via real AST, each with a red fixture; service-locator/implicit-transaction explicitly out of scope. |
| V08 (exact money transport) | not-yet-built | **partial** | `packages/money`'s own canonical round-trip is exact and property-tested; no contracts/API/db boundary exists. |
| V10 (temporal governance) | not-yet-built | **partial** | Primitives + AsOf + explicit-Clock + ambient-clock static control exist; no governed business logic yet. |
| V12 (mutation sensitivity) | not-yet-built | **partial** | Same 2 fixtures as SCC-18. |
| V13 (oracle diversity) | not-yet-built | **partial** | One independent oracle (rounding) for the one critical calculation that exists. |
| V14 (provenance/reproducibility) | partial | **partial** (evidence extended) | First narrow application-layer DET-05 canonical-form evidence (Money/MinorUnits); governance-registry scope claim unchanged. |

**Doctrine rules with newly-realized/partial supporting evidence** (doctrine/DOCTRINE.md itself is unmodified — this is reporting prose, not an authority edit): MON-01 (bigint minor units, never `number`), MON-03 (explicit currency, never implicit), MON-06 (range/overflow/sign explicit), TIM-03/TIM-04 (explicit Clock, no ambient time, bitemporal AsOf), DET-05 (exactly one canonical textual form for MinorUnits/Money/Instant/CivilDate), GOV-03 (a critical guard demonstrably fails when removed — the 2 mutation-kill fixtures), GOV-04 (independent oracle for rounding).

**Not advanced merely because one package demonstrates part of it:** V08, V10, V12, V13 are explicitly capped at `partial` per the phase brief's own worked examples (V08 needs every transport boundary; V10 needs governed business logic; V12/V13 need a domain-wide corpus/multiple calculations) — none of that exists yet.

---

## 10. Red harness — final fixture count

`scripts/red.ts` now runs **25 top-level fixtures** (14 pre-existing + 11 new this phase), plus the 11 sub-fixtures delegated through `authority-self-test` and the 6 sub-fixtures (5 negative + 1 control) delegated through the compile-time negative harness — i.e. every fixture is either a direct top-level entry or an explicit, named delegation to another real, independently-runnable harness (never silently uncounted).

New this phase (11 top-level entries):
1. `runTypeInvalidDelegatedFixture` (delegates to 6 `tests/type-invalid` fixtures)
2. `runDepCruiseInternalImportFixture`
3. `runDepCruiseCycleFixture`
4. `runArchitectureFixtures` → decorator, class-inheritance, module-discovery, ambient-clock (4 sub-results)
5. `runMoneySafetyFixtures` → unsafe-JSON-shape, lossy-conversion (2 sub-results)
6. `runMoneyCurrencyGuardMutationFixture`
7. `runMoneyRangeGuardMutationFixture`

All fixtures use `withDisposableFixtureFiles` (writes files, runs the real check, removes files in a `finally` block) or mutate a real file and restore it byte-for-byte in a `finally` block — the same pattern already established by the pre-existing `runLockfileDisagreementFixture`/`runTypecheckFixture`.

**Verified zero contamination:** `git status --short` immediately after a full `pnpm red` run shows no fixture files and no modified `money.ts`/`minor-units.ts` — restoration is byte-identical. `pnpm gate` run immediately after `pnpm red` is fully green.

---

## 11. Commands and exit codes (this session)

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` / `--no-frozen-lockfile` (after adding workspace devDependency links) | exit 0 |
| `pnpm exec turbo run typecheck:native typecheck:compat test --dry=json` | exit 0, 9 real taskIds |
| `pnpm exec turbo run typecheck:native typecheck:compat test` | exit 0, 9/9 successful |
| `node scripts/check-type-invalid.ts` | exit 0, 5/5 fixtures + control correct |
| `pnpm run boundary:check` (clean tree) | exit 0, 30 modules / 59 deps, 0 violations |
| `node scripts/check-money-safety.ts` | exit 0, 0 violations |
| `node scripts/check-architecture.ts` | exit 0, 0 violations |
| `pnpm run typecheck:native` / `typecheck:compat` / `lint` (root) | exit 0 each |
| `node scripts/gate.ts` | exit 0, all steps PASS |
| `node scripts/red.ts` | exit 0, all 25 top-level fixtures behaved as expected |
| `node scripts/gate.ts` (immediately after red) | exit 0 — zero contamination |
| `git status --short` (after red) | no fixture files, no modified `money.ts`/`minor-units.ts` |

---

## 12. Limitations / NOT-YET-BUILT surfaces (explicit)

- No API, frontend, database, jobs, identity, ledger, sales, purchasing, inventory, HR, or payroll code exists. None was created in this phase.
- No PostgreSQL, Kysely, `pg`, migrations, PGlite, or Testcontainers exist.
- `packages/contracts` does not exist; V08 (exact money transport across every boundary) cannot be fully evidenced without it.
- No StrykerJS run exists; SCC-18/V12's "critical mutation survival zero" is evidenced only for 2 hand-picked guards, not a domain-wide corpus.
- SCC-24's service-locator and implicit-transaction-abstraction detection are explicitly unimplemented (no reliable AST shape identified yet).
- No git remote is configured in this environment (unchanged from Phase 2.2); no live CI evidence exists.
- The TS6 wrapper/compiler-engine discrepancy (SCC-04) remains documented and intentionally unresolved, unchanged by this phase.
- This report and the control-implementation.json updates do **not** constitute an application-readiness claim or a stack-adoption claim. `stack/STACK_ADOPTION.md` is intentionally left unmodified — no compound checklist item in it is objectively fully established by this phase's evidence (see §13).

## 13. `STACK_ADOPTION.md`

Reviewed and left unmodified. Every checklist item in it is a compound, whole-stack claim (e.g. full PostgreSQL dual-major qualification, a real API, a real frontend) — Phase 3A's evidence is real but narrow (3 kernel packages, no database/API/frontend), so no item there is objectively, fully satisfied yet. Ticking a partially-true compound item would overstate reality.
