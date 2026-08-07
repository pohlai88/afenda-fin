// Canonical pg.Pool construction (SEL-06). Application pools connect as
// `afenda_app` (created by db/migrations/0001_bootstrap.sql). Bootstrap /
// migration connections use a separate factory and must never share this pool.

import pg from 'pg';
import type { Pool, PoolConfig } from 'pg';
import { configureExactTypeParsers } from './type-parsers.ts';

export interface AppPoolConfig {
  readonly host: string;
  readonly port: number;
  readonly database: string;
  readonly user: string;
  readonly password: string;
  readonly max?: number;
  readonly applicationName?: string;
}

/**
 * Creates the one sanctioned application Pool. Exact type parsers are installed
 * before the pool is constructed so every checkout inherits them.
 */
export function createAppPool(config: AppPoolConfig): Pool {
  configureExactTypeParsers();
  const poolConfig: PoolConfig = {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    max: config.max ?? 10,
    application_name: config.applicationName ?? 'afenda-app',
  };
  return new pg.Pool(poolConfig);
}

/**
 * Creates a bootstrap/migration Pool (superuser-ish or migrator role).
 * Same type-parser discipline; separate identity from `createAppPool`.
 */
export function createBootstrapPool(config: AppPoolConfig): Pool {
  configureExactTypeParsers();
  const poolConfig: PoolConfig = {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    max: config.max ?? 2,
    application_name: config.applicationName ?? 'afenda-bootstrap',
  };
  return new pg.Pool(poolConfig);
}
