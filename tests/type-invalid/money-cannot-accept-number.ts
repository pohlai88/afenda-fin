// EXPECT_ERROR: not assignable to type 'Money'
//
// Money is a branded, structurally-validated object type — a bare JavaScript
// number can never satisfy it, only `moneyFromParts`/`makeMoney` can produce
// one. This is compile-time evidence for MON-01/Forbidden #4, complementing
// (not replacing) scripts/check-money-safety.ts's runtime/static SCC-03 gate.

import type { Money } from '@afenda/money';

const bad: Money = 5;

export { bad };
