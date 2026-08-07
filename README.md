# AFENDA authority layer

Sealed, machine-verified governance for AFENDA: doctrine, stack, position. Markdown = canonical text. JSON under `governance/` = generated, read-only projection. Never edit JSON by hand — regenerate from source.

## Precedence

```
Doctrine  >  Stack  >  Position
```

Doctrine wins on conflict. Position cannot override doctrine or stack — it governs claims only, not implementation or truth.

## Canonical documents

| Doc | Path | Seal | Role |
|---|---|---|---|
| Doctrine | [doctrine/DOCTRINE.md](doctrine/DOCTRINE.md) | [doctrine/DOCTRINE.sha256](doctrine/DOCTRINE.sha256) | Normative authority — what must be true |
| Stack | [stack/STACK.md](stack/STACK.md) | [stack/STACK.sha256](stack/STACK.sha256) | Implementation authority, subordinate to doctrine |
| Position | [position/POSITION.md](position/POSITION.md) | [position/POSITION.sha256](position/POSITION.sha256) | Market-claim authority — not technical, not normative |

Stack adoption record (checklist + validation, not yet complete): [stack/STACK_ADOPTION.md](stack/STACK_ADOPTION.md).

## Machine projections (generated — do not hand-edit)

| File | Contents |
|---|---|
| [governance/authority-index.json](governance/authority-index.json) | 3 docs indexed: path, precedence, SHA-256, adoption status, object counts |
| [governance/doctrine-registry.json](governance/doctrine-registry.json) | 63 rules, 18 verification controls (V01–V18), 20 forbidden items, authority classes, evidence grades |
| [governance/stack-registry.json](governance/stack-registry.json) | 27 selections, 27 controls, rejections, escape hatches, gates |
| [governance/position-registry.json](governance/position-registry.json) | 7 obligations, result classes, evidence ladder, approved messaging |

Full audit trail of this consolidation: [governance/CONSOLIDATION_REPORT.md](governance/CONSOLIDATION_REPORT.md).
Original pre-consolidation bundle, preserved byte-identical: `governance/history/2026-08-07-stack-bundle/`.

## Regenerate and verify

```bash
node scripts/build-authority-registry.mjs      # rebuild governance/*.json from canonical Markdown
node scripts/check-authority-integrity.mjs     # read-only gate — never repairs, exits non-zero on any failure
node scripts/check-authority-integrity.mjs --self-test   # proves the gate can actually fail (9 negative fixtures)
```

Build and check share one parser (`scripts/lib/authority-parser.mjs`), so they cannot silently drift apart.

## Rules

- Doctrine/Stack/Position wording is frozen. Regenerate JSON from Markdown, never the reverse.
- `gist` fields in the JSON are non-normative summaries. Never treat a `gist` as authority — always trace back to `rule_verbatim` / `decision_verbatim` / `text_verbatim`.
- Historical evidence gaps (doctrine §15.4) are marked `historical-orphaned` on the *evidence*, never on the rule itself. Rules stay `active`.
- Before removing any standing-authority file: rebuild registries, run the integrity gate, confirm 0 failures, only then delete.
