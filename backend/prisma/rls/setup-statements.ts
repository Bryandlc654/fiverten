// ============================================================================
// FIVERTEN - Configuracion de Row-Level Security para la base de datos del
// backend (subconjunto identidad / tenancy / autenticacion).
//
// La app se conecta con un rol NO propietario (`fiverten_app`) y fija por
// transaccion:
//   app.current_user       -> uuid del usuario
//   app.current_org        -> uuid de la organizacion
//   app.is_platform_admin  -> 'true' para tareas de plataforma
//
// Estas sentencias son idempotentes y se ejecutan con un rol propietario
// (por ejemplo `postgres`) mediante `npm run db:rls`.
// ============================================================================

export const APP_ROLE = 'fiverten_app';
// En produccion define APP_DB_PASSWORD (y reflejalo en APP_DATABASE_URL).
export const APP_ROLE_PASSWORD = process.env.APP_DB_PASSWORD ?? 'fiverten_app';

// Sentencias que requieren privilegios de propietario. El rol de aplicacion se
// crea aparte (ver apply.ts) porque CREATE ROLE no admite IF NOT EXISTS.
export const rlsStatements: string[] = [
  `CREATE OR REPLACE FUNCTION app_current_org() RETURNS uuid AS $$
     SELECT NULLIF(current_setting('app.current_org', true), '')::uuid;
   $$ LANGUAGE sql STABLE`,

  `CREATE OR REPLACE FUNCTION app_current_user() RETURNS uuid AS $$
     SELECT NULLIF(current_setting('app.current_user', true), '')::uuid;
   $$ LANGUAGE sql STABLE`,

  `CREATE OR REPLACE FUNCTION app_is_platform_admin() RETURNS boolean AS $$
     SELECT COALESCE(NULLIF(current_setting('app.is_platform_admin', true), ''), 'false')::boolean;
   $$ LANGUAGE sql STABLE`,

  // Aislamiento por organizacion (organizations usa su propio id).
  `ALTER TABLE organizations ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS rls_organizations ON organizations`,
  `CREATE POLICY rls_organizations ON organizations
     USING (id = app_current_org() OR app_is_platform_admin())
     WITH CHECK (id = app_current_org() OR app_is_platform_admin())`,

  // Membresias: visibles para su organizacion o para el propio usuario.
  `ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS rls_organization_memberships ON organization_memberships`,
  `CREATE POLICY rls_organization_memberships ON organization_memberships
     USING (organization_id = app_current_org() OR user_id = app_current_user() OR app_is_platform_admin())
     WITH CHECK (organization_id = app_current_org() OR user_id = app_current_user() OR app_is_platform_admin())`,

  // Roles: de organizacion (organization_id) o globales (organization_id NULL).
  // Un usuario ve los roles de su organizacion (contexto) o de cualquier
  // organizacion de la que sea miembro.
  `ALTER TABLE roles ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS rls_roles ON roles`,
  `CREATE POLICY rls_roles ON roles
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
     )`,

  // Permisos de rol: accesibles si el rol es visible para el contexto actual.
  `ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS rls_role_permissions ON role_permissions`,
  `CREATE POLICY rls_role_permissions ON role_permissions
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
     )`,

  `ALTER TABLE sessions ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS rls_sessions ON sessions`,
  `CREATE POLICY rls_sessions ON sessions
     USING (user_id = app_current_user() OR app_is_platform_admin())
     WITH CHECK (user_id = app_current_user() OR app_is_platform_admin())`,

  `ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS rls_refresh_tokens ON refresh_tokens`,
  `CREATE POLICY rls_refresh_tokens ON refresh_tokens
     USING (user_id = app_current_user() OR app_is_platform_admin())
     WITH CHECK (user_id = app_current_user() OR app_is_platform_admin())`,

  `GRANT USAGE ON SCHEMA public TO fiverten_app`,
  `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO fiverten_app`,
  `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fiverten_app`,
  `GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO fiverten_app`,
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO fiverten_app`,
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO fiverten_app`,

  // La tabla de auditoría de intentos de autenticación es de sólo-anexado:
  // el rol de aplicación no debe poder borrar su historial.
  `REVOKE DELETE ON auth_attempts FROM fiverten_app`,
];

export function renderSql(): string {
  return ['-- FIVERTEN RLS setup (rol fiverten_app)', '', ...rlsStatements.map((s) => `${s};`)].join(
    '\n\n',
  );
}
