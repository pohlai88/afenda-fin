// EXPECT_ERROR: currency
//
// Money's `currency` field is required, not optional — an object literal that
// supplies only `minorUnits` can never satisfy the `Money` interface. Doctrine
// MON-03: "no implicit currency".

import type { Money, MinorUnits } from '@afenda/money';

declare const minorUnits: MinorUnits;
const bad: Money = { minorUnits };

export { bad };
