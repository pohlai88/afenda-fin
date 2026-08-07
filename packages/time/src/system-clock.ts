// The ONE sanctioned ambient-clock call site in @afenda/time.
//
// scripts/check-architecture.ts's no-ambient-clock rule (SCC-24 subset;
// Forbidden #13) forbids `Date.now()`/zero-argument `new Date()` everywhere in
// packages/*/src EXCEPT this exact file, which is allow-listed by path. Nothing
// in this package (or any other) calls `systemClock` implicitly: a caller must
// explicitly import and pass it, exactly like any other `Clock` implementation.
// This is the "explicit named adapter/capability, never called implicitly"
// pattern the phase brief requires.

import { instantFromEpochMillis } from './instant.ts';
import type { Clock } from './clock.ts';
import type { Instant } from './instant.ts';

/** The real wall-clock `Clock`. Must be passed explicitly by a caller; never imported ambiently by domain code. */
export const systemClock: Clock = {
  now(): Instant {
    const result = instantFromEpochMillis(Date.now());
    if (!result.ok) {
      // Date.now() is by construction always a safe integer inside the
      // 0000-9999 year range for the foreseeable operating lifetime of this
      // system; a failure here is a programmer/environment fault, not a
      // domain outcome, so it throws rather than returning a Result.
      throw new Error(`systemClock: Date.now() produced an invalid Instant: ${result.error.message}`);
    }
    return result.value;
  },
};
