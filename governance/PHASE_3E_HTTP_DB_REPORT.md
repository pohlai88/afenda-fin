# AFENDA Phase 3E — HTTP → PostgreSQL Composition Report

**Phase:** verification-only HTTP → contracts → packages/db → PostgreSQL composition for Money / Instant / CivilDate.
**Date:** 2026-08-08
**Baseline HEAD at Phase 3E start:** `8cc3c561a5e85e947c34013256f4c4f771850d2e` (post Phase 3D.1 CI deferral docs)
**Explicit statement:** This phase does **not** establish frontend, identity, jobs, outbox, ledger, BI, E5/E6, or stack adoption. Live GitHub CI remains **deferred** (billing lock); SCC-04 stays `partial`.

---

## PART A — CI (deferred)

| Field | Value |
| --- | --- |
| Prior push SHA | `c82d852` |
| CI run | `31232287375` — zero steps; billing lock annotation |
| Operator decision | Defer live GitHub CI due to payment failure; continue Phase 3E |
| CI repair commit | none |
| SCC-04 | `partial` → `partial` (unchanged) |

See `governance/PHASE_3D1_CI_REPORT.md`.

---

## PART B — Composition architecture

```
HTTP request
  → createCompositionApi (NOT createApi / production router)
  → Zod/OpenAPI (@hono/zod-openapi)
  → @afenda/contracts decode
  → packages/db exact-persistence-probe (withTransaction + queryOnClient)
  → PostgreSQL (bigint / timestamptz / date)
  → owned pg type parsers (string exactness)
  → @afenda/contracts decode + encode
  → mapResultToHttp
  → HTTP response
```

| Surface | Location | In production router? |
| --- | --- | --- |
| Production API | `createApi()` — health + `/_afenda/verify/*` | yes |
| Composition API | `createCompositionApi({ pool })` | **no** |
| Composition routes | `/_afenda/composition/{money,instant,civil-date,fail}` | **absent from createApi** (404 proven) |

Transaction ownership: `withTransaction` / `queryOnClient` in `@afenda/db` only. apps/api does not BEGIN/COMMIT/ROLLBACK or call `pool.query` for transactional work.

Migration: `db/migrations/0002_verify_exact_probe.sql` — verification-scoped table `afenda_verify_exact_probe` (not ledger/ERP). Post-0001 migrations apply via `MigrateOptions.migratorPool` as `afenda_migrator`.

---

## Results

### Money (PG17 + PG18)

| Value | Result |
| --- | --- |
| 2^53 − 1 (`9007199254740991`) | exact string identity |
| 2^53 (`9007199254740992`) | exact string identity |
| 2^53 + 1 (`9007199254740993`) | exact string identity |
| PG bigint min | exact string identity |
| PG bigint max | exact string identity |
| JSON number `minorUnits` | 400 `REQUEST_VALIDATION_FAILED`, no `cause` |

### Instant / CivilDate

| Case | Result |
| --- | --- |
| Instant under `Asia/Kuala_Lumpur` session TZ | UTC canonical round-trip |
| CivilDate `2026-08-08` | exact date round-trip |
| AsOf | not persisted (HTTP/domain only) |

### Transaction / failure

| Case | Result |
| --- | --- |
| Same-client BEGIN/insert/query/COMMIT/release | via `withTransaction` |
| Deliberate DB failure | ROLLBACK; probe row count unchanged |
| Public HTTP mapping | 500 `PERSISTENCE_PROBE_FAILED`; no SQL/stack/host/`cause` |

### Test counts

| Lane | Tests |
| --- | --- |
| apps/api composition (PG17+PG18) | 12 |
| apps/api fast (non-composition) | 27 |

Composition lane: `pnpm test:composition` / `gate:db-integration` step 5.

---

## Controls

| Control | Before | After |
| --- | --- | --- |
| SCC-03 | implemented | implemented (+ composition corpus/mutant) |
| SCC-04 | partial | partial (CI deferred) |
| SCC-05 | implemented | implemented (api→db public API allowed) |
| SCC-12 | implemented | implemented (allow `@afenda/db`; forbid `pg`) |
| SCC-18 / V12 | partial | partial (+ 2 composition mutants) |
| V08 | partial | partial (HTTP+JSON+PostgreSQL composition demonstrated; other boundaries absent) |
| V10 | partial | partial (+ Instant/CivilDate HTTP↔DB; AsOf not DB) |
| V13 | partial | partial (canonical string equality as independent expected; no new oracle class) |

### Adoption checklist

No new ticks. Frontend client / identity / outbox / Playwright / adoption ratification remain unchecked.

---

## Mutants / red

- `runCompositionMoneyNumberCoercionMutationFixture`
- `runCompositionFailureLeakMutationFixture`
- SCC-12: direct `pg` import (replaces prior “forbid @afenda/db” fixture)

---

## Claims not made

No product ERP endpoints. No stack adoption. No E5/E6. No CI-verified toolchain. No “every AFENDA boundary proven” for V08.
