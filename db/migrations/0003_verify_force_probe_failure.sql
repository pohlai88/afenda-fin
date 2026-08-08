-- AFENDA migration 0003: owned deliberate-failure function for verification probes.
--
-- NOT product/ERP. Lets failExactPersistenceProbe RAISE inside a transaction
-- (not rely on undefined_function). Ordinary EXECUTE: afenda_app.

CREATE OR REPLACE FUNCTION afenda_force_probe_failure()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'afenda_force_probe_failure'
    USING ERRCODE = 'P0001';
END;
$$;

ALTER FUNCTION afenda_force_probe_failure() OWNER TO afenda_migrator;
GRANT EXECUTE ON FUNCTION afenda_force_probe_failure() TO afenda_app;
