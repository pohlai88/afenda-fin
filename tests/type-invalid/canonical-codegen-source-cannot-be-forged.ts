// EXPECT_ERROR: not assignable to type 'CanonicalCodegenSource'
//
// CanonicalCodegenSource is branded. A plain `{ kind, connectionString }`
// object is not assignable — only `codegenSourceFromPostgres18` (via the
// internal mint) can produce one. This seals the SCC-10 claim that alternate
// lanes cannot forge the codegen token.

import type { CanonicalCodegenSource } from '@afenda/db';

const bad: CanonicalCodegenSource = {
  kind: 'testcontainers-pg18',
  connectionString: 'postgres://forged',
};

export { bad };
