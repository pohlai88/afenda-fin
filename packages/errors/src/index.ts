// Root public API of @afenda/errors. Consumers must import from the package root
// ("@afenda/errors"), never from a src/* subpath — enforced by .dependency-cruiser.cjs's
// no-cross-package-src-import rule (SCC-05).

export type {
  PublicErrorDetailValue,
  PublicErrorDetails,
  ErrorShape,
  PublicErrorJson,
  Ok,
  Err,
  Result,
  ErrOptions,
  WrapErrOptions,
  ResultMatchers,
} from './result.ts';

export {
  NON_FINITE_DETAIL_CANONICAL,
  normalizePublicErrorDetails,
  ok,
  err,
  isOk,
  isErr,
  mapOk,
  mapErr,
  wrapErr,
  unwrapOr,
  matchResult,
  toPublicJson,
} from './result.ts';
