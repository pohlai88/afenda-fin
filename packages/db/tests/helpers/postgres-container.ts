import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { createCanonicalCodegenSource, type CanonicalCodegenSource } from '../../src/codegen-source.ts';
import { POSTGRES_IMAGE_PINS } from '../../src/postgres-pins.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '../../../..');
export const MIGRATIONS_DIR = path.join(REPO_ROOT, 'db', 'migrations');

/** Digest-pinned PostgreSQL 18 image (primary major — sole Kysely codegen source). */
export const POSTGRES_18_IMAGE = POSTGRES_IMAGE_PINS[18].imageRef;

/** Digest-pinned PostgreSQL 17 image (compatibility floor). Never a codegen source. */
export const POSTGRES_17_IMAGE = POSTGRES_IMAGE_PINS[17].imageRef;

export const BOOTSTRAP_USER = 'postgres';
export const BOOTSTRAP_PASSWORD = 'postgres';
export const APP_USER = 'afenda_app';
export const APP_PASSWORD = 'afenda_app_dev_only';
export const MIGRATOR_USER = 'afenda_migrator';
export const MIGRATOR_PASSWORD = 'afenda_migrator_dev_only';

export type PostgresMajor = 17 | 18;

export async function startPostgres(major: PostgresMajor): Promise<StartedPostgreSqlContainer> {
  return new PostgreSqlContainer(POSTGRES_IMAGE_PINS[major].imageRef)
    .withUsername(BOOTSTRAP_USER)
    .withPassword(BOOTSTRAP_PASSWORD)
    .withDatabase('afenda')
    .start();
}

export function startPostgres18(): Promise<StartedPostgreSqlContainer> {
  return startPostgres(18);
}

export function startPostgres17(): Promise<StartedPostgreSqlContainer> {
  return startPostgres(17);
}

export function containerConnection(container: StartedPostgreSqlContainer): {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
} {
  return {
    host: container.getHost(),
    port: container.getPort(),
    database: container.getDatabase(),
    user: container.getUsername(),
    password: container.getPassword(),
  };
}

/**
 * Only PostgreSQL 18 Testcontainers connections can mint a CanonicalCodegenSource.
 * Calling this for PG17 is a type/runtime error by design.
 */
export function codegenSourceFromPostgres18(container: StartedPostgreSqlContainer): CanonicalCodegenSource {
  const conn = containerConnection(container);
  const connectionString = `postgres://${encodeURIComponent(conn.user)}:${encodeURIComponent(conn.password)}@${conn.host}:${String(conn.port)}/${conn.database}`;
  return createCanonicalCodegenSource(connectionString);
}
