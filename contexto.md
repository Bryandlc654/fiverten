# contexto.md — FIVERTEN (estado al 2026-10-16)

## 1. Objetivo
SaaS multiempresa (multitenant) de **reseñas y reputación**, tipo Trustpilot. Las empresas tienen perfil público, reciben reseñas, las responden, resuelven las negativas antes de que se publiquen (es el diferencial del producto), envían solicitudes de reseña (enlace, QR, campañas) y contratan planes. Roles: Super Admin (plataforma), Admin Tenant (empresa) y cliente final. Alcance completo en `alcance.txt`; documentación funcional en `documentacion.txt` y `ESTADO_IMPLEMENTACION_FIVERTEN.md`.

## 2. Tecnologías y arquitectura
- **Backend** `backend/`: NestJS 10, Prisma 5, PostgreSQL 16, passport-jwt, Argon2id (`@node-rs/argon2`; bcrypt solo como formato antiguo), nodemailer, `@aws-sdk/client-s3` (Cloudflare R2), helmet, throttler. Prefijo global `/api`, puerto 4000.
- **Frontend** `frontend/`: Next.js 14 (App Router), React 18, Tailwind, Playwright. Proxy same-origin `/api/*` hacia `API_PROXY_TARGET` (`next.config.mjs`).
- **Producción**: front y back en Render; base de datos en Neon. Local: `docker-compose.yml` levanta solo Postgres 16 (usuario y contraseña postgres/postgres, BD `fiverten`, puerto 5432).
- **Multitenancy**: Row-Level Security de Postgres. La app se conecta con el rol no propietario `fiverten_app` (`APP_DATABASE_URL`). `PrismaService.withContext({userId, orgId, isPlatformAdmin}, fn)` fija `app.current_user`, `app.current_org` y `app.is_platform_admin` con `set_config(...,true)` dentro de una transacción.
- **Sesión**: access JWT de 15 min guardado en memoria en el front + refresh token en cookie httpOnly (`fiverten_refresh`), con rotación y detección de reutilización (familyId).

## 3. Archivos importantes
- `backend/prisma/schema.prisma`: 11 modelos (Organization, User, Role, Permission, RolePermission, OrganizationMembership, Session, RefreshToken, EmailVerification, PasswordResetToken, AuthAttempt).
- `backend/prisma/rls/setup.sql` + `apply.ts`: políticas RLS (solo para organizations, organization_memberships, sessions y refresh_tokens) y permisos del rol `fiverten_app`.
- `backend/prisma/seed.ts`: crea el super admin (`ADMIN_EMAIL`/`ADMIN_PASSWORD`; tiene valores por defecto en el código). `retention.ts`: limpieza de datos antiguos.
- `backend/src/auth/auth.service.ts` (889 líneas): registro, login, refresh, logout, verificación de correo, recuperación de contraseña, sesiones.
- `backend/src/organizations/organizations.service.ts` (629 líneas): lógica del tenant (empresa y miembros) y del super admin (stats, empresas, usuarios).
- `backend/src/auth/guards/*`: `JwtAuthGuard`, `RolesGuard` (`@Roles`), `PlatformAdminGuard` (`@PlatformAdmin`). Jerarquía en `src/common/roles.ts`: owner(50) > admin(40) > manager(30) > editor(20) > viewer(10).
- `backend/src/app.setup.ts`: helmet, CORS, ValidationPipe estricto, chequeo de Origin contra CSRF, `trust proxy`.
- `backend/src/media/*`: subida de la portada a R2 (responde 503 si faltan las variables R2).
- `frontend/lib/api.ts` (cliente API y tipos), `lib/auth-context.tsx` (sesión), `lib/roles.ts`.
- `frontend/app/`: login, register, forgot/reset-password, verify-email, dashboard (+ company, users), admin (+ organizations/[id]). `components/DashboardShell.tsx`, `PlatformDashboard.tsx`.
- `modelo_bd_fiverten_completo.sql` / `.dbml` / `.md` / `_erd.mmd`: diseño de la BD **completa** (57 tablas); la referencia para los módulos futuros.

## 4. Estado real
Sin verificar = leído en el código o en la documentación, pero no ejecutado en esta sesión (no se instalaron dependencias ni se corrieron tests).
- **Implementado (sin verificar)**:
  - Autenticación completa, con bloqueo tras intentos fallidos y verificación de correo opcional (`REQUIRE_EMAIL_VERIFICATION`).
  - Perfil de empresa y portada.
  - CRUD de miembros con control de roles.
  - Panel de super admin: stats, listar/crear/editar empresas, listar/editar usuarios.
  - RLS, rate limit, tests e2e (backend: auth, mail, members, rls, email-verification; frontend: login, register, admin).
- **A medias**: el dashboard del tenant usa datos de ejemplo; la home pública es básica; la subida de portada no funciona hasta configurar R2.
- **Pendiente (nada empezado)**:
  - Reseñas y sus estados (PENDING, PUBLISHED, UNDER_REVIEW, RESOLUTION, RESOLVED, REJECTED, REPORTED, HIDDEN).
  - Perfil público `/empresa/:slug` y formulario `/review/:slug`.
  - Flujo de resolución, respuestas de la empresa, solicitudes, campañas y QR.
  - Planes, suscripciones y pagos; moderación y reportes.
  - Verificación de empresas (reclamo → verificación); configuración (categorías, países, plantillas).

## 5. Cambios en esta sesión
- Se clonó `https://github.com/Bryandlc654/fiverten.git` en `D:\Escritorio\fiverten` (rama `main`, HEAD `e4e4c4b`, árbol limpio).
- Se hizo un análisis del proyecto en modo solo lectura.
- Se creó este `contexto.md`, que queda sin commitear. No se modificó ningún otro archivo.

## 6. Decisiones técnicas existentes (del código)
- RLS en la BD en lugar de solo filtros en la app, como defensa en profundidad. En producción `DB_RLS_ENABLED=true` es obligatorio. Con PgBouncer hay que usar modo transaction y `?pgbouncer=true`.
- Proxy same-origin `/api` en Next para evitar cookies cross-site entre dominios `*.onrender.com`.
- Las imágenes se reducen en el front antes de subirlas; se guardan en R2.
- Paginación del panel admin con `DefaultValuePipe`, para evitar el 400 cuando faltan `page`/`pageSize` (commit 0191f84).
- `start:prod` apunta a `dist/src/main.js`.
- Al super admin no se le muestra "Empresa" en el menú, porque no tiene organización.

## 7. Problemas detectados — CORREGIDOS (2026-10-16, sin commitear)
1. **Alta directa de miembros** → sustituida por invitaciones (`organization_invitations`, migración `20261016120000`). `POST /organizations/me/invitations` (manager+), `GET`/`DELETE` para listar/cancelar; el invitado usa `POST /invitations/preview|accept|accept-existing` (token en el cuerpo, de un solo uso, 72 h `INVITATION_TTL_HOURS`). Nadie fija la contraseña de otro; el super admin también invita al propietario (`ownerPassword` eliminado). Página `/accept-invitation`.
2. **Refresh no atómico** → `updateMany where {id, isUsed:false, revokedAt:null}`; si `count !== 1` se trata como reutilización. El front hace refresh de un solo vuelo (`lib/api.ts`) para no disparar esto con StrictMode.
3. **Login con diferencia de tiempo** → hash ficticio (`common/passwords.ts` `burnPasswordCheck`); "bloqueada"/"inactiva" solo se revelan con la contraseña correcta; el registro hashea antes de comprobar; forgot-password no espera al envío del correo.
4. **Rol desde el JWT** → `JwtStrategy` lee membresía y rol de la BD en cada petición; degradar/expulsar surte efecto inmediato.
5. **RLS** → ahora en todas las tablas (users con SELECT ampliado a miembros de la org y escritura solo propia; tokens; auth_attempts; permissions; invitations). Helpers `tenantTablePolicy`/`userTablePolicy` en `setup-statements.ts`; `setup.sql` se genera con `npm run db:rls:sql`; `test/rls.e2e-spec.ts` falla si alguna tabla nueva no tiene RLS. Todas las consultas a `users` llevan contexto explícito.
6. **Deuda técnica** → `admin/` es un módulo propio (`AdminService`); `organizations.service.ts` solo tenant + `invitations.service.ts` + `organizations.mappers.ts`. `frontend/middleware.ts` protege `/dashboard` y `/admin` con la cookie indicadora `fiverten_session` (path `/`, la fija el backend junto al refresh). Páginas divididas en `components/{dashboard,admin,users,ui}`.

Verificado: 65 tests e2e de backend en verde (también la suite completa con la app conectada como `fiverten_app` y RLS real), `tsc`/eslint/`next build` limpios, y flujo probado a mano en el navegador (middleware, invitar, aceptar con cuenta nueva, alta de empresa con propietario invitado). No se corrieron los e2e de Playwright.

## 7b. Perfil público y reseñas (2026-10-16, rama `feat/perfil-publico-y-resenas`, creada desde `fix/seguridad-y-calidad`, sin commitear)
- Modelos `Review` y `ReviewResponse` (migración `20261016231311_reviews`, con los CHECK del modelo completo). Estados como en el `.sql` completo (lifecycle / verification / visibility / moderation); el estado visible se deriva en `reviews.mappers.ts`.
- Flujo: formulario público `/review/:slug` → la reseña queda pendiente → email con enlace `/confirmar-resena?token=` (7 días) → se publica sola, salvo señales antifraude (≥3 reseñas desde la misma IP a la misma empresa en 24 h, o enlaces en el texto), que la dejan `under_review`. Antifraude MVP: throttle 5/min, honeypot `website`, 1 reseña por email y empresa cada 30 días.
- Perfil `/empresa/:slug` (solo si `isPublic`): media, distribución, filtros por estrellas, más recientes/antiguas, respuestas de la empresa, contacto solo si `allowContact`. El nombre se muestra como "Nombre I." y nunca se exponen ni el email ni la IP.
- Panel `/dashboard/reviews`: resumen, enlace para compartir, filtros por estado y estrellas, responder/editar/retirar (editor+). "Últimas opiniones" del resumen ya usa datos reales.
- RLS: `tenantTablePolicy` en reviews y review_responses + política SELECT pública solo para lo publicado.
- API pública bajo `/api/public/...`; tenant bajo `/api/organizations/me/reviews`.
- Arreglo transversal: `lib/api.ts` espera a la restauración inicial de sesión antes de las peticiones privadas (en una carga completa, las páginas pedían datos sin token y recibían 401).
- Verificado: 87 tests e2e del backend (y la suite de reseñas también con RLS real), lint, `next build` y flujo completo a mano en el navegador (escritorio y móvil).
- Pendiente de este módulo: flujo de resolución de reseñas negativas (punto 7/9 del alcance), reportes y moderación del super admin (las `under_review` aún no tienen pantalla), imagen en la reseña, CAPTCHA, perfil renderizado en servidor (SEO).

## 7c. Estados y moderación de reseñas (2026-10-16, misma rama, sin commitear)
- Tablas del modelo completo: `report_reasons` (8 motivos del alcance, cargados en la migración `20261016235706_review_moderation`), `review_reports` y `moderation_actions` (historial). RLS: catálogo legible por todos; reportes e historial solo plataforma (`platformTablePolicy`/`catalogTablePolicy`).
- Máquina de estados explícita en `backend/src/reviews/review-states.ts`: pending → published | under_review; published → reported (sigue visible); under_review → published | rejected; published/reported → hidden; reported → published (descartar reportes); hidden/rejected → published (restaurar). Ocultar y rechazar exigen motivo. Toda transición, incluidas las automáticas, queda en `moderation_actions`.
- Reportar: visitantes desde el perfil público (throttle 3/min, sin duplicados por IP) y empresas desde su panel (manager+). La empresa no puede ocultar reseñas.
- Super admin: `/admin/reviews` (cola por estado con contadores, señales antifraude, reportes, historial y acciones), menú "Reseñas" y acceso rápido en su resumen. `GET /api/admin/stats` incluye contadores de reseñas.
- Verificado: 101 tests e2e de backend (moderación también con RLS real), lint, build y flujo a mano (reportar, rechazar, descartar reportes, historial).
- Pendiente: avisar por email al autor cuando se oculta o rechaza su reseña; flujo de resolución (RESOLUTION/RESOLVED).

## 7d. Respuestas y filtros + preparación de la presentación (2026-10-17, misma rama, sin commitear)
- Filtros nuevos (`backend/src/reviews/reviews.params.ts`): `period` = 30d/90d/365d y `sort` = recent/oldest/highest/lowest, en el perfil público y en el panel; en el panel también `answered` = yes/no. En el frontend van en `lib/review-filters.ts`.
- La media se muestra con un decimal ("4,0").
- Arreglo: confirmar la reseña y verificar el email se hacen una sola vez por token (`once` en `lib/api.ts`). En desarrollo, StrictMode duplicaba la llamada y la pantalla mostraba "enlace no válido" aunque la reseña sí se había publicado.
- Datos de demo: `npm run db:seed:demo` crea (o reinicia) "Clínica Dental Sonrisa" en `/empresa/clinica-dental-sonrisa`: pública, verificada, 14 reseñas de 1 a 5★ repartidas en 14 meses, 6 con respuesta. Acceso del propietario: `demo@clinica-sonrisa.test` / `Demo12345!` (configurable con DEMO_EMAIL/DEMO_PASSWORD).
- Verificado: 104 tests e2e de backend, `next build` y el recorrido completo de la demo en el navegador.

### Guion de presentación
1. `/empresa/clinica-dental-sonrisa`: cabecera con la insignia de verificada, media 4,0, 14 reseñas, distribución de estrellas (clic en una barra = filtro).
2. Filtros: chips de estrellas, "Último mes / 3 meses / año" y orden "Más recientes / Más antiguas / Mejor / Peor valoradas"; se combinan.
3. "Escribir una reseña" → formulario (estrellas, título, texto, fecha de la experiencia, nº de pedido, consentimiento) → "Revisa tu correo".
4. Enlace de confirmación. Con MAIL_TRANSPORT=log aparece en el log del backend: `/confirmar-resena?token=...` → publicada, y sube el total.
5. Acceso empresas con la cuenta demo → Opiniones → filtro "Sin responder" → Responder → la respuesta aparece bajo la reseña en el perfil público.
6. (Opcional) Reportar una reseña y moderarla desde el super admin en `/admin/reviews`.
Antes de presentar: `npm run db:seed:demo` para partir de la demo limpia.

## 8. Dónde nos quedamos
Perfil público y recepción de reseñas implementados sin commitear en `feat/perfil-publico-y-resenas`. El PR de `fix/seguridad-y-calidad` sigue sin fusionar.

## 9. Próximos pasos (por prioridad)
1. En producción: `prisma migrate deploy` + `npm run db:rls` (nuevas políticas) y añadir `INVITATION_TTL_HOURS` si se quiere otro valor. Correr los e2e de Playwright.
2. Flujo de resolución de reseñas negativas (estados RESOLUTION/RESOLVED).
3. SSR del perfil público para SEO.
4. Dashboard del tenant con datos reales (hoy usa `components/dashboard/sample-data.ts`).
5. Solicitudes, campañas y QR; después planes y pagos; después moderación.

## 10. Comandos
```
# BD local
docker compose up -d
# Backend (cd backend; copiar .env.example a .env)
npm install
npm run prisma:generate
npm run prisma:migrate        # dev | prisma:deploy en prod
npm run db:rls                # aplica las políticas RLS y la contraseña del rol fiverten_app
npm run db:seed               # super admin
npm run start:dev             # http://localhost:4000/api
npm test                      # e2e con jest; usa TEST_DATABASE_URL o la BD fiverten_test (hay que crearla)
npm run lint && npm run typecheck && npm run format:check
npm run build && npm run start:prod
npm run db:retention
# Frontend (cd frontend; copiar .env.example a .env.local)
npm install
npm run dev                   # http://localhost:3000
npm run e2e                   # Playwright
npm run lint && npm run typecheck && npm run build
```
El despliegue se hace en Render (front + back) con Neon. No hay `render.yaml` en el repo; la configuración vive en el panel de Render y no se revisó.

## 11. Restricciones e instrucciones
- Comunicarse con el usuario en **español**. El código y los comentarios del repo están en español y sin tildes en los comentarios; seguir ese estilo.
- Commits con prefijos convencionales (`feat(...)`, `fix(...)`, `chore:`), en español. Solo commitear o hacer push si el usuario lo pide.
- Toda consulta del tenant debe pasar por `prisma.withContext(...)` con el contexto correcto. Toda tabla nueva necesita su política RLS.
- En producción: `DB_RLS_ENABLED=true` y secretos JWT y de BD fuertes. No commitear `.env`.
- Entorno: Windows 11, PowerShell o Git Bash. `node_modules` no está instalado en ninguna de las dos carpetas.
