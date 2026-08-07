import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decodeAsOfTransport, encodeAsOfTransport } from '../src/as-of-transport.ts';
import { instantFromEpochMillis, makeAsOf, compareInstants, MIN_EPOCH_MILLIS, MAX_EPOCH_MILLIS } from '@afenda/time';

const instantArbitrary = fc.integer({ min: MIN_EPOCH_MILLIS, max: MAX_EPOCH_MILLIS }).map((epochMillis) => {
  const built = instantFromEpochMillis(epochMillis);
  if (!built.ok) throw new Error('unreachable: value already in the valid four-digit-year range');
  return built.value;
});

describe('AsOf transport properties', () => {
  it('decode(encode(x)) equals x for both dimensions independently, for any valid domain AsOf', () => {
    fc.assert(
      fc.property(instantArbitrary, instantArbitrary, (businessAsOf, knowledgeAsOf) => {
        const asOf = makeAsOf(businessAsOf, knowledgeAsOf);
        const decoded = decodeAsOfTransport(encodeAsOfTransport(asOf));
        expect(decoded.ok).toBe(true);
        if (decoded.ok) {
          expect(compareInstants(decoded.value.businessAsOf, businessAsOf)).toBe(0);
          expect(compareInstants(decoded.value.knowledgeAsOf, knowledgeAsOf)).toBe(0);
        }
      }),
    );
  });

  it('a full JSON round trip never collapses distinct boundaries into one', () => {
    fc.assert(
      fc.property(instantArbitrary, instantArbitrary, (businessAsOf, knowledgeAsOf) => {
        fc.pre(compareInstants(businessAsOf, knowledgeAsOf) !== 0);
        const wire = encodeAsOfTransport(makeAsOf(businessAsOf, knowledgeAsOf));
        const roundTripped = JSON.parse(JSON.stringify(wire)) as unknown;
        const decoded = decodeAsOfTransport(roundTripped);
        expect(decoded.ok).toBe(true);
        if (decoded.ok) {
          expect(compareInstants(decoded.value.businessAsOf, decoded.value.knowledgeAsOf)).not.toBe(0);
        }
      }),
    );
  });
});
