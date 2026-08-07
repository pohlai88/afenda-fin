// EXPECT_ERROR: currency
import type { MoneyWire } from '@afenda/contracts';
const bad: MoneyWire = { minorUnits: '100' };
export { bad };
