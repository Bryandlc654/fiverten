# Row-Level Security (RLS)

## Estado actual del código

- Existen políticas RLS para todas las tablas con datos de tenant.
- Existe un test (`backend/test/rls.e2e-spec.ts`) que comprueba que todas las tablas públicas tienen RLS.
- La aplicación fija por transacción `app.current_user`, `app.current_org` e `app.is_platform_admin`.

## Activación en producción

La base de datos de producción necesita el rol de aplicación y las políticas aplicadas:

```bash
# 1. Crear/actualizar el rol y aplicar políticas (rol propietario)
APP_DB_PASSWORD="<password-fuerte>" npm run db:rls

# 2. Configurar en Render:
DB_RLS_ENABLED=true
APP_DB_PASSWORD=<password-fuerte>
APP_DATABASE_URL=postgresql://fiverten_app:<password-fuerte>@<host-externo>/appfiverten?sslmode=require
```

Sin `APP_DATABASE_URL` apuntando al rol `fiverten_app`, la aplicación puede conectar como propietario y **RLS no se aplica** aunque las políticas existan.

## Comprobación

```sql
SELECT rolname FROM pg_roles WHERE rolname = 'fiverten_app';
SELECT tablename, COUNT(*) FROM pg_policies GROUP BY tablename ORDER BY tablename;
```

Y ejecutar los tests de aislamiento:

```bash
npm test -- rls.e2e-spec.ts
```

## Auditoría append-only

La migración `20261112170000_security_hardening` crea triggers que impiden `UPDATE` y `DELETE` sobre `verification_events` y `moderation_actions`. El rol de aplicación también pierde esos privilegios en `setup-statements.ts`.

## Error de autenticacion al desplegar

Si Render muestra `PrismaClientInitializationError: Authentication failed`, la app
esta usando `APP_DATABASE_URL` (porque `DB_RLS_ENABLED=true`) y esas credenciales
no son validas. Comprobaciones:

1. `APP_DATABASE_URL` debe incluir usuario y contrasena:
   `postgresql://fiverten_app:<APP_DB_PASSWORD>@<host>/<base>?sslmode=require`.
2. La contrasena debe ser exactamente la misma que `APP_DB_PASSWORD`.
3. Si la contrasena tiene caracteres especiales, codificalos en la URL
   (`@` -> `%40`, `#` -> `%23`, `%` -> `%25`, `:` -> `%3A`).
4. Si el rol no existe o cambiaste la contrasena, vuelve a aplicarlo con el rol
   propietario:

   ```bash
   APP_DB_PASSWORD="<password>" DATABASE_URL="<url-del-propietario>" npm run db:rls
   ```

Al arrancar, el backend registra que conexion usa sin mostrar secretos:

```
[Bootstrap] Base de datos: APP_DATABASE_URL - host <host> - usuario fiverten_app
```
