import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '../../../..');
export const MIGRATIONS_DIR = path.join(REPO_ROOT, 'db', 'migrations');

/** Digest-pinned PostgreSQL 18 image (primary major). Commit 2 adds 17. */
export const POSTGRES_18_IMAGE = 'postgres@sha256:a02db8cac496f15b094798a38254f14d6e00741f709360e5e00bb6668ea31636';

export const BOOTSTRAP_USER = 'postgres';
export const BOOTSTRAP_PASSWORD = 'postgres';
export const APP_USER = 'afenda_app';
export const APP_PASSWORD = 'afenda_app_dev_only';
export const MIGRATOR_USER = 'afenda_migrator';
export const MIGRATOR_PASSWORD = 'afenda_migrator_dev_only';

export async function startPostgres18(): Promise<StartedPostgreSqlContainer> {
  return new PostgreSqlContainer(POSTGRES_18_IMAGE)
    .withUsername(BOOTSTRAP_USER)
    .withPassword(BOOTSTRAP_PASSWORD)
    .withDatabase('afenda')
    .start();
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
