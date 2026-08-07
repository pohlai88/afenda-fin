# AFENDA Phase 3B.1 — Lint Control Repair/Hardening Report

**Baseline commit:** `8c6923e` (`feat(contracts): establish AFENDA exact transport boundary`), parent `82c08dd`. `authority-baseline-v1` remains at `09e7e6e`, unmoved by this phase.

**Scope:** repair and harden lint control evidence before database work. This phase fixes a real false-red defect in the lint gate's own red fixture, enables two unsafe-ingress ESLint rules, fixes the one real violation they surface, adds dedicated red fixtures (including a business-facing Money/JSON ingress proof), adds a developer-only cached lint script, and reviews/updates control evidence. It is **not** an ERP feature phase and does **not** touch PostgreSQL, `pg`, Kysely, an API, a frontend, jobs, identity, or the accounting ledger.

This report records what was found, fixed, and proven — including the pre-existing defect, honestly, rather than rewriting history as if it never existed.

---

## 1. Preflight / concurrent-writer check

| Check | Result |
| --- | --- |
| `git rev-parse HEAD` before any edit | `8c6923e280b95c9a12ee5d95e6acac15cdb94923` — matches the required baseline |
| `git status --short` before any edit | empty (clean tree) |
| `pnpm gate` before any edit | `PASS` |
| `pnpm red` before any edit | `ALL FIXTURES BEHAVED AS EXPECTED`, tree clean immediately after |
| Concurrent-writer signs | none observed: the tree was clean before `pnpm gate`/`pnpm red`, remained clean after both, and stayed clean through every subsequent fixture-design experiment in this session (verified with `git status --short` after each disposable probe) |

No moving-tree condition was detected. The phase proceeded.

---

## 2. Reproducing the existing lint fixture defect

The prior fixture (`runLintTsSuppressionFixture` in `scripts/red.ts`) called `eslint.lintText(badCode, { filePath: path.join(ROOT, 'scripts', '__red_fixture__.mjs') })` — an **invented path that was never written to disk** — and asserted only `report.errorCount > 0`.

**Bad-content run** (`// @ts-ignore` + `/** @type {any} */ const x = 1;`) against the invented path:

```json
{
  "ruleId": null,
  "fatal": true,
  "severity": 2,
  "message": "Parsing error: ...__red_fixture__.mjs was not found by the project service. Consider either including it in the tsconfig.json or including it in allowDefaultProject."
}
```

`errorCount: 1` — but the one message is a `projectService` "file not found" **parser failure**, not `no-explicit-any`/`ban-ts-comment` firing.

**Clean-content control run** (`export const x = 1;\n`) against the *identical* invented path:

```json
{
  "ruleId": null,
  "fatal": true,
  "severity": 2,
  "message": "Parsing error: ...__red_fixture__.mjs was not found by the project service. ..."
}
```

Byte-identical `errorCount: 1`, same fatal message. This confirms the old fixture's `errorCount > 0` assertion could not distinguish "the rule fired" from "the file does not exist" — the fixture was false-red evidence, exactly as suspected. It had been silently passing (reported PASS in `pnpm red`) without ever having proven the two named rules could detect anything.

---

## 3. The fix

A real `.ts` fixture is now written to a real on-disk path already covered by `tsconfig.json`'s `include` (`scripts/**/*.ts`): `scripts/__red_fixture_lint_suppression__.ts`.

New shared harness helper `runLintRuleFixture(name, spec)` in `scripts/red.ts`:

1. Writes `spec.badSource` to the real `spec.relativePath`.
2. Runs `eslint.lintFiles([relativePath])` (not `lintText` against a virtual path).
3. **Rejects** the fixture if any message has `fatal === true` or `ruleId === null` — a parser/config failure can never substitute for rule detection.
4. **Rejects** the fixture unless every id in `spec.expectedRuleIds` is present among the fired `ruleId`s.
5. Overwrites the same real path with `spec.cleanSource` and asserts `errorCount === 0` — proving the path/config itself is not simply broken.
6. Removes the fixture file in a `finally` block, on every exit path (success, assertion failure, or thrown error).

`runLintTsSuppressionFixture` now uses this helper:

- bad source: `// @ts-ignore` + `export const redFixtureLintSuppression: any = 1;`
- expected rule IDs: `@typescript-eslint/ban-ts-comment`, `@typescript-eslint/no-explicit-any` — both confirmed to fire, no fatal message present
- clean source at the same path: `export const redFixtureLintSuppressionClean: number = 1;` — confirmed 0 errors

---

## 4. Rules enabled

`eslint.config.mjs`:

| Rule | Before | After |
| --- | --- | --- |
| `@typescript-eslint/no-unsafe-assignment` | `'off'` | `'error'` |
| `@typescript-eslint/no-unsafe-argument` | `'off'` | `'error'` |
| `@typescript-eslint/no-unsafe-member-access` | `'off'` | `'off'` (unchanged, deliberately) |
| `@typescript-eslint/no-unsafe-call` | `'off'` | `'off'` (unchanged, deliberately) |
| `@typescript-eslint/no-explicit-any`, `ban-ts-comment` | `'error'` | unchanged |

No other rule was weakened to compensate.

---

## 5. Fixing the one real violation

`pnpm lint` after enabling the two rules surfaced exactly **one** violation, in `packages/errors/tests/result.test.ts:103`:

```
error  Unsafe assignment of an `any` value  @typescript-eslint/no-unsafe-assignment
```

Site: `const roundTripped = JSON.parse(JSON.stringify(publicJson));` — the bare `const` declaration implicitly takes on `JSON.parse`'s `any` return type, which `no-unsafe-assignment` correctly flags even without a target type annotation.

**Fix applied** (no `as`, no `eslint-disable`, no `@ts-ignore`/`@ts-nocheck`):

```ts
const roundTripped: unknown = JSON.parse(JSON.stringify(publicJson));
```

An explicit `unknown` annotation is not `any`; assigning `any` into an `unknown`-typed binding is not unsafe (the compiler forces no assumption on the value). The test's own subsequent `expect(roundTripped).toEqual(...)` still works unchanged. Re-run: `pnpm lint` → 0 errors; `pnpm --filter @afenda/errors run test` → 16/16 tests pass.

---

## 6. Dedicated red fixtures added

### A. `runUnsafeAssignmentLintFixture`

```ts
interface RedFixtureShape { amount: string; }
declare const raw: string;
export const redFixtureUnsafeAssignment: RedFixtureShape = JSON.parse(raw);
```

Fires exactly `@typescript-eslint/no-unsafe-assignment` (one message, no fatal, no other rule). Clean control at the same path (`declare const raw: RedFixtureShape; export const ... = raw;`) lints with 0 errors.

### B. `runUnsafeArgumentLintFixture`

```ts
function redFixtureTypedFunction(value: string): string { return value; }
declare const raw: string;
export const redFixtureUnsafeArgument = redFixtureTypedFunction(JSON.parse(raw).value);
```

Fires exactly `@typescript-eslint/no-unsafe-argument` (one message). The `.value` property access on `JSON.parse`'s `any` return does not itself fire, since `no-unsafe-member-access` remains off, isolating the proof to the intended rule. Clean control passing `raw` directly lints with 0 errors.

Neither fixture writes a literal `any` token, so `no-explicit-any` cannot be the reason either fires — the unsafe type genuinely arrives from `JSON.parse`, an untyped/external source.

---

## 7. The Money/JSON ingress proof (business-facing)

`runMoneyJsonIngressLintFixture` — the doctrine SEC-05 proof ("all external and cross-boundary input is untrusted ... shall be validated against typed and business constraints before authoritative use").

**Unsafe (before), bypassing `packages/contracts`'s Zod schema:**

```ts
import { moneyFromParts } from '@afenda/money';
declare const raw: string;
const incoming = JSON.parse(raw);
export const redFixtureMoneyIngressUnsafe = moneyFromParts(incoming.currency, incoming.minorUnits);
```

Fires:

- `@typescript-eslint/no-unsafe-assignment` (line 3, the bare `const incoming = JSON.parse(raw)`)
- `@typescript-eslint/no-unsafe-argument` ×2 (line 4, `incoming.currency` and `incoming.minorUnits` passed to `moneyFromParts`'s typed `string`/`bigint` parameters)

**Sanctioned (after), through the real `packages/contracts` boundary:**

```ts
import { decodeMoneyTransport } from '@afenda/contracts';
declare const raw: string;
export const redFixtureMoneyIngressClean = decodeMoneyTransport(JSON.parse(raw));
```

Lints with **0 errors**. `decodeMoneyTransport`'s parameter type is `unknown`, not `any` — passing an untrusted `JSON.parse()` value directly into it is not unsafe by construction, because `unknown` forces `MoneyWireSchema.safeParse` to validate before anything downstream can assume a shape. `JSON.parse` itself is not banned anywhere; the invariant proven is narrower and correct: untrusted data cannot become authoritative typed input without passing through validation.

---

## 8. Dev lint cache

`package.json`:

```json
"lint": "eslint .",
"lint:dev": "eslint . --cache --cache-location node_modules/.cache/eslint"
```

`pnpm lint` remains exactly `eslint .` — unchanged, uncached, and is what `pnpm gate` (step 4c, via `runPnpmScript('lint')`), `.github/workflows/gate.yml`, and `turbo.json`'s `lint` task (`"cache": false`, no `--cache` flag) all invoke. `pnpm red` calls the ESLint Node API directly (`new ESLint({ cwd: ROOT })`), never the cache flag. `node_modules/.cache/eslint` falls under the existing `.gitignore` entry `node_modules/` (confirmed via `git check-ignore -v`).

**Observed timings** (this session, no concurrent load observed; recorded as raw observations only, no performance claim):

| Run | Time |
| --- | --- |
| Cold (`node_modules/.cache/eslint` deleted first) | ~16.3s – 21.2s (two separate cold measurements) |
| Warm (immediately after) | ~3.8s – 5.7s (three separate warm measurements) |

The prior audit noted concurrent load made earlier warm-cache numbers unreliable as qualification evidence; this session did not attempt to characterize that further, and no exact speedup percentage is claimed — only that a warm cache was observably faster than cold in every measurement taken.

---

## 9. Out-of-scope rules

Not added, as instructed: `eqeqeq`, `no-console`, `no-non-null-assertion`, `restrict-plus-operands`, `require-array-sort-compare`, `radix`. `no-non-null-assertion` is recorded here as a possible future hardening item only — no current evidence was gathered to justify enabling it, and it is not enabled.

---

## 10. Red harness hardening (generalized lesson)

The failure mode this phase fixes — a rule-specific lint fixture whose assertion (`errorCount > 0`) is satisfied by a fatal parser/config error rather than the named rule — is now structurally impossible for any fixture built on `runLintRuleFixture`: the helper explicitly checks for and rejects `fatal`/`ruleId: null` messages before ever checking for the expected rule IDs, and separately requires a same-path clean-source control to lint with zero errors. All four lint fixtures in this phase (`lint-ts-suppression`, `no-unsafe-assignment`, `no-unsafe-argument`, Money/JSON ingress) go through this one helper. No second lint framework was introduced.

---

## 11. Control review

No control's **state** changed. Evidence was strengthened for the controls below (full text: `governance/control-implementation.json`).

| Control | State (before → after) | What changed |
| --- | --- | --- |
| SCC-01 | `implemented` → `implemented` | Evidence: false-red history recorded honestly; `lint-ts-suppression` fixture rewritten; new shared `runLintRuleFixture` helper documented |
| SCC-02 | `implemented` → `implemented` | Evidence: two new rules enabled and their real-repository effect (1 violation, fixed) recorded; 2 new red fixtures added |
| SCC-03 | `implemented` → `implemented` | Evidence: SEC-05 cross-reference added — the two new lint rules make untrusted-JSON-to-Money ingress a repository-wide, mechanically-enforced lint failure, independent of `scripts/check-money-safety.ts`'s narrower AST scan; new red fixture referenced |
| SCC-18 | `partial` → `partial` | Note only: clarifies the lint-fixture fix is recorded under V12, not as a 6th hand-authored production-code mutant here |
| V08 | `partial` → `partial` | Evidence: notes that the one existing real Money boundary (`decodeMoneyTransport`) is now also proven, statically, to admit no untyped-`any` shortcut; explicitly still bounded to the current topology (no database/API/queue boundary exists) |
| V12 | `partial` → `partial` | Evidence: the lint-fixture fix + 3 new fixtures recorded as a *distinct instance* of GOV-03 ("a critical executable control must demonstrably be able to fail"), applied to the lint gate itself rather than to money/time production code; gate field extended to list the lint fixtures |
| SEC-05 (doctrine rule) | n/a | SEC-05 has no dedicated `control_id` in `governance/control-implementation.json` and is not listed as a `primary_rules` entry for any V-control in `doctrine/DOCTRINE.md`'s own V-control table — it is referenced only in supporting prose (SCC-12's note, now also SCC-03/V08). This phase adds concrete, mechanically-enforced evidence for SEC-05's mandate under SCC-03/V08 rather than inventing a new control entry that doctrine itself does not define. |

No state was advanced merely because fixture count increased, per instruction.

---

## 12. Commands run and exit codes (this phase, post-fix)

| Command | Exit code |
| --- | --- |
| `git status --short` (preflight) | 0, empty |
| `pnpm gate` (preflight) | 0 |
| `pnpm red` (preflight) | 0, `ALL FIXTURES BEHAVED AS EXPECTED` |
| `pnpm install --frozen-lockfile` | 0 |
| `pnpm run typecheck:native` | 0 |
| `pnpm run typecheck:native:single` | 0 |
| `pnpm run typecheck:compat` | 0 |
| `pnpm lint` | 0 |
| `pnpm lint:dev` (cold) | 0 |
| `pnpm lint:dev` (warm ×2) | 0 |
| `pnpm exec turbo run typecheck:native typecheck:compat test` | 0 (12/12 tasks successful, 0 cached) |
| `node scripts/check-type-invalid.ts` | 0 (12 fixtures) |
| `pnpm agent-docs` | 0, no drift (`git status` showed no change to `governance/rules.json`, `.cursor/rules/afenda.mdc`, `AGENTS.md`) |
| `pnpm gate` (1st, post-fix) | 0 |
| `pnpm red` (post-fix) | 0, 36/36 fixtures `ALL FIXTURES BEHAVED AS EXPECTED` |
| `pnpm gate` (2nd, post-fix) | 0 |

**Explicitly verified in `pnpm red` output:**

- every lint fixture's PASS line reads "expected FAIL-detected, got FAIL-detected" — no fixture is satisfied by `ruleId: null`
- no fatal parser/`projectService` failure substitutes for rule sensitivity (enforced structurally by `runLintRuleFixture`, and confirmed by inspecting each fixture's internal assertions)
- `no-unsafe-assignment` fixture fires the correct, single rule
- `no-unsafe-argument` fixture fires the correct, single rule
- all fixture files removed after every run (`git status --short` clean immediately after `pnpm red`, both mid-session and in the final verification pass)
- the second `pnpm gate` passes with the same state summary as the first (`implemented: 5, partial: 8, not-yet-built: 31, blocked: 0, not-applicable-current-tree: 1`)

**Red fixture count:** 33 (before) → 36 (after), confirmed by running `pnpm red` against the pre-change tree (via `git stash`) and counting top-level `[PASS]` lines, then again against the post-change tree. Net +3: `no-unsafe-assignment`, `no-unsafe-argument`, Money/JSON ingress. (`lint-ts-suppression` occupies the same slot it always did — fixed in place, not added.)

---

## 13. Limitations

- `@typescript-eslint/no-unsafe-member-access` and `no-unsafe-call` remain `'off'`. No current codebase violation makes enabling them mechanically necessary, and doing so was explicitly out of scope for this narrow commit.
- **Residual: transient untrusted `any` (highest-ranked follow-up).** The two enabled rules close ingress at the *binding* site and the *argument* site. Untrusted `any` that is never bound and never passed still escapes both. Probed on disk at `a67ac88` under the real config:

  ```
  MISSED | any in if-condition        | -
  MISSED | any bare call statement    | -
  MISSED | any in template literal    | -
  MISSED | any in === comparison      | -
  MISSED | any thrown                 | -
  MISSED | any in arithmetic only     | -
  CAUGHT | any pushed to typed array  | @typescript-eslint/no-unsafe-argument
  ```

  So the two `'off'` rules are not redundant with the two enabled ones — they cover a narrower but real band. For an authoritative-money kernel the sharpest case is a control-flow decision taken directly on untrusted input, e.g. `if (JSON.parse(body).authorized) { ... }`, which lints clean today. This is recorded as a scoped follow-up with probe evidence already in hand; it is **not** a defect in this phase's stated scope, which was ingress into typed data.
- `no-non-null-assertion` and the other rules listed in §9 remain unadded; no evidence was gathered this phase to justify them. It ranks **below** the transient-`any` residual above.
- A prior audit recommendation to enable `no-unsafe-member-access`/`no-unsafe-call` alongside the two ingress rules was **over-cautious and is superseded**. Re-running that audit's own eight-path leak probe against the hardened config shows all 8 of 8 paths now caught — including the four the audit predicted would need those rules — because `no-unsafe-assignment` fires at the binding site regardless of how the `any` was produced. The `'off'` decision recorded in `eslint.config.mjs` is empirically correct for those paths; its remaining justification is the transient band above, not the ingress band.
- The lint:dev cache timing numbers (§8) are single-session observations on this machine, not a controlled benchmark; no percentage improvement is claimed, matching the prior audit's own caution about concurrent-load contamination.
- SEC-05 has no dedicated control entry in `governance/control-implementation.json` because doctrine's own V-control table does not map it to any V-control's `primary_rules`; this phase strengthens SEC-05-relevant evidence inside SCC-03/V08 rather than fabricating a new control ID.
- This phase proves the lint mechanism prevents untrusted-`any` ingress into a **typed variable or a typed function parameter**. It does not (and does not claim to) prevent unsafe **member access** or unsafe **calls** on an `any`-typed value, since those two rules remain off.
- As with Phase 3B, no database/API/queue/export boundary exists; SEC-05/V08 evidence remains bounded to the one real transport boundary that exists today (`packages/contracts`).

## 14. Concurrent-writer caveat (carried forward)

The prior lint audit that discovered this defect observed another session writing `packages/contracts` during measurement. This phase's preflight (§1) found the tree stable and clean at the required baseline commit before any edit was made, and it remained clean (verified with `git status --short`) after every fixture-design experiment and after both full `pnpm red` runs in this session. No evidence of a concurrent writer was found during this phase's own work.

**Correction (recorded 2026-08-08).** The sentence above is accurate for *this phase's* execution window, which began at `8c6923e`. It should not be read as saying the tree was quiet throughout the audit that preceded it. It was not. The audit session sampled write activity every 10s for 60s and observed writes in 5 of 6 windows:

```
[sample 1 @ 04:25:08] writes in last 30s: 1   packages/time/src/instant.ts
[sample 2 @ 04:25:20] writes in last 30s: 1   packages/time/src/instant.ts
[sample 3 @ 04:25:32] writes in last 30s: 1   packages/time/src/instant.ts
[sample 4 @ 04:25:43] writes in last 30s: 0
[sample 5 @ 04:25:56] writes in last 30s: 1   scripts/red.ts
[sample 6 @ 04:26:08] writes in last 30s: 1   scripts/red.ts
```

Two details matter for the evidence record and were not previously stated:

1. The concurrent writer was actively editing **`scripts/red.ts`** — the file this phase repairs — not only `packages/contracts`. At that moment the tree carried 7 modified and 8 untracked paths; that work became `8c6923e`.
2. That session added **+160 lines** to `scripts/red.ts` without fixing the false red. The defect survived into `8c6923e` intact: `lintText` against the invented `scripts/__red_fixture__.mjs` path with an `errorCount > 0` assertion. The audit session declined to edit a moving tree and stopped rather than produce evidence against it; the repair is this phase, on a quiet tree.

Neither detail invalidates any result in this report — `8c6923e` landed first, and this phase's preflight was genuinely clean. It is recorded because §1's "none observed" is scoped to this phase alone, and a reader tracing when the defect was introduced, observed, and repaired needs the ordering.

---

## 14a. Independent post-commit mutation verification (added 2026-08-08, at `a67ac88`)

Everything in §12 verifies the harness is *green*. Green is exactly what the old fixture was, so a passing run is not by itself evidence that the repair worked. The repaired fixtures were therefore mutation-tested at `a67ac88`: the control was removed and the harness re-run, to confirm it turns red for the intended defect.

**Mutation:** `@typescript-eslint/no-unsafe-assignment` flipped `'error'` → `'off'` in `eslint.config.mjs`. No other change.

```
[PASS] lint-ts-suppression (@ts-ignore + explicit any, real on-disk path, exact rule IDs) (expected FAIL-detected, got FAIL-detected)
[FAIL] lint: no-unsafe-assignment fires on untrusted JSON.parse() assigned to a typed shape (expected FAIL-detected, got no-fail)
[PASS] lint: no-unsafe-argument fires on untrusted JSON.parse() value passed to a typed parameter (expected FAIL-detected, got FAIL-detected)
[FAIL] lint: untrusted JSON->Money ingress fails without Zod; decodeMoneyTransport(JSON.parse(...)) lints clean (expected FAIL-detected, got no-fail)
Red harness result: SOME FIXTURES DID NOT BEHAVE AS EXPECTED

pnpm red EXIT CODE (control removed) = 1
```

**Result:** exactly the two fixtures that depend on the removed rule flipped, and both flipped with `got no-fail` — the harness detected an *absent rule*, not a parser error. The `no-unsafe-argument` fixture correctly stayed green, confirming the fixtures are rule-scoped rather than co-triggering. `pnpm red` exits `1`, so CI cannot pass over a removed control.

`eslint.config.mjs` was restored with `git checkout --`; `git status --short` empty; `HEAD` still `a67ac88`. This is the property §10 of the phase brief asked for, stated as evidence rather than as intent: **a red test is evidence only if it turns red for the defect it claims to detect** — now demonstrated, not asserted.

---

## 15. Final git status (end of phase, pre-commit)

```
 M eslint.config.mjs
 M governance/control-implementation.json
 M package.json
 M packages/errors/tests/result.test.ts
 M scripts/red.ts
```

(`governance/CONTROL_PLANE_REPORT.md` and this report, `governance/PHASE_3B1_LINT_REPORT.md`, are new/modified files staged alongside the above at commit time.) No fixture residue, no Doctrine/Stack/Position change, no seal change, no database/API/frontend/jobs/identity/ledger code added.
