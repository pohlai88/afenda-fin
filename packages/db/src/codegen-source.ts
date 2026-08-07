/**
 * Canonical source token for Kysely schema codegen (SEL-07 / SCC-10).
 *
 * Only Testcontainers-managed PostgreSQL 18 may produce committed types.
 * PGlite and PostgreSQL 17 connection helpers deliberately do not return this
 * type, so there is no code path by which a faster/alternate lane can write
 * `packages/db/src/generated/database.ts`.
 */
export interface CanonicalCodegenSource {
  readonly kind: 'testcontainers-pg18';
  readonly connectionString: string;
}

export function createCanonicalCodegenSource(connectionString: string): CanonicalCodegenSource {
  return { kind: 'testcontainers-pg18', connectionString };
}

export function assertCanonicalCodegenSource(source: CanonicalCodegenSource): void {
  if (source.kind !== 'testcontainers-pg18') {
    const kind = typeof source === 'object' && source !== null && 'kind' in source ? String(source.kind) : 'unknown';
    throw new Error(`refusing to generate Kysely types from non-canonical source kind: ${kind}`);
  }
}
