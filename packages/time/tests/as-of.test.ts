import { describe, expect, it } from 'vitest';
import { makeAsOf } from '../src/as-of.ts';
import { instantFromEpochMillis } from '../src/instant.ts';

describe('AsOf', () => {
  it('carries both a business boundary and a knowledge boundary', () => {
    const business = instantFromEpochMillis(1000);
    const knowledge = instantFromEpochMillis(2000);
    expect(business.ok && knowledge.ok).toBe(true);
    if (!business.ok || !knowledge.ok) return;

    const asOf = makeAsOf(business.value, knowledge.value);
    expect(asOf.businessAsOf).toEqual(business.value);
    expect(asOf.knowledgeAsOf).toEqual(knowledge.value);
  });

  it('keeps knowledgeAsOf and businessAsOf distinct even when constructed from different instants', () => {
    const march = instantFromEpochMillis(0);
    const laterKnowledge = instantFromEpochMillis(86_400_000);
    expect(march.ok && laterKnowledge.ok).toBe(true);
    if (!march.ok || !laterKnowledge.ok) return;

    // A late-arriving correction: the business fact was effective in March, but
    // the system only learned about it a day later. Both boundaries must be
    // independently observable on the resulting AsOf.
    const asOf = makeAsOf(march.value, laterKnowledge.value);
    expect(asOf.businessAsOf).not.toEqual(asOf.knowledgeAsOf);
    expect(asOf.businessAsOf.epochMillis).toBeLessThan(asOf.knowledgeAsOf.epochMillis);
  });

  // Compile-time evidence that AsOf cannot omit either boundary lives in
  // tests/type-invalid/asof-missing-business-boundary.ts and
  // tests/type-invalid/asof-missing-knowledge-boundary.ts (see
  // scripts/check-type-invalid.ts), not here — this file only exercises runtime
  // behavior of values that already satisfy the type.
});
