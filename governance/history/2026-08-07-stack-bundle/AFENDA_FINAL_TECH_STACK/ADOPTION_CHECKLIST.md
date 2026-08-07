# AFENDA Stack Adoption Checklist

**Target record:** STACK.md v2.0  
**Prepared:** 2026-08-07

Complete each item before marking the stack `ADOPTED`.

## Authority and integrity

- [ ] Commit `STACK.md`, `STACK.sha256`, `STACK_CONTROL_MAP.json`, `VERSION_BASELINE.json` and `SOURCE_REGISTER.md` under one canonical `stack/` path.
- [ ] Add a CI check that rejects any stack authority whose SHA-256 differs from `STACK.sha256`.
- [ ] Mark prior stack drafts as non-authoritative or remove them from standing-context discovery.
- [ ] Record the adopter, date and repository commit.

## Toolchain

- [ ] Pin Node 24 LTS exactly in `.node-version`, CI and container image.
- [ ] Install exact TypeScript 7 native and TypeScript 6 compatibility aliases.
- [ ] Add `typecheck:native`, `typecheck:native:single`, `typecheck:compat` and type-aware lint scripts.
- [ ] Pin pnpm exactly in `packageManager`; commit the frozen lockfile.
- [ ] Reject unapproved dependency ranges and lockfile drift.

## Database

- [ ] Pin PostgreSQL 18 and 17 container digests.
- [ ] Configure `pg` type parsing so authoritative bigint/numeric/time values do not silently lose precision.
- [ ] Implement a same-client transaction capability; forbid transactional `pool.query()`.
- [ ] Run every migration and authoritative DB control on both PostgreSQL majors.
- [ ] Generate Kysely types from the migrated schema and fail on drift.
- [ ] Separate request, posting, migration, audit and backup credentials.

## API and frontend

- [ ] Allow only Hono's Node adapter and the approved Zod/OpenAPI integration.
- [ ] Generate and diff OpenAPI; generate the frontend transport client.
- [ ] Configure React/Vite SPA and reject `react-server-dom-*` dependencies.
- [ ] Choose TanStack file-based routing only and govern generated route-tree drift.
- [ ] Apply the UI-system tokens and accessibility checks to source-owned shadcn components.

## Identity, jobs and effects

- [ ] Configure OIDC discovery/token validation with Keycloak as reference provider.
- [ ] Keep entity/operation/amount/period authorization inside AFENDA.
- [ ] Wrap Graphile Worker behind `JobQueue`; prohibit private-table coupling.
- [ ] Implement the owned financial/statutory outbox state machine and reconciliation.

## Verification

- [ ] Add SCC-01 through SCC-27 to CI or a machine-readable governance dispatcher.
- [ ] Add PGlite fast tests but prohibit concurrency qualification there.
- [ ] Add Testcontainers PostgreSQL 18/17 lanes with real roles and multiple connections.
- [ ] Add critical domain mutants and enforce zero survival.
- [ ] Add Playwright vertical-slice workflow with trace retention.
- [ ] Run a clean qualification from the exact lockfile and image digests.

## Deployment, BI and operations

- [ ] Provide digest-pinned Docker Compose profiles.
- [ ] Prove the stack runs with external egress denied after artifacts are acquired.
- [ ] Create `reporting` and `analytics` schemas and a read-only BI role.
- [ ] Ship Metabase only against the read-only role.
- [ ] Do not create a logical replication slot without a live monitored consumer.
- [ ] Initialize OpenTelemetry before application code and verify correlation fields/redaction.

## Final adoption

- [ ] All constitutional selections have controls in `STACK_CONTROL_MAP.json`.
- [ ] `VALIDATION.md` passes with zero failures.
- [ ] Ratifier signs the adoption record below.

**Adopted by:** ______________________________  
**Role:** ____________________________________  
**Date:** ____________________________________  
**Repository commit:** ________________________
