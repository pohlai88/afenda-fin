/**
 * Structural SCC-19 helper: concurrency-sensitive tests MUST import this
 * module. It only resolves usefully when `AFENDA_DB_LANE=testcontainers` is
 * set (the Testcontainers integration lane). Under PGlite / unit lanes the
 * import throws at call time — a filename convention cannot silently defeat it.
 */

export type DbLane = 'testcontainers' | 'pglite' | 'unit';

export function currentDbLane(): DbLane {
  const raw = process.env['AFENDA_DB_LANE'];
  if (raw === 'testcontainers' || raw === 'pglite' || raw === 'unit') return raw;
  return 'unit';
}

/**
 * Call at the top of any concurrency-sensitive test body.
 * Throws unless the process is the Testcontainers lane.
 */
export function requireTestcontainersLane(): void {
  const lane = currentDbLane();
  if (lane !== 'testcontainers') {
    throw new Error(
      `concurrency-sensitive test requires AFENDA_DB_LANE=testcontainers; current lane is ${lane}`,
    );
  }
}
