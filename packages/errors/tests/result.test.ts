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
  wrapErr,
  NON_FINITE_DETAIL_CANONICAL,
  type ErrorShape,
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

  it('mapErr re-codes a failure while carrying details AND cause forward', () => {
    const rootCause = new Error('socket closed');
    const result: Result<number, 'LOW_LEVEL'> = err('LOW_LEVEL', 'low level failure', {
      details: { attempt: 3 },
      cause: rootCause,
    });
    // Spreading the original shape is the non-lossy idiom: everything the caller
    // does not deliberately override survives the re-code.
    const mapped = mapErr(result, (e) => ({ ...e, code: 'HIGH_LEVEL' as const, message: 'wrapped' }));
    expect(isErr(mapped)).toBe(true);
    if (isErr(mapped)) {
      expect(mapped.error.code).toBe('HIGH_LEVEL');
      expect(mapped.error.details).toEqual({ attempt: 3 });
      expect(mapped.error.cause).toBe(rootCause);
    }
  });
});

describe('wrapErr cause chaining', () => {
  it('leaves a success untouched', () => {
    const result: Result<number, 'LOW_LEVEL'> = ok(7);
    const wrapped = wrapErr(result, 'HIGH_LEVEL', 'wrapped');
    expect(isOk(wrapped)).toBe(true);
    if (isOk(wrapped)) {
      expect(wrapped.value).toBe(7);
    }
  });

  it('re-codes a failure and preserves the entire original shape as cause', () => {
    const rootCause = new Error('socket closed');
    const result: Result<number, 'LOW_LEVEL'> = err('LOW_LEVEL', 'low level failure', {
      details: { attempt: 3 },
      cause: rootCause,
    });
    const wrapped = wrapErr(result, 'HIGH_LEVEL', 'could not load ledger');
    expect(isErr(wrapped)).toBe(true);
    if (isErr(wrapped)) {
      expect(wrapped.error.code).toBe('HIGH_LEVEL');
      expect(wrapped.error.message).toBe('could not load ledger');
      // The original failure survives intact, including its own cause chain.
      const original = wrapped.error.cause as ErrorShape<'LOW_LEVEL'>;
      expect(original.code).toBe('LOW_LEVEL');
      expect(original.message).toBe('low level failure');
      expect(original.details).toEqual({ attempt: 3 });
      expect(original.cause).toBe(rootCause);
    }
  });

  it('carries the original details forward when no replacement details are supplied', () => {
    const result: Result<number, 'LOW_LEVEL'> = err('LOW_LEVEL', 'low level failure', {
      details: { attempt: 3 },
    });
    const wrapped = wrapErr(result, 'HIGH_LEVEL', 'wrapped');
    expect(isErr(wrapped)).toBe(true);
    if (isErr(wrapped)) {
      expect(wrapped.error.details).toEqual({ attempt: 3 });
    }
  });

  it('replaces details when the caller supplies them, without losing the original in cause', () => {
    const result: Result<number, 'LOW_LEVEL'> = err('LOW_LEVEL', 'low level failure', {
      details: { attempt: 3 },
    });
    const wrapped = wrapErr(result, 'HIGH_LEVEL', 'wrapped', { details: { ledger: 'AR' } });
    expect(isErr(wrapped)).toBe(true);
    if (isErr(wrapped)) {
      expect(wrapped.error.details).toEqual({ ledger: 'AR' });
      expect((wrapped.error.cause as ErrorShape<'LOW_LEVEL'>).details).toEqual({ attempt: 3 });
    }
  });

  it('omits details entirely when neither the original nor the caller supplied any', () => {
    const result: Result<number, 'LOW_LEVEL'> = err('LOW_LEVEL', 'low level failure');
    const wrapped = wrapErr(result, 'HIGH_LEVEL', 'wrapped');
    expect(isErr(wrapped)).toBe(true);
    if (isErr(wrapped)) {
      expect(Object.hasOwn(wrapped.error, 'details')).toBe(false);
    }
  });

  it('nests cleanly across three layers, keeping every code recoverable', () => {
    const layer1: Result<number, 'L1'> = err('L1', 'lowest');
    const layer2 = wrapErr(layer1, 'L2', 'middle');
    const layer3 = wrapErr(layer2, 'L3', 'top');
    expect(isErr(layer3)).toBe(true);
    if (isErr(layer3)) {
      expect(layer3.error.code).toBe('L3');
      const middle = layer3.error.cause as ErrorShape<'L2'>;
      expect(middle.code).toBe('L2');
      expect((middle.cause as ErrorShape<'L1'>).code).toBe('L1');
    }
  });

  it('contrasts with mapErr without spread: prior cause is dropped (lossy replace)', () => {
    // Contract proof that mapErr is not wrapErr — agents must not pick by vibes.
    const root = new Error('driver');
    const result: Result<number, 'LOW'> = err('LOW', 'low', { cause: root, details: { attempt: 1 } });
    const mapped = mapErr(result, () => ({ code: 'HIGH' as const, message: 'high' }));
    expect(isErr(mapped)).toBe(true);
    if (isErr(mapped)) {
      expect(mapped.error.code).toBe('HIGH');
      expect(Object.hasOwn(mapped.error, 'cause')).toBe(false);
      expect(Object.hasOwn(mapped.error, 'details')).toBe(false);
    }
    const wrapped = wrapErr(result, 'HIGH', 'high');
    expect(isErr(wrapped)).toBe(true);
    if (isErr(wrapped)) {
      expect(wrapped.error.cause).toBe(result.error);
      expect(wrapped.error.details).toEqual({ attempt: 1 });
    }
  });
});

describe('details isolation (shallow copy + freeze)', () => {
  it('err shallow-copies details so later mutation of the input cannot alias into the ErrorShape', () => {
    const details = { attempt: 1 };
    const failure = err('X', 'm', { details });
    details.attempt = 99;
    expect(failure.error.details).toEqual({ attempt: 1 });
  });

  it('toPublicJson shallow-copies details so mutation of the projection cannot alias into the ErrorShape', () => {
    const failure = err('X', 'm', { details: { attempt: 1 } });
    const publicJson = toPublicJson(failure.error);
    if (publicJson.details === undefined) throw new Error('expected details');
    expect(() => {
      (publicJson.details as { attempt: number }).attempt = 99;
    }).toThrow();
    expect(failure.error.details).toEqual({ attempt: 1 });
    expect(publicJson.details).toEqual({ attempt: 1 });
  });

  it('freezes stored details so post-construction key mutation fails', () => {
    const failure = err('X', 'm', { details: { attempt: 1 } });
    expect(Object.isFrozen(failure.error.details)).toBe(true);
    expect(() => {
      (failure.error.details as { attempt: number }).attempt = 99;
    }).toThrow();
  });
});

describe('non-finite detail scalars', () => {
  // JSON has no representation for NaN/Infinity/-0: JSON.stringify silently
  // turns them into `null`/`0`. That is exactly the lossy, unauditable
  // conversion this package exists to prevent, so `err` normalizes them to
  // their canonical string form at construction instead.
  it('normalizes NaN to its canonical string form', () => {
    const failure = err('X', 'm', { details: { ratio: Number.NaN } });
    expect(failure.error.details).toEqual({ ratio: 'NaN' });
  });

  it('normalizes positive and negative infinity to canonical string forms', () => {
    const failure = err('X', 'm', {
      details: { high: Number.POSITIVE_INFINITY, low: Number.NEGATIVE_INFINITY },
    });
    expect(failure.error.details).toEqual({ high: 'Infinity', low: '-Infinity' });
  });

  it('normalizes negative zero to "-0" (decided: including toPublicJson)', () => {
    // JSON.stringify(-0) emits 0 and drops the sign. Canonical '-0' is intentional
    // determinism — see packages/errors/README.md — not a quirk to reverse.
    const failure = err('X', 'm', { details: { delta: -0 } });
    expect(failure.error.details).toEqual({ delta: NON_FINITE_DETAIL_CANONICAL.negativeZero });
    expect(toPublicJson(failure.error).details).toEqual({
      delta: NON_FINITE_DETAIL_CANONICAL.negativeZero,
    });
  });

  it('leaves ordinary finite numbers, including positive zero, untouched', () => {
    const failure = err('X', 'm', { details: { attempt: 3, zero: 0, fraction: 1.5, big: 1e21 } });
    expect(failure.error.details).toEqual({ attempt: 3, zero: 0, fraction: 1.5, big: 1e21 });
  });

  it('normalizes non-finite scalars introduced by mapErr', () => {
    const result: Result<number, 'LOW'> = err('LOW', 'low');
    const mapped = mapErr(result, (e) => ({ ...e, details: { ratio: Number.NaN } }));
    expect(isErr(mapped)).toBe(true);
    if (isErr(mapped)) {
      expect(mapped.error.details).toEqual({ ratio: 'NaN' });
    }
  });

  it('normalizes non-finite scalars in a hand-built ErrorShape at the public boundary', () => {
    // `ErrorShape` is a plain interface, so a caller can construct one without
    // going through `err`. `toPublicJson` is the last gate before the wire.
    const handBuilt: ErrorShape<'X'> = { code: 'X', message: 'm', details: { ratio: Number.NaN } };
    expect(toPublicJson(handBuilt).details).toEqual({ ratio: 'NaN' });
  });

  it('round-trips a public projection containing non-finite inputs through JSON unchanged', () => {
    const failure = err('X', 'm', {
      details: { ratio: Number.NaN, high: Number.POSITIVE_INFINITY, delta: -0, attempt: 3 },
    });
    const publicJson = toPublicJson(failure.error);
    expect(JSON.parse(JSON.stringify(publicJson))).toEqual(publicJson);
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

  it('unwrapOr accepts a differently-typed fallback without widening the success type', () => {
    const errResult: Result<number, 'X'> = err('X', 'x');
    // Type-level intent: the return is `number | null`, not `number` and not `any`.
    const value: number | null = unwrapOr(errResult, null);
    expect(value).toBeNull();
  });
});
