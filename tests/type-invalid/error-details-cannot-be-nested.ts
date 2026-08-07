// EXPECT_ERROR: not assignable to type 'PublicErrorDetailValue'
//
// PublicErrorDetails is flat scalars only (string | number | boolean | null).
// Nested objects are outside the aliasing contract — shallow copy is sufficient
// because nesting is not representable without type forgery. See
// packages/errors/README.md.

import type { PublicErrorDetails } from '@afenda/errors';

const bad: PublicErrorDetails = { nested: { x: 1 } };

export { bad };
