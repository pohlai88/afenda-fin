import { describe, expect, it } from 'vitest';
import { isValidCurrencyCode, toCurrencyCode } from '../src/currency.ts';

describe('toCurrencyCode', () => {
  it('accepts a well-formed 3-letter uppercase code', () => {
    expect(toCurrencyCode('MYR').ok).toBe(true);
    expect(toCurrencyCode('USD').ok).toBe(true);
  });

  it('rejects lowercase', () => {
    expect(toCurrencyCode('myr').ok).toBe(false);
  });

  it('rejects mixed case', () => {
    expect(toCurrencyCode('Myr').ok).toBe(false);
  });

  it('rejects the wrong length', () => {
    expect(toCurrencyCode('MY').ok).toBe(false);
    expect(toCurrencyCode('MYRA').ok).toBe(false);
  });

  it('rejects non-letter characters', () => {
    expect(toCurrencyCode('MY1').ok).toBe(false);
    expect(toCurrencyCode('M-R').ok).toBe(false);
  });

  it('rejects empty string', () => {
    expect(toCurrencyCode('').ok).toBe(false);
  });
});

describe('isValidCurrencyCode', () => {
  it('agrees with toCurrencyCode on validity, for representative inputs', () => {
    for (const candidate of ['MYR', 'usd', 'EU', 'SGDX', '']) {
      expect(isValidCurrencyCode(candidate)).toBe(toCurrencyCode(candidate).ok);
    }
  });
});
