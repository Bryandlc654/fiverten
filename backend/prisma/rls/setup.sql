-- ============================================================================
-- FIVERTEN - Row-Level Security (base de datos del backend)
-- GENERADO desde backend/prisma/rls/setup-statements.ts (npm run db:rls:sql).
-- No editar a mano. Ejecutar como rol propietario:  npm run db:rls
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

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_roles ON roles;

CREATE POLICY rls_roles ON roles
  USING (
    organization_id IS NULL
    OR organization_id = app_current_org()
    OR app_is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM organization_memberships m
      WHERE m.organization_id = roles.organization_id
        AND m.user_id = app_current_user()
        AND m.is_active
    )
  )
  WITH CHECK (
    organization_id IS NULL
    OR organization_id = app_current_org()
    OR app_is_platform_admin()
  );

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_role_permissions ON role_permissions;

CREATE POLICY rls_role_permissions ON role_permissions
  USING (
    app_is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM roles r
      WHERE r.id = role_permissions.role_id
        AND (
          r.organization_id IS NULL
          OR r.organization_id = app_current_org()
          OR EXISTS (
            SELECT 1 FROM organization_memberships m
            WHERE m.organization_id = r.organization_id
              AND m.user_id = app_current_user()
              AND m.is_active
          )
        )
    )
  )
  WITH CHECK (
    app_is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM roles r
      WHERE r.id = role_permissions.role_id
        AND (r.organization_id IS NULL OR r.organization_id = app_current_org())
    )
  );

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_users ON users;

DROP POLICY IF EXISTS rls_users_select ON users;

CREATE POLICY rls_users_select ON users FOR SELECT
  USING (
    id = app_current_user()
    OR app_is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM organization_memberships m
      WHERE m.user_id = users.id
        AND m.organization_id = app_current_org()
    )
  );

CREATE POLICY rls_users ON users
  USING (id = app_current_user() OR app_is_platform_admin())
  WITH CHECK (id = app_current_user() OR app_is_platform_admin());

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

ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_email_verifications ON email_verifications;

CREATE POLICY rls_email_verifications ON email_verifications
    USING (user_id = app_current_user() OR app_is_platform_admin())
    WITH CHECK (user_id = app_current_user() OR app_is_platform_admin());

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_password_reset_tokens ON password_reset_tokens;

CREATE POLICY rls_password_reset_tokens ON password_reset_tokens
    USING (user_id = app_current_user() OR app_is_platform_admin())
    WITH CHECK (user_id = app_current_user() OR app_is_platform_admin());

ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_organization_invitations ON organization_invitations;

CREATE POLICY rls_organization_invitations ON organization_invitations
    USING (organization_id = app_current_org() OR app_is_platform_admin())
    WITH CHECK (organization_id = app_current_org() OR app_is_platform_admin());

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_reviews ON reviews;

CREATE POLICY rls_reviews ON reviews
    USING (organization_id = app_current_org() OR app_is_platform_admin())
    WITH CHECK (organization_id = app_current_org() OR app_is_platform_admin());

DROP POLICY IF EXISTS rls_reviews_public ON reviews;

CREATE POLICY rls_reviews_public ON reviews FOR SELECT
  USING (lifecycle_status = 'published' AND visibility = 'public' AND deleted_at IS NULL);

ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_review_responses ON review_responses;

CREATE POLICY rls_review_responses ON review_responses
    USING (organization_id = app_current_org() OR app_is_platform_admin())
    WITH CHECK (organization_id = app_current_org() OR app_is_platform_admin());

DROP POLICY IF EXISTS rls_review_responses_public ON review_responses;

CREATE POLICY rls_review_responses_public ON review_responses FOR SELECT
  USING (
    is_public AND EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.id = review_responses.review_id
        AND r.lifecycle_status = 'published'
        AND r.visibility = 'public'
        AND r.deleted_at IS NULL
    )
  );

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_permissions_select ON permissions;

DROP POLICY IF EXISTS rls_permissions ON permissions;

CREATE POLICY rls_permissions_select ON permissions FOR SELECT USING (true);

CREATE POLICY rls_permissions ON permissions
  USING (app_is_platform_admin())
  WITH CHECK (app_is_platform_admin());

ALTER TABLE auth_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_auth_attempts ON auth_attempts;

CREATE POLICY rls_auth_attempts ON auth_attempts
  USING (app_is_platform_admin())
  WITH CHECK (app_is_platform_admin());

GRANT USAGE ON SCHEMA public TO fiverten_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO fiverten_app;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fiverten_app;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO fiverten_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fiverten_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO fiverten_app;

REVOKE DELETE ON auth_attempts FROM fiverten_app;
