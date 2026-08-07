// EXPECT_ERROR: not assignable to type 'MinorUnits'
//
// MinorUnits is a branded bigint (`bigint & { brand }`) — a plain JavaScript
// number literal is not a bigint at all, so it can never satisfy the brand,
// even structurally. Only `toMinorUnits`/`parseMinorUnits` can produce a real
// `MinorUnits` value.

import type { MinorUnits } from '@afenda/money';

const bad: MinorUnits = 5;

export { bad };
