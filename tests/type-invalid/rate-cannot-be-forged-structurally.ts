// EXPECT_ERROR: not assignable to type 'Rate'
//
// Rate is a branded object type. A plain `{ numerator, denominator }` literal
// is structurally similar but lacks the brand, so it cannot be assigned to
// `Rate` — only `toRate` can produce one. This seals the path that previously
// allowed a negative/zero denominator into `roundExactRateToMinorUnits`.

import type { Rate } from '@afenda/money';

const bad: Rate = { numerator: 5n, denominator: -2n };

export { bad };
