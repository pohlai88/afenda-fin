// Exact database type parsing (SEL-06 / SCC-09).
//
// Empirically verified against node-postgres 8.22.0 + PostgreSQL 18 (see
// packages/db/tests/type-parser-defaults.probe.test.ts and
// governance/PHASE_3C_DB_REPORT.md): OID 20 (int8) and OID 1700 (numeric)
// already return JS strings by default. The real regression vector is therefore
// *adding* a lossy parser (e.g. parseInt / Number), not removing a safe one.
//
// This module:
//   1. Registers identity string parsers for int8/numeric/timestamp/timestamptz/date
//      so the contract is explicit and owned, not merely "right by accident".
//   2. Registers a throwing parser for OID 790 (`money`) so that type can never
//      silently enter an AFENDA process.
//   3. Leaves conversion into domain types (@afenda/money, @afenda/time) to
//      call sites that hold enough context (currency, civil vs instant, etc.).

import pg from 'pg';
import { PG_OID } from './oids.ts';

let configured = false;

function identityString(value: string): string {
  return value;
}

function rejectMoneyType(value: string): never {
  throw new Error(
    `PostgreSQL money type (OID ${PG_OID.MONEY}) is forbidden in AFENDA; received value ${JSON.stringify(value)}. Use bigint minor-units + CurrencyCode instead.`,
  );
}

/**
 * Installs AFENDA's owned pg type parsers on the process-global `pg.types` registry.
 * Idempotent. Call once before opening any Pool/Client used for authoritative work.
 */
export function configureExactTypeParsers(): void {
  if (configured) return;
  pg.types.setTypeParser(PG_OID.INT8, identityString);
  pg.types.setTypeParser(PG_OID.NUMERIC, identityString);
  pg.types.setTypeParser(PG_OID.TIMESTAMP, identityString);
  pg.types.setTypeParser(PG_OID.TIMESTAMPTZ, identityString);
  pg.types.setTypeParser(PG_OID.DATE, identityString);
  pg.types.setTypeParser(PG_OID.MONEY, rejectMoneyType);
  configured = true;
}

/** Test-only: reset the idempotency latch (does not restore prior pg.types state). */
export function resetTypeParserConfigurationForTests(): void {
  configured = false;
}
