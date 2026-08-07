import { describe, expect, it } from 'vitest';
import { encodeFailureTransport, decodeFailureTransportShape } from '../src/result-transport.ts';
import { err, type ErrorShape } from '@afenda/errors';
import { minorUnitsToCanonicalString, moneyFromParts } from '@afenda/money';

describe('Failure transport: public-safe projection', () => {
  it('strips the diagnostic cause from the wire shape', () => {
    const failure = err('SOME_ERROR', 'something failed', { cause: new Error('internal stack trace, never public') });
    const wire = encodeFailureTransport(failure.error);
    expect(wire).toEqual({ code: 'SOME_ERROR', message: 'something failed' });
    expect(Object.hasOwn(wire, 'cause')).toBe(false);
  });

  it('preserves the stable public code and JSON-safe details', () => {
    const failure = err('RANGE_OVERFLOW', 'value out of range', { details: { attempted: 5, limit: 3, entity: 'invoice', ok: false } });
    const wire = encodeFailureTransport(failure.error);
    expect(wire.code).toBe('RANGE_OVERFLOW');
    expect(wire.details).toEqual({ attempted: 5, limit: 3, entity: 'invoice', ok: false });
  });

  it('an authoritative Money amount can only enter details as its canonical decimal string, never as a JS number', () => {
    const moneyResult = moneyFromParts('MYR', 12_345n);
    expect(moneyResult.ok).toBe(true);
    if (!moneyResult.ok) return;
    const amountAsString = minorUnitsToCanonicalString(moneyResult.value.minorUnits);
    const failure = err('INSUFFICIENT_FUNDS', 'insufficient funds', { details: { amount: amountAsString, currency: moneyResult.value.currency } });
    const wire = encodeFailureTransport(failure.error);
    expect(wire.details).toEqual({ amount: '12345', currency: 'MYR' });
    expect(typeof wire.details?.['amount']).toBe('string');
  });

  it('the failure wire shape validates against PublicFailureWireSchema', () => {
    const failure: ErrorShape<'X'> = { code: 'X', message: 'm', details: { a: 1, b: 'two', c: true, d: null } };
    const wire = encodeFailureTransport(failure);
    const validated = decodeFailureTransportShape(wire);
    expect(validated.ok).toBe(true);
  });
});

describe('SEC-05: external-input validation, negative/malformed cases', () => {
  it('rejects a missing code', () => {
    expect(decodeFailureTransportShape({ message: 'm' }).ok).toBe(false);
  });

  it('rejects a missing message', () => {
    expect(decodeFailureTransportShape({ code: 'X' }).ok).toBe(false);
  });

  it('rejects a non-JSON-safe details value (nested object)', () => {
    expect(decodeFailureTransportShape({ code: 'X', message: 'm', details: { nested: { a: 1 } } }).ok).toBe(false);
  });

  it('rejects an extra/unknown top-level field (strict shape)', () => {
    expect(decodeFailureTransportShape({ code: 'X', message: 'm', extra: 'field' }).ok).toBe(false);
  });

  it('rejects non-object input', () => {
    expect(decodeFailureTransportShape(null).ok).toBe(false);
    expect(decodeFailureTransportShape('X').ok).toBe(false);
  });
});
