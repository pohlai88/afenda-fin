// EXPECT_ERROR: minorUnits
import type { MoneyWire } from '@afenda/contracts';
const bad: MoneyWire = { currency: 'MYR' };
export { bad };
