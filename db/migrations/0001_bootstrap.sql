-- AFENDA migration 0001: role topology + migration history bootstrap.
--
-- Bootstrap identity (explicit): this file MUST be applied by a connection that
-- is NOT `afenda_migrator` and NOT `afenda_app`, because those roles are created
-- here. Legitimate bootstrap identities:
--   - local/CI Testcontainers & docker-compose: the image superuser `postgres`
--   - managed hosts (e.g. Neon): the provisioned owner/admin role
-- This is the only place in AFENDA where such a credential legitimately appears.
--
-- After 0001, ordinary DDL runs as `afenda_migrator` and application DML as
-- `afenda_app`. No throwaway probe table: forward-only history cannot delete it.

-- Role topology ---------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'afenda_migrator') THEN
    CREATE ROLE afenda_migrator LOGIN PASSWORD 'afenda_migrator_dev_only';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'afenda_app') THEN
    CREATE ROLE afenda_app LOGIN PASSWORD 'afenda_app_dev_only';
  END IF;
END
$$;

ALTER ROLE afenda_migrator SET lock_timeout = '5s';
ALTER ROLE afenda_migrator SET statement_timeout = '60s';
ALTER ROLE afenda_app SET lock_timeout = '5s';
ALTER ROLE afenda_app SET statement_timeout = '30s';

DO $$
DECLARE
  dbname text := current_database();
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO afenda_migrator', dbname);
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO afenda_app', dbname);
END
$$;

GRANT USAGE, CREATE ON SCHEMA public TO afenda_migrator;
GRANT USAGE ON SCHEMA public TO afenda_app;

-- Migration history table -----------------------------------------------------
CREATE TABLE IF NOT EXISTS afenda_migration_history (
  version     integer PRIMARY KEY,
  name        text NOT NULL,
  checksum    text NOT NULL,
  applied_at  timestamptz NOT NULL DEFAULT clock_timestamp(),
  applied_by  text NOT NULL
);

ALTER TABLE afenda_migration_history OWNER TO afenda_migrator;
GRANT SELECT ON TABLE afenda_migration_history TO afenda_app;

-- Recorder function ($$-quoted body; proves runner handles function shapes) ---
CREATE OR REPLACE FUNCTION afenda_record_migration(
  p_version integer,
  p_name text,
  p_checksum text,
  p_applied_by text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO afenda_migration_history (version, name, checksum, applied_by)
  VALUES (p_version, p_name, p_checksum, p_applied_by);
END;
$$;

ALTER FUNCTION afenda_record_migration(integer, text, text, text) OWNER TO afenda_migrator;
GRANT EXECUTE ON FUNCTION afenda_record_migration(integer, text, text, text) TO afenda_migrator;
