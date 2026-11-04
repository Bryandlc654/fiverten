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

ALTER TABLE review_resolutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_review_resolutions ON review_resolutions;

CREATE POLICY rls_review_resolutions ON review_resolutions
    USING (organization_id = app_current_org() OR app_is_platform_admin())
    WITH CHECK (organization_id = app_current_org() OR app_is_platform_admin());

ALTER TABLE resolution_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_resolution_messages ON resolution_messages;

CREATE POLICY rls_resolution_messages ON resolution_messages
    USING (organization_id = app_current_org() OR app_is_platform_admin())
    WITH CHECK (organization_id = app_current_org() OR app_is_platform_admin());

ALTER TABLE review_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_review_cases ON review_cases;

CREATE POLICY rls_review_cases ON review_cases
    USING (organization_id = app_current_org() OR app_is_platform_admin())
    WITH CHECK (organization_id = app_current_org() OR app_is_platform_admin());

ALTER TABLE review_case_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_review_case_messages ON review_case_messages;

CREATE POLICY rls_review_case_messages ON review_case_messages
    USING (organization_id = app_current_org() OR app_is_platform_admin())
    WITH CHECK (organization_id = app_current_org() OR app_is_platform_admin());

ALTER TABLE review_case_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_review_case_files ON review_case_files;

CREATE POLICY rls_review_case_files ON review_case_files
    USING (organization_id = app_current_org() OR app_is_platform_admin())
    WITH CHECK (organization_id = app_current_org() OR app_is_platform_admin());

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_notifications ON notifications;

CREATE POLICY rls_notifications ON notifications
    USING (organization_id = app_current_org() OR app_is_platform_admin())
    WITH CHECK (organization_id = app_current_org() OR app_is_platform_admin());

ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_review_requests ON review_requests;

CREATE POLICY rls_review_requests ON review_requests
    USING (organization_id = app_current_org() OR app_is_platform_admin())
    WITH CHECK (organization_id = app_current_org() OR app_is_platform_admin());

ALTER TABLE review_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_review_campaigns ON review_campaigns;

CREATE POLICY rls_review_campaigns ON review_campaigns
    USING (organization_id = app_current_org() OR app_is_platform_admin())
    WITH CHECK (organization_id = app_current_org() OR app_is_platform_admin());

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_support_tickets ON support_tickets;

CREATE POLICY rls_support_tickets ON support_tickets
    USING (organization_id = app_current_org() OR app_is_platform_admin())
    WITH CHECK (organization_id = app_current_org() OR app_is_platform_admin());

ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_support_ticket_messages ON support_ticket_messages;

CREATE POLICY rls_support_ticket_messages ON support_ticket_messages
    USING (organization_id = app_current_org() OR app_is_platform_admin())
    WITH CHECK (organization_id = app_current_org() OR app_is_platform_admin());

ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_media_files_select ON media_files;

CREATE POLICY rls_media_files_select ON media_files FOR SELECT USING (true);

DROP POLICY IF EXISTS rls_media_files_write ON media_files;

CREATE POLICY rls_media_files_write ON media_files
  USING (
    (organization_id IS NOT NULL AND organization_id = app_current_org())
    OR (user_id IS NOT NULL AND user_id = app_current_user())
    OR app_is_platform_admin()
  )
  WITH CHECK (
    (organization_id IS NOT NULL AND organization_id = app_current_org())
    OR (user_id IS NOT NULL AND user_id = app_current_user())
    OR app_is_platform_admin()
  );

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

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_subscriptions ON subscriptions;

CREATE POLICY rls_subscriptions ON subscriptions
    USING (organization_id = app_current_org() OR app_is_platform_admin())
    WITH CHECK (organization_id = app_current_org() OR app_is_platform_admin());

ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_subscription_events ON subscription_events;

CREATE POLICY rls_subscription_events ON subscription_events
    USING (organization_id = app_current_org() OR app_is_platform_admin())
    WITH CHECK (organization_id = app_current_org() OR app_is_platform_admin());

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_payments ON payments;

CREATE POLICY rls_payments ON payments
    USING (organization_id = app_current_org() OR app_is_platform_admin())
    WITH CHECK (organization_id = app_current_org() OR app_is_platform_admin());

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_platform_settings ON platform_settings;

CREATE POLICY rls_platform_settings ON platform_settings
    USING (app_is_platform_admin())
    WITH CHECK (app_is_platform_admin());

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_email_templates ON email_templates;

CREATE POLICY rls_email_templates ON email_templates
    USING (app_is_platform_admin())
    WITH CHECK (app_is_platform_admin());

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_permissions ON permissions;

CREATE POLICY rls_permissions ON permissions
    USING (app_is_platform_admin())
    WITH CHECK (app_is_platform_admin());

DROP POLICY IF EXISTS rls_permissions_select ON permissions;

CREATE POLICY rls_permissions_select ON permissions FOR SELECT USING (true);

ALTER TABLE report_reasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_report_reasons ON report_reasons;

CREATE POLICY rls_report_reasons ON report_reasons
    USING (app_is_platform_admin())
    WITH CHECK (app_is_platform_admin());

DROP POLICY IF EXISTS rls_report_reasons_select ON report_reasons;

CREATE POLICY rls_report_reasons_select ON report_reasons FOR SELECT USING (true);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_plans ON plans;

CREATE POLICY rls_plans ON plans
    USING (app_is_platform_admin())
    WITH CHECK (app_is_platform_admin());

DROP POLICY IF EXISTS rls_plans_select ON plans;

CREATE POLICY rls_plans_select ON plans FOR SELECT USING (true);

ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_sectors ON sectors;

CREATE POLICY rls_sectors ON sectors
    USING (app_is_platform_admin())
    WITH CHECK (app_is_platform_admin());

DROP POLICY IF EXISTS rls_sectors_select ON sectors;

CREATE POLICY rls_sectors_select ON sectors FOR SELECT USING (true);

ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_countries ON countries;

CREATE POLICY rls_countries ON countries
    USING (app_is_platform_admin())
    WITH CHECK (app_is_platform_admin());

DROP POLICY IF EXISTS rls_countries_select ON countries;

CREATE POLICY rls_countries_select ON countries FOR SELECT USING (true);

ALTER TABLE languages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_languages ON languages;

CREATE POLICY rls_languages ON languages
    USING (app_is_platform_admin())
    WITH CHECK (app_is_platform_admin());

DROP POLICY IF EXISTS rls_languages_select ON languages;

CREATE POLICY rls_languages_select ON languages FOR SELECT USING (true);

ALTER TABLE auth_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_auth_attempts ON auth_attempts;

CREATE POLICY rls_auth_attempts ON auth_attempts
    USING (app_is_platform_admin())
    WITH CHECK (app_is_platform_admin());

ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_review_reports ON review_reports;

CREATE POLICY rls_review_reports ON review_reports
    USING (app_is_platform_admin())
    WITH CHECK (app_is_platform_admin());

ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_moderation_actions ON moderation_actions;

CREATE POLICY rls_moderation_actions ON moderation_actions
    USING (app_is_platform_admin())
    WITH CHECK (app_is_platform_admin());

GRANT USAGE ON SCHEMA public TO fiverten_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO fiverten_app;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fiverten_app;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO fiverten_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fiverten_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO fiverten_app;

REVOKE DELETE ON auth_attempts FROM fiverten_app;
