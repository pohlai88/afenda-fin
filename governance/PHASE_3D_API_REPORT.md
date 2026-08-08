# AFENDA Phase 3D — Thin Hono HTTP/API Boundary Report

**Phase:** establish the smallest real Node/Hono API adapter over `@afenda/contracts`.
**Date:** 2026-08-08
**Baseline HEAD at phase start:** `9a3dca752c031a6aa5c59b28c4227a1bfa57c75e`
**Explicit statement:** This phase does **not** establish frontend, identity, jobs, outbox, ledger, E5 deployment qualification, E6 operational proof, or stack adoption.

---

## 1. Phase 3D.0 hygiene

### A. SCC-04 live CI observation

| Field | Value |
| --- | --- |
| Remote | `origin` → `https://github.com/pohlai88/afenda-fin.git` |
| Auth | `gh` authenticated as `pohlai88` |
| Run | `31229167315` |
| headSha | `9a3dca752c031a6aa5c59b28c4227a1bfa57c75e` |
| Workflow | `gate` |
| Conclusion | `failure` (~3s, job recorded **zero steps**) |

**Outcome:** Remote and Actions runs are observable, but this run is **not** successful `pnpm gate` / `pnpm red` / toolchain CI evidence. SCC-04 remains **partial**.

### B. Instant calendar-guard mutation fixture

- Stale guard string `instantToCanonicalString(candidate)` replaced with live `formatEpochMillisUnchecked(epochMillis) !== canonical`.
- Fixture now fails closed if snippet missing or replacement count is 0 (no fake kill).
- Mutates production `packages/time/src/instant.ts`, runs real `@afenda/contracts` tests, restores byte-identically.

### C. Stale control-map notes

| Control | Change |
| --- | --- |
| V01 | Notes updated: migrator/app roles exist via 0001; full privilege topology still absent → stays **not-yet-built** |
| V04 | Notes updated: packages/money exists; ledger posting rounding boundary absent → stays **not-yet-built** |
| SCC-23 | Notes updated: dev compose digests exist; self-host app profile absent → stays **not-yet-built** |
| SCC-04 | Evidence updated with observed failed CI run; stays **partial** |

---

## 2. Exact Hono pins

| Package | Exact version |
| --- | --- |
| `hono` | `4.13.1` |
| `@hono/node-server` | `2.1.0` |
| `@hono/zod-openapi` | `1.5.1` |
| `zod` | `4.4.3` (same as contracts) |

No `^` / `~` / `latest`. No Hono RPC. No alternate runtime adapters.

---

## 3. apps/api dependency graph

```
@afenda/errors
@afenda/time
@afenda/money
@afenda/contracts
        ↓
     apps/api  (@afenda/api)
```

- No `@afenda/db` dependency.
- Kernel/packages must not depend on `apps/api` (depcruise enforced).

---

## 4. Route inventory

### Production

| Method | Path | Role |
| --- | --- | --- |
| GET | `/health` | Liveness only — **not** Money/time evidence |

### Reference / verification (`afenda-verify` tag — NOT product ERP)

| Method | Path | Role |
| --- | --- | --- |
| POST | `/_afenda/verify/money` | MoneyWire decode/encode via contracts |
| POST | `/_afenda/verify/instant` | Instant wire round-trip |
| POST | `/_afenda/verify/civil-date` | CivilDate wire round-trip |
| POST | `/_afenda/verify/as-of` | AsOf both boundaries required |

Also serves generated OpenAPI at `/openapi.json` (runtime); committed authority is `apps/api/openapi.json`.

---

## 5. Result → HTTP

`apps/api/src/http/map-result.ts` (+ handlers using `encodeFailureTransport`):

- Public `code` / `message` / optional `details` only
- `cause` never serialized
- No stack traces

---

## 6. OpenAPI

| Command | Role |
| --- | --- |
| `pnpm api:openapi` / `pnpm --filter @afenda/api openapi:generate` | Writer |
| `pnpm api:openapi:check` | Read-only drift (gate step 4k) |

- Deterministic: no timestamps/env in document
- Second generation byte-identical (tested)
- Structural Vitest: Money `minorUnits` string; AsOf both required; failure has no `cause`

---

## 7. Gates / red evidence (Phase 3D additions)

| Control | Gate |
| --- | --- |
| SCC-12 | `scripts/check-hono-api-path.ts` (gate 4j) |
| OpenAPI drift | `api:openapi:check` (gate 4k) |
| SCC-03 | money-safety glob includes `apps/api/src` |
| SCC-05 | `depcruise apps packages` + new rules |
| SCC-24 | architecture glob includes `apps/*/src` |

Red fixtures added: SCC-12 adapter/RPC/pool.query; OpenAPI drift; API money number literal; package→api reverse dep; api→money/src internal import.

---

## 8. HTTP Money results

Through real `app.request()` on `/_afenda/verify/money`:

| minorUnits | Result |
| --- | --- |
| `9007199254740991` (2^53-1) | 200, string unchanged |
| `9007199254740992` (2^53) | 200, string unchanged |
| `9007199254740993` (2^53+1) | 200, string unchanged |
| PG bigint min/max | 200, string unchanged |
| JSON number `12345` | 400 `REQUEST_VALIDATION_FAILED` |

---

## 9. HTTP time results

- Instant/CivilDate canonical round-trip: pass
- Malformed Instant `2026-02-30…` / CivilDate `2026-02-30`: 400
- AsOf both dimensions round-trip: pass
- Missing `businessAsOf` or `knowledgeAsOf`: 400

V10 remains **partial** (no AsOf-governed business data resolution).

---

## 10. Turbo / tests

- `@afenda/api` participates in `turbo run typecheck:native typecheck:compat test`
- Vitest: **24** tests in apps/api (including Node-server smoke)

---

## 11. Control state changes (Phase 3D)

| Control | Before | After |
| --- | --- | --- |
| SCC-03 | implemented | implemented (scope extended to apps/api) |
| SCC-05 | implemented | implemented (apps graph) |
| SCC-12 | not-yet-built | **implemented** |
| SCC-18 / V12 | partial | partial (+ API red fixtures; not Stryker/domain-wide) |
| SCC-24 | partial | partial (still subset detector) |
| V08 | partial | partial (HTTP layer added; no HTTP→DB composition) |
| V10 | partial | partial |
| V11 | not-yet-built | not-yet-built |
| SCC-04 | partial | partial (CI observed but failed empty-step) |

---

## 12. Adoption checklist

- Ticked: Hono Node + Zod/OpenAPI only
- Unchecked: compound OpenAPI+frontend client; React/Vite; TanStack; shadcn; identity; Playwright
- **No stack adoption claim**

---

## 13. Unresolved gaps

1. GitHub Actions `gate` workflow fails before recording steps (SCC-04 CI-verified still open).
2. No composed HTTP→DB Money path (V08).
3. No authz (V11 / SEC-02).
4. Verify routes are explicitly non-product.
5. Frontend transport client not generated.

---

## 14. Claims not made

No React/Vite, Keycloak, Graphile Worker, outbox, ledger schema, Metabase, autonomous AI, E5/E6, or stack adoption.
