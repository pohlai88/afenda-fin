# AFENDA Final Technology Stack Approval

**Decision:** APPROVED  
**Stack record:** `STACK.md` v2.0  
**Verification date:** 2026-08-07  
**Architecture assessment:** approximately **9.7/10** against the binding vibe-code-first criteria.

## Approved stack

Strict TypeScript; TypeScript 7 native plus TypeScript 6 compatibility tooling; Node.js 24 LTS; pnpm workspaces and Turborepo; plain PostgreSQL 18 with PostgreSQL 17 compatibility; node-postgres; Kysely with schema-derived types; reviewed SQL migrations; Hono on Node only; Zod 4 and REST/OpenAPI; React/Vite SPA; TanStack Router/Query/Table/Virtual; React Hook Form; Tailwind CSS and shadcn/ui; OIDC with Keycloak as the reference provider; Graphile Worker behind an adapter; AFENDA-owned transactional outbox; Vitest, fast-check, StrykerJS, owned domain mutants, PGlite, Testcontainers and Playwright; governed reporting/analytics schemas; optional read-only Metabase; OpenTelemetry; OCI containers and Docker Compose first.

## Approval conditions integrated

1. `node-postgres` is the canonical driver; every transaction uses one checked-out client.
2. TypeScript 7 and TypeScript 6 compatibility lanes must both pass.
3. Evidence grades remain honest; reported evidence is marked `-R` until reproduced.
4. PostgreSQL 18 and 17 are qualified independently.
5. Hono is bound to Node and one Zod/OpenAPI path.
6. Functions and explicit capabilities are the application default; classes are permitted only at visible adapter boundaries.
7. Offline verification means no external egress after dependencies and digest-pinned images are acquired.
8. Exact patch versions and image digests live in machine-enforced files; `react-server-dom-*` is prohibited.

## Adoption status

The architecture is approved. It becomes repository authority after `ADOPTION_CHECKLIST.md` is completed and `STACK.sha256` is enforced in CI. This approval does not claim E5 deployment qualification or E6 operational proof.
