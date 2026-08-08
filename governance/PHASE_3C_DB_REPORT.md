# AFENDA Phase 3C — Persistence Boundary Report

**Baseline commit:** `a11585b` (pre-Phase-3C). Commit 1: `a44ec74`. Commit 2 completes the planned split. `authority-baseline-v1` remains at `09e7e6e`, unmoved.

**Scope:** first persistence boundary — `packages/db`, `db/migrations/0001_bootstrap.sql`, exact `pg` type parsers, single-client transactions, checksummed forward-only migrations, dual-major Testcontainers (18+17), PGlite fast lane with structural concurrency gating, Kysely codegen from a single canonical source (Testcontainers PG18), separate `pnpm gate:db-integration` lane. **No** ledger/business schema.

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

Public API (`src/index.ts`): pool constructors, `withTransaction` / `queryOnClient`, migrate helpers, owned type parsers (`configureExactTypeParsers`), branded `CanonicalCodegenSource` + `assertCanonicalCodegenSource`, lane/pin/role constants. Test-only `resetTypeParserConfigurationForTests` and the codegen mint `createCanonicalCodegenSource` are **not** root exports (tests/helpers import them from `src/` directly).

- Depends on `@afenda/errors` only (no `@afenda/time` / `@afenda/money` until domain decode call sites exist)
- `createBootstrapPool` / `createAppPool` — exact type parsers installed before pool construction
- `withTransaction` — one checked-out client for BEGIN/work/COMMIT|ROLLBACK
- `migrate` — SHA-256 checksums, strict `NNNN_name.sql` ordering, transactional default, `-- afenda:transactional=false` requires `-- afenda:non-transactional-note:`
- Owned parsers for int8/numeric/timestamp/timestamptz/date; throwing parser for OID 790
- `CanonicalCodegenSource` is branded; only `codegenSourceFromPostgres18` mints it (compile-time fixture `canonical-codegen-source-cannot-be-forged.ts`)

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
| `pnpm gate:db-integration` | Image-pin major check + unit + Testcontainers dual-major + Kysely drift |
| `pnpm db:up` / `db:down` | Local digest-pinned Postgres 18/17 compose (dev only; ephemeral, no volumes) |

DB red fixtures invoke the DB-integration lane / `checkTransactionSafety`, never fold cold containers into `pnpm gate`.

### Compose / pin / identity hardenings (post-commit-2 review)

- `packages/db/src/postgres-pins.ts` — digests + declared majors + compose host ports (`127.0.0.1:55432` / `55433`)
- `scripts/check-postgres-image-pins.ts` — asserts `docker-compose.yml` image refs/ports match the pin registry, then `docker` asserts `postgres --version` and image `PG_MAJOR` (opaque digest alone is not evidence)
- Healthcheck uses `pg_isready … -h localhost` + `start_period: 10s` (TCP readiness, not Unix-socket-during-initdb)
- Ephemeral by design: no named `volumes:`; `pnpm db:down` is `docker compose down -v` so the image's anonymous VOLUME is removed and the next `db:up` re-runs initdb from scratch
- `POSTGRES_USER: postgres` documented as the sole compose bootstrap credential for 0001
- `assertMigrationRunnerIdentity` — 0001 forbids managed roles; post-0001 requires `afenda_migrator` for both `current_user` and `session_user` (rejects postgres / SET ROLE / `afenda_app`); `migrate()` wiring covered by fake-pool unit tests
- Dual-major disagreement policy restated in pin module + dual-major tests: **build failure**, never silent floor bump

---

## 3. Control-state changes

| Control | Before | After | Notes |
| --- | --- | --- | --- |
| SCC-05 | implemented | implemented | Evidence extended to 5-package graph |
| SCC-06 | not-yet-built | not-yet-built | No ledger kernel |
| SCC-07 | not-yet-built | **implemented** | Dual-major 18+17 corpus; disagreement = fail |
| SCC-08 | not-yet-built | **implemented** | withTransaction + static scan + red fixtures |
| SCC-09 | not-yet-built | **implemented** | Owned parsers + OID 790 ban + lossy-mutant red |
| SCC-10 | not-yet-built | **implemented** | Branded CanonicalCodegenSource (PG18 mint only) + drift gate |
| SCC-11 | not-yet-built | **implemented** | Checksums + 0001 bootstrap + red fixture |
| SCC-19 | not-yet-built | **partial** | Structural lane gate; no real concurrency corpus yet |

---

## 4. Commit 2 additions

- `dual-major.integration.test.ts` — same corpus on PG18 and PG17
- `requireTestcontainersLane()` — import-time structural gate (not a filename convention)
- PGlite fast lane for cheap SQL feedback; concurrency helpers throw there
- `CanonicalCodegenSource` + `generate:types` / `check:types-drift` (PG18 Testcontainers only)
- docker-compose PostgreSQL 17 service on host port `127.0.0.1:55433` (18 on `55432`)

---

## 5. Dependencies (exact pins)

| Package | Version |
| --- | --- |
| pg | 8.22.0 |
| @types/pg | 8.21.0 |
| kysely | 0.29.4 |
| kysely-codegen | 0.20.0 |
| @electric-sql/pglite | 0.5.4 |
| testcontainers | 12.1.0 |
| @testcontainers/postgresql | 12.1.0 |
| PostgreSQL 18 image | `postgres@sha256:a02db8cac496f15b094798a38254f14d6e00741f709360e5e00bb6668ea31636` |
| PostgreSQL 17 image | `postgres@sha256:7958605b474b3d264a969cb3a123d6aa00ad1e1fe9da8a69984dabb704d93317` |

Native `ssh2` / `cpu-features` optional bindings failed to compile on this Windows host (no VS C++ toolchain); JS fallback is used for local Docker.

---

## 6. Limitations

- Dev-only role passwords are embedded in `0001_bootstrap.sql` for local/CI reproducibility; must be replaced by secret injection before shared/production use.
- No request/posting/audit/backup credential topology yet.
- No ledger/business tables.
- kysely-codegen maps `timestamptz` to `Date` in generated types; owned `pg` parsers still return strings — decode at call sites.
- Stack remains **not adopted**.
