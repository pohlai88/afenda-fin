# AFENDA Phase 3C — Persistence Boundary Report (Commit 1)

**Baseline commit:** `a11585b` (`docs(governance): correct lint-phase concurrency record, add mutation evidence`), descendant of Phase 3B.1 `a67ac88`. `authority-baseline-v1` remains at `09e7e6e`, unmoved.

**Scope (commit 1):** first persistence foundations — `packages/db`, `db/migrations/0001_bootstrap.sql`, exact `pg` type parsers, single-client transactions, checksummed forward-only migration runner with transactional header policy, digest-pinned PostgreSQL 18 via Testcontainers and docker-compose, separate `pnpm gate:db-integration` lane. **No** ledger/business schema, **no** Kysely codegen, **no** PostgreSQL 17 dual-major lane, **no** PGlite (those are commit 2).

---

## 1. Empirical type-parser probe (before owned configuration)

Against node-postgres `8.22.0` + digest-pinned PostgreSQL 18:

| OID | Type | Default JS typeof | Notes |
| --- | --- | --- | --- |
| 20 | int8 | `string` | Including `9007199254740993` (2^53+1) |
| 1700 | numeric | `string` | |
| 790 | money | `string` | Locale-dependent fixed-point — **forbidden** under owned parsers |

**Consequence:** a red fixture that *removes* a safe registration would be false-red (defaults already safe). The mutant is *registering* a lossy parser (`parseInt` / `Number`). Recorded in `packages/db/tests/persistence.integration.test.ts` and `scripts/red.ts` `runDbLossyInt8ParserMutationFixture`.

---

## 2. What was built

### `packages/db`

- `createBootstrapPool` / `createAppPool` — exact type parsers installed before pool construction
- `withTransaction` — one checked-out client for BEGIN/work/COMMIT|ROLLBACK
- `migrate` — SHA-256 checksums, strict `NNNN_name.sql` ordering, transactional default, `-- afenda:transactional=false` requires `-- afenda:non-transactional-note:`
- Owned parsers for int8/numeric/timestamp/timestamptz/date; throwing parser for OID 790

### `db/migrations/0001_bootstrap.sql`

Authoritative bootstrap (not a throwaway table):

- Roles `afenda_migrator` / `afenda_app` with `lock_timeout` and `statement_timeout`
- `afenda_migration_history` table
- `afenda_record_migration(...)` SECURITY DEFINER function (`$$` body, `ALTER ... OWNER`, `GRANT EXECUTE`)
- **Bootstrap identity:** container/image superuser `postgres` (must not be `afenda_migrator` / `afenda_app`)

### Gate-lane separation

| Command | Role |
| --- | --- |
| `pnpm gate` | Fast authority/toolchain/static controls + package unit tests; includes SCC-08 AST scan (step 4i). **No Testcontainers.** |
| `pnpm gate:db-integration` | Unit + Testcontainers integration for `@afenda/db` |
| `pnpm db:up` / `db:down` | Local digest-pinned Postgres 18 compose (dev only) |

DB red fixtures invoke the DB-integration lane / `checkTransactionSafety`, never fold cold containers into `pnpm gate`.

---

## 3. Control-state changes (commit 1)

| Control | Before | After | Notes |
| --- | --- | --- | --- |
| SCC-05 | implemented | implemented | Evidence extended to 5-package graph |
| SCC-06 | not-yet-built | not-yet-built | No ledger kernel |
| SCC-07 | not-yet-built | **partial** | PG18 only; PG17 = commit 2 |
| SCC-08 | not-yet-built | **implemented** | withTransaction + static scan + red fixtures |
| SCC-09 | not-yet-built | **implemented** | Owned parsers + OID 790 ban + lossy-mutant red |
| SCC-10 | not-yet-built | not-yet-built | Kysely codegen = commit 2 |
| SCC-11 | not-yet-built | **implemented** | Checksums + 0001 bootstrap + red fixture |
| SCC-19 | not-yet-built | not-yet-built | Structural PGlite gating = commit 2 |

---

## 4. Dependencies (exact pins)

| Package | Version |
| --- | --- |
| pg | 8.22.0 |
| @types/pg | 8.21.0 |
| testcontainers | 12.1.0 |
| @testcontainers/postgresql | 12.1.0 |
| PostgreSQL 18 image | `postgres@sha256:a02db8cac496f15b094798a38254f14d6e00741f709360e5e00bb6668ea31636` |

Native `ssh2` / `cpu-features` optional bindings failed to compile on this Windows host (no VS C++ toolchain); JS fallback is used for local Docker. Documented as an environment limitation, not a control gap.

---

## 5. Commit 2 remaining

- Dual-major PostgreSQL 17 lane + disagreement policy (build failure, never silent floor bump)
- PGlite fast lane with import-time `requireTestcontainersLane()` structural gating
- Kysely codegen from **only** Testcontainers PG18; PGlite structurally incapable of producing types
- Drift gate in the DB-integration lane

---

## 6. Limitations

- Dev-only role passwords are embedded in `0001_bootstrap.sql` for local/CI reproducibility; must be replaced by secret injection before shared/production use.
- No request/posting/audit/backup credential topology yet.
- No ledger/business tables.
- Stack remains **not adopted**.
