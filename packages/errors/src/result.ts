// Canonical Result<T, C> contract for AFENDA application packages.
//
// Doctrine basis: GOV-01/GOV-02 (executable, code-narrowable evidence, not prose);
// Forbidden #4/#12/#13 indirectly, by keeping this vocabulary free of ambient state
// or implicit numeric coercion. This module contains no business logic — it only
// gives later packages (time, money, and beyond) one shared, exhaustively
// narrowable way to represent "this operation produced a value" vs "this operation
// produced a named, stable failure".
//
// Design constraints (see governance/PHASE_3A_KERNEL_REPORT.md):
// - discriminated union on the `ok` boolean field, immutable (`readonly` throughout)
// - explicit constructors only (`ok`, `err`); no thrown exception for ordinary
//   domain control flow
// - `ErrorShape.cause` is diagnostic/internal evidence and is never present in the
//   JSON-safe public projection produced by `toPublicJson`
// - `wrapErr` = provenance-preserving re-code (original ErrorShape becomes cause).
//   `mapErr` = lossy replace of the failure shape (spread the original when you
//   need non-lossy). Prefer wrapErr for audit/driver re-coding; see README.md.
// - detail records are shallow-copied at construction and public projection.
//   Nesting is not representable: PublicErrorDetailValue is scalar-only, so
//   shallow copy is sufficient without forging.
// - non-finite number detail scalars normalize to canonical strings at err /
//   mapErr / wrapErr / toPublicJson. Decided: `-0` → `'-0'` (JSON.stringify
//   would emit `0` and silently drop the sign — byte-level determinism wins).
// - `PublicErrorDetails` values are restricted to JSON primitives. `number` here is
//   a generic, non-authoritative diagnostic scalar — NOT authoritative money.

/**
 * JSON-safe scalar allowed inside a public error detail record.
 * **Flat only** — nested objects/arrays are not representable without type forgery.
 * That is why shallow-copy of the details record is the complete aliasing contract.
 */
export type PublicErrorDetailValue = string | number | boolean | null;

/** Public-safe, JSON-serializable diagnostic payload attached to a failure (flat scalars). */
export type PublicErrorDetails = Readonly<Record<string, PublicErrorDetailValue>>;

/** Decided canonical forms for non-finite JSON-hostile number detail scalars. */
export const NON_FINITE_DETAIL_CANONICAL = {
  nan: 'NaN',
  positiveInfinity: 'Infinity',
  negativeInfinity: '-Infinity',
  negativeZero: '-0',
} as const;

/**
 * The full internal shape of a failure. `cause` is diagnostic/internal evidence
 * (e.g. an underlying thrown error from an infrastructure fault, a stack, a raw
 * driver error) that is useful for logs/telemetry but must never be assumed
 * JSON-safe and must never cross into a public API response body.
 */
export interface ErrorShape<C extends string = string> {
  readonly code: C;
  readonly message: string;
  readonly details?: PublicErrorDetails;
  readonly cause?: unknown;
}

/** The JSON-safe projection of an `ErrorShape`, with `cause` deliberately stripped. */
export interface PublicErrorJson<C extends string = string> {
  readonly code: C;
  readonly message: string;
  readonly details?: PublicErrorDetails;
}

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err<C extends string = string> {
  readonly ok: false;
  readonly error: ErrorShape<C>;
}

/** A discriminated, exhaustively-narrowable outcome: exactly one of `Ok<T>` or `Err<C>`. */
export type Result<T, C extends string = string> = Ok<T> | Err<C>;

/** Constructs a successful result. */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export interface ErrOptions {
  readonly details?: PublicErrorDetails;
  readonly cause?: unknown;
}

export interface WrapErrOptions {
  readonly details?: PublicErrorDetails;
}

/**
 * Normalizes a single detail scalar so JSON round-trips cannot silently drop
 * NaN / ±Infinity / -0 into null / 0.
 *
 * Decided: `-0` → `'-0'` (see `NON_FINITE_DETAIL_CANONICAL.negativeZero`).
 * `JSON.stringify(-0)` emits `0` and drops the sign — do not reverse this.
 */
function normalizeDetailValue(value: PublicErrorDetailValue): PublicErrorDetailValue {
  if (typeof value !== 'number') return value;
  if (Number.isNaN(value)) return NON_FINITE_DETAIL_CANONICAL.nan;
  if (value === Number.POSITIVE_INFINITY) return NON_FINITE_DETAIL_CANONICAL.positiveInfinity;
  if (value === Number.NEGATIVE_INFINITY) return NON_FINITE_DETAIL_CANONICAL.negativeInfinity;
  if (Object.is(value, -0)) return NON_FINITE_DETAIL_CANONICAL.negativeZero;
  return value;
}

/**
 * Shallow-copies and normalizes a details record (never aliases the caller's object).
 * Frozen so honest callers cannot mutate keys after construction / projection.
 *
 * Public so transport boundaries (`@afenda/contracts` failure decode) share the
 * same canonicalization as `err` / `toPublicJson` — including `-0` → `'-0'`.
 */
export function normalizePublicErrorDetails(details: PublicErrorDetails): PublicErrorDetails {
  const copy: Record<string, PublicErrorDetailValue> = {};
  for (const [key, value] of Object.entries(details)) {
    copy[key] = normalizeDetailValue(value);
  }
  return Object.freeze(copy);
}

function materializeErrorShape<C extends string>(shape: ErrorShape<C>): ErrorShape<C> {
  return {
    code: shape.code,
    message: shape.message,
    ...(shape.details !== undefined ? { details: normalizePublicErrorDetails(shape.details) } : {}),
    ...(shape.cause !== undefined ? { cause: shape.cause } : {}),
  };
}

/**
 * Constructs a failed result with a stable, code-narrowable failure code.
 * `options.details` must already be JSON-safe; `options.cause` is retained only
 * as internal/diagnostic evidence and is never emitted by `toPublicJson`.
 */
export function err<C extends string>(code: C, message: string, options: ErrOptions = {}): Err<C> {
  return {
    ok: false,
    error: materializeErrorShape({
      code,
      message,
      ...(options.details !== undefined ? { details: options.details } : {}),
      ...(options.cause !== undefined ? { cause: options.cause } : {}),
    }),
  };
}

/** Narrows `result` to `Ok<T>`. */
export function isOk<T, C extends string>(result: Result<T, C>): result is Ok<T> {
  return result.ok;
}

/** Narrows `result` to `Err<C>`. */
export function isErr<T, C extends string>(result: Result<T, C>): result is Err<C> {
  return !result.ok;
}

/** Transforms the success value of `result`, leaving a failure untouched. */
export function mapOk<T, U, C extends string>(result: Result<T, C>, fn: (value: T) => U): Result<U, C> {
  return result.ok ? ok(fn(result.value)) : result;
}

/**
 * Lossy failure replace (not the default re-code path).
 *
 * Mapper returns a new `ErrorShape`; prior `code`/`message`/`cause`/`details` are
 * preserved only if the mapper spreads the original
 * (`(e) => ({ ...e, code: 'X' })`). Prefer {@link wrapErr} whenever a cause chain
 * or audit trail matters (stack/STACK.md SC-05 — specific errors with recoverable
 * provenance). Produced details are shallow-copied, frozen, and non-finite-normalized.
 *
 * @see packages/errors/README.md — `mapErr` vs `wrapErr`
 */
export function mapErr<T, C extends string, D extends string>(
  result: Result<T, C>,
  fn: (error: ErrorShape<C>) => ErrorShape<D>,
): Result<T, D> {
  return result.ok ? result : { ok: false, error: materializeErrorShape(fn(result.error)) };
}

/**
 * Default provenance-preserving re-code path (prefer over {@link mapErr}).
 *
 * Leaves success untouched. On failure: new `code`/`message`, entire original
 * `ErrorShape` retained as `cause`. Details default to the original’s (copied);
 * caller-supplied `details` replace the top level without losing the original in
 * `cause`. Use for driver → domain and layer → layer re-coding (SC-05).
 *
 * @see packages/errors/README.md — `mapErr` vs `wrapErr`
 */
export function wrapErr<T, C extends string, D extends string>(
  result: Result<T, C>,
  code: D,
  message: string,
  options: WrapErrOptions = {},
): Result<T, D> {
  if (result.ok) return result;
  const original = result.error;
  const detailsSource = options.details !== undefined ? options.details : original.details;
  return {
    ok: false,
    error: {
      code,
      message,
      ...(detailsSource !== undefined ? { details: normalizePublicErrorDetails(detailsSource) } : {}),
      cause: original,
    },
  };
}

/** Returns the success value, or `fallback` if `result` is a failure. */
export function unwrapOr<T, U, C extends string>(result: Result<T, C>, fallback: U): T | U {
  return result.ok ? result.value : fallback;
}

export interface ResultMatchers<T, C extends string, R> {
  readonly ok: (value: T) => R;
  readonly err: (error: ErrorShape<C>) => R;
}

/**
 * Exhaustive handling entry point: both branches are mandatory at the call site,
 * so a `Result` can never be silently half-handled.
 */
export function matchResult<T, C extends string, R>(result: Result<T, C>, matchers: ResultMatchers<T, C, R>): R {
  return result.ok ? matchers.ok(result.value) : matchers.err(result.error);
}

/**
 * Projects an `ErrorShape` to its JSON-safe public form, stripping `cause`.
 * Details are shallow-copied, frozen, and non-finite-normalized — including the
 * decided `-0` → `'-0'` mapping (byte-level determinism; not a quirk).
 */
export function toPublicJson<C extends string>(error: ErrorShape<C>): PublicErrorJson<C> {
  return error.details === undefined
    ? { code: error.code, message: error.message }
    : { code: error.code, message: error.message, details: normalizePublicErrorDetails(error.details) };
}
