// Clock: the explicit capability authoritative domain functions must receive to
// learn the current instant. There is no package-owned ambient system clock —
// see ./system-clock.ts for the one sanctioned adapter, which callers must pass
// explicitly and which this module never reaches for on its own (Forbidden #13;
// SEL-25's "no ambient mutable global state").

import type { Instant } from './instant.ts';

/** An explicit capability for obtaining the current instant. Never implicit, never ambient. */
export interface Clock {
  now(): Instant;
}

/**
 * A deterministic test/fixture `Clock` that always returns the same, explicitly
 * supplied instant. Pure and stateless — safe to use in property tests without
 * introducing hidden shared mutable state between test cases.
 */
export function fixedClock(instant: Instant): Clock {
  return {
    now(): Instant {
      return instant;
    },
  };
}
