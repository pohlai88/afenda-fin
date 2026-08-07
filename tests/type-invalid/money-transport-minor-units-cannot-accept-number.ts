// EXPECT_ERROR: not assignable to type 'string'
import type { MoneyWire } from '@afenda/contracts';
const bad: MoneyWire = { currency: 'MYR', minorUnits: 5 };
export { bad };
