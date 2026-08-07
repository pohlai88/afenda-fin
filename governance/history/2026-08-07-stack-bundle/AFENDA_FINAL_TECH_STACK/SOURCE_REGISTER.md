# AFENDA Stack Source Register

**Verified:** 2026-08-07

## S01 — Announcing TypeScript 7.0

**Publisher:** TypeScript Team  
**URL:** https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/  
**Use in stack record:** TypeScript 7 GA, 8–12x typical full-build speedups, TypeScript 6 compatibility package, no stable 7.0 programmatic API.

## S02 — Node.js Releases

**Publisher:** Node.js Project  
**URL:** https://nodejs.org/en/about/previous-releases  
**Use in stack record:** Node 24 is LTS; production should use Active or Maintenance LTS.

## S03 — PostgreSQL 18 Released

**Publisher:** PostgreSQL Global Development Group  
**URL:** https://www.postgresql.org/about/news/postgresql-18-released-3142/  
**Use in stack record:** PostgreSQL 18 is the current major release.

## S04 — PostgreSQL 18.4 and 17.10 Released

**Publisher:** PostgreSQL Global Development Group  
**URL:** https://www.postgresql.org/about/news/postgresql-184-1710-1614-1518-and-1423-released-3297/  
**Use in stack record:** Current supported patch baselines used in this record.

## S05 — Kysely documentation

**Publisher:** Kysely  
**URL:** https://kysely.dev/  
**Use in stack record:** Thin SQL-shaped query builder, database-derived types, one-to-one compilation, zero dependencies.

## S06 — Transactions

**Publisher:** node-postgres  
**URL:** https://node-postgres.com/features/transactions  
**Use in stack record:** All transaction statements must use the same checked-out client; pool.query is not safe for transactions.

## S07 — Data types and parsing

**Publisher:** node-postgres  
**URL:** https://node-postgres.com/features/types  
**Use in stack record:** Exact and custom type parsing; values can remain strings rather than being silently coerced.

## S08 — Node.js adapter

**Publisher:** Hono  
**URL:** https://hono.dev/docs/getting-started/nodejs  
**Use in stack record:** Official Node adapter and server pattern.

## S09 — Zod OpenAPI example

**Publisher:** Hono  
**URL:** https://hono.dev/examples/zod-openapi  
**Use in stack record:** Zod validation and OpenAPI generation through one approved path.

## S10 — Zod 4 documentation

**Publisher:** Zod  
**URL:** https://zod.dev/  
**Use in stack record:** Zod 4 is stable and maps closely to TypeScript types.

## S11 — Vite 8.1 announcement

**Publisher:** Vite  
**URL:** https://vite.dev/blog/announcing-vite8-1  
**Use in stack record:** Vite 8.1 stable release line.

## S12 — React 19.2

**Publisher:** React Team  
**URL:** https://react.dev/blog/2025/10/01/react-19-2  
**Use in stack record:** React 19.2 release line.

## S13 — RSC security fixes

**Publisher:** React Team  
**URL:** https://react.dev/blog/2025/12/11/denial-of-service-and-source-code-exposure-in-react-server-components  
**Use in stack record:** React Server Components fixes through 19.2.4; this stack prohibits react-server-dom packages.

## S14 — Tailwind CSS v4.3

**Publisher:** Tailwind Labs  
**URL:** https://tailwindcss.com/blog  
**Use in stack record:** Tailwind CSS v4 current release family.

## S15 — Keycloak 26.7.0 released

**Publisher:** Keycloak  
**URL:** https://www.keycloak.org/2026/07/keycloak-2670-released  
**Use in stack record:** Current reference self-hosted OIDC provider line.

## S16 — Graphile Worker documentation

**Publisher:** Graphile Worker  
**URL:** https://worker.graphile.org/docs  
**Use in stack record:** PostgreSQL-backed, at-least-once background jobs with retries; small-team infrastructure simplification.

## S17 — Router type safety

**Publisher:** TanStack  
**URL:** https://tanstack.com/router/latest/docs/guide/type-safety  
**Use in stack record:** Type-safe routes, params and search state; runtime mismatch detection.

## S18 — PostgreSQL module for Node.js

**Publisher:** Testcontainers  
**URL:** https://node.testcontainers.org/modules/postgresql/  
**Use in stack record:** Real disposable PostgreSQL for authoritative integration tests.

## S19 — Getting started

**Publisher:** PGlite  
**URL:** https://pglite.dev/docs/  
**Use in stack record:** Embedded PostgreSQL in WASM; single exclusive connection means concurrency is not qualified there.

## S20 — Vitest CLI

**Publisher:** Vitest  
**URL:** https://vitest.dev/guide/cli  
**Use in stack record:** Fast TypeScript/ESM test loop.

## S21 — Introduction

**Publisher:** fast-check  
**URL:** https://fast-check.dev/docs/introduction/  
**Use in stack record:** Property-based test generation and shrinking.

## S22 — StrykerJS introduction

**Publisher:** Stryker  
**URL:** https://stryker-mutator.io/docs/stryker-js/introduction/  
**Use in stack record:** Mutation testing for JavaScript and TypeScript.

## S23 — PostgreSQL connection

**Publisher:** Metabase  
**URL:** https://www.metabase.com/docs/latest/databases/connections/postgresql  
**Use in stack record:** Read-only schema-scoped PostgreSQL BI connection.

## S24 — JavaScript getting started

**Publisher:** OpenTelemetry  
**URL:** https://opentelemetry.io/docs/languages/js/getting-started/  
**Use in stack record:** Node.js and browser telemetry instrumentation.

## S25 — pnpm documentation

**Publisher:** pnpm  
**URL:** https://pnpm.io/  
**Use in stack record:** Workspace support, exact lockfile workflow, monorepo package management.
