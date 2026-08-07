// AsOf: the pair of temporal boundaries doctrine TIM-04 requires for any
// projection that distinguishes "when it was true in the business" from "when
// the system came to know it". Both boundaries are mandatory — there is no
// constructor path that can produce an `AsOf` with only one dimension, and no
// optional field for a caller to accidentally omit.

import type { Instant } from './instant.ts';

/**
 * A dual-boundary as-of point: `businessAsOf` is the effective/business-world
 * boundary (TIM-04's "effective time"); `knowledgeAsOf` is the recorded/known
 * boundary (TIM-04's "recorded time"). Both are always present — this is the
 * type-level enforcement that "as-of" can never mean only one of them.
 */
export interface AsOf {
  readonly businessAsOf: Instant;
  readonly knowledgeAsOf: Instant;
}

/** Constructs an `AsOf`. Both boundaries are required parameters — neither may be omitted. */
export function makeAsOf(businessAsOf: Instant, knowledgeAsOf: Instant): AsOf {
  return { businessAsOf, knowledgeAsOf };
}
