# `@afenda/errors`

Canonical `Result` / failure vocabulary for AFENDA application packages.

See `governance/PHASE_3A_KERNEL_REPORT.md` for phase evidence. This README records
**semantic commitments** callers and agents must not “fix” as quirks.

## `mapErr` vs `wrapErr`

| Helper | Meaning | Use when |
| --- | --- | --- |
| **`wrapErr`** | Provenance-preserving re-code. New `code`/`message`; the **entire** original `ErrorShape` is retained as `cause`. Details default to the original’s (copied); caller `details` replace the top level without losing the original in `cause`. | Default path for re-coding (driver → domain, layer → layer). Prefer whenever an audit trail or cause chain matters. |
| **`mapErr`** | Lossy replace. Mapper returns a new `ErrorShape`; nothing is preserved unless the mapper **spreads** the original (`(e) => ({ ...e, code: 'X' })`). | Deliberate shape transform / discard. Do **not** use by vibes where cause chains matter. |

`wrapErr` is the default re-code path (SC-05 / specific errors with recoverable provenance).

## Non-finite detail scalars (decided)

At `err`, `mapErr`, `wrapErr`, and `toPublicJson`:

| Input | Canonical form |
| --- | --- |
| `NaN` | `'NaN'` |
| `Infinity` | `'Infinity'` |
| `-Infinity` | `'-Infinity'` |
| `-0` | `'-0'` |

**`-0 → '-0'` is intentional**, including at `toPublicJson`. `JSON.stringify(-0)` emits `0` and silently loses the sign; canonicalizing preserves byte-level determinism across wire/log round-trips. Do not “fix” this back to a JSON number.

Finite numbers (including `+0`) are left unchanged.

## Details shape and shallow copy

- `PublicErrorDetailValue = string | number | boolean | null` — **flat scalars only**. Nested objects are not representable without type forgery.
- `err` / `mapErr` / `wrapErr` / `toPublicJson` always **shallow-copy** the details record so top-level caller mutation cannot alias into a stored `ErrorShape` or public projection.
- Because nesting is outside the type, shallow copy is the complete aliasing contract for honest callers. A forged nested value is outside this package’s guarantees.
