// EXPECT_ERROR: knowledgeAsOf
//
// AsOf requires both boundaries; an object literal supplying only
// `businessAsOf` can never satisfy the `AsOf` interface. Doctrine TIM-04.

import type { AsOf, Instant } from '@afenda/time';

declare const businessAsOf: Instant;
const bad: AsOf = { businessAsOf };

export { bad };
