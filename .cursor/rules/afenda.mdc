<!-- GENERATED FILE - DO NOT EDIT -->
<!-- Source: governance/rules.json | Regenerate: pnpm agent-docs -->
<!-- A hand edit here will fail the AGENT-DOCS-DRIFT gate. -->
# AFENDA rules

AFENDA is a vibe-code-first ERP under construction. This repository currently holds the sealed authority layer and its governance/tooling control plane; no application code exists yet.

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
| `scripts/` | Deterministic build/check/gate tooling. scripts/lib/ holds shared parsing logic used by both build and check scripts. |
| `package.json, tsconfig*.json, pnpm-workspace.yaml, .node-version, turbo.json` | Repository/tooling control-plane shell established in Phase 2. No apps/ or packages/ application code exists yet; see stack/STACK.md §8 for the target architecture at adoption. |

## Stack adoption status

architecturally approved; not yet adopted (stack/STACK_ADOPTION.md is intentionally unchecked pending mechanical evidence)

## Before finishing

Run `pnpm gate`. If it fails, fix the code — never the gate, the test, the seals, or the canonical authority documents. A failing or NOT-YET-BUILT gate is information; report it and stop.
