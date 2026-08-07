import fc from 'fast-check';
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
  type PublicErrorDetailValue,
  type Result,
} from '../src/index.ts';

// `fc.double()` is deliberately unfiltered: it generates NaN, ±Infinity and -0,
// which are exactly the `number` values JSON cannot represent. Restricting this
// generator to `fc.integer()` would make the round-trip property below
// unfalsifiable — the bug class it exists to catch could never be generated.
const jsonScalarArbitrary: fc.Arbitrary<PublicErrorDetailValue> = fc.oneof(
  fc.string(),
  fc.integer(),
  fc.double(),
  fc.boolean(),
  fc.constant(null),
);

const detailsArbitrary = fc.dictionary(fc.string({ minLength: 1 }), jsonScalarArbitrary);
const codeArbitrary = fc.string({ minLength: 1 });

describe('Result properties', () => {
  it('ok(x) is always isOk and never isErr, for any value', () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        const result = ok(value);
        expect(isOk(result)).toBe(true);
        expect(isErr(result)).toBe(false);
      }),
    );
  });

  it('err(code, message) is always isErr and never isOk, for any code/message', () => {
    fc.assert(
      fc.property(codeArbitrary, fc.string(), (code, message) => {
        const result = err(code, message);
        expect(isErr(result)).toBe(true);
        expect(isOk(result)).toBe(false);
        expect(result.error.code).toBe(code);
      }),
    );
  });

  it('mapOk(ok(x), fn) === ok(fn(x)) for any integer x and pure fn', () => {
    fc.assert(
      fc.property(fc.integer(), (x) => {
        const mapped = mapOk(ok(x), (n) => n + 1);
        expect(isOk(mapped)).toBe(true);
        if (isOk(mapped)) {
          expect(mapped.value).toBe(x + 1);
        }
      }),
    );
  });

  it('mapErr is identity on Ok; wrapErr is identity on Ok', () => {
    fc.assert(
      fc.property(fc.integer(), codeArbitrary, fc.string(), (value, code, message) => {
        const success: Result<number, 'X'> = ok(value);
        const mapped = mapErr(success, (e) => ({ ...e, code: 'Y' as const }));
        const wrapped = wrapErr(success, code, message);
        expect(mapped).toEqual(success);
        expect(wrapped).toEqual(success);
      }),
    );
  });

  it('toPublicJson never contains a `cause` key, for any details/cause combination', () => {
    fc.assert(
      fc.property(codeArbitrary, fc.string(), detailsArbitrary, fc.anything(), (code, message, details, cause) => {
        const failure = err(code, message, { details, cause });
        const publicJson = toPublicJson(failure.error);
        expect(Object.hasOwn(publicJson, 'cause')).toBe(false);
        // The public projection must itself always be JSON-serializable without throwing.
        expect(() => JSON.stringify(publicJson)).not.toThrow();
        // After non-finite normalization, JSON round-trip must be exact.
        expect(JSON.parse(JSON.stringify(publicJson))).toEqual(publicJson);
      }),
    );
  });

  it('wrapErr chains preserve every prior code as nested cause', () => {
    fc.assert(
      fc.property(codeArbitrary, codeArbitrary, codeArbitrary, fc.string(), (c1, c2, c3, message) => {
        const layer1 = err(c1, message);
        const layer2 = wrapErr(layer1, c2, message);
        const layer3 = wrapErr(layer2, c3, message);
        expect(isErr(layer3)).toBe(true);
        if (!isErr(layer3)) return;
        expect(layer3.error.code).toBe(c3);
        const mid = layer3.error.cause as { code: string; cause?: { code: string } };
        expect(mid.code).toBe(c2);
        expect(mid.cause?.code).toBe(c1);
      }),
    );
  });

  it('matchResult / unwrapOr eliminate Results without losing Ok values', () => {
    fc.assert(
      fc.property(fc.integer(), (value) => {
        const result = ok(value);
        expect(matchResult(result, { ok: (v) => v, err: () => -1 })).toBe(value);
        expect(unwrapOr(result, null)).toBe(value);
        expect(unwrapOr(err('X', 'x'), null)).toBeNull();
      }),
    );
  });
});
