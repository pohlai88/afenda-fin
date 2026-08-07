// EXPECT_ERROR: knowledgeAsOf
import type { AsOfWire } from '@afenda/contracts';
const bad: AsOfWire = { businessAsOf: '2025-01-01T00:00:00.000Z' };
export { bad };
