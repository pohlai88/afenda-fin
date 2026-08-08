// Verification-only exact-value persistence probe (NOT product/ERP).
// Owns PostgreSQL round-trips for wire-shaped strings via withTransaction.
// Domain Money/Instant/CivilDate conversion stays at the contracts boundary.

import type { Pool } from 'pg';
import { err, ok, type Result } from '@afenda/errors';
import { queryOnClient, withTransaction } from './transaction.ts';

export type ExactPersistenceProbeErrorCode = 'PERSISTENCE_PROBE_FAILED';

export interface MoneyProbeWire {
  readonly currency: string;
  readonly minorUnits: string;
}

function mapProbeFailure(_error: unknown): Result<never, ExactPersistenceProbeErrorCode> {
  void _error;
  // Never surface SQL, host, stack, or driver internals via Result.message.
  return err('PERSISTENCE_PROBE_FAILED', 'exact persistence probe failed');
}

/**
 * Inserts Money wire fields as (text, bigint), reads them back via owned parsers,
 * deletes the row, and commits — all on one checked-out client.
 */
export async function roundTripMoneyExact(
  pool: Pool,
  wire: MoneyProbeWire,
): Promise<Result<MoneyProbeWire, ExactPersistenceProbeErrorCode>> {
  try {
    const result = await withTransaction(pool, async (client) => {
      const inserted = await queryOnClient<{ id: string; currency: string; minor_units: string }>(
        client,
        `INSERT INTO afenda_verify_exact_probe (kind, currency, minor_units)
         VALUES ('money', $1, $2::bigint)
         RETURNING id, currency, minor_units`,
        [wire.currency, wire.minorUnits],
      );
      const row = inserted.rows[0];
      if (row === undefined) {
        throw new Error('money probe returned no row');
      }
      if (typeof row.minor_units !== 'string') {
        throw new Error('money probe lost int8 string exactness');
      }
      await queryOnClient(client, `DELETE FROM afenda_verify_exact_probe WHERE id = $1`, [row.id]);
      return { currency: row.currency, minorUnits: row.minor_units };
    });
    return ok(result);
  } catch (error: unknown) {
    return mapProbeFailure(error);
  }
}

/**
 * Instant wire string ↔ timestamptz ↔ canonical UTC string on one client.
 * Optional sessionTimeZone proves session TZ cannot change the UTC instant identity.
 */
export async function roundTripInstantExact(
  pool: Pool,
  instant: string,
  sessionTimeZone?: string,
): Promise<Result<{ instant: string }, ExactPersistenceProbeErrorCode>> {
  try {
    const result = await withTransaction(pool, async (client) => {
      if (sessionTimeZone !== undefined) {
        await queryOnClient(client, `SET LOCAL TIME ZONE '${sessionTimeZone.replaceAll("'", "''")}'`);
      }
      const inserted = await queryOnClient<{ id: string }>(
        client,
        `INSERT INTO afenda_verify_exact_probe (kind, instant_ts)
         VALUES ('instant', $1::timestamptz)
         RETURNING id`,
        [instant],
      );
      const id = inserted.rows[0]?.id;
      if (id === undefined) {
        throw new Error('instant probe returned no row');
      }
      const canonical = await queryOnClient<{ c: string }>(
        client,
        `SELECT to_char(instant_ts AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS c
         FROM afenda_verify_exact_probe WHERE id = $1`,
        [id],
      );
      const c = canonical.rows[0]?.c;
      if (c === undefined) {
        throw new Error('instant probe canonicalization failed');
      }
      await queryOnClient(client, `DELETE FROM afenda_verify_exact_probe WHERE id = $1`, [id]);
      return { instant: c };
    });
    return ok(result);
  } catch (error: unknown) {
    return mapProbeFailure(error);
  }
}

/** CivilDate wire string ↔ date ↔ YYYY-MM-DD string on one client. */
export async function roundTripCivilDateExact(
  pool: Pool,
  civilDate: string,
): Promise<Result<{ civilDate: string }, ExactPersistenceProbeErrorCode>> {
  try {
    const result = await withTransaction(pool, async (client) => {
      const inserted = await queryOnClient<{ id: string; civil_date: string }>(
        client,
        `INSERT INTO afenda_verify_exact_probe (kind, civil_date)
         VALUES ('civil_date', $1::date)
         RETURNING id, civil_date`,
        [civilDate],
      );
      const row = inserted.rows[0];
      if (row === undefined) {
        throw new Error('civil_date probe returned no row');
      }
      const asText =
        typeof row.civil_date === 'string'
          ? row.civil_date.slice(0, 10)
          : String(row.civil_date).slice(0, 10);
      await queryOnClient(client, `DELETE FROM afenda_verify_exact_probe WHERE id = $1`, [row.id]);
      return { civilDate: asText };
    });
    return ok(result);
  } catch (error: unknown) {
    return mapProbeFailure(error);
  }
}

/**
 * Inserts a money marker row then fails inside the same transaction so callers
 * can prove ROLLBACK + client release + public-safe Result mapping.
 */
export async function failExactPersistenceProbe(
  pool: Pool,
): Promise<Result<never, ExactPersistenceProbeErrorCode>> {
  try {
    await withTransaction(pool, async (client) => {
      await queryOnClient(
        client,
        `INSERT INTO afenda_verify_exact_probe (kind, currency, minor_units)
         VALUES ('money', 'ZZZ', 1)`,
      );
      await queryOnClient(client, `SELECT afenda_force_probe_failure()`);
    });
    return err('PERSISTENCE_PROBE_FAILED', 'exact persistence probe failed');
  } catch (error: unknown) {
    return mapProbeFailure(error);
  }
}

/** Counts probe rows — used to assert rollback left no partial money row. */
export async function countExactProbeRows(
  pool: Pool,
  kind: 'money' | 'instant' | 'civil_date',
): Promise<number> {
  // SCC-08: no pool.query in packages/db/src — use the single-client path.
  return withTransaction(pool, async (client) => {
    const result = await queryOnClient<{ n: string }>(
      client,
      `SELECT count(*)::text AS n FROM afenda_verify_exact_probe WHERE kind = $1`,
      [kind],
    );
    return Number.parseInt(result.rows[0]?.n ?? '0', 10);
  });
}
