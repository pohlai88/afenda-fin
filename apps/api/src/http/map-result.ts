// Narrow Result → HTTP mapping. Routes must not invent status/body shapes.

import type { Context } from 'hono';
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

/**
 * Maps a canonical Result to a public HTTP body.
 * - ok → 200 + success body
 * - err → 4xx/5xx + encodeFailureTransport (never serializes cause/stack)
 */
export function mapResultToHttp<T, C extends string>(
  result: Result<T, C>,
  successBody: (value: T) => unknown,
): HttpMappedResult<unknown> {
  if (isOk(result)) {
    return { status: 200, body: successBody(result.value) };
  }
  const code = result.error.code;
  const status: 400 | 422 | 500 =
    code.includes('MALFORMED') || code.includes('MISSING') || code.includes('UNKNOWN')
      ? 400
      : code.includes('OVERFLOW') || code.includes('RANGE') || code.includes('MISMATCH')
        ? 422
        : 400;
  return {
    status,
    body: encodeFailureTransport(result.error),
  };
}

/** Apply a mapped result onto a Hono context as JSON. */
export function respondMapped(c: Context, mapped: HttpMappedResult<unknown>): Response {
  return c.json(mapped.body, mapped.status);
}

/** Public-safe body for Zod/OpenAPI request validation failures (no issue internals dump of secrets). */
export function validationFailureBody(message: string): ReturnType<typeof encodeFailureTransport> {
  return {
    code: 'REQUEST_VALIDATION_FAILED',
    message,
  };
}
