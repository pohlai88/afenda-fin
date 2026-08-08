// EXPECT_ERROR: not assignable to type 'EpochMillis'
//
// EpochMillis is a branded safe integer attached only by toEpochMillis /
// instantFromEpochMillis. A bare JavaScript number (including floats) must not
// type-check as Instant.epochMillis — compile-time evidence for TIM-01/TIM-03
// and the Instant forge-path hardening (aligned with MinorUnits).

import type { Instant } from '@afenda/time';

const bad: Instant = { epochMillis: 1.5 };

export { bad };
