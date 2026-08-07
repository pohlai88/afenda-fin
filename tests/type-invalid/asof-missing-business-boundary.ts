// EXPECT_ERROR: businessAsOf
//
// AsOf requires both boundaries; an object literal supplying only
// `knowledgeAsOf` can never satisfy the `AsOf` interface. Doctrine TIM-04.

import type { AsOf, Instant } from '@afenda/time';

declare const knowledgeAsOf: Instant;
const bad: AsOf = { knowledgeAsOf };

export { bad };
