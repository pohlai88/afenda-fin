# AFENDA Stack Adoption Record

**Consolidates:** `README.md`, `FINAL_APPROVAL.md`, `VALIDATION.md`, `ADOPTION_CHECKLIST.md` from the original `AFENDA_FINAL_TECH_STACK` bundle (archived verbatim at `governance/history/2026-08-07-stack-bundle/AFENDA_FINAL_TECH_STACK/`).
**Consolidation date:** 2026-08-08
**Rule:** No qualifier, hedge, or limitation from any source document has been strengthened, weakened, or removed. Where a source used "approximately", "does not claim", "not yet", or a specific count, that exact wording is preserved below.

---

## 1. Bundle index

*Source: `README.md`*

This is the final approved, source-verified stack package for the vibe-code-first AFENDA ERP.

**Human-readable authority**

- `STACK.md` — canonical technology stack selection record
- `AFENDA_FINAL_TECH_STACK.docx` — polished editable edition (archived; not canonical)
- `AFENDA_FINAL_TECH_STACK.pdf` — rendered fixed-layout edition (archived; not canonical)
- `FINAL_APPROVAL.md` — concise approval memorandum (consolidated into this file, §2)

**Machine authority and governance**

- `STACK.sha256` — integrity seal for `STACK.md`
- `STACK_CONTROL_MAP.json` — selection-to-control traceability
- `VERSION_BASELINE.json` — verified release lines and exact-pin policy
- `BUNDLE_MANIFEST.json` — SHA-256 inventory of the complete bundle (archived; superseded live by `governance/authority-index.json`)

**Adoption and evidence**

- `ADOPTION_CHECKLIST.md` — repository adoption checklist (consolidated into this file, §3)
- `VALIDATION.md` — structural, traceability and visual-QA result (consolidated into this file, §4)
- `SOURCE_REGISTER.md` — official primary-source register

**Authority rule**

`DOCTRINE.md` remains superior. `STACK.md` becomes stack authority only after the adoption checklist is completed and its SHA-256 is enforced in CI. Historical implementation evidence does not become independent proof merely because this architecture is approved.

---

## 2. Approval decision

*Source: `FINAL_APPROVAL.md`*

**Decision:** APPROVED
**Stack record:** `STACK.md` v2.0
**Verification date:** 2026-08-07
**Architecture assessment:** approximately **9.7/10** against the binding vibe-code-first criteria.

### Approved stack

Strict TypeScript; TypeScript 7 native plus TypeScript 6 compatibility tooling; Node.js 24 LTS; pnpm workspaces and Turborepo; plain PostgreSQL 18 with PostgreSQL 17 compatibility; node-postgres; Kysely with schema-derived types; reviewed SQL migrations; Hono on Node only; Zod 4 and REST/OpenAPI; React/Vite SPA; TanStack Router/Query/Table/Virtual; React Hook Form; Tailwind CSS and shadcn/ui; OIDC with Keycloak as the reference provider; Graphile Worker behind an adapter; AFENDA-owned transactional outbox; Vitest, fast-check, StrykerJS, owned domain mutants, PGlite, Testcontainers and Playwright; governed reporting/analytics schemas; optional read-only Metabase; OpenTelemetry; OCI containers and Docker Compose first.

### Approval conditions integrated

1. `node-postgres` is the canonical driver; every transaction uses one checked-out client.
2. TypeScript 7 and TypeScript 6 compatibility lanes must both pass.
3. Evidence grades remain honest; reported evidence is marked `-R` until reproduced.
4. PostgreSQL 18 and 17 are qualified independently.
5. Hono is bound to Node and one Zod/OpenAPI path.
6. Functions and explicit capabilities are the application default; classes are permitted only at visible adapter boundaries.
7. Offline verification means no external egress after dependencies and digest-pinned images are acquired.
8. Exact patch versions and image digests live in machine-enforced files; `react-server-dom-*` is prohibited.

### Adoption status

The architecture is approved. It becomes repository authority after `ADOPTION_CHECKLIST.md` is completed and `STACK.sha256` is enforced in CI. **This approval does not claim E5 deployment qualification or E6 operational proof.**

---

## 3. Adoption checklist

*Source: `ADOPTION_CHECKLIST.md`. Checkbox state is preserved exactly as supplied — every item was unchecked in the source document. This consolidation does not check any item; completion is a repository-operations event, not a documentation event.*

**Target record:** STACK.md v2.0
**Prepared:** 2026-08-07

Complete each item before marking the stack `ADOPTED`.

### Authority and integrity

- [x] Commit `STACK.md`, `STACK.sha256`, `STACK_CONTROL_MAP.json`, `VERSION_BASELINE.json` and `SOURCE_REGISTER.md` under one canonical `stack/` path.
- [x] Add a CI check that rejects any stack authority whose SHA-256 differs from `STACK.sha256`.
- [x] Mark prior stack drafts as non-authoritative or remove them from standing-context discovery.
- [ ] Record the adopter, date and repository commit.

### Toolchain

- [ ] Pin Node 24 LTS exactly in `.node-version`, CI and container image.
- [x] Install exact TypeScript 7 native and TypeScript 6 compatibility aliases.
- [x] Add `typecheck:native`, `typecheck:native:single`, `typecheck:compat` and type-aware lint scripts.
- [x] Pin pnpm exactly in `packageManager`; commit the frozen lockfile.
- [x] Reject unapproved dependency ranges and lockfile drift.

### Database

- [ ] Pin PostgreSQL 18 and 17 container digests.
- [ ] Configure `pg` type parsing so authoritative bigint/numeric/time values do not silently lose precision.
- [ ] Implement a same-client transaction capability; forbid transactional `pool.query()`.
- [ ] Run every migration and authoritative DB control on both PostgreSQL majors.
- [ ] Generate Kysely types from the migrated schema and fail on drift.
- [ ] Separate request, posting, migration, audit and backup credentials.

### API and frontend

- [ ] Allow only Hono's Node adapter and the approved Zod/OpenAPI integration.
- [ ] Generate and diff OpenAPI; generate the frontend transport client.
- [ ] Configure React/Vite SPA and reject `react-server-dom-*` dependencies.
- [ ] Choose TanStack file-based routing only and govern generated route-tree drift.
- [ ] Apply the UI-system tokens and accessibility checks to source-owned shadcn components.

### Identity, jobs and effects

- [ ] Configure OIDC discovery/token validation with Keycloak as reference provider.
- [ ] Keep entity/operation/amount/period authorization inside AFENDA.
- [ ] Wrap Graphile Worker behind `JobQueue`; prohibit private-table coupling.
- [ ] Implement the owned financial/statutory outbox state machine and reconciliation.

### Verification

- [x] Add SCC-01 through SCC-27 to CI or a machine-readable governance dispatcher.
- [ ] Add PGlite fast tests but prohibit concurrency qualification there.
- [ ] Add Testcontainers PostgreSQL 18/17 lanes with real roles and multiple connections.
- [ ] Add critical domain mutants and enforce zero survival.
- [ ] Add Playwright vertical-slice workflow with trace retention.
- [ ] Run a clean qualification from the exact lockfile and image digests.

### Deployment, BI and operations

- [ ] Provide digest-pinned Docker Compose profiles.
- [ ] Prove the stack runs with external egress denied after artifacts are acquired.
- [ ] Create `reporting` and `analytics` schemas and a read-only BI role.
- [ ] Ship Metabase only against the read-only role.
- [ ] Do not create a logical replication slot without a live monitored consumer.
- [ ] Initialize OpenTelemetry before application code and verify correlation fields/redaction.

### Final adoption

- [ ] All constitutional selections have controls in `STACK_CONTROL_MAP.json`.
- [ ] `VALIDATION.md` passes with zero failures.
- [ ] Ratifier signs the adoption record below.

**Adopted by:** ______________________________
**Role:** ____________________________________
**Date:** ____________________________________
**Repository commit:** ________________________

---

## 4. Validation results

*Source: `VALIDATION.md`*

**Result: 23/23 checks passed.**

- PASS — Canonical stack file exists
- PASS — Hash matches STACK.md
- PASS — All 27 selection identifiers present
- PASS — All executable controls present
- PASS — Control map includes all selections
- PASS — Control map includes all controls
- PASS — Every selection control reference resolves: []
- PASS — Every constitutional selection has a control
- PASS — node-postgres selected
- PASS — TypeScript dual-toolchain parity selected
- PASS — PostgreSQL 17 and 18 qualification selected
- PASS — Hono bound to Node and one OpenAPI path
- PASS — Class rule is scoped, not blanket
- PASS — Offline rule corrected
- PASS — React Server Components prohibited
- PASS — Evidence grades do not claim battle-proven
- PASS — BI read-only boundary present
- PASS — CDC idle slot prohibition present
- PASS — No Next.js selected
- PASS — Source register contains official primary sources
- PASS — Version baseline current date
- PASS — Adoption checklist exists
- PASS — No unresolved placeholder token

### Integrity

`STACK.md` SHA-256: `0db072117f1eac486e4cc56b1472b8b192c290ac42c7653a00349ebe93c10b65`

**This validation confirms document completeness and internal consistency. It does not claim the selected implementation is E5-qualified or E6 operationally proven.**

### Rendered-document QA

- PASS — Word edition rendered successfully to PDF.
- PASS — All 19 rendered pages were inspected; no clipping, overlap, missing table header, or unreadable page was observed.
- PASS — JSON governance files parse successfully.
- PASS — PDF and DOCX editions are present in the final bundle.

---

## 5. Status of this consolidation

This file is a **reorganization of existing adoption evidence**, not a new adoption event. No checklist item has been completed by this consolidation; no validation was re-run against a different implementation. The stack does not become repository authority merely because this file exists — that still requires completing §3 and enforcing `stack/STACK.sha256` in CI, per `STACK.md` §12 and the authority rule in §1 above.

---

## 6. Phase 2 control-plane update (2026-08-08)

The nine `- [x]` items ticked in §3 above were completed and mechanically evidenced during AFENDA Phase 2 (repository control plane), commit `build(governance): establish AFENDA control plane`, and are individually cross-referenced with executable evidence in `governance/CONTROL_PLANE_REPORT.md`. Every other checklist item in §3 remains `- [ ]` unchecked because the corresponding repository state (database, API, frontend, identity, jobs, outbox, PGlite/Testcontainers, mutants, Playwright, containers, BI) does not exist yet. **Ticking these nine items is not a stack adoption event.** The stack still does not become repository authority: §3's remaining items, the ratifier signature block, and CI enforcement of `stack/STACK.sha256` on a live runner are all still outstanding.
