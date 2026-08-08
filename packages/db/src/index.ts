export type { Pool } from 'pg';
export { PG_OID } from './oids.ts';

export { configureExactTypeParsers } from './type-parsers.ts';
export { createAppPool, createBootstrapPool, type AppPoolConfig } from './pool.ts';
export { withTransaction, queryOnClient, type TransactionClient } from './transaction.ts';
export {
  migrate,
  loadMigrationFiles,
  parseMigrationHeader,
  checksumMigrationSource,
  assertMigrationRunnerIdentity,
  type MigrationFile,
  type MigrateOptions,
  type MigrateResult,
  type MigrationErrorCode,
  type AppliedMigration,
} from './migrate.ts';
export {
  assertCanonicalCodegenSource,
  type CanonicalCodegenSource,
} from './codegen-source.ts';
export { requireTestcontainersLane, currentDbLane, type DbLane } from './testcontainers-lane.ts';
export { POSTGRES_IMAGE_PINS, type PostgresImagePin } from './postgres-pins.ts';
export { MANAGED_MIGRATION_ROLES, MIGRATOR_ROLE, APP_ROLE } from './migration-roles.ts';
export {
  roundTripMoneyExact,
  roundTripInstantExact,
  roundTripCivilDateExact,
  failExactPersistenceProbe,
  countExactProbeRows,
  hasForceProbeFailureFunction,
  type MoneyProbeWire,
  type ExactPersistenceProbeErrorCode,
} from './exact-persistence-probe.ts';
