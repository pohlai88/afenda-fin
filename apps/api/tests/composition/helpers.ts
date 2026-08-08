import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import {
  createAppPool,
  createBootstrapPool,
  migrate,
  type Pool,
  POSTGRES_IMAGE_PINS,
} from '@afenda/db';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '../../../..');
export const MIGRATIONS_DIR = path.join(REPO_ROOT, 'db', 'migrations');

export const BOOTSTRAP_USER = 'postgres';
export const BOOTSTRAP_PASSWORD = 'postgres';
export const APP_USER = 'afenda_app';
export const APP_PASSWORD = 'afenda_app_dev_only';
export const MIGRATOR_USER = 'afenda_migrator';
export const MIGRATOR_PASSWORD = 'afenda_migrator_dev_only';

export type PostgresMajor = 17 | 18;

export async function startMigratedAppPool(major: PostgresMajor): Promise<{
  container: StartedPostgreSqlContainer;
  bootstrapPool: Pool;
  appPool: Pool;
}> {
  process.env['AFENDA_DB_LANE'] = 'testcontainers';
  const container = await new PostgreSqlContainer(POSTGRES_IMAGE_PINS[major].imageRef)
    .withUsername(BOOTSTRAP_USER)
    .withPassword(BOOTSTRAP_PASSWORD)
    .withDatabase('afenda')
    .start();

  const host = container.getHost();
  const port = container.getPort();
  const database = container.getDatabase();

  const bootstrapPool = createBootstrapPool({
    host,
    port,
    database,
    user: BOOTSTRAP_USER,
    password: BOOTSTRAP_PASSWORD,
    applicationName: `afenda-composition-bootstrap-pg${String(major)}`,
  });
  const migratorPool = createBootstrapPool({
    host,
    port,
    database,
    user: MIGRATOR_USER,
    password: MIGRATOR_PASSWORD,
    applicationName: `afenda-composition-migrator-pg${String(major)}`,
  });

  const version = await bootstrapPool.query<{ n: string }>(
    `SELECT current_setting('server_version_num') AS n`,
  );
  const serverVersionNum = Number.parseInt(version.rows[0]?.n ?? '', 10);
  if (Math.floor(serverVersionNum / 10_000) !== POSTGRES_IMAGE_PINS[major].major) {
    throw new Error(`expected PG${String(major)}, got version_num ${String(serverVersionNum)}`);
  }

  const migrated = await migrate(bootstrapPool, {
    migrationsDir: MIGRATIONS_DIR,
    appliedBy: BOOTSTRAP_USER,
    migratorPool,
  });
  await migratorPool.end();
  if (!migrated.ok) {
    throw new Error(migrated.error.message);
  }

  const appPool = createAppPool({
    host,
    port,
    database,
    user: APP_USER,
    password: APP_PASSWORD,
    applicationName: `afenda-composition-app-pg${String(major)}`,
  });

  return { container, bootstrapPool, appPool };
}

export async function stopCompositionPools(opts: {
  appPool: Pool;
  bootstrapPool: Pool;
  container: StartedPostgreSqlContainer;
}): Promise<void> {
  await opts.appPool.end();
  await opts.bootstrapPool.end();
  await opts.container.stop();
}
