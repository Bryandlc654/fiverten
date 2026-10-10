# Modelo de Base de Datos — FIVERTEN (Revisión 2)

**Plataforma de reputación verificable (CLAIM → PROOF)**
Basado en `alcance.txt` y `documentacion.txt`.

| Atributo | Valor |
|---|---|
| Motor | PostgreSQL 13+ |
| Tablas | 57 |
| Normalización | 3NF |
| Clave primaria | UUID v4 (`gen_random_uuid()`) |
| Multi-tenant | `organization_id` + **Row-Level Security (RLS)** |
| Autorización | RBAC único vía `role_id` (sin duplicar permisos) |
| IDs públicos | `public_id` opaco (ej. `FT-8K4M2-X9P`) |
| Máquina de estados | Catálogo `state_transitions` + trigger de validación |
| Trazabilidad | `verification_claims` → `claim_evidence` → `verification_decisions` → `decision_evidence` |

> Esta revisión incorpora las correcciones acordadas antes de desarrollar: FKs completas, aislamiento multitenant con RLS, máquina de estados, endurecimiento de credenciales/tokens, restricciones de integridad reales y decisiones de arquitectura. Además refuerza la trazabilidad CLAIM → PROOF.

---

## Índice de correcciones aplicadas

1. [Claves foráneas completas](#1-claves-foráneas-completas)
2. [Seguridad multi-tenant (RLS)](#2-seguridad-multi-tenant-rls)
3. [Máquina de estados](#3-máquina-de-estados)
4. [Credenciales y tokens](#4-credenciales-y-tokens)
5. [Restricciones de integridad](#5-restricciones-de-integridad)
6. [Decisiones de arquitectura](#6-decisiones-de-arquitectura)
7. [Trazabilidad CLAIM → PROOF](#7-trazabilidad-claim--proof)
8. [Resumen de tablas](#8-resumen-de-tablas)

---

## 1. Claves foráneas completas

Se hizo una auditoría de **todas** las columnas que representan relaciones. En esta revisión las FKs se declaran de forma centralizada en la sección `PARTE 16: CLAVES FORÁNEAS` del SQL (134 restricciones), tras crear todas las tablas, para evitar problemas de orden y garantizar cobertura.

Casos que antes faltaban y ahora están cubiertos:

| Tabla | Columnas corregidas |
|---|---|
| `organizations` | `sector_id`, `country_id`, `created_by`, `updated_by`, `deleted_by` |
| `organization_locations` | `country_id` |
| `users` | `default_organization_id`, `created_by`, `updated_by`, `deleted_by` |
| `role_permissions` | `created_by` |
| `projects` | `created_by`, `updated_by` |
| `documents` | `reviewed_by` |
| `system_settings` | `created_by`, `updated_by` |
| `refresh_tokens` | `replaced_by_token_id` |
| `api_keys` | `revoked_by` |
| `verification_events` | `claim_id`, `decision_id`, `evidence_id`, `document_id`, `project_id`, `review_id`, `actor_id`, `methodology_version_id` |
| `review_disputes` | `resolved_by` |
| `sectors` | `parent_id` (autorreferencia) |

Reglas de borrado coherentes con el rol de cada relación: `CASCADE` en hijos dependientes, `RESTRICT` donde no debe eliminarse el padre (p. ej. `subscriptions.plan_id`), `SET NULL` en referencias opcionales.

---

## 2. Seguridad multi-tenant (RLS)

Tener `organization_id` no basta. Se añade **Row-Level Security** en PostgreSQL como defensa adicional (defense in depth). El backend debe fijar por petición:

```sql
SET app.current_org = '<uuid-de-la-organizacion>';
SET app.current_user = '<uuid-del-usuario>';
SET app.is_platform_admin = 'true';   -- solo staff de plataforma
```

Funciones de apoyo:

- `app_current_org()` → organización activa.
- `app_current_user()` → usuario activo.
- `app_is_platform_admin()` → bypass legítimo del staff FIVERTEN.

Políticas aplicadas:

- **Tablas con `organization_id`** (26 tablas): `USING (organization_id = app_current_org() OR app_is_platform_admin())`.
- **`organizations`**: `USING (id = app_current_org() OR app_is_platform_admin())`.
- **Tablas hijas sin `organization_id`** (`project_verifications`, `review_reports`, `moderation_actions`, `resolution_messages`, `claim_evidence`, `decision_evidence`, `verification_decisions`): política derivada mediante `EXISTS` a la tabla padre.
- **Tablas de usuario** (`sessions`, `refresh_tokens`, `user_notifications`): `USING (user_id = app_current_user() OR app_is_platform_admin())`.

Requisitos operativos:
- La aplicación se conecta con un rol **no propietario y sin `BYPASSRLS`/`SUPERUSER`**.
- La autorización por organización debe aplicarse **también** en la capa de aplicación (RLS es una red de seguridad, no la única).
- **Permisos de plataforma y de organización separados:** `permissions.scope` distingue `platform`, `organization` y `own`; los roles de plataforma tienen `roles.scope = 'platform'` y `organization_id = NULL`.
- **Coherencia entre entidades:** todas las entidades hijas (respuesta, disputa, resolución, reporte) referencian la misma `review_id`, que fija la organización; las políticas derivadas impiden cruzar tenants.
- **Datos sensibles:** documentos y evidencia quedan cubiertos por RLS y por control de visibilidad (`private|restricted|public`).

---

## 3. Máquina de estados

Se define un catálogo `state_transitions (entity_type, field, from_value, to_value, required_permission)` y un trigger genérico `enforce_state_transition()` que **rechaza en la base de datos** cualquier transición no declarada.

Se valida en:

`reviews.lifecycle_status`, `reviews.verification_status`, `reviews.moderation_status`, `projects.lifecycle_status`, `organization_verifications.status`, `verification_claims.status`, `subscriptions.status`, `documents.status`, `evidence.status`.

### Respuestas a las dudas planteadas

**¿Puede una reseña estar publicada, oculta y verificada a la vez?**
No puede estar **publicada y oculta**: la restricción `reviews_hidden_visibility_check` lo impide (`moderation_status='hidden'` ⇒ `visibility<>'public'`). **Sí** puede estar publicada y verificada, porque son dimensiones independientes.

**La verificación no desaparece por moderación.** `verification_status` solo cambia mediante el flujo de verificación; una decisión de moderación no lo altera. Y **publicar no implica autenticidad**: `published` no exige `verified`.

### Transiciones de reseña (extracto)

| Dimensión | Transiciones permitidas |
|---|---|
| `lifecycle_status` | draft→submitted, submitted→published, submitted→draft, published→archived, archived→published |
| `verification_status` | not_verified→pending, pending→verified, pending→rejected, verified→expired, verified→pending, expired→pending, rejected→pending |
| `moderation_status` | none→reported, reported→under_review, under_review→{resolved,rejected,hidden}, hidden→none, resolved→none, rejected→none |

El catálogo completo está sembrado en la sección `PARTE 19` del SQL.

---

## 4. Credenciales y tokens

| Elemento | Antes | Ahora |
|---|---|---|
| Token de sesión | `sessions.session_token` (texto) | `sessions.session_token_hash` (**hash**) |
| Secreto MFA | `users.mfa_secret` | `users.mfa_secret_encrypted` (**cifrado reversible**, clave en KMS/vault) |
| Intentos de auth | — | `auth_attempts` (rate limiting y bloqueo) |
| Reuso de refresh | `family_id` | `family_id` + `replaced_by_token_id` + `sessions.compromised_at` |
| Bloqueo de cuenta | — | `users.failed_login_count`, `users.locked_until` |

Notas:
- **`session_token_hash`** nunca es recuperable; el token en claro solo lo conoce el cliente.
- **`mfa_secret_encrypted`** se cifra a nivel aplicación con una clave externa a la BD (no es un hash, porque debe recuperarse para validar TOTP).
- **Rotación y detección de reuso:** cada refresh token pertenece a una `family_id`; al usarse se marca `is_used`, se enlaza con `replaced_by_token_id` y, si se detecta reutilización de un token ya usado, se marca `sessions.compromised_at` y se revoca la familia.
- **Protección ante intentos repetidos:** `auth_attempts` + `failed_login_count` + `locked_until`.

---

## 5. Restricciones de integridad

Reglas que antes solo estaban en notas, ahora son restricciones reales:

| Tabla | Restricción |
|---|---|
| `reviews` | `rating BETWEEN 1 AND 5`; `hidden ⇒ visibility<>'public'`; `published ⇒ published_at IS NOT NULL` |
| `documents` | `expiry_date >= issue_date` (cuando ambas existen) |
| `evidence` | `expiry_date >= issue_date` (cuando ambas existen) |
| `projects` | `end_date >= start_date`; `year` en rango válido |
| `subscriptions` | `current_period_end > current_period_start` (cuando ambas) |
| `plans` | `price >= 0` |
| `plan_limits` | `limit_value >= 0` |
| `invoices` | `subtotal, tax, total >= 0`; `due_at >= issued_at` |
| `invoice_items` | `quantity > 0`; `unit_price >= 0`; `amount >= 0` |
| `payments` | `amount >= 0` |
| `organization_locations` | latitud `-90..90`, longitud `-180..180` |
| `antifraud_signals` | `score` en `0..100` |
| `client_relations` | `consent ⇒ consent_at IS NOT NULL` |
| `user_notifications` | `is_read ⇒ read_at IS NOT NULL` |
| `campaigns` | contadores `>= 0` |
| `verification_decisions` | `valid_until > valid_from` |

Valores permitidos para estados/tipos/canales: validados con `CHECK` en todas las columnas de estado (no se confía en el frontend).

---

## 6. Decisiones de arquitectura

| Área | Decisión |
|---|---|
| **Usuarios y permisos** | **RBAC único** vía `organization_memberships.role_id` (NOT NULL). Se eliminan `member_role` y `permissions` JSONB que se solapaban. `roles.base_role` (admin/editor/viewer) da el rol de negocio subyacente. |
| **Verificaciones** | Fuente de verdad = `organization_verifications` (una fila por scope). `organizations.verification_status` es **caché** del estado global, recalculable con `v_organization_verification_status`; se marca `verification_computed_at`. |
| **Evidencias vs documentos** | `evidence` = **PROOF** (artefacto de prueba con `hash`; archivo o fuente externa). `documents` = **documento legal gestionado** (emisor, número, versión, vigencia, revisión); su archivo vive en una fila de `evidence` (`documents.evidence_id`). |
| **Campañas** | `total_sent/total_opened/total_reviews` son **agregados recalculables** (caché). Verdad = `v_campaign_stats` sobre `review_requests`. |
| **Facturación** | Moneda por organización (`organizations.billing_currency`) y por documento (`plans.currency`, `invoices.currency`, `payments.currency`). `countries.default_currency` para el valor por defecto. Soporte multimoneda en la misma BD. |
| **Plantillas** | Se **unifican** en `notification_templates` (canal-aware, incluye `email` con `html_body`/`text_body`). Se **elimina** `email_templates` para no duplicar responsabilidad. |
| **Auditoría** | `audit_logs` es **append-only**. Política de retención, acceso restringido por RLS y minimización de datos sensibles (ver abajo). |

### Política de auditoría (retención y acceso)

- `audit_logs` y `verification_events` son **append-only**: sin `updated_at`, sin borrado desde la app.
- Acceso restringido por RLS (organización + staff).
- Retención configurable vía `system_settings`; recomendado: 24 meses operativo, archivo/anonimización posterior.
- Los `old_values/new_values` no deben contener secretos ni datos personales innecesarios (minimización GDPR).

---

## 7. Trazabilidad CLAIM → PROOF

Se refuerza el flujo para poder **reconstruir por qué una empresa fue verificada, con qué pruebas y quién lo aprobó**, sin perder historial:

```
1. verification_claims     La empresa AFIRMA / solicita verificación (por scope).
2. claim_evidence          Evidencias (proof) que respaldan esa afirmación (N:M).
3. verification_decisions  Un revisor decide según una methodology_version, con
                           justificación. Append-only; encadena con previous_decision_id.
4. decision_evidence       Qué evidencias concretas se evaluaron en la decisión.
5. organization_verifications  Proyección del estado ACTUAL por scope (apunta a
                               current_decision_id).
6. verification_events     Bitácora inmutable de todas las transiciones.
```

Propiedades garantizadas:

- **Nunca se borra una decisión**: la reevaluación crea una nueva decisión enlazada por `previous_decision_id`.
- **Caducidad sin pérdida**: `valid_from`/`valid_until` y `expires_at`; el estado pasa a `expired` conservando el historial.
- **Revocación trazable**: se registra una decisión `revoked` con su `justification`.
- **FKs reales**: `verification_events` mantiene `entity_type`/`entity_id` para extensibilidad, pero añade FKs **tipadas** (`claim_id`, `decision_id`, `evidence_id`, `document_id`, `project_id`, `review_id`) para que el motor garantice integridad referencial.

Consulta de reconstrucción típica:

```sql
SELECT d.created_at, d.decision, d.justification,
       mv.version AS metodologia, u.email AS revisor,
       e.title AS evidencia, de.evaluation_notes
FROM verification_decisions d
JOIN verification_claims c   ON c.id = d.claim_id
LEFT JOIN methodology_versions mv ON mv.id = d.methodology_version_id
LEFT JOIN users u            ON u.id = d.reviewer_id
LEFT JOIN decision_evidence de ON de.decision_id = d.id
LEFT JOIN evidence e         ON e.id = de.evidence_id
WHERE c.organization_id = :org_id AND c.scope_code = :scope
ORDER BY d.created_at;
```

---

## 8. Resumen de tablas (57)

### Núcleo y seguridad
`organizations`, `organization_locations`, `users`, `roles`, `permissions`, `role_permissions`, `organization_memberships`, `sessions`, `refresh_tokens`, `password_reset_tokens`, `email_verifications`, `auth_providers`, `auth_attempts`, `api_keys`, `system_settings`, `audit_logs`, `methodology_versions`.

### Catálogos
`countries`, `languages`, `sectors`, `verification_scopes`, `report_reasons`, `review_policies`, `state_transitions`.

### Evidencia y verificación
`evidence`, `documents`, `verification_claims`, `claim_evidence`, `verification_decisions`, `decision_evidence`, `organization_verifications`, `verification_events`.

### Proyectos y clientes
`projects`, `project_verifications`, `client_relations`, `client_invites`.

### Reseñas y moderación
`reviews`, `review_responses`, `review_disputes`, `review_resolutions`, `resolution_messages`, `review_reports`, `moderation_actions`, `antifraud_signals`.

### Captación y sello
`campaigns`, `review_requests`, `public_badges`.

### Facturación
`plans`, `plan_limits`, `subscriptions`, `invoices`, `invoice_items`, `payments`.

### Notificaciones y analítica
`notification_templates`, `notifications`, `user_notifications`, `analytics_events`.

---

## 9. Vistas y funciones

| Objeto | Propósito |
|---|---|
| `v_organization_verification_status` | Estado global de verificación (fuente de verdad). |
| `v_campaign_stats` | Estadísticas de campaña recalculadas desde `review_requests`. |
| `update_updated_at_column()` | Trigger `updated_at`. |
| `enforce_state_transition()` | Valida transiciones contra `state_transitions`. |
| `app_current_org()`, `app_current_user()`, `app_is_platform_admin()` | Contexto de sesión para RLS. |

---

## 10. Antes de desarrollar (checklist)

- [ ] Conectar la app con un rol **no propietario** y sin `BYPASSRLS`.
- [ ] Fijar `app.current_org` / `app.current_user` en cada petición (transacción).
- [ ] Sembrar `permissions`, `roles` (con `base_role`), `verification_scopes` (con `is_required`) y `state_transitions`.
- [ ] Definir la clave de cifrado de `mfa_secret_encrypted` en un KMS externo.
- [ ] Definir retención de `audit_logs`/`verification_events` y anonimización GDPR.
- [ ] Revisar la moneda/facturación según mercados objetivo.
- [ ] Añadir pruebas que verifiquen que las transiciones inválidas son rechazadas por la BD.
