-- ============================================================================
-- MODELO DE BASE DE DATOS - FIVERTEN (REVISIÓN 2)
-- Plataforma de reputación verificable (CLAIM -> PROOF)
-- Basado en alcance.txt y documentacion.txt
-- Diseño: Escalable, Seguro, Normalizado (3NF), Multi-tenant con RLS
-- Motor: PostgreSQL 13+
-- 57 tablas
--
-- Cambios de esta revisión:
--  1. Auditoría de TODAS las claves foráneas (sección PARTE 16).
--  2. Row-Level Security (RLS) por organización.
--  3. Máquina de estados con catálogo + trigger de validación.
--  4. Credenciales/tokens: session_token_hash, mfa_secret_encrypted, auth_attempts.
--  5. Restricciones de integridad reales (rangos y coherencia de fechas).
--  6. Arquitectura: RBAC único, fuente de verdad de verificación,
--     evidence vs documents, contadores como caché, plantillas unificadas,
--     y trazabilidad CLAIM -> EVIDENCE -> DECISION -> EVENT.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- PARTE 1: ORGANIZACIONES (TENANT) Y UBICACIONES
-- ============================================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id VARCHAR(32) NOT NULL UNIQUE,          -- ID público opaco (ej. FT-8K4M2-X9P)
  legal_name VARCHAR(255),
  trade_name VARCHAR(200) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  tax_id VARCHAR(50),
  description TEXT,
  logo_url VARCHAR(500),
  website VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  sector_id UUID,
  country_id UUID,
  locale VARCHAR(10) NOT NULL DEFAULT 'es',
  billing_currency CHAR(3) NOT NULL DEFAULT 'EUR', -- moneda de facturación por organización
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- CACHÉ del estado global derivado de organization_verifications.
  -- Fuente de verdad = organization_verifications (por scope). Ver v_organization_verification_status.
  verification_status VARCHAR(20) NOT NULL DEFAULT 'not_verified',
  verification_computed_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verification_expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  allow_contact BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  deleted_by UUID,
  CONSTRAINT organizations_status_check CHECK (status IN ('pending','active','suspended','inactive')),
  CONSTRAINT organizations_verif_check CHECK (verification_status IN ('not_verified','pending','verified','expired','rejected'))
);

CREATE INDEX idx_organizations_slug ON organizations (slug);
CREATE INDEX idx_organizations_status ON organizations (status, is_active, deleted_at);
CREATE INDEX idx_organizations_verif ON organizations (verification_status);
CREATE INDEX idx_organizations_sector ON organizations (sector_id);
CREATE INDEX idx_organizations_country ON organizations (country_id);
CREATE INDEX idx_organizations_public ON organizations (is_public, deleted_at);

CREATE TABLE organization_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  label VARCHAR(100),
  address_line1 VARCHAR(255),
  city VARCHAR(120),
  province VARCHAR(120),
  postal_code VARCHAR(20),
  country_id UUID,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT organization_locations_lat_check CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  CONSTRAINT organization_locations_lng_check CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180))
);

CREATE INDEX idx_org_locations_org ON organization_locations (organization_id);

-- ============================================================================
-- PARTE 2: USUARIOS, RBAC Y MEMBRESÍAS
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(50),
  avatar_url VARCHAR(500),
  default_organization_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_fiverten_staff BOOLEAN NOT NULL DEFAULT FALSE,
  is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ,
  email_verified_at TIMESTAMPTZ,
  failed_login_count INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  blocked_at TIMESTAMPTZ,
  block_reason VARCHAR(255),
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  -- CIFRADO a nivel aplicación con clave gestionada FUERA de la BD (KMS/vault).
  -- NO es un hash: el secreto debe recuperarse para validar códigos TOTP.
  mfa_secret_encrypted VARCHAR(512),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  deleted_by UUID,
  CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT users_failed_login_check CHECK (failed_login_count >= 0)
);

CREATE INDEX idx_users_active_deleted ON users (is_active, deleted_at);
CREATE INDEX idx_users_staff ON users (is_fiverten_staff);
CREATE INDEX idx_users_created_at ON users (created_at);

-- RBAC: la AUTORIDAD es el par roles + permissions (via role_permissions).
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,                            -- NULL = rol de plataforma
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  base_role VARCHAR(20),                           -- admin|editor|viewer (rol de negocio subyacente)
  description TEXT,
  scope VARCHAR(20) NOT NULL DEFAULT 'organization',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  priority INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT roles_scope_check CHECK (scope IN ('platform','organization')),
  CONSTRAINT roles_base_role_check CHECK (base_role IS NULL OR base_role IN ('admin','editor','viewer')),
  CONSTRAINT roles_org_slug_unique UNIQUE (organization_id, slug)
);

CREATE INDEX idx_roles_org ON roles (organization_id, is_active, deleted_at);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  scope VARCHAR(50) NOT NULL DEFAULT 'organization',
  description VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT permissions_unique UNIQUE (resource, action, scope),
  CONSTRAINT permissions_action_check CHECK (action IN ('create','read','update','delete','manage','export','import','verify','moderate')),
  CONSTRAINT permissions_scope_check CHECK (scope IN ('platform','organization','own'))
);

CREATE INDEX idx_permissions_active ON permissions (is_active);

CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL,
  permission_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  CONSTRAINT role_permissions_unique UNIQUE (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions (role_id);
CREATE INDEX idx_role_permissions_perm ON role_permissions (permission_id);

-- Modelo de autorización ÚNICO: la pertenencia usa role_id. No se duplican
-- permisos en columnas JSONB que puedan contradecir al rol.
CREATE TABLE organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role_id UUID NOT NULL,
  is_owner BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  invited_by UUID,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT organization_memberships_unique UNIQUE (organization_id, user_id)
);

CREATE INDEX idx_org_memberships_org ON organization_memberships (organization_id, is_active);
CREATE INDEX idx_org_memberships_user ON organization_memberships (user_id, is_active);
CREATE INDEX idx_org_memberships_role ON organization_memberships (role_id);

-- ============================================================================
-- PARTE 3: SESIONES, TOKENS Y AUTENTICACIÓN
-- ============================================================================

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID,
  -- Se guarda el HASH del token de sesión, nunca el token recuperable.
  session_token_hash VARCHAR(255) NOT NULL UNIQUE,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  device_id VARCHAR(255),
  platform VARCHAR(100),
  country VARCHAR(50),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoke_reason VARCHAR(255),
  compromised_at TIMESTAMPTZ,                      -- reutilización de refresh token detectada
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_active ON sessions (user_id, is_active);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id UUID,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  family_id UUID,                                  -- familia para rotación y detección de reuso
  replaced_by_token_id UUID,                       -- trazabilidad de la rotación
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoke_reason VARCHAR(255),
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id, is_used, revoked_at);
CREATE INDEX idx_refresh_tokens_family ON refresh_tokens (family_id);

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prt_user_active ON password_reset_tokens (user_id, is_active);

CREATE TABLE email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ev_user_active ON email_verifications (user_id, is_active);

CREATE TABLE auth_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_providers_enabled ON auth_providers (is_enabled, is_active);

-- Registro de intentos de autenticación para rate limiting y bloqueo.
CREATE TABLE auth_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  attempt_type VARCHAR(30) NOT NULL DEFAULT 'login',
  success BOOLEAN NOT NULL DEFAULT FALSE,
  failure_reason VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT auth_attempts_type_check CHECK (attempt_type IN ('login','refresh','password_reset','email_verify','mfa','api_key'))
);

CREATE INDEX idx_auth_attempts_email ON auth_attempts (email, created_at);
CREATE INDEX idx_auth_attempts_ip ON auth_attempts (ip_address, created_at);
CREATE INDEX idx_auth_attempts_user ON auth_attempts (user_id, created_at);

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  created_by UUID,
  name VARCHAR(150) NOT NULL,
  prefix VARCHAR(20) NOT NULL UNIQUE,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID,
  revoke_reason VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_org ON api_keys (organization_id, revoked_at);

-- ============================================================================
-- PARTE 4: CONFIGURACIÓN, AUDITORÍA Y METODOLOGÍA
-- ============================================================================

CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  setting_key VARCHAR(150) NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(20) NOT NULL DEFAULT 'string',
  scope VARCHAR(20) NOT NULL DEFAULT 'organization',
  is_encrypted BOOLEAN NOT NULL DEFAULT FALSE,
  is_readonly BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  CONSTRAINT system_settings_key_unique UNIQUE (organization_id, setting_key),
  CONSTRAINT system_settings_type_check CHECK (setting_type IN ('string','bool','int','float','json','array')),
  CONSTRAINT system_settings_scope_check CHECK (scope IN ('platform','organization'))
);

CREATE INDEX idx_system_settings_scope ON system_settings (scope, is_readonly);

-- Tabla append-only. Retención y acceso restringido (ver documentación).
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  user_id UUID,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  trace_id VARCHAR(100),
  request_id VARCHAR(100),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT audit_logs_action_check CHECK (action IN ('CREATE','READ','UPDATE','DELETE','LOGIN','LOGOUT','APPROVE','REJECT','VERIFY','EXPIRE','REVOKE','MODERATE','PUBLISH','HIDE','ROTATE'))
);

CREATE INDEX idx_audit_logs_org_entity ON audit_logs (organization_id, entity_type, created_at);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs (user_id, created_at);
CREATE INDEX idx_audit_logs_created ON audit_logs (created_at);
CREATE INDEX idx_audit_logs_trace ON audit_logs (trace_id);

CREATE TABLE methodology_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(30) NOT NULL UNIQUE,
  title VARCHAR(200),
  description TEXT,
  scope JSONB NOT NULL DEFAULT '[]'::jsonb,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PARTE 5: CATÁLOGOS
-- ============================================================================

CREATE TABLE countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iso2 CHAR(2) NOT NULL UNIQUE,
  iso3 CHAR(3) UNIQUE,
  name VARCHAR(120) NOT NULL,
  dial_code VARCHAR(10),
  default_currency CHAR(3),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(150) NOT NULL UNIQUE,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sectors_parent ON sectors (parent_id);

CREATE TABLE verification_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  is_required BOOLEAN NOT NULL DEFAULT FALSE,      -- para el cálculo del estado global
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE report_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(150) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE review_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(30) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  allow_resolution_flow BOOLEAN NOT NULL DEFAULT TRUE,
  min_rating_for_resolution SMALLINT NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT review_policies_min_rating_check CHECK (min_rating_for_resolution BETWEEN 1 AND 5)
);

-- Catálogo de la máquina de estados (transiciones permitidas).
CREATE TABLE state_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(60) NOT NULL,
  field VARCHAR(60) NOT NULL,
  from_value VARCHAR(40) NOT NULL,
  to_value VARCHAR(40) NOT NULL,
  required_permission VARCHAR(100),
  description VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT state_transitions_unique UNIQUE (entity_type, field, from_value, to_value)
);

CREATE INDEX idx_state_transitions_lookup ON state_transitions (entity_type, field, from_value, is_active);

-- ============================================================================
-- PARTE 6: EVIDENCIA Y DOCUMENTOS (CLAIM -> PROOF)
-- ----------------------------------------------------------------------------
-- Responsabilidades:
--   evidence  = PROOF: artefacto de prueba (archivo o fuente externa) con hash
--               de integridad. Es lo que se adjunta a una afirmación.
--   documents = DOCUMENTO LEGAL gestionado (RC, licencia, seguro...): añade
--               emisor, número, vigencia y revisión. Su archivo vive en una
--               fila de evidence (documents.evidence_id).
-- ============================================================================

CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  project_id UUID,
  -- Trazabilidad opcional a la afirmación/verificación que respalda.
  claim_id UUID,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  owner_type VARCHAR(40),                          -- company_submitted|fiverten_verified|source_derived|system_calculated
  file_ref VARCHAR(1000),
  source_ref VARCHAR(1000),
  visibility VARCHAR(20) NOT NULL DEFAULT 'private',
  issue_date DATE,
  expiry_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  hash CHAR(64),
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT evidence_visibility_check CHECK (visibility IN ('private','restricted','public')),
  CONSTRAINT evidence_status_check CHECK (status IN ('pending','verified','rejected','expired')),
  CONSTRAINT evidence_owner_check CHECK (owner_type IS NULL OR owner_type IN ('company_submitted','fiverten_verified','source_derived','system_calculated')),
  CONSTRAINT evidence_dates_check CHECK (expiry_date IS NULL OR issue_date IS NULL OR expiry_date >= issue_date)
);

CREATE INDEX idx_evidence_org ON evidence (organization_id, deleted_at);
CREATE INDEX idx_evidence_project ON evidence (project_id);
CREATE INDEX idx_evidence_claim ON evidence (claim_id);
CREATE INDEX idx_evidence_expiry ON evidence (expiry_date);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  evidence_id UUID,                                -- archivo original (proof)
  category VARCHAR(50) NOT NULL,
  issuer VARCHAR(200),
  document_number VARCHAR(100),
  version VARCHAR(30),
  title VARCHAR(255),
  issue_date DATE,
  expiry_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  visibility VARCHAR(20) NOT NULL DEFAULT 'private',
  review_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT documents_status_check CHECK (status IN ('pending','verified','rejected','expired')),
  CONSTRAINT documents_visibility_check CHECK (visibility IN ('private','restricted','public')),
  CONSTRAINT documents_dates_check CHECK (expiry_date IS NULL OR issue_date IS NULL OR expiry_date >= issue_date)
);

CREATE INDEX idx_documents_org ON documents (organization_id, deleted_at);
CREATE INDEX idx_documents_category ON documents (category, status);
CREATE INDEX idx_documents_expiry ON documents (expiry_date);

-- ============================================================================
-- PARTE 7: VERIFICACIÓN (CLAIM -> EVIDENCE -> DECISION)
-- ----------------------------------------------------------------------------
-- Flujo completo y reconstruible:
--   1. verification_claims: la empresa AFIRMA / solicita verificación.
--   2. claim_evidence: evidencias que respaldan esa afirmación.
--   3. verification_decisions: un revisor decide según una methodology_version.
--   4. decision_evidence: qué evidencias concretas se evaluaron en la decisión.
--   5. organization_verifications: proyección del estado ACTUAL por scope.
--   6. verification_events: bitácora inmutable (con FKs tipadas reales).
-- ============================================================================

CREATE TABLE verification_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id VARCHAR(32) NOT NULL UNIQUE,
  organization_id UUID NOT NULL,
  scope_id UUID,
  scope_code VARCHAR(50) NOT NULL,
  project_id UUID,
  review_id UUID,
  statement TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  submitted_by UUID,
  submitted_at TIMESTAMPTZ,
  current_decision_id UUID,                        -- última decisión (append-only)
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT verification_claims_status_check CHECK (status IN ('draft','submitted','under_review','approved','rejected','expired','revoked'))
);

CREATE INDEX idx_verification_claims_org ON verification_claims (organization_id, scope_code, status);
CREATE INDEX idx_verification_claims_project ON verification_claims (project_id);
CREATE INDEX idx_verification_claims_review ON verification_claims (review_id);

CREATE TABLE claim_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL,
  evidence_id UUID NOT NULL,
  added_by UUID,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT claim_evidence_unique UNIQUE (claim_id, evidence_id)
);

CREATE INDEX idx_claim_evidence_claim ON claim_evidence (claim_id);
CREATE INDEX idx_claim_evidence_evidence ON claim_evidence (evidence_id);

-- Append-only: nunca se actualiza una decisión; se encadena con previous_decision_id.
CREATE TABLE verification_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL,
  reviewer_id UUID,
  methodology_version_id UUID,
  decision VARCHAR(20) NOT NULL,
  justification TEXT,
  previous_decision_id UUID,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT verification_decisions_decision_check CHECK (decision IN ('approved','rejected','revoked','expired','re_evaluated')),
  CONSTRAINT verification_decisions_validity_check CHECK (valid_until IS NULL OR valid_until > valid_from)
);

CREATE INDEX idx_verification_decisions_claim ON verification_decisions (claim_id, created_at);
CREATE INDEX idx_verification_decisions_reviewer ON verification_decisions (reviewer_id);

CREATE TABLE decision_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL,
  evidence_id UUID NOT NULL,
  evaluation_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT decision_evidence_unique UNIQUE (decision_id, evidence_id)
);

CREATE INDEX idx_decision_evidence_decision ON decision_evidence (decision_id);

CREATE TABLE organization_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  scope_id UUID,
  scope_code VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'not_verified',
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  methodology_version_id UUID,
  reviewer_id UUID,
  current_decision_id UUID,                        -- decisión vigente que sustenta este estado
  reason TEXT,
  source VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT org_verifications_status_check CHECK (status IN ('not_verified','pending','verified','expired','rejected')),
  CONSTRAINT org_verifications_unique UNIQUE (organization_id, scope_code)
);

CREATE INDEX idx_org_verifications_org ON organization_verifications (organization_id, status);
CREATE INDEX idx_org_verifications_expires ON organization_verifications (expires_at);

-- Bitácora inmutable. entity_type/entity_id se mantienen para extensibilidad,
-- pero se añaden FKs TIPADAS reales para las entidades conocidas.
CREATE TABLE verification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  entity_type VARCHAR(60) NOT NULL,
  entity_id UUID NOT NULL,
  claim_id UUID,
  decision_id UUID,
  evidence_id UUID,
  document_id UUID,
  project_id UUID,
  review_id UUID,
  actor_id UUID,
  from_status VARCHAR(30),
  to_status VARCHAR(30),
  reason TEXT,
  source VARCHAR(255),
  methodology_version_id UUID,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT verification_events_entity_type_check CHECK (entity_type IN ('organization','document','project','review','evidence','claim','decision'))
);

CREATE INDEX idx_verification_events_entity ON verification_events (entity_type, entity_id, created_at);
CREATE INDEX idx_verification_events_org ON verification_events (organization_id, created_at);
CREATE INDEX idx_verification_events_claim ON verification_events (claim_id);
CREATE INDEX idx_verification_events_actor ON verification_events (actor_id);

-- ============================================================================
-- PARTE 8: PROYECTOS, VERIFICACIÓN Y CLIENTES
-- ============================================================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(80),
  description TEXT,
  location VARCHAR(200),
  year SMALLINT,
  start_date DATE,
  end_date DATE,
  lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'draft',
  verification_status VARCHAR(20) NOT NULL DEFAULT 'not_verified',
  visibility VARCHAR(20) NOT NULL DEFAULT 'private',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  CONSTRAINT projects_lifecycle_check CHECK (lifecycle_status IN ('draft','submitted','published','archived')),
  CONSTRAINT projects_verif_check CHECK (verification_status IN ('not_verified','pending','verified','expired','rejected')),
  CONSTRAINT projects_visibility_check CHECK (visibility IN ('private','restricted','public')),
  CONSTRAINT projects_dates_check CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CONSTRAINT projects_year_check CHECK (year IS NULL OR (year >= 1900 AND year <= 2100))
);

CREATE INDEX idx_projects_org ON projects (organization_id, deleted_at);
CREATE INDEX idx_projects_verif ON projects (verification_status);
CREATE INDEX idx_projects_visibility ON projects (visibility);

CREATE TABLE project_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  evidence_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  client_status VARCHAR(20) NOT NULL DEFAULT 'identified',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  reviewer_id UUID,
  methodology_version_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_verifications_client_check CHECK (client_status IN ('identified','confirmed','verified')),
  CONSTRAINT project_verifications_status_check CHECK (status IN ('pending','verified','rejected','expired'))
);

CREATE INDEX idx_project_verifications_project ON project_verifications (project_id, status);

CREATE TABLE client_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  project_id UUID,
  client_user_id UUID,
  client_name VARCHAR(200),
  client_email VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'identified',
  verification_level VARCHAR(20) NOT NULL DEFAULT 'identified',
  consent BOOLEAN NOT NULL DEFAULT FALSE,
  consent_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT client_relations_status_check CHECK (status IN ('identified','confirmed','verified','rejected')),
  CONSTRAINT client_relations_level_check CHECK (verification_level IN ('identified','confirmed','verified')),
  CONSTRAINT client_relations_consent_check CHECK (NOT consent OR consent_at IS NOT NULL)
);

CREATE INDEX idx_client_relations_org ON client_relations (organization_id);
CREATE INDEX idx_client_relations_project ON client_relations (project_id);
CREATE INDEX idx_client_relations_email ON client_relations (organization_id, client_email);

CREATE TABLE client_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  project_id UUID,
  client_relation_id UUID,
  invited_by UUID,
  client_name VARCHAR(200),
  email VARCHAR(255) NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'email',
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT client_invites_channel_check CHECK (channel IN ('email','sms','link','qr')),
  CONSTRAINT client_invites_status_check CHECK (status IN ('pending','sent','opened','responded','expired','cancelled'))
);

CREATE INDEX idx_client_invites_org ON client_invites (organization_id, status);
CREATE INDEX idx_client_invites_project ON client_invites (project_id);

-- ============================================================================
-- PARTE 9: RESEÑAS / OPINIONES
-- ============================================================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  project_id UUID,
  client_relation_id UUID,
  client_invite_id UUID,
  reviewer_name VARCHAR(200),
  reviewer_email VARCHAR(255),
  rating SMALLINT NOT NULL,
  title VARCHAR(255),
  body TEXT,
  experience_date DATE,
  order_reference VARCHAR(100),
  image_url VARCHAR(1000),
  consent BOOLEAN NOT NULL DEFAULT FALSE,
  -- Cuatro dimensiones independientes (máquina de estados en state_transitions).
  lifecycle_status VARCHAR(20) NOT NULL DEFAULT 'submitted',
  verification_status VARCHAR(20) NOT NULL DEFAULT 'not_verified',
  visibility VARCHAR(20) NOT NULL DEFAULT 'private',
  moderation_status VARCHAR(20) NOT NULL DEFAULT 'none',
  published_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT reviews_rating_check CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT reviews_lifecycle_check CHECK (lifecycle_status IN ('draft','submitted','published','archived')),
  CONSTRAINT reviews_verif_check CHECK (verification_status IN ('not_verified','pending','verified','expired','rejected')),
  CONSTRAINT reviews_visibility_check CHECK (visibility IN ('private','restricted','public')),
  CONSTRAINT reviews_moderation_check CHECK (moderation_status IN ('none','reported','under_review','resolved','rejected','hidden')),
  -- Una reseña oculta por moderación no puede seguir siendo pública.
  CONSTRAINT reviews_hidden_visibility_check CHECK (NOT (moderation_status = 'hidden' AND visibility = 'public')),
  -- La publicación no implica autenticidad: no se obliga verificación para publicar.
  CONSTRAINT reviews_published_at_check CHECK (lifecycle_status <> 'published' OR published_at IS NOT NULL)
);

CREATE INDEX idx_reviews_org ON reviews (organization_id, deleted_at);
CREATE INDEX idx_reviews_org_status ON reviews (organization_id, lifecycle_status, moderation_status);
CREATE INDEX idx_reviews_project ON reviews (project_id);
CREATE INDEX idx_reviews_rating ON reviews (organization_id, rating);
CREATE INDEX idx_reviews_published ON reviews (published_at);
CREATE INDEX idx_reviews_ip ON reviews (ip_address);

CREATE TABLE review_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL UNIQUE,
  organization_id UUID NOT NULL,
  author_user_id UUID,
  body TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_responses_review ON review_responses (review_id);

CREATE TABLE review_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  raised_by UUID,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT review_disputes_status_check CHECK (status IN ('open','under_review','accepted','rejected','closed'))
);

CREATE INDEX idx_review_disputes_review ON review_disputes (review_id);

CREATE TABLE review_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  initiated_by UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  proposal TEXT,
  outcome VARCHAR(20),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT review_resolutions_status_check CHECK (status IN ('open','in_progress','accepted','rejected','closed')),
  CONSTRAINT review_resolutions_outcome_check CHECK (outcome IS NULL OR outcome IN ('resolved','unresolved','withdrawn'))
);

CREATE INDEX idx_review_resolutions_review ON review_resolutions (review_id, status);

CREATE TABLE resolution_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resolution_id UUID NOT NULL,
  sender_type VARCHAR(20) NOT NULL,
  sender_user_id UUID,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT resolution_messages_sender_check CHECK (sender_type IN ('company','client','system'))
);

CREATE INDEX idx_resolution_messages_resolution ON resolution_messages (resolution_id, created_at);

CREATE TABLE review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL,
  reason_id UUID,
  reporter_user_id UUID,
  reporter_organization_id UUID,
  comment TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  handled_by UUID,
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT review_reports_status_check CHECK (status IN ('open','reviewing','accepted','rejected','closed'))
);

CREATE INDEX idx_review_reports_review ON review_reports (review_id);
CREATE INDEX idx_review_reports_status ON review_reports (status, created_at);

CREATE TABLE moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL,
  moderator_id UUID,
  action VARCHAR(30) NOT NULL,
  from_status VARCHAR(20),
  to_status VARCHAR(20),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT moderation_actions_action_check CHECK (action IN ('hide','publish','restore','reject','flag','unflag','delete'))
);

CREATE INDEX idx_moderation_actions_review ON moderation_actions (review_id, created_at);
CREATE INDEX idx_moderation_actions_moderator ON moderation_actions (moderator_id);

CREATE TABLE antifraud_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID,
  organization_id UUID,
  signal_type VARCHAR(50) NOT NULL,
  score NUMERIC(5,2),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT antifraud_signals_score_check CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);

CREATE INDEX idx_antifraud_review ON antifraud_signals (review_id);
CREATE INDEX idx_antifraud_type ON antifraud_signals (signal_type, created_at);

-- ============================================================================
-- PARTE 10: SOLICITUDES DE RESEÑA Y CAMPAÑAS
-- ============================================================================

-- total_* son AGREGADOS RECALCULABLES (caché). Ver v_campaign_stats.
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'email',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  total_sent INT NOT NULL DEFAULT 0,
  total_opened INT NOT NULL DEFAULT 0,
  total_reviews INT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT campaigns_channel_check CHECK (channel IN ('email','sms','link','qr')),
  CONSTRAINT campaigns_status_check CHECK (status IN ('draft','scheduled','running','paused','finished','cancelled')),
  CONSTRAINT campaigns_counters_check CHECK (total_sent >= 0 AND total_opened >= 0 AND total_reviews >= 0)
);

CREATE INDEX idx_campaigns_org ON campaigns (organization_id, status);

CREATE TABLE review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  campaign_id UUID,
  project_id UUID,
  client_relation_id UUID,
  review_id UUID,
  client_name VARCHAR(200),
  email VARCHAR(255),
  channel VARCHAR(20) NOT NULL DEFAULT 'email',
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT review_requests_channel_check CHECK (channel IN ('email','sms','link','qr')),
  CONSTRAINT review_requests_status_check CHECK (status IN ('pending','sent','opened','clicked','reviewed','bounced','cancelled'))
);

CREATE INDEX idx_review_requests_org ON review_requests (organization_id, status);
CREATE INDEX idx_review_requests_campaign ON review_requests (campaign_id);

-- ============================================================================
-- PARTE 11: SELLO PÚBLICO / EMBEDS
-- ============================================================================

CREATE TABLE public_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  state VARCHAR(20) NOT NULL DEFAULT 'pending',
  embed_token VARCHAR(64) NOT NULL UNIQUE,
  current_url VARCHAR(500),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  downloaded_at TIMESTAMPTZ,
  embed_copied_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_reason VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT public_badges_state_check CHECK (state IN ('verified','pending','expired','revoked'))
);

CREATE INDEX idx_public_badges_org ON public_badges (organization_id, state);
CREATE INDEX idx_public_badges_token ON public_badges (embed_token);

-- ============================================================================
-- PARTE 12: PLANES, SUSCRIPCIONES Y FACTURACIÓN
-- ============================================================================

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  billing_interval VARCHAR(20) NOT NULL DEFAULT 'monthly',
  is_custom_pricing BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT plans_interval_check CHECK (billing_interval IN ('monthly','yearly','custom')),
  CONSTRAINT plans_price_check CHECK (price >= 0)
);

CREATE TABLE plan_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL,
  feature_key VARCHAR(80) NOT NULL,
  limit_value INT,
  is_boolean BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT plan_limits_unique UNIQUE (plan_id, feature_key),
  CONSTRAINT plan_limits_value_check CHECK (limit_value IS NULL OR limit_value >= 0)
);

CREATE INDEX idx_plan_limits_plan ON plan_limits (plan_id);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  provider VARCHAR(50),
  provider_subscription_ref VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subscriptions_status_check CHECK (status IN ('active','trial','past_due','cancelled','expired')),
  CONSTRAINT subscriptions_period_check CHECK (current_period_end IS NULL OR current_period_start IS NULL OR current_period_end > current_period_start)
);

CREATE INDEX idx_subscriptions_org ON subscriptions (organization_id, status);
CREATE INDEX idx_subscriptions_period ON subscriptions (current_period_end);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  subscription_id UUID,
  number VARCHAR(50) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  issued_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT invoices_status_check CHECK (status IN ('draft','open','paid','void','uncollectible')),
  CONSTRAINT invoices_totals_check CHECK (subtotal >= 0 AND tax >= 0 AND total >= 0),
  CONSTRAINT invoices_due_check CHECK (due_at IS NULL OR issued_at IS NULL OR due_at >= issued_at)
);

CREATE INDEX idx_invoices_org ON invoices (organization_id, status);

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT invoice_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT invoice_items_price_check CHECK (unit_price >= 0),
  CONSTRAINT invoice_items_amount_check CHECK (amount >= 0)
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items (invoice_id);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID,
  organization_id UUID NOT NULL,
  provider VARCHAR(50),
  provider_payment_ref VARCHAR(255),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  failure_reason VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payments_status_check CHECK (status IN ('pending','succeeded','failed','refunded')),
  CONSTRAINT payments_amount_check CHECK (amount >= 0)
);

CREATE INDEX idx_payments_org ON payments (organization_id, status);

-- ============================================================================
-- PARTE 13: NOTIFICACIONES Y PLANTILLAS
-- ----------------------------------------------------------------------------
-- Plantillas unificadas en notification_templates (canal-aware, incluido email).
-- Se elimina email_templates para no duplicar responsabilidad.
-- ============================================================================

CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL,
  name VARCHAR(150),
  channel VARCHAR(20) NOT NULL,                    -- email|in_app|sms|push
  locale VARCHAR(10) NOT NULL DEFAULT 'es',
  subject VARCHAR(255),
  body TEXT NOT NULL,
  html_body TEXT,
  text_body TEXT,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_templates_unique UNIQUE (code, channel, locale),
  CONSTRAINT notification_templates_channel_check CHECK (channel IN ('email','in_app','sms','push'))
);

CREATE INDEX idx_notification_templates_code ON notification_templates (code, is_active);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  template_code VARCHAR(100),
  type VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'in_app',
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  title VARCHAR(255) NOT NULL,
  body TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  notifiable_type VARCHAR(50),
  notifiable_id UUID,
  created_by UUID,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notifications_channel_check CHECK (channel IN ('email','in_app','sms','push')),
  CONSTRAINT notifications_priority_check CHECK (priority IN ('low','normal','high','urgent'))
);

CREATE INDEX idx_notifications_org ON notifications (organization_id, created_at);
CREATE INDEX idx_notifications_target ON notifications (notifiable_type, notifiable_id);

CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL,
  user_id UUID NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,
  channel VARCHAR(20) NOT NULL DEFAULT 'in_app',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_notifications_unique UNIQUE (notification_id, user_id),
  CONSTRAINT user_notifications_read_check CHECK (NOT is_read OR read_at IS NOT NULL)
);

CREATE INDEX idx_user_notifications_unread ON user_notifications (user_id, is_read, is_archived);

-- ============================================================================
-- PARTE 14: ANALÍTICA DE EVENTOS
-- ============================================================================

CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  user_id UUID,
  event_name VARCHAR(80) NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_name ON analytics_events (event_name, created_at);
CREATE INDEX idx_analytics_events_org ON analytics_events (organization_id, created_at);

-- ============================================================================
-- PARTE 15: FUNCIÓN updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PARTE 16: CLAVES FORÁNEAS (auditoría completa)
-- ============================================================================

-- Organizaciones
ALTER TABLE organizations ADD CONSTRAINT fk_organizations_sector FOREIGN KEY (sector_id) REFERENCES sectors(id) ON DELETE SET NULL;
ALTER TABLE organizations ADD CONSTRAINT fk_organizations_country FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE SET NULL;
ALTER TABLE organizations ADD CONSTRAINT fk_organizations_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE organizations ADD CONSTRAINT fk_organizations_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE organizations ADD CONSTRAINT fk_organizations_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE organization_locations ADD CONSTRAINT fk_org_locations_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE organization_locations ADD CONSTRAINT fk_org_locations_country FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE SET NULL;

-- Usuarios / RBAC / membresías
ALTER TABLE users ADD CONSTRAINT fk_users_default_org FOREIGN KEY (default_organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT fk_users_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT fk_users_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT fk_users_deleted_by FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE roles ADD CONSTRAINT fk_roles_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions_perm FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;
ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE organization_memberships ADD CONSTRAINT fk_org_memberships_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE organization_memberships ADD CONSTRAINT fk_org_memberships_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE organization_memberships ADD CONSTRAINT fk_org_memberships_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT;
ALTER TABLE organization_memberships ADD CONSTRAINT fk_org_memberships_invited_by FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL;

-- Sesiones / tokens / auth
ALTER TABLE sessions ADD CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD CONSTRAINT fk_sessions_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE refresh_tokens ADD CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE refresh_tokens ADD CONSTRAINT fk_refresh_tokens_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE refresh_tokens ADD CONSTRAINT fk_refresh_tokens_replaced_by FOREIGN KEY (replaced_by_token_id) REFERENCES refresh_tokens(id) ON DELETE SET NULL;

ALTER TABLE password_reset_tokens ADD CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE email_verifications ADD CONSTRAINT fk_ev_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE auth_attempts ADD CONSTRAINT fk_auth_attempts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE api_keys ADD CONSTRAINT fk_api_keys_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE api_keys ADD CONSTRAINT fk_api_keys_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE api_keys ADD CONSTRAINT fk_api_keys_revoked_by FOREIGN KEY (revoked_by) REFERENCES users(id) ON DELETE SET NULL;

-- Configuración / auditoría
ALTER TABLE system_settings ADD CONSTRAINT fk_system_settings_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE system_settings ADD CONSTRAINT fk_system_settings_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE system_settings ADD CONSTRAINT fk_system_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Catálogos
ALTER TABLE sectors ADD CONSTRAINT fk_sectors_parent FOREIGN KEY (parent_id) REFERENCES sectors(id) ON DELETE SET NULL;

-- Evidencia / documentos
ALTER TABLE evidence ADD CONSTRAINT fk_evidence_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE evidence ADD CONSTRAINT fk_evidence_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE evidence ADD CONSTRAINT fk_evidence_claim FOREIGN KEY (claim_id) REFERENCES verification_claims(id) ON DELETE SET NULL;
ALTER TABLE evidence ADD CONSTRAINT fk_evidence_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE documents ADD CONSTRAINT fk_documents_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE documents ADD CONSTRAINT fk_documents_evidence FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE SET NULL;
ALTER TABLE documents ADD CONSTRAINT fk_documents_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;

-- Verificación (claims / decisiones / proyección / eventos)
ALTER TABLE verification_claims ADD CONSTRAINT fk_claims_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE verification_claims ADD CONSTRAINT fk_claims_scope FOREIGN KEY (scope_id) REFERENCES verification_scopes(id) ON DELETE SET NULL;
ALTER TABLE verification_claims ADD CONSTRAINT fk_claims_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE verification_claims ADD CONSTRAINT fk_claims_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE;
ALTER TABLE verification_claims ADD CONSTRAINT fk_claims_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE verification_claims ADD CONSTRAINT fk_claims_current_decision FOREIGN KEY (current_decision_id) REFERENCES verification_decisions(id) ON DELETE SET NULL;
ALTER TABLE verification_claims ADD CONSTRAINT fk_claims_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE claim_evidence ADD CONSTRAINT fk_claim_evidence_claim FOREIGN KEY (claim_id) REFERENCES verification_claims(id) ON DELETE CASCADE;
ALTER TABLE claim_evidence ADD CONSTRAINT fk_claim_evidence_evidence FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE;
ALTER TABLE claim_evidence ADD CONSTRAINT fk_claim_evidence_added_by FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE verification_decisions ADD CONSTRAINT fk_decisions_claim FOREIGN KEY (claim_id) REFERENCES verification_claims(id) ON DELETE CASCADE;
ALTER TABLE verification_decisions ADD CONSTRAINT fk_decisions_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE verification_decisions ADD CONSTRAINT fk_decisions_methodology FOREIGN KEY (methodology_version_id) REFERENCES methodology_versions(id) ON DELETE SET NULL;
ALTER TABLE verification_decisions ADD CONSTRAINT fk_decisions_previous FOREIGN KEY (previous_decision_id) REFERENCES verification_decisions(id) ON DELETE SET NULL;

ALTER TABLE decision_evidence ADD CONSTRAINT fk_decision_evidence_decision FOREIGN KEY (decision_id) REFERENCES verification_decisions(id) ON DELETE CASCADE;
ALTER TABLE decision_evidence ADD CONSTRAINT fk_decision_evidence_evidence FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE;

ALTER TABLE organization_verifications ADD CONSTRAINT fk_org_verif_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE organization_verifications ADD CONSTRAINT fk_org_verif_scope FOREIGN KEY (scope_id) REFERENCES verification_scopes(id) ON DELETE SET NULL;
ALTER TABLE organization_verifications ADD CONSTRAINT fk_org_verif_methodology FOREIGN KEY (methodology_version_id) REFERENCES methodology_versions(id) ON DELETE SET NULL;
ALTER TABLE organization_verifications ADD CONSTRAINT fk_org_verif_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE organization_verifications ADD CONSTRAINT fk_org_verif_decision FOREIGN KEY (current_decision_id) REFERENCES verification_decisions(id) ON DELETE SET NULL;

ALTER TABLE verification_events ADD CONSTRAINT fk_verif_events_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE verification_events ADD CONSTRAINT fk_verif_events_claim FOREIGN KEY (claim_id) REFERENCES verification_claims(id) ON DELETE SET NULL;
ALTER TABLE verification_events ADD CONSTRAINT fk_verif_events_decision FOREIGN KEY (decision_id) REFERENCES verification_decisions(id) ON DELETE SET NULL;
ALTER TABLE verification_events ADD CONSTRAINT fk_verif_events_evidence FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE SET NULL;
ALTER TABLE verification_events ADD CONSTRAINT fk_verif_events_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE verification_events ADD CONSTRAINT fk_verif_events_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE verification_events ADD CONSTRAINT fk_verif_events_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE SET NULL;
ALTER TABLE verification_events ADD CONSTRAINT fk_verif_events_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE verification_events ADD CONSTRAINT fk_verif_events_methodology FOREIGN KEY (methodology_version_id) REFERENCES methodology_versions(id) ON DELETE SET NULL;

-- Proyectos / clientes
ALTER TABLE projects ADD CONSTRAINT fk_projects_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE projects ADD CONSTRAINT fk_projects_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE projects ADD CONSTRAINT fk_projects_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE project_verifications ADD CONSTRAINT fk_project_verif_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE project_verifications ADD CONSTRAINT fk_project_verif_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE project_verifications ADD CONSTRAINT fk_project_verif_methodology FOREIGN KEY (methodology_version_id) REFERENCES methodology_versions(id) ON DELETE SET NULL;

ALTER TABLE client_relations ADD CONSTRAINT fk_client_rel_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE client_relations ADD CONSTRAINT fk_client_rel_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE client_relations ADD CONSTRAINT fk_client_rel_user FOREIGN KEY (client_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE client_invites ADD CONSTRAINT fk_client_invites_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE client_invites ADD CONSTRAINT fk_client_invites_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE client_invites ADD CONSTRAINT fk_client_invites_relation FOREIGN KEY (client_relation_id) REFERENCES client_relations(id) ON DELETE SET NULL;
ALTER TABLE client_invites ADD CONSTRAINT fk_client_invites_invited_by FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL;

-- Reseñas / moderación
ALTER TABLE reviews ADD CONSTRAINT fk_reviews_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE reviews ADD CONSTRAINT fk_reviews_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE reviews ADD CONSTRAINT fk_reviews_relation FOREIGN KEY (client_relation_id) REFERENCES client_relations(id) ON DELETE SET NULL;
ALTER TABLE reviews ADD CONSTRAINT fk_reviews_invite FOREIGN KEY (client_invite_id) REFERENCES client_invites(id) ON DELETE SET NULL;

ALTER TABLE review_responses ADD CONSTRAINT fk_review_responses_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE;
ALTER TABLE review_responses ADD CONSTRAINT fk_review_responses_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE review_responses ADD CONSTRAINT fk_review_responses_author FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE review_disputes ADD CONSTRAINT fk_review_disputes_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE;
ALTER TABLE review_disputes ADD CONSTRAINT fk_review_disputes_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE review_disputes ADD CONSTRAINT fk_review_disputes_raised_by FOREIGN KEY (raised_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE review_disputes ADD CONSTRAINT fk_review_disputes_resolved_by FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE review_resolutions ADD CONSTRAINT fk_review_resolutions_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE;
ALTER TABLE review_resolutions ADD CONSTRAINT fk_review_resolutions_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE review_resolutions ADD CONSTRAINT fk_review_resolutions_initiated_by FOREIGN KEY (initiated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE resolution_messages ADD CONSTRAINT fk_resolution_messages_resolution FOREIGN KEY (resolution_id) REFERENCES review_resolutions(id) ON DELETE CASCADE;
ALTER TABLE resolution_messages ADD CONSTRAINT fk_resolution_messages_sender FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE review_reports ADD CONSTRAINT fk_review_reports_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE;
ALTER TABLE review_reports ADD CONSTRAINT fk_review_reports_reason FOREIGN KEY (reason_id) REFERENCES report_reasons(id) ON DELETE SET NULL;
ALTER TABLE review_reports ADD CONSTRAINT fk_review_reports_user FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE review_reports ADD CONSTRAINT fk_review_reports_org FOREIGN KEY (reporter_organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE review_reports ADD CONSTRAINT fk_review_reports_handled_by FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE moderation_actions ADD CONSTRAINT fk_moderation_actions_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE;
ALTER TABLE moderation_actions ADD CONSTRAINT fk_moderation_actions_moderator FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE antifraud_signals ADD CONSTRAINT fk_antifraud_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE;
ALTER TABLE antifraud_signals ADD CONSTRAINT fk_antifraud_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Campañas / solicitudes
ALTER TABLE campaigns ADD CONSTRAINT fk_campaigns_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE campaigns ADD CONSTRAINT fk_campaigns_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE review_requests ADD CONSTRAINT fk_review_requests_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE review_requests ADD CONSTRAINT fk_review_requests_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;
ALTER TABLE review_requests ADD CONSTRAINT fk_review_requests_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE review_requests ADD CONSTRAINT fk_review_requests_relation FOREIGN KEY (client_relation_id) REFERENCES client_relations(id) ON DELETE SET NULL;
ALTER TABLE review_requests ADD CONSTRAINT fk_review_requests_review FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE SET NULL;
ALTER TABLE review_requests ADD CONSTRAINT fk_review_requests_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Sello público
ALTER TABLE public_badges ADD CONSTRAINT fk_public_badges_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Facturación
ALTER TABLE plan_limits ADD CONSTRAINT fk_plan_limits_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE;
ALTER TABLE subscriptions ADD CONSTRAINT fk_subscriptions_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE subscriptions ADD CONSTRAINT fk_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT;
ALTER TABLE invoices ADD CONSTRAINT fk_invoices_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE invoices ADD CONSTRAINT fk_invoices_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL;
ALTER TABLE invoice_items ADD CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
ALTER TABLE payments ADD CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
ALTER TABLE payments ADD CONSTRAINT fk_payments_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Notificaciones / analítica
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE user_notifications ADD CONSTRAINT fk_user_notifications_notification FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE;
ALTER TABLE user_notifications ADD CONSTRAINT fk_user_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE analytics_events ADD CONSTRAINT fk_analytics_events_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE analytics_events ADD CONSTRAINT fk_analytics_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================================
-- PARTE 17: MÁQUINA DE ESTADOS (validación de transiciones)
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_state_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_entity TEXT := TG_ARGV[0];
  v_field  TEXT := TG_ARGV[1];
  v_from   TEXT;
  v_to     TEXT;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  v_from := to_jsonb(OLD) ->> v_field;
  v_to   := to_jsonb(NEW) ->> v_field;

  IF v_from IS DISTINCT FROM v_to THEN
    IF NOT EXISTS (
      SELECT 1 FROM state_transitions st
      WHERE st.entity_type = v_entity
        AND st.field = v_field
        AND st.from_value = v_from
        AND st.to_value = v_to
        AND st.is_active
    ) THEN
      RAISE EXCEPTION 'Transición no permitida: %.% de "%" a "%"', v_entity, v_field, v_from, v_to
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PARTE 18: TRIGGERS updated_at
-- ============================================================================

CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_org_locations_updated_at BEFORE UPDATE ON organization_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_permissions_updated_at BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_org_memberships_updated_at BEFORE UPDATE ON organization_memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_auth_providers_updated_at BEFORE UPDATE ON auth_providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_methodology_versions_updated_at BEFORE UPDATE ON methodology_versions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_sectors_updated_at BEFORE UPDATE ON sectors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_review_policies_updated_at BEFORE UPDATE ON review_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_evidence_updated_at BEFORE UPDATE ON evidence FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_org_verifications_updated_at BEFORE UPDATE ON organization_verifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_claims_updated_at BEFORE UPDATE ON verification_claims FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_project_verifications_updated_at BEFORE UPDATE ON project_verifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_client_relations_updated_at BEFORE UPDATE ON client_relations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_review_responses_updated_at BEFORE UPDATE ON review_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_review_disputes_updated_at BEFORE UPDATE ON review_disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_review_resolutions_updated_at BEFORE UPDATE ON review_resolutions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_public_badges_updated_at BEFORE UPDATE ON public_badges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_notification_templates_updated_at BEFORE UPDATE ON notification_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers de máquina de estados
CREATE TRIGGER trg_reviews_st_lifecycle BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION enforce_state_transition('reviews','lifecycle_status');
CREATE TRIGGER trg_reviews_st_verification BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION enforce_state_transition('reviews','verification_status');
CREATE TRIGGER trg_reviews_st_moderation BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION enforce_state_transition('reviews','moderation_status');
CREATE TRIGGER trg_projects_st_lifecycle BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION enforce_state_transition('projects','lifecycle_status');
CREATE TRIGGER trg_org_verif_st BEFORE UPDATE ON organization_verifications FOR EACH ROW EXECUTE FUNCTION enforce_state_transition('organization_verifications','status');
CREATE TRIGGER trg_claims_st BEFORE UPDATE ON verification_claims FOR EACH ROW EXECUTE FUNCTION enforce_state_transition('verification_claims','status');
CREATE TRIGGER trg_subscriptions_st BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION enforce_state_transition('subscriptions','status');
CREATE TRIGGER trg_documents_st BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION enforce_state_transition('documents','status');
CREATE TRIGGER trg_evidence_st BEFORE UPDATE ON evidence FOR EACH ROW EXECUTE FUNCTION enforce_state_transition('evidence','status');

-- ============================================================================
-- PARTE 19: SEED DE TRANSICIONES PERMITIDAS
-- ============================================================================

INSERT INTO state_transitions (entity_type, field, from_value, to_value, required_permission, description) VALUES
-- Reseñas: life cycle
('reviews','lifecycle_status','draft','submitted','reviews.update','Enviar a publicación'),
('reviews','lifecycle_status','submitted','published','reviews.manage','Publicar'),
('reviews','lifecycle_status','submitted','draft','reviews.update','Devolver a borrador'),
('reviews','lifecycle_status','published','archived','reviews.manage','Archivar'),
('reviews','lifecycle_status','archived','published','reviews.manage','Restaurar'),
-- Reseñas: verificación
('reviews','verification_status','not_verified','pending','reviews.verify','Iniciar verificación'),
('reviews','verification_status','pending','verified','reviews.verify','Verificar'),
('reviews','verification_status','pending','rejected','reviews.verify','Rechazar'),
('reviews','verification_status','verified','expired',NULL,'Caducar'),
('reviews','verification_status','verified','pending','reviews.verify','Reevaluar'),
('reviews','verification_status','expired','pending','reviews.verify','Reevaluar'),
('reviews','verification_status','rejected','pending','reviews.verify','Reevaluar'),
-- Reseñas: moderación
('reviews','moderation_status','none','reported',NULL,'Reportada'),
('reviews','moderation_status','reported','under_review','reviews.moderate','En revisión'),
('reviews','moderation_status','under_review','resolved','reviews.moderate','Resuelta'),
('reviews','moderation_status','under_review','rejected','reviews.moderate','Rechazada'),
('reviews','moderation_status','under_review','hidden','reviews.moderate','Ocultar'),
('reviews','moderation_status','hidden','none','reviews.moderate','Restaurar'),
('reviews','moderation_status','resolved','none','reviews.moderate','Cerrar'),
('reviews','moderation_status','rejected','none','reviews.moderate','Reabrir'),
-- Proyectos: life cycle
('projects','lifecycle_status','draft','submitted','projects.update','Enviar'),
('projects','lifecycle_status','submitted','published','projects.manage','Publicar'),
('projects','lifecycle_status','submitted','draft','projects.update','Devolver'),
('projects','lifecycle_status','published','archived','projects.manage','Archivar'),
('projects','lifecycle_status','archived','published','projects.manage','Restaurar'),
-- organization_verifications
('organization_verifications','status','not_verified','pending','verifications.manage','Solicitar'),
('organization_verifications','status','pending','verified','verifications.verify','Verificar'),
('organization_verifications','status','pending','rejected','verifications.verify','Rechazar'),
('organization_verifications','status','verified','expired',NULL,'Caducar'),
('organization_verifications','status','verified','rejected','verifications.verify','Revocar'),
('organization_verifications','status','expired','pending','verifications.manage','Reevaluar'),
('organization_verifications','status','rejected','pending','verifications.manage','Reevaluar'),
-- verification_claims
('verification_claims','status','draft','submitted','verifications.manage','Enviar'),
('verification_claims','status','submitted','under_review','verifications.verify','En revisión'),
('verification_claims','status','under_review','approved','verifications.verify','Aprobar'),
('verification_claims','status','under_review','rejected','verifications.verify','Rechazar'),
('verification_claims','status','approved','expired',NULL,'Caducar'),
('verification_claims','status','approved','revoked','verifications.verify','Revocar'),
('verification_claims','status','expired','submitted','verifications.manage','Reevaluar'),
('verification_claims','status','rejected','submitted','verifications.manage','Reevaluar'),
('verification_claims','status','revoked','submitted','verifications.manage','Reevaluar'),
-- subscriptions
('subscriptions','status','trial','active',NULL,'Conversión'),
('subscriptions','status','trial','expired',NULL,'Prueba caducada'),
('subscriptions','status','active','past_due',NULL,'Pago pendiente'),
('subscriptions','status','past_due','active',NULL,'Pago regularizado'),
('subscriptions','status','active','cancelled',NULL,'Cancelación'),
('subscriptions','status','past_due','cancelled',NULL,'Cancelación'),
('subscriptions','status','cancelled','active',NULL,'Reactivación'),
('subscriptions','status','active','expired',NULL,'Expiración'),
('subscriptions','status','past_due','expired',NULL,'Expiración'),
('subscriptions','status','cancelled','expired',NULL,'Expiración'),
-- documents
('documents','status','pending','verified','documents.verify','Verificar'),
('documents','status','pending','rejected','documents.verify','Rechazar'),
('documents','status','verified','expired',NULL,'Caducar'),
('documents','status','expired','pending','documents.manage','Reevaluar'),
('documents','status','rejected','pending','documents.manage','Reevaluar'),
-- evidence
('evidence','status','pending','verified','evidence.verify','Verificar'),
('evidence','status','pending','rejected','evidence.verify','Rechazar'),
('evidence','status','verified','expired',NULL,'Caducar'),
('evidence','status','expired','pending','evidence.manage','Reevaluar'),
('evidence','status','rejected','pending','evidence.manage','Reevaluar');

-- ============================================================================
-- PARTE 20: ROW-LEVEL SECURITY (aislamiento multi-tenant)
-- ----------------------------------------------------------------------------
-- El backend debe fijar por petición:
--   SET app.current_org = '<uuid>';
--   SET app.current_user = '<uuid>';
--   SET app.is_platform_admin = 'true' (solo staff de plataforma)
-- La app se conecta con un rol NO propietario (no SUPERUSER ni BYPASSRLS).
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

-- Tablas con columna organization_id: aislar por organización.
DO $$
DECLARE
  t TEXT;
  org_tables TEXT[] := ARRAY[
    'organization_locations','organization_memberships','api_keys','system_settings',
    'evidence','documents','organization_verifications','verification_claims',
    'projects','client_relations','client_invites',
    'reviews','review_responses','review_disputes','review_resolutions',
    'antifraud_signals',
    'campaigns','review_requests','public_badges','subscriptions','invoices',
    'payments','notifications','analytics_events',
    'audit_logs','verification_events'
  ];
BEGIN
  FOREACH t IN ARRAY org_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (organization_id = app_current_org() OR app_is_platform_admin())',
      'rls_' || t, t
    );
  END LOOP;
END $$;

-- organizations: aislamiento por id.
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_organizations ON organizations
  USING (id = app_current_org() OR app_is_platform_admin());

-- Tablas hijas sin organization_id: derivar el acceso desde su padre.
ALTER TABLE project_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_project_verifications ON project_verifications
  USING (EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_verifications.project_id
      AND (p.organization_id = app_current_org() OR app_is_platform_admin())
  ));

ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_review_reports ON review_reports
  USING (EXISTS (
    SELECT 1 FROM reviews r
    WHERE r.id = review_reports.review_id
      AND (r.organization_id = app_current_org() OR app_is_platform_admin())
  ));

ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_moderation_actions ON moderation_actions
  USING (EXISTS (
    SELECT 1 FROM reviews r
    WHERE r.id = moderation_actions.review_id
      AND (r.organization_id = app_current_org() OR app_is_platform_admin())
  ));

ALTER TABLE resolution_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_resolution_messages ON resolution_messages
  USING (EXISTS (
    SELECT 1 FROM review_resolutions rr
    WHERE rr.id = resolution_messages.resolution_id
      AND (rr.organization_id = app_current_org() OR app_is_platform_admin())
  ));

-- claim_evidence / decision_evidence: derivar acceso desde la claim.
ALTER TABLE claim_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_claim_evidence ON claim_evidence
  USING (EXISTS (
    SELECT 1 FROM verification_claims c
    WHERE c.id = claim_evidence.claim_id
      AND (c.organization_id = app_current_org() OR app_is_platform_admin())
  ));

ALTER TABLE decision_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_decision_evidence ON decision_evidence
  USING (EXISTS (
    SELECT 1 FROM verification_decisions d
    JOIN verification_claims c ON c.id = d.claim_id
    WHERE d.id = decision_evidence.decision_id
      AND (c.organization_id = app_current_org() OR app_is_platform_admin())
  ));

ALTER TABLE verification_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_verification_decisions ON verification_decisions
  USING (EXISTS (
    SELECT 1 FROM verification_claims c
    WHERE c.id = verification_decisions.claim_id
      AND (c.organization_id = app_current_org() OR app_is_platform_admin())
  ));

-- sessions / refresh_tokens / tokens de usuario: aislamiento por usuario.
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_sessions ON sessions
  USING (user_id = app_current_user() OR app_is_platform_admin());

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_refresh_tokens ON refresh_tokens
  USING (user_id = app_current_user() OR app_is_platform_admin());

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_user_notifications ON user_notifications
  USING (user_id = app_current_user() OR app_is_platform_admin());

-- ============================================================================
-- PARTE 21: VISTAS (fuente de verdad / agregados)
-- ============================================================================

-- Estado global de verificación de la organización (fuente de verdad).
CREATE OR REPLACE VIEW v_organization_verification_status AS
SELECT
  ov.organization_id,
  BOOL_AND(ov.status = 'verified') AS all_scopes_verified,
  BOOL_OR(ov.status = 'verified')  AS any_scope_verified,
  BOOL_OR(ov.status = 'pending')   AS has_pending,
  COUNT(*) FILTER (WHERE ov.status = 'verified') AS verified_scopes,
  COUNT(*) AS total_scopes,
  MIN(ov.expires_at) FILTER (WHERE ov.status = 'verified') AS next_expiry
FROM organization_verifications ov
GROUP BY ov.organization_id;

-- Estadísticas de campaña (agregados recalculables; no confiar en contadores cache).
CREATE OR REPLACE VIEW v_campaign_stats AS
SELECT
  c.id AS campaign_id,
  c.organization_id,
  COUNT(rr.id) FILTER (WHERE rr.status IN ('sent','opened','clicked','reviewed')) AS sent_count,
  COUNT(rr.id) FILTER (WHERE rr.opened_at IS NOT NULL) AS opened_count,
  COUNT(rr.id) FILTER (WHERE rr.reviewed_at IS NOT NULL) AS reviewed_count
FROM campaigns c
LEFT JOIN review_requests rr ON rr.campaign_id = c.id
GROUP BY c.id, c.organization_id;
