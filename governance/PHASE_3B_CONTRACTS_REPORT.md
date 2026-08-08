# AFENDA Phase 3B — Contracts Report

**Baseline commit:** `82c08dd` (`feat(kernel): establish AFENDA money and time foundations`), parent `6bf2800`. `authority-baseline-v1` remains at `09e7e6e`, unmoved by this phase.

**Scope:** the first real external/JSON transport boundary — `packages/contracts` — proving authoritative Money, Instant, CivilDate and AsOf values cross a real serialize/JSON/parse boundary exactly. This is **not** an ERP feature phase and does **not** build Hono/an API, a database, a frontend, jobs, identity, or an accounting ledger. No `hono`, `@hono/zod-openapi`, PostgreSQL, Kysely, `pg`, migrations, PGlite, or Testcontainers were introduced.

This report records what was built and, precisely, what was **not**. It does not claim application readiness or stack adoption.

---

## 1. Package created

### Dependency graph (actual, mechanically enforced by `.dependency-cruiser.cjs`)

```
packages/errors   (no dependencies)
      ^          ^          ^
      |          |          |
packages/time  packages/money  |
      ^          ^             |
      |          |             |
      +----------+-------------+
                 |
         packages/contracts
   (depends on errors, time, money, zod;
    errors/time/money must NOT depend on contracts)
```

`contracts` is the only new package. `errors`, `time`, and `money` are byte-for-byte unmodified except where noted in §7 (temporary mutation fixtures only, always restored).

### `packages/contracts` — canonical external transport boundary

Public API (`src/index.ts`):

- **Money:** `MoneyWire`, `MoneyWireSchema`, `MoneyTransportErrorCode`, `decodeMoneyTransport`, `encodeMoneyTransport`
- **Instant:** `InstantWire`, `InstantWireSchema`, `InstantTransportErrorCode`, `decodeInstantTransport`, `encodeInstantTransport`
- **CivilDate:** `CivilDateWire`, `CivilDateWireSchema`, `CivilDateTransportErrorCode`, `decodeCivilDateTransport`, `encodeCivilDateTransport`
- **AsOf:** `AsOfWire`, `AsOfWireSchema`, `AsOfTransportErrorCode`, `decodeAsOfTransport`, `encodeAsOfTransport`
- **Result/Failure:** `PublicFailureWire`, `PublicErrorDetailValueSchema`, `PublicFailureWireSchema`, `encodeFailureTransport`, `decodeFailureTransportShape`

No `src/*` internal path is a supported import target for consumers; enforced by the same `no-cross-package-internal-import` dependency-cruiser rule used for `errors`/`time`/`money` (§6).

#### Money wire shape

```json
{ "currency": "MYR", "minorUnits": "12345" }
```

`MoneyWireSchema` is a **strict** Zod object (`z.object({ currency: z.string(), minorUnits: z.string() }).strict()`) — `minorUnits` is typed as a Zod `string`, so a JSON `number` is rejected at the schema layer itself, before the domain parser is ever invoked. `decodeMoneyTransport` validates the shape, then delegates all range/canonical-format semantics to the **existing** domain `parseMoney` (no duplicated logic); `encodeMoneyTransport` delegates to the existing domain `serializeMoney`. `MoneyWire` is a type alias for `packages/money`'s own `CanonicalMoney` — the *shape* is shared by design (there is exactly one canonical wire shape), but a domain `Money` object (with a `bigint` `minorUnits`) is never itself assignable to `MoneyWire` (proven at compile time, §4).

#### Temporal wire shapes

- **Instant:** a canonical RFC 3339 string (`YYYY-MM-DDTHH:mm:ss.sssZ`), validated at the Zod layer as `z.string()` then parsed via the existing domain `parseInstant` (which itself round-trips the input to reject calendar-invalid-but-numeric strings like `2026-02-30`) and serialized via `instantToCanonicalString`.
- **CivilDate:** a canonical `YYYY-MM-DD` string, same pattern via `parseCivilDate`/`civilDateToCanonicalString`. No timezone inference of any kind.
- **AsOf:** an explicit, strict object carrying **both** dimensions independently:

  ```json
  { "businessAsOf": "2025-01-01T00:00:00.000Z", "knowledgeAsOf": "2025-04-01T00:00:00.000Z" }
  ```

  Each field is validated and parsed through the same `InstantWireSchema`/`decodeInstantTransport` used for a standalone `Instant` — no duplicate temporal semantics were created. `AsOfWire` requires both fields (Zod `.strict()` object with no optional properties); a domain `AsOf` is only ever constructed via `makeAsOf(business, knowledge)` after both individually parse successfully.

#### Result/Failure transport

`PublicFailureWireSchema` is a strict Zod object: `{ code: string, message: string, details?: Record<string, string | number | boolean | null> }`. `encodeFailureTransport` delegates to the **existing** `packages/errors` `toPublicJson` (no redesign) — `cause`/diagnostic internals are already stripped by that function. `decodeFailureTransportShape` applies the same `@afenda/errors` `normalizePublicErrorDetails` canonicalization after the Zod shape gate (so inbound `-0` becomes `'-0'`, matching encode), and `.strict()` rejects an inbound `cause` key. A compile-time negative fixture (§4) proves a domain `Money` object can never be assigned into `PublicErrorDetails`, so authoritative Money can never leak through the generic ordinary-number details channel. No HTTP status mapping exists — there is no API framework to map onto yet.

### Canonical integer string — one owned parser/validator

No new regex was scattered around the repository. `decodeMoneyTransport` delegates directly to the **existing** `packages/money/src/minor-units.ts` `parseMinorUnits`, which is the single semantic authority for the canonical-integer-string invariant (leading zeros rejected except the bare digit `"0"`, `"-0"` rejected, no decimal/exponent, no whitespace, no leading `+`, PostgreSQL `bigint` range enforced). `packages/contracts` adds only the outer Zod *shape* check (is it a string at all, is the object's shape well-formed) — never a second, competing definition of "canonical integer string."

---

## 2. Zod version

| Field | Value |
| --- | --- |
| Requested (declared in `packages/contracts/package.json`) | `zod: "4.4.3"` (exact, no `^`/`~`/`latest`) |
| Resolved (`pnpm-lock.yaml`) | `zod@4.4.3` |
| Installed (`packages/contracts/node_modules/zod/package.json`) | `4.4.3` |

All three agree exactly. `4.4.3` was selected as the latest published `zod@4.x` patch at the time of this phase (`npm view zod dist-tags` was consulted; STACK.md's own text was **not** altered merely because it did not previously name an exact patch — STACK.md says "Zod 4," and `4.4.3` satisfies that under the existing exact-pin discipline, recorded here and in the lockfile as exact-version authority per the phase brief). `scripts/lib/control-map.ts`'s `checkDependencyPinsAreExact` (wired into `pnpm gate` step 5b) confirmed this pin passes the same range-rejection check every other dependency in this repository is held to.

---

## 3. Round-trip and property test evidence

`packages/contracts/tests/` — **8 test files, 85 tests, all passing** (includes later encode/decode `-0` parity and inbound-`cause` rejection cases).

| File | Tests | Covers |
| --- | --- | --- |
| `money-transport.test.ts` | unit | Exact round trip at `2^53-1`/`2^53`/`2^53+1` (and negatives), PostgreSQL `bigint` min/max, multiple currencies; rejects a JSON `number` for `minorUnits`; rejects every malformed-canonical-string case (`""`, `" 1"`, `"1 "`, `"+1"`, `"01"`, `"-0"`, `"1.0"`, `"1e3"`, `"1E3"`, `"NaN"`, `"Infinity"`, `"0x10"`); rejects missing/extra fields, wrong types, invalid currency, out-of-range `minorUnits` |
| `money-transport.property.test.ts` | fast-check | `decode(encode(x)) = x`; full `JSON.stringify`/`JSON.parse` round trip preserves `x` exactly; encoded `minorUnits` is always a canonical integer string (`/^-?[0-9]+$/`); numeric JSON input is always rejected |
| `instant-transport.test.ts` | unit | Exact round trip; rejects non-string input and malformed RFC3339 (missing `Z`, missing milliseconds, non-UTC offset, calendar-invalid, garbage) |
| `instant-transport.property.test.ts` | fast-check | `decode(encode(x)) = x` and full JSON round trip across a wide generated `Instant` range |
| `civil-date-transport.test.ts` | unit | Exact round trip including leap days; rejects non-string input and malformed `YYYY-MM-DD` (calendar-invalid, missing padding, time component, garbage) |
| `as-of-transport.test.ts` | unit | Exact round trip for distinct **and** equal `businessAsOf`/`knowledgeAsOf`; rejects missing fields, extra fields, malformed instant strings, non-object input |
| `as-of-transport.property.test.ts` | fast-check | Both dimensions round-trip independently without collapsing into one value; full JSON round trip preserves distinct boundaries |
| `result-transport.test.ts` | unit | outbound `cause` is stripped; inbound `cause` rejected by `.strict()`; `code`/`message`/`details` preserved; encode/decode `-0` → `'-0'` parity; a domain `Money` value entering `details` is only ever representable as a JSON-safe primitive (string), never a raw object; rejects malformed shapes |

**Money JSON boundary result (the doctrine-mandated corpus, RED-03's spirit):**

| Value | Round-trips exactly? |
| --- | --- |
| `9007199254740991` (2^53 − 1) | Yes |
| `9007199254740992` (2^53) | Yes |
| `9007199254740993` (2^53 + 1) | Yes |
| `-9223372036854775808` (PG `bigint` min) | Yes |
| `9223372036854775807` (PG `bigint` max) | Yes |

All five values are covered by both the example-based test (`money-transport.test.ts`) and the fast-check property test, and by the precision-loss mutation-kill fixture (§7) that proves the test suite would actually catch a regression at this exact boundary.

---

## 4. Compile-time negative fixtures (`tests/type-invalid/`)

Six **new** fixtures added this phase (12 total then, up from 6 in Phase 3A), run via the same real `node scripts/check-type-invalid.ts` → `tsc --noEmit -p tests/type-invalid/tsconfig.json` harness. A later money-kernel seal added `rate-cannot-be-forged-structurally.ts` (branded `Rate`), bringing the live fixture count to **13**.

| Fixture | Proves |
| --- | --- |
| `money-transport-minor-units-cannot-accept-number.ts` | `MoneyWire.minorUnits` cannot accept a `number` literal |
| `money-transport-missing-currency.ts` | `MoneyWire.currency` is required, not optional |
| `money-transport-missing-minor-units.ts` | `MoneyWire.minorUnits` is required, not optional |
| `asof-transport-missing-business-boundary.ts` | `AsOfWire.businessAsOf` is required, not optional |
| `asof-transport-missing-knowledge-boundary.ts` | `AsOfWire.knowledgeAsOf` is required, not optional |
| `domain-money-not-assignable-to-money-transport.ts` | A domain `Money` (bigint `minorUnits`) is **not** directly assignable to `MoneyWire` — transport/domain separation is structurally enforced, not just a naming convention |
| `money-cannot-enter-failure-details.ts` *(bonus, SEC-05/MON-01 adjacent)* | A domain `Money` object cannot be assigned as a value in `PublicErrorDetails` — Money can never leak through the generic JSON-details channel |
| `rate-cannot-be-forged-structurally.ts` *(later money-kernel seal)* | A plain `{ numerator, denominator }` object is not assignable to branded `Rate` |

`_control-valid.ts` was updated to additionally construct valid `MoneyWire`/`AsOfWire` values, proving the harness itself still compiles clean and the new types are genuinely usable, not just restrictive.

Run standalone: `node scripts/check-type-invalid.ts` — fixtures fail for their declared reason; control fixture compiles clean. Wired into `pnpm gate` (step 4h, scope comment updated) and delegated into `pnpm red` (`runTypeInvalidDelegatedFixture`).

---

## 5. SCC-03 — money-safety gate extended to `packages/contracts`

`scripts/check-money-safety.ts`'s glob scope was extended from `['packages/money/src/**/*.ts']` to `['packages/money/src/**/*.ts', 'packages/contracts/src/**/*.ts']`. Two new detector classes were added:

1. **Unary numeric coercion** (`+value`) — `isUnaryPlusCoercion` detects a `ts.PrefixUnaryExpression` with the `+` operator, flagged as the same `lossy-number-conversion` violation kind as a bare `Number(...)` call.
2. **Numeric Zod schema for an authoritative money field** (new violation kind `numeric-zod-money-schema`) — `isZodNumberSchemaExpression` walks a call/property-access chain to detect `z.number()` (including through `.optional()`/other chained calls) used as the initializer for an object-literal property named `minorUnits`/`amount`.

Run standalone: `node scripts/check-money-safety.ts` over both packages — **0 violations.** Verified zero false positives against real `packages/contracts` code (the Zod schemas legitimately use `z.string()` for `minorUnits`/`InstantWire`, never `z.number()`).

Red fixtures (`scripts/red.ts`, real `checkMoneySafety()` invocation, all injected as disposable files in `packages/contracts/src` and removed after): unsafe JSON-number shape, `z.number()` schema on `minorUnits`, unary `+minorUnits` coercion. All three caught.

**State change: SCC-03 partial → implemented** (for the current, actual `money` + `contracts` topology — see `governance/control-implementation.json` for the full reasoning distinguishing this from V08's broader "every boundary" wording).

---

## 6. SCC-05 — module boundaries extended to the 4-package graph

`.dependency-cruiser.cjs` was updated:

- Header comments now describe the real 4-package graph.
- New rule `no-kernel-depends-on-contracts`: `from: packages/(errors|time|money)/`, `to: packages/contracts/`, `severity: error` — the dependency must never run in reverse.
- `no-cross-package-internal-import`, `no-errors-depends-upward`, `no-money-depends-on-time`/`no-time-depends-on-money`, and `no-circular` all now graph `packages/contracts` too, automatically (no code change needed beyond the new rule).

Run standalone: `pnpm run boundary:check` over the real 4-package tree — **0 violations.**

Red fixtures (`scripts/red.ts`, real `pnpm run boundary:check` CLI invocation, disposable files removed after):
- **New:** `packages/contracts/src/__red_fixture_internal_import__.ts` imports `../../money/src/money.ts` directly — caught by `no-cross-package-internal-import`, proving the existing rule also covers the 4th package.
- **New:** `packages/money/src/__red_fixture_reverse_dependency__.ts` imports `../../contracts/src/index.ts` — the exact reverse dependency the transport boundary exists to forbid — caught by the new `no-kernel-depends-on-contracts` rule.
- (Carried from Phase 3A, still passing) `money` → `errors/src/*` internal import; a same-package dependency cycle.

**State change: SCC-05 remains implemented**, now evidenced against the 4-package graph instead of 3.

---

## 7. Mutation-kill fixtures (testing category)

Three **new** hand-authored mutants this phase, each proven killed by the existing Vitest suite via the real production `pnpm --filter @afenda/contracts test` command, with the mutated file restored byte-for-byte in a `finally` block:

1. **`runMoneyTransportDecimalGuardMutationFixture`** — widens `packages/money/src/minor-units.ts`'s canonical-integer-string pattern (`/^-?[0-9]+$/` → `/^-?[0-9]+(\.[0-9]+)?$/`) so a decimal string like `"1.0"` passes the format check and reaches `BigInt("1.0")`, which throws. Result: `packages/contracts`'s malformed-input test throws instead of returning a clean rejection — the test fails (mutant killed), and it is killed by a **downstream package's** test suite, not the domain package's own tests.
2. **`runMoneyTransportPrecisionLossMutationFixture`** — routes `packages/contracts/src/money-transport.ts`'s `encodeMoneyTransport` through a lossy `Number(money.minorUnits).toString()` instead of the exact domain `serializeMoney`. Result: 7 tests fail, including exact round-trips at `9223372036854775807`/`-9223372036854775808` (`9223372036854775807` → `"9223372036854776000"`) and the `9007199254740993` boundary (`→ "9007199254740992"`) — precisely the precision-loss defect MON-01/RED-03 exist to prevent.
3. **`runInstantTransportCalendarGuardMutationFixture`** — disables `packages/time/src/instant.ts`'s calendar round-trip guard (`if (instantToCanonicalString(candidate) !== canonical)` → `if (false)`). Result: `packages/contracts`'s malformed-Instant negative tests (calendar-invalid day/month, e.g. `2026-02-30`) fail — the domain guard's removal is caught by the transport test suite.

Combined with Phase 3A's two fixtures (currency-equality guard, range guard), **5 mutation-kill fixtures now exist total.** Notably, two of the three new fixtures mutate a *domain* file (`packages/money`/`packages/time`) but are caught by the *downstream* `packages/contracts` test suite — real evidence that the transport boundary adds defense-in-depth rather than merely re-testing what the domain package already tests.

**State change: SCC-18/V12 remain partial**, evidence strengthened from 2 to 5 fixtures.

---

## 8. V08 — exact money transport (strengthened, still partial)

Phase 3A's V08 evidence was limited to `packages/money`'s own in-memory `serializeMoney`/`parseMoney` round trip — no value had ever crossed a real external boundary. Phase 3B adds the first such boundary:

```
domain Money → MoneyWire → JSON.stringify → JSON.parse → MoneyWireSchema.safeParse → parseMoney → domain Money
```

proven exact at the full corpus in §3 (2^53±1, PostgreSQL `bigint` bounds), by both example and property tests, with mutation-kill evidence (§7.2) that the exactness claim is not vacuous.

**State: V08 remains partial.** Doctrine's own wording is "values survive every boundary exactly" — not "the boundaries that currently exist." There is still no database, HTTP API, queue, or export boundary carrying a Money value. This phase materially narrows the gap for the one boundary that now exists; it does not close V08 overall.

---

## 9. SEC-05 — external input validation (contracts-boundary evidence)

`packages/contracts` is the first real external-input schema layer in this repository. Negative-input coverage added this phase (across `money-transport.test.ts`, `instant-transport.test.ts`, `civil-date-transport.test.ts`, `as-of-transport.test.ts`, `result-transport.test.ts`):

- Missing required fields (currency, minorUnits, businessAsOf, knowledgeAsOf, code, message)
- Extra/unknown fields (all wire schemas are Zod `.strict()` objects — an extra field is rejected, not silently dropped)
- Wrong types (number where string expected, object where string expected, etc.)
- Malformed canonical integer strings (the full list in §3)
- Malformed RFC3339 instant strings and `YYYY-MM-DD` civil-date strings
- Invalid/malformed currency and out-of-range `minorUnits`
- `null` where a field is required

SEC-05 has no dedicated entry in `governance/control-implementation.json`'s `doctrine_verification_controls` (V01–V18) — its evidence is recorded here and folded into V08's supporting rationale, per doctrine's own SEC-05 wording ("HTTP, database output, files, webhooks... shall be validated"), since `packages/contracts` is the first of those boundaries to exist. **This is contracts-boundary evidence only** — SEC-05 is not claimed realized across AFENDA as a whole; the boundaries it names (HTTP, database, files, webhooks) mostly do not exist yet.

---

## 10. SCC-12 — Hono runtime and contract path (unchanged, deliberately)

**No Hono dependency of any kind was installed.** `packages/contracts` is a pure Zod package with zero `hono`/`@hono/*` imports. SCC-12's stack-authority required outcome ("Only `@hono/node-server` and `@hono/zod-openapi` appear in authoritative API code; Hono RPC is prohibited") is entirely about a Hono API surface that does not exist here.

**State: SCC-12 remains not-yet-built.** The Zod-only "contract half" this phase built is real evidence toward V08/SEC-05/SCC-03, but does not touch SCC-12's own required outcome, so no partial credit is claimed for it.

---

## 11. Package exports and module boundary control (SCC-05, restated)

`packages/contracts/package.json` follows the exact same `exports` pattern as `errors`/`time`/`money` — a single root export (`"."`) pointing at `src/index.ts`, both for `types` and `default`. `src/index.ts` re-exports only the supported transport types/schemas/functions listed in §1 — no barrel explosion, no re-export of internal helper functions. Dependency-cruiser's `no-cross-package-internal-import` rule (§6) mechanically forbids any future consumer from bypassing this root export.

---

## 12. Turborepo — real orchestration, now 4 packages

```
$ pnpm exec turbo run typecheck:native typecheck:compat test --dry=json
```

lists **12** real `taskId`s (up from 9 in Phase 3A):

```
@afenda/contracts#test
@afenda/contracts#typecheck:compat
@afenda/contracts#typecheck:native
@afenda/errors#test
@afenda/errors#typecheck:compat
@afenda/errors#typecheck:native
@afenda/money#test
@afenda/money#typecheck:compat
@afenda/money#typecheck:native
@afenda/time#test
@afenda/time#typecheck:compat
@afenda/time#typecheck:native
```

```
$ pnpm exec turbo run typecheck:native typecheck:compat test
...
 Tasks:    12 successful, 12 total
```

No `build` task was added merely for appearance — `packages/contracts`, like the other three packages, has `noEmit: true` and is executed directly by Node/Vitest; there is nothing to emit. Wired into `pnpm gate` step 4d (comment updated to name all 4 packages).

---

## 13. Control and doctrine-evidence state changes

All changes are recorded with full evidence/notes in `governance/control-implementation.json`; summarized here:

| Control | Before | After | Why |
| --- | --- | --- | --- |
| SCC-03 (money type safety) | partial | **implemented** | Real AST gate now covers both authoritative-money surfaces that exist (`money` + `contracts`); stack wording for this control does not require "every future boundary" the way V08's does. |
| SCC-05 (module boundaries) | implemented | **implemented** (evidence extended) | Real 4-package graph, new reverse-dependency rule, 2 new red fixtures. |
| SCC-12 (Hono runtime) | not-yet-built | **not-yet-built** (unchanged) | No Hono dependency installed; contract-half work does not satisfy this control's own required outcome. |
| SCC-18 (mutation survival) | partial | **partial** (evidence extended) | 3 new mutation-kill fixtures (5 total), 2 of which cross the domain→transport boundary. |
| SCC-24 (application architecture) | partial | **partial** (evidence extended) | Same 4 detected patterns confirmed against the new package via its generic glob scope; zero violations, zero new pattern classes. |
| V08 (exact money transport) | partial | **partial** (evidence materially strengthened) | First real JSON transport boundary proven exact at the full 2^53/bigint corpus; still no database/API/queue boundary. |
| V10 (temporal governance) | partial | **partial** (evidence extended) | AsOf's bitemporal discipline proven again at the transport layer; still no governed business logic. |
| V12 (mutation sensitivity) | partial | **partial** (evidence extended) | Same 3 new fixtures as SCC-18. |
| V14 (provenance/reproducibility) | partial | **partial** (evidence extended) | Exact Zod pin (4.4.3); 3 more canonical wire-string invariants (DET-05 domain-field half only — no request hashing/signing exists). |

**Doctrine rules with newly-realized/strengthened supporting evidence** (doctrine/DOCTRINE.md itself is unmodified — this is reporting prose, not an authority edit): MON-01 (Money JSON transport never uses a binary-float-derived number), MON-03/MON-06 (currency + range/sign carried exactly through the wire shape), TIM-01/TIM-03/TIM-04 (AsOf's two dimensions independently round-trip through JSON without collapsing), SEC-05 (first real external-input validation layer, negative-tested), DET-05 (canonical-domain-field-representation half strengthened for 3 more types; canonical-JSON-document half explicitly still not claimed), GOV-03/GOV-04 (3 new mutation-kill fixtures; no new independent oracle was needed since contracts introduces no new critical calculation — it delegates rounding/parsing to the already-oracled domain functions).

**Not advanced merely because a boundary now exists for it:** V08 and V10 are explicitly held at `partial` — V08 because doctrine says "every boundary" and database/API/queue boundaries remain absent; V10 because no governed business logic exists yet, only primitives and their transport.

---

## 14. Red harness — final fixture count

`scripts/red.ts` now runs **32 top-level fixtures** (25 from Phase 3A + 7 new this phase), plus the same 11 sub-fixtures delegated through `authority-self-test` and 12 sub-fixtures (11 negative + 1 control) delegated through the compile-time negative harness (up from 6 in Phase 3A).

New this phase (7 top-level entries):
1. `runDepCruiseContractsInternalImportFixture`
2. `runDepCruiseReverseDependencyFixture`
3. `runMoneySafetyFixtures` extended with 3 new sub-results (contracts unsafe-JSON-shape, numeric Zod schema, unary-plus coercion) — same function, more sub-fixtures
4. `runMoneyTransportDecimalGuardMutationFixture`
5. `runMoneyTransportPrecisionLossMutationFixture`
6. `runInstantTransportCalendarGuardMutationFixture`

All fixtures use `withDisposableFixtureFiles` (writes files, runs the real check, removes files in a `finally` block) or mutate a real file and restore it byte-for-byte in a `finally` block — the same pattern already established in Phase 3A.

**Verified zero contamination:** `git status --short` immediately after a full `pnpm red` run shows no fixture files and no modified `money.ts`/`minor-units.ts`/`instant.ts`/`money-transport.ts` — restoration is byte-identical. `pnpm gate` run immediately after `pnpm red` is fully green.

---

## 15. Commands and exit codes (this session)

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm --filter @afenda/contracts run test` (clean tree) | exit 0, 8 files / 82 tests passed |
| `pnpm --filter @afenda/money run test` | exit 0, 8 files / 88 tests passed |
| `pnpm --filter @afenda/time run test` | exit 0, 5 files / 45 tests passed |
| `pnpm --filter @afenda/errors run test` | exit 0, 2 files / 16 tests passed |
| `node scripts/check-type-invalid.ts` | exit 0, fixtures + control correct (live count includes later `rate-cannot-be-forged-structurally.ts`) |
| `pnpm run boundary:check` (clean tree) | exit 0, 4-package graph, 0 violations |
| `node scripts/check-money-safety.ts` | exit 0, 0 violations (both packages) |
| `node scripts/check-architecture.ts` | exit 0, 0 violations (all 4 packages) |
| `pnpm exec turbo run typecheck:native typecheck:compat test --dry=json` | exit 0, 12 real taskIds |
| `pnpm exec turbo run typecheck:native typecheck:compat test` | exit 0, 12/12 successful |
| `pnpm run typecheck:native` / `typecheck:compat` / `lint` (root) | exit 0 each |
| `pnpm agent-docs` | exit 0, zero drift |
| `node scripts/gate.ts` | exit 0, all steps PASS |
| `node scripts/red.ts` | exit 0, all 32 top-level fixtures behaved as expected |
| `node scripts/gate.ts` (immediately after red) | exit 0 — zero contamination |
| `git status --short` (after red) | no fixture files, no modified domain/transport files |

---

## 16. Limitations / NOT-YET-BUILT surfaces (explicit)

- No API, frontend, database, jobs, identity, ledger, sales, purchasing, inventory, HR, or payroll code exists. None was created in this phase.
- No `hono`, `@hono/node-server`, `@hono/zod-openapi`, PostgreSQL, Kysely, `pg`, migrations, PGlite, or Testcontainers exist.
- SCC-12 (Hono runtime and contract path) remains not-yet-built; only the non-Hono Zod half of the transport story exists.
- V08 (exact money transport "through every boundary") remains partial: only the JSON/contracts boundary is proven; database/API/queue/export boundaries remain absent.
- DET-05's canonical-JSON-**document** serialization (RFC 8785-style, key ordering/whitespace across an arbitrary document) is **not** implemented — only canonical-domain-**field** representation (one textual form per Money/Instant/CivilDate value) was strengthened. No request hashing/signing exists.
- No StrykerJS run exists; SCC-18/V12's "critical mutation survival zero" is evidenced only for 5 hand-picked guards (2 domain-only, 3 spanning domain→transport), not a domain-wide corpus.
- SCC-24's service-locator and implicit-transaction-abstraction detection remain explicitly unimplemented (unchanged from Phase 3A — no reliable AST shape identified yet).
- No git remote is configured in this environment (unchanged from Phase 2.2); no live CI evidence exists.
- The TS6 wrapper/compiler-engine discrepancy (SCC-04) remains documented and intentionally unresolved, unchanged by this phase.
- This report and the `control-implementation.json` updates do **not** constitute an application-readiness claim, an E5/E6 claim, or a stack-adoption claim.

## 17. `stack/STACK_ADOPTION.md`

Reviewed and appended with a short §8 recording that this phase was checked against every unchecked item and **no item was ticked** — see `stack/STACK_ADOPTION.md` §8 for the specific reasoning per near-miss item (mutation-survival, dependency-range policy). No compound checklist item there is objectively fully established by this phase's evidence; the stack remains architecturally approved, not adopted.
