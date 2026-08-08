/**
 * Canonical source token for Kysely schema codegen (SEL-07 / SCC-10).
 *
 * Branded so a plain `{ kind, connectionString }` object cannot forge the
 * token. The only sanctioned mint is `codegenSourceFromPostgres18` in the
 * Testcontainers helper (used by `generate:types` / `check:types-drift`).
 * PGlite and PostgreSQL 17 helpers deliberately do not return this type.
 */

declare const canonicalCodegenBrand: unique symbol;

export type CanonicalCodegenSource = {
  readonly kind: 'testcontainers-pg18';
  readonly connectionString: string;
} & { readonly [canonicalCodegenBrand]: 'CanonicalCodegenSource' };

/**
 * Internal mint — not part of the package root public API. Call only from
 * `codegenSourceFromPostgres18` (Testcontainers PostgreSQL 18).
 */
export function createCanonicalCodegenSource(connectionString: string): CanonicalCodegenSource {
  return { kind: 'testcontainers-pg18', connectionString } as CanonicalCodegenSource;
}

export function assertCanonicalCodegenSource(source: CanonicalCodegenSource): void {
  if (source.kind !== 'testcontainers-pg18') {
    const kind = typeof source === 'object' && source !== null && 'kind' in source ? String(source.kind) : 'unknown';
    throw new Error(`refusing to generate Kysely types from non-canonical source kind: ${kind}`);
  }
}
