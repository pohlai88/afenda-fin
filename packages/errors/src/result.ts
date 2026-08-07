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
// - `PublicErrorDetails` values are restricted to JSON primitives. `number` here is
//   a generic, non-authoritative diagnostic scalar (e.g. "how many rows", "retry
//   count"). It is NOT authoritative money. @afenda/money's `Money`/`MinorUnits`
//   types are branded and structurally cannot be assigned into this `number` slot;
//   an authoritative amount that needs to appear in a diagnostic must be passed as
//   its canonical decimal STRING (see @afenda/money's `minorUnitsToCanonicalString`
//   / `serializeMoney`), never as a JS number. SCC-03 (packages/money type-safety
//   gate) separately rejects any Money/MinorUnits value written into a JSON
//   `number` field at its own authoritative surface.

/** JSON-safe scalar allowed inside a public error detail record. */
export type PublicErrorDetailValue = string | number | boolean | null;

/** Public-safe, JSON-serializable diagnostic payload attached to a failure. */
export type PublicErrorDetails = Readonly<Record<string, PublicErrorDetailValue>>;

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

/**
 * Constructs a failed result with a stable, code-narrowable failure code.
 * `options.details` must already be JSON-safe; `options.cause` is retained only
 * as internal/diagnostic evidence and is never emitted by `toPublicJson`.
 */
export function err<C extends string>(code: C, message: string, options: ErrOptions = {}): Err<C> {
  const error: ErrorShape<C> = {
    code,
    message,
    ...(options.details !== undefined ? { details: options.details } : {}),
    ...(options.cause !== undefined ? { cause: options.cause } : {}),
  };
  return { ok: false, error };
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

/** Transforms the failure of `result` into a (possibly differently-coded) failure, leaving success untouched. */
export function mapErr<T, C extends string, D extends string>(
  result: Result<T, C>,
  fn: (error: ErrorShape<C>) => ErrorShape<D>,
): Result<T, D> {
  return result.ok ? result : { ok: false, error: fn(result.error) };
}

/** Returns the success value, or `fallback` if `result` is a failure. */
export function unwrapOr<T, C extends string>(result: Result<T, C>, fallback: T): T {
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

/** Projects an `ErrorShape` to its JSON-safe public form, stripping `cause`. */
export function toPublicJson<C extends string>(error: ErrorShape<C>): PublicErrorJson<C> {
  return error.details === undefined
    ? { code: error.code, message: error.message }
    : { code: error.code, message: error.message, details: error.details };
}
