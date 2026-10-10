-- ============================================================================
-- FIVERTEN - Row-Level Security (base de datos del backend)
-- Espejo operativo de backend/prisma/rls/setup-statements.ts.
-- Ejecutar como rol propietario:  npm run db:rls
-- ============================================================================

CREATE OR REPLACE FUNCTION app_current_org() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_org', true), '')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_current_user() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_user', true), '')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_is_platform_admin() RETURNS boolean AS $$
  SELECT COALESCE(NULLIF(current_setting('app.is_platform_admin', true), ''), 'false')::boolean;
$$ LANGUAGE sql STABLE;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_organizations ON organizations;
CREATE POLICY rls_organizations ON organizations
  USING (id = app_current_org() OR app_is_platform_admin())
  WITH CHECK (id = app_current_org() OR app_is_platform_admin());

ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_organization_memberships ON organization_memberships;
CREATE POLICY rls_organization_memberships ON organization_memberships
  USING (organization_id = app_current_org() OR user_id = app_current_user() OR app_is_platform_admin())
  WITH CHECK (organization_id = app_current_org() OR user_id = app_current_user() OR app_is_platform_admin());

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_sessions ON sessions;
CREATE POLICY rls_sessions ON sessions
  USING (user_id = app_current_user() OR app_is_platform_admin())
  WITH CHECK (user_id = app_current_user() OR app_is_platform_admin());

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_refresh_tokens ON refresh_tokens;
CREATE POLICY rls_refresh_tokens ON refresh_tokens
  USING (user_id = app_current_user() OR app_is_platform_admin())
  WITH CHECK (user_id = app_current_user() OR app_is_platform_admin());

-- Rol de aplicacion (no propietario, sin BYPASSRLS):
--   CREATE ROLE fiverten_app LOGIN PASSWORD 'fiverten_app'
--     NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
GRANT USAGE ON SCHEMA public TO fiverten_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO fiverten_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fiverten_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO fiverten_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fiverten_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO fiverten_app;
-- GRANT CONNECT ON DATABASE "<nombre>" TO fiverten_app;
