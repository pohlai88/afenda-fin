<!-- GENERATED FILE - DO NOT EDIT -->
<!-- Sources: governance/authority-index.json + scripts/generate-agent-docs.ts | Regenerate: pnpm agent-docs -->
<!-- A hand edit here will fail the AGENT-DOCS-DRIFT gate. -->
# AFENDA rules

AFENDA is a vibe-code-first ERP under construction. This repository currently holds the sealed authority layer, its governance/tooling control plane, a first application kernel (packages/errors, packages/time, packages/money), a first external transport boundary (packages/contracts), a first persistence boundary (packages/db + db/migrations), and a thin Hono HTTP adapter (apps/api) over contracts with verification-only HTTP→DB composition; no frontend, jobs, identity, ledger, or other business-module code exists yet.

## Precedence

1. `doctrine/DOCTRINE.md`
2. `stack/STACK.md`
3. `position/POSITION.md`

## Authority model

- Doctrine > Stack > Position. Doctrine governs what must be true; Stack governs the approved implementation shape subordinate to Doctrine; Position governs market claims and has no technical authority.
- Normative Markdown (doctrine/DOCTRINE.md, stack/STACK.md, position/POSITION.md) is canonical. Everything under governance/*.json is a generated, deterministic projection and is never independently authored authority.
- gist fields inside the generated registries are non-normative summaries. Never treat a gist as a substitute for rule_verbatim when deciding correctness.
- Evidence state is not rule state. A doctrine rule can be rule_status: active while its evidence_status is historical-orphaned, specified, or otherwise short of proven. Do not upgrade evidence_status to make a report look better.
- NOT-YET-BUILT is not PASS. A control with no executable check must be reported as not-yet-built, partial, or blocked — never silently marked implemented or folded into an overall green.
- The Stack (stack/STACK.md) is architecturally approved but not yet adopted. Adoption is a separate, explicit event gated by stack/STACK_ADOPTION.md being satisfied item-by-item with mechanical evidence, not by the existence of files.
- No agent may edit doctrine/DOCTRINE.md, stack/STACK.md, position/POSITION.md, their .sha256 seals, or the generated governance/*.json registries in order to make a check pass. Fix the implementation; never fix the authority.
- An authority conflict (Stack contradicting Doctrine, Position attempting to override Doctrine/Stack) requires an explicit governance decision and must be reported, not resolved by assumption.

## Current repository layout

| Path | Role |
| --- | --- |
| `doctrine/` | Normative doctrine authority (highest precedence). |
| `stack/` | Normative stack/implementation authority, subordinate to doctrine. |
| `position/` | Normative market-claim authority; not technical authority. |
| `governance/` | Generated JSON projections, integrity/control-plane reports, and archived history. Never hand-authored authority. |
| `scripts/` | Deterministic build/check/gate tooling, written in strict TypeScript and executed directly by Node (no build step). scripts/lib/ holds shared parsing logic used by both build and check scripts. |
| `packages/errors`, `packages/time`, `packages/money` | Phase 3A application kernel: canonical Result/error vocabulary, explicit temporal primitives (Instant/CivilDate/AsOf/Clock), and exact bigint-based money primitives (CurrencyCode/MinorUnits/Money/Rate/rounding). See governance/PHASE_3A_KERNEL_REPORT.md. |
| `packages/contracts` | Phase 3B external transport boundary: Zod 4 (exact pin 4.4.3) wire schemas and exact serialize/parse contracts for Money, Instant, CivilDate, AsOf and public-safe Result/Failure shapes. Depends on errors/time/money only; no Hono/API/OpenAPI dependency. See governance/PHASE_3B_CONTRACTS_REPORT.md. |
| `packages/db`, `db/migrations/` | Phase 3C persistence boundary: node-postgres pool/single-client transactions, exact type parsers (incl. forbidden OID 790 money), checksummed forward-only migrations bootstrapping role topology, dual-major Testcontainers PostgreSQL 18+17 integration lane via `pnpm gate:db-integration` (not folded into `pnpm gate`; Kysely codegen from PG18 only). Depends on `@afenda/errors` only until domain decode helpers exist. No ledger/business schema yet. See governance/PHASE_3C_DB_REPORT.md. |
| `apps/api` | Phase 3D–3E thin Hono HTTP adapter (`@hono/node-server` + `@hono/zod-openapi`) over `@afenda/contracts`. Production `GET /health` plus labeled `/_afenda/verify/*` reference routes. Verification-only `createCompositionApi` may use `@afenda/db` public API (not registered on the production router). No frontend, identity, worker, or ledger. See governance/PHASE_3D_API_REPORT.md and governance/PHASE_3E_HTTP_DB_REPORT.md. |
| `package.json`, `tsconfig.json`, `tsconfig.base.json`, `pnpm-workspace.yaml`, `.node-version`, `turbo.json`, `docker-compose.yml` | Repository/tooling control-plane shell; Turborepo package tasks across errors/time/money/contracts/db/api; digest-pinned local Postgres 18/17 compose profile for development only. |

## Stack adoption status

architecturally approved; not yet adopted (stack/STACK_ADOPTION.md is intentionally unchecked pending mechanical evidence)

## Before finishing

Run `pnpm gate`. If it fails, fix the code — never the gate, the test, the seals, or the canonical authority documents. A failing or NOT-YET-BUILT gate is information; report it and stop.
