import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { err, isErr, isOk, mapOk, ok, toPublicJson, type PublicErrorDetailValue } from '../src/index.ts';

const jsonScalarArbitrary: fc.Arbitrary<PublicErrorDetailValue> = fc.oneof(
  fc.string(),
  fc.integer(),
  fc.boolean(),
  fc.constant(null),
);

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
      fc.property(fc.string({ minLength: 1 }), fc.string(), (code, message) => {
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

  it('toPublicJson never contains a `cause` key, for any details/cause combination', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string(),
        fc.dictionary(fc.string({ minLength: 1 }), jsonScalarArbitrary),
        fc.anything(),
        (code, message, details, cause) => {
          const failure = err(code, message, { details, cause });
          const publicJson = toPublicJson(failure.error);
          expect(Object.hasOwn(publicJson, 'cause')).toBe(false);
          // The public projection must itself always be JSON-serializable without throwing.
          expect(() => JSON.stringify(publicJson)).not.toThrow();
        },
      ),
    );
  });
});
