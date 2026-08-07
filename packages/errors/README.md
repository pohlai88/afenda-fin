# `@afenda/errors`

Canonical `Result` / failure vocabulary for AFENDA application packages.

Evidence: `governance/PHASE_3A_KERNEL_REPORT.md`. This README records **semantic
commitments** — do not reverse them as quirks.

## `mapErr` vs `wrapErr` (stack/STACK.md SC-05)

SC-05 — *Specific errors*: prefer failures that name the violated type, schema,
constraint, operation or control. Provenance-preserving re-code keeps that
specificity recoverable up the stack.

| Helper | Meaning | Use when |
| --- | --- | --- |
| **`wrapErr`** | **Default** provenance-preserving re-code. New `code`/`message`; the **entire** original `ErrorShape` is retained as `cause`. Details default to the original’s (copied); caller `details` replace the top level without losing the original in `cause`. | Driver → domain, layer → layer, anything with an audit trail or cause chain. |
| **`mapErr`** | Lossy replace. Mapper returns a new `ErrorShape`; nothing is preserved unless the mapper **spreads** the original (`(e) => ({ ...e, code: 'X' })`). | Deliberate shape transform / discard. **Not** the default when cause chains matter. |

Pick by contract, not by vibes: if you need the prior failure later, use `wrapErr`.

## Non-finite detail scalars (decided)

Applied at `err`, `mapErr`, `wrapErr`, `toPublicJson`, and (via the exported
`normalizePublicErrorDetails` helper) at `@afenda/contracts` failure decode:

| Input | Canonical form |
| --- | --- |
| `NaN` | `'NaN'` |
| `Infinity` | `'Infinity'` |
| `-Infinity` | `'-Infinity'` |
| `-0` | `'-0'` |

**`-0 → '-0'` is intentional on both encode and decode.** `JSON.stringify(-0)`
emits `0` and silently loses the sign; the string form preserves byte-level
determinism (DET-05 family). Do not “fix” this back to a JSON number.

Finite numbers (including `+0`) are left unchanged.

## Details shape and shallow copy

- `PublicErrorDetailValue = string | number | boolean | null` — **flat scalars
  only**. Nested objects/arrays are a type error (compile-time fixture:
  `tests/type-invalid/error-details-cannot-be-nested.ts`).
- `err` / `mapErr` / `wrapErr` / `toPublicJson` / `normalizePublicErrorDetails`
  **shallow-copy and `Object.freeze`** the details record so top-level caller
  mutation cannot alias into a stored `ErrorShape` or public projection.
- Because nesting is outside the type, that is the complete aliasing contract for
  honest callers. Forged nested values are outside this package’s guarantees.
