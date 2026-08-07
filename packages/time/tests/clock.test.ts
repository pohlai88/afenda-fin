import { describe, expect, it } from 'vitest';
import { fixedClock } from '../src/clock.ts';
import { instantFromEpochMillis } from '../src/instant.ts';
import { systemClock } from '../src/system-clock.ts';

describe('fixedClock', () => {
  it('always returns the same explicitly supplied instant', () => {
    const instant = instantFromEpochMillis(123_456);
    expect(instant.ok).toBe(true);
    if (!instant.ok) return;
    const clock = fixedClock(instant.value);
    expect(clock.now()).toEqual(instant.value);
    expect(clock.now()).toEqual(instant.value);
  });
});

describe('systemClock', () => {
  it('is the one explicit, named adapter to the real wall clock, called only when a caller asks for it', () => {
    const before = Date.now();
    const observed = systemClock.now();
    const after = Date.now();
    expect(observed.epochMillis).toBeGreaterThanOrEqual(before);
    expect(observed.epochMillis).toBeLessThanOrEqual(after);
  });
});
