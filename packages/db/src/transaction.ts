// Single-client transaction capability (SEL-06 / SCC-08).
//
// Every transaction uses ONE checked-out PoolClient from BEGIN through
// COMMIT/ROLLBACK. `pool.query(...)` is never used inside a transaction —
// that would borrow a different client from the pool and break atomicity
// (node-postgres docs: https://node-postgres.com/features/transactions).

import type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

export type TransactionClient = PoolClient;

/**
 * Runs `fn` inside a single-client transaction on `pool`.
 * The client is always released, even when `fn` throws.
 */
export async function withTransaction<T>(pool: Pool, fn: (client: TransactionClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const value = await fn(client);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Prefer the original error; rollback failure is secondary.
    }
    throw error;
  } finally {
    client.release();
  }
}

/** Convenience typed query helper that must be called on a TransactionClient, never a Pool. */
export async function queryOnClient<R extends QueryResultRow = QueryResultRow>(
  client: TransactionClient,
  text: string,
  values?: readonly unknown[],
): Promise<QueryResult<R>> {
  return client.query<R>(text, values === undefined ? undefined : [...values]);
}
