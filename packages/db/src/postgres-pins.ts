/**
 * Single source of truth for digest-pinned PostgreSQL images (SEL-05 / SCC-07).
 *
 * A digest alone is opaque — without an expected major and a mechanical check
 * that the pulled image's PG_MAJOR/server_version matches, dual-major evidence
 * could silently qualify the same major twice. Comments document intent;
 * `scripts/check-postgres-image-pins.ts` asserts (1) compose matches this
 * registry and (2) pulled images match declared majors; dual-major tests assert
 * live server_version_num.
 *
 * Dual-major disagreement policy (stated before adding PG17, not under a red
 * lane): if PostgreSQL 17 and 18 produce different results for the same
 * corpus, that is a **build failure** requiring investigation. Raising the
 * compatibility floor is an explicit STACK.md / STACK_ADOPTION decision — never
 * a silent runner fallback.
 */

export interface PostgresImagePin {
  readonly major: 17 | 18;
  /** docker-compose service name that must reference this pin. */
  readonly composeService: string;
  /** Full image reference including digest. */
  readonly imageRef: string;
  /** Human label for the tag the digest was resolved from (documentation). */
  readonly resolvedFromTag: string;
  /** ISO date the digest was resolved. */
  readonly resolvedAt: string;
  /** Host port for local docker-compose (avoids colliding with a local Postgres on 5432). */
  readonly composeHostPort: number;
  /** Container-internal Postgres port. */
  readonly containerPort: 5432;
}

export const POSTGRES_IMAGE_PINS = {
  18: {
    major: 18,
    composeService: 'postgres18',
    imageRef: 'postgres@sha256:a02db8cac496f15b094798a38254f14d6e00741f709360e5e00bb6668ea31636',
    resolvedFromTag: 'postgres:18 (Debian, PG_VERSION 18.4-1.pgdg13+1)',
    resolvedAt: '2026-08-08',
    composeHostPort: 55432,
    containerPort: 5432,
  },
  17: {
    major: 17,
    composeService: 'postgres17',
    imageRef: 'postgres@sha256:7958605b474b3d264a969cb3a123d6aa00ad1e1fe9da8a69984dabb704d93317',
    resolvedFromTag: 'postgres:17 (Debian, PG_VERSION 17.10-1.pgdg13+1)',
    resolvedAt: '2026-08-08',
    composeHostPort: 55433,
    containerPort: 5432,
  },
} as const satisfies Record<17 | 18, PostgresImagePin>;
