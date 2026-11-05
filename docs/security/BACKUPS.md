# Backups, restauración y retención

## Política operativa

- **Proveedor**: PostgreSQL gestionado en Render.
- **Backups automáticos**: Render debe mantener backups diarios con retención mínima de 7 días y point-in-time recovery (PITR) si el plan lo permite.
- **Cifrado**: backups cifrados en reposo por el proveedor y en tránsito mediante TLS.
- **Acceso**: solo el propietario de la base de datos y el responsable de operaciones.
- **Frecuencia mínima aceptada**: 1 backup diario; para lanzamientos con migraciones, backup manual previo.

## Procedimiento previo a migraciones

1. Verificar el backup más reciente en Render.
2. Registrar la versión de migraciones (`GET /api/health`, campo `migrations`).
3. Ejecutar `npx prisma migrate deploy` con `DATABASE_URL` de producción.
4. Verificar `/api/health` y un login/consulta crítica.

## Restauración probada

La restauración debe probarse al menos **trimestralmente** en una base temporal:

1. Crear una base PostgreSQL temporal.
2. Restaurar el último backup o punto PITR.
3. Ejecutar `npx prisma migrate status` y comprobar que no hay migraciones pendientes.
4. Ejecutar los tests E2E contra la base restaurada.
5. Registrar fecha, responsable, duración y resultado.

No se considera válido un backup que no haya sido restaurado al menos una vez.

## Retención

| Dato | Retención | Observación |
|---|---|---|
| Backups de base de datos | 7-30 días | Según plan de Render |
| `auth_attempts` | 90 días | Script `db:retention` |
| Tokens caducados | Hasta caducidad + limpieza diaria | Script `db:retention` |
| Reseñas sin confirmar | 7 días | Script `db:retention` |
| Invitaciones caducadas | Hasta caducidad + limpieza diaria | Script `db:retention` |
| Evidencias y verificaciones | Según obligación legal/contractual | No borrar sin revisión legal |
| Eventos de auditoría | Append-only | No se eliminan desde la aplicación |

## Responsable

El equipo legal y el responsable de operaciones deben validar esta política antes de considerarla definitiva.
