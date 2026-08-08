-- AFENDA migration 0002: verification-only exact-value probe table.
--
-- NOT product/ERP/ledger schema. Exists solely so HTTP→contracts→db→PostgreSQL
-- composition tests can prove Money/Instant/CivilDate survive bigint/timestamptz/date
-- exactly. Ordinary DML: afenda_app. DDL owner: afenda_migrator.

CREATE TABLE afenda_verify_exact_probe (
  id           bigserial PRIMARY KEY,
  kind         text NOT NULL CHECK (kind IN ('money', 'instant', 'civil_date')),
  currency     text,
  minor_units  bigint,
  instant_ts   timestamptz,
  civil_date   date,
  created_at   timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT afenda_verify_exact_probe_money_shape CHECK (
    (kind <> 'money') OR (currency IS NOT NULL AND minor_units IS NOT NULL)
  ),
  CONSTRAINT afenda_verify_exact_probe_instant_shape CHECK (
    (kind <> 'instant') OR (instant_ts IS NOT NULL)
  ),
  CONSTRAINT afenda_verify_exact_probe_civil_date_shape CHECK (
    (kind <> 'civil_date') OR (civil_date IS NOT NULL)
  )
);

ALTER TABLE afenda_verify_exact_probe OWNER TO afenda_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE afenda_verify_exact_probe TO afenda_app;
GRANT USAGE, SELECT ON SEQUENCE afenda_verify_exact_probe_id_seq TO afenda_app;
