import { describe, expect, it } from 'vitest';
import { decodeAsOfTransport, encodeAsOfTransport } from '../src/as-of-transport.ts';
import { instantFromEpochMillis, makeAsOf, compareInstants } from '@afenda/time';

function instant(epochMillis: number) {
  const result = instantFromEpochMillis(epochMillis);
  if (!result.ok) throw new Error('test fixture construction failed');
  return result.value;
}

describe('AsOf transport: both dimensions survive independently', () => {
  it('round-trips distinct business/knowledge boundaries exactly, without collapsing them', () => {
    const businessAsOf = instant(1_735_689_600_000); // 2025-01-01
    const knowledgeAsOf = instant(1_743_465_600_000); // 2025-04-01 (recorded later, e.g. late entry / correction)
    const original = makeAsOf(businessAsOf, knowledgeAsOf);

    const wire = encodeAsOfTransport(original);
    expect(wire.businessAsOf).not.toBe(wire.knowledgeAsOf);

    const json = JSON.parse(JSON.stringify(wire)) as unknown;
    const decoded = decodeAsOfTransport(json);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(compareInstants(decoded.value.businessAsOf, businessAsOf)).toBe(0);
      expect(compareInstants(decoded.value.knowledgeAsOf, knowledgeAsOf)).toBe(0);
      expect(compareInstants(decoded.value.businessAsOf, decoded.value.knowledgeAsOf)).not.toBe(0);
    }
  });

  it('round-trips when both boundaries happen to be equal, without merging them into one field', () => {
    const same = instant(1_735_689_600_000);
    const original = makeAsOf(same, same);
    const wire = encodeAsOfTransport(original);
    const decoded = decodeAsOfTransport(JSON.parse(JSON.stringify(wire)) as unknown);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(compareInstants(decoded.value.businessAsOf, same)).toBe(0);
      expect(compareInstants(decoded.value.knowledgeAsOf, same)).toBe(0);
    }
  });
});

describe('SEC-05: external-input validation, negative/malformed cases', () => {
  it('rejects a wire object missing businessAsOf', () => {
    expect(decodeAsOfTransport({ knowledgeAsOf: '2025-01-01T00:00:00.000Z' }).ok).toBe(false);
  });

  it('rejects a wire object missing knowledgeAsOf', () => {
    expect(decodeAsOfTransport({ businessAsOf: '2025-01-01T00:00:00.000Z' }).ok).toBe(false);
  });

  it('rejects an extra/unknown field (strict shape)', () => {
    expect(
      decodeAsOfTransport({
        businessAsOf: '2025-01-01T00:00:00.000Z',
        knowledgeAsOf: '2025-01-01T00:00:00.000Z',
        extra: 'field',
      }).ok,
    ).toBe(false);
  });

  it('rejects a malformed businessAsOf even when knowledgeAsOf is valid', () => {
    expect(
      decodeAsOfTransport({
        businessAsOf: 'not-an-instant',
        knowledgeAsOf: '2025-01-01T00:00:00.000Z',
      }).ok,
    ).toBe(false);
  });

  it('rejects a malformed knowledgeAsOf even when businessAsOf is valid', () => {
    expect(
      decodeAsOfTransport({
        businessAsOf: '2025-01-01T00:00:00.000Z',
        knowledgeAsOf: 'not-an-instant',
      }).ok,
    ).toBe(false);
  });

  it('rejects non-object input', () => {
    expect(decodeAsOfTransport(null).ok).toBe(false);
    expect(decodeAsOfTransport('2025-01-01T00:00:00.000Z').ok).toBe(false);
  });
});
