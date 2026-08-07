import { describe, expect, it } from 'vitest';
import {
  err,
  isErr,
  isOk,
  mapErr,
  mapOk,
  matchResult,
  ok,
  toPublicJson,
  unwrapOr,
  type Result,
} from '../src/index.ts';

describe('ok/err narrowing', () => {
  it('narrows a successful result to Ok<T> via isOk', () => {
    const result: Result<number, 'NEVER'> = ok(42);
    expect(isOk(result)).toBe(true);
    expect(isErr(result)).toBe(false);
    if (isOk(result)) {
      // Type-narrowed: `result.value` is `number`, not `number | undefined`.
      expect(result.value).toBe(42);
    }
  });

  it('narrows a failed result to Err<C> via isErr', () => {
    const result: Result<number, 'BAD_INPUT'> = err('BAD_INPUT', 'input was bad');
    expect(isErr(result)).toBe(true);
    expect(isOk(result)).toBe(false);
    if (isErr(result)) {
      expect(result.error.code).toBe('BAD_INPUT');
    }
  });
});

describe('stable code preservation', () => {
  it('preserves the exact failure code through mapOk (no-op on Err)', () => {
    const result: Result<number, 'BAD_INPUT'> = err('BAD_INPUT', 'input was bad');
    const mapped = mapOk(result, (n: number) => n * 2);
    expect(isErr(mapped)).toBe(true);
    if (isErr(mapped)) {
      expect(mapped.error.code).toBe('BAD_INPUT');
    }
  });

  it('preserves the success value through mapErr (no-op on Ok)', () => {
    const result: Result<number, 'BAD_INPUT'> = ok(7);
    const mapped = mapErr(result, (e) => ({ ...e, code: 'REMAPPED' as const }));
    expect(isOk(mapped)).toBe(true);
    if (isOk(mapped)) {
      expect(mapped.value).toBe(7);
    }
  });

  it('mapErr can re-code a failure while carrying details forward', () => {
    const result: Result<number, 'LOW_LEVEL'> = err('LOW_LEVEL', 'low level failure', {
      details: { attempt: 3 },
    });
    const mapped = mapErr(result, (e) => ({
      code: 'HIGH_LEVEL' as const,
      message: 'wrapped',
      ...(e.details !== undefined ? { details: e.details } : {}),
    }));
    expect(isErr(mapped)).toBe(true);
    if (isErr(mapped)) {
      expect(mapped.error.code).toBe('HIGH_LEVEL');
      expect(mapped.error.details).toEqual({ attempt: 3 });
    }
  });
});

describe('public vs diagnostic separation', () => {
  it('keeps cause out of the error shape unless explicitly supplied', () => {
    const failure = err('X', 'message only');
    expect(failure.error.cause).toBeUndefined();
    expect(Object.hasOwn(failure.error, 'cause')).toBe(false);
  });

  it('retains cause on the internal ErrorShape but never in toPublicJson', () => {
    const internalCause = new Error('database exploded');
    const failure = err('DB_FAILURE', 'could not save record', { cause: internalCause });
    expect(failure.error.cause).toBe(internalCause);

    const publicJson = toPublicJson(failure.error);
    expect(publicJson).not.toHaveProperty('cause');
    expect(JSON.stringify(publicJson)).not.toContain('database exploded');
  });

  it('omits details from the public projection when none were supplied', () => {
    const failure = err('X', 'no details here');
    const publicJson = toPublicJson(failure.error);
    expect(Object.hasOwn(publicJson, 'details')).toBe(false);
  });
});

describe('JSON-safe structure', () => {
  it('round-trips a public error through JSON.stringify/JSON.parse unchanged', () => {
    const failure = err('VALIDATION_FAILED', 'field is required', {
      details: { field: 'email', attempt: 2, retryable: false, hint: null },
      cause: new Error('internal-only'),
    });
    const publicJson = toPublicJson(failure.error);
    const roundTripped: unknown = JSON.parse(JSON.stringify(publicJson));
    expect(roundTripped).toEqual({
      code: 'VALIDATION_FAILED',
      message: 'field is required',
      details: { field: 'email', attempt: 2, retryable: false, hint: null },
    });
  });
});

describe('exhaustive result behavior', () => {
  it('matchResult calls exactly the ok branch for a success', () => {
    const result: Result<number, 'NEVER'> = ok(10);
    const output = matchResult(result, {
      ok: (v) => `ok:${v}`,
      err: () => 'should-not-run',
    });
    expect(output).toBe('ok:10');
  });

  it('matchResult calls exactly the err branch for a failure', () => {
    const result: Result<number, 'FAILED'> = err('FAILED', 'nope');
    const output = matchResult(result, {
      ok: () => 'should-not-run',
      err: (e) => `err:${e.code}`,
    });
    expect(output).toBe('err:FAILED');
  });

  it('unwrapOr returns the value for Ok and the fallback for Err', () => {
    const okResult: Result<number, 'X'> = ok(5);
    const errResult: Result<number, 'X'> = err('X', 'x');
    expect(unwrapOr(okResult, 0)).toBe(5);
    expect(unwrapOr(errResult, 0)).toBe(0);
  });
});
