// EXPECT_ERROR: businessAsOf
import type { AsOfWire } from '@afenda/contracts';
const bad: AsOfWire = { knowledgeAsOf: '2025-01-01T00:00:00.000Z' };
export { bad };
