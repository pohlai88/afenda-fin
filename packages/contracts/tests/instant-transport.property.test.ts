import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decodeInstantTransport, encodeInstantTransport } from '../src/instant-transport.ts';
import { instantFromEpochMillis, MIN_EPOCH_MILLIS, MAX_EPOCH_MILLIS, compareInstants } from '@afenda/time';

const instantArbitrary = fc.integer({ min: MIN_EPOCH_MILLIS, max: MAX_EPOCH_MILLIS }).map((epochMillis) => {
  const built = instantFromEpochMillis(epochMillis);
  if (!built.ok) throw new Error('unreachable: value already in the valid four-digit-year range');
  return built.value;
});

describe('Instant transport properties', () => {
  it('decode(encode(x)) equals x, for any valid domain Instant in the four-digit-year range', () => {
    fc.assert(
      fc.property(instantArbitrary, (instant) => {
        const decoded = decodeInstantTransport(encodeInstantTransport(instant));
        expect(decoded.ok).toBe(true);
        if (decoded.ok) expect(compareInstants(decoded.value, instant)).toBe(0);
      }),
    );
  });

  it('a full JSON round trip preserves x exactly', () => {
    fc.assert(
      fc.property(instantArbitrary, (instant) => {
        const wire = encodeInstantTransport(instant);
        const roundTripped = JSON.parse(JSON.stringify(wire)) as unknown;
        const decoded = decodeInstantTransport(roundTripped);
        expect(decoded.ok).toBe(true);
        if (decoded.ok) expect(compareInstants(decoded.value, instant)).toBe(0);
      }),
    );
  });
});
