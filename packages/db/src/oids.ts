/** PostgreSQL type OIDs relevant to AFENDA exact-value parsing (SCC-09). */
export const PG_OID = {
  INT8: 20,
  NUMERIC: 1700,
  TIMESTAMP: 1114,
  TIMESTAMPTZ: 1184,
  DATE: 1082,
  /** PostgreSQL's locale-dependent fixed-point `money` type — forbidden in AFENDA. */
  MONEY: 790,
} as const;
