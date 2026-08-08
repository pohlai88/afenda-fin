// Narrow Result → HTTP mapping. Routes must not invent status/body shapes.

import { encodeFailureTransport } from '@afenda/contracts';
import { isOk, type Result } from '@afenda/errors';

export interface HttpMappedSuccess<T> {
  readonly status: 200;
  readonly body: T;
}

export interface HttpMappedFailure {
  readonly status: 400 | 422 | 500;
  readonly body: ReturnType<typeof encodeFailureTransport>;
}

export type HttpMappedResult<T> = HttpMappedSuccess<T> | HttpMappedFailure;

function failureStatus(code: string): 400 | 422 | 500 {
  if (code.includes('PERSISTENCE') || code.includes('INTERNAL')) {
    return 500;
  }
  if (code.includes('OVERFLOW') || code.includes('RANGE') || code.includes('MISMATCH')) {
    return 422;
  }
  return 400;
}

/**
 * Maps a canonical Result to a public HTTP body.
 * - ok → 200 + success body
 * - err → 400/422/500 + encodeFailureTransport (never serializes cause/stack)
 */
export function mapResultToHttp<T, C extends string>(
  result: Result<T, C>,
  successBody: (value: T) => unknown,
): HttpMappedResult<unknown> {
  if (isOk(result)) {
    return { status: 200, body: successBody(result.value) };
  }
  return {
    status: failureStatus(result.error.code),
    body: encodeFailureTransport(result.error),
  };
}

/** Public-safe body for Zod/OpenAPI request validation failures. */
export function validationFailureBody(
  message = 'request failed OpenAPI/Zod validation',
): ReturnType<typeof encodeFailureTransport> {
  return {
    code: 'REQUEST_VALIDATION_FAILED',
    message,
  };
}
