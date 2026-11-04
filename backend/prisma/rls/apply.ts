// ============================================================================
// Aplica la configuracion de RLS a la base de datos del backend.
// Uso: npm run db:rls   (requiere un rol propietario en DATABASE_URL)
// ============================================================================
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { APP_ROLE, APP_ROLE_PASSWORD, rlsStatements } from './setup-statements';

async function main(): Promise<void> {
  const admin = new PrismaClient();
  try {
    const existing = (await admin.$queryRawUnsafe(
      `SELECT 1 FROM pg_roles WHERE rolname = '${APP_ROLE}'`,
    )) as unknown[];

    if (existing.length === 0) {
      await admin.$executeRawUnsafe(
        `CREATE ROLE ${APP_ROLE} LOGIN PASSWORD '${APP_ROLE_PASSWORD}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`,
      );
      console.log(`Rol '${APP_ROLE}' creado.`);
    } else {
      // En proveedores gestionados (Neon, RDS…) el rol propietario no es
      // SUPERUSER y no puede tocar el atributo SUPERUSER ni para quitarlo.
      // Para un rol existente basta con asegurar LOGIN + contraseña y avisar
      // si conservara privilegios elevados.
      const roles = (await admin.$queryRawUnsafe(
        `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = '${APP_ROLE}'`,
      )) as { rolsuper: boolean; rolbypassrls: boolean }[];
      if (roles[0]?.rolsuper || roles[0]?.rolbypassrls) {
        console.warn(
          `Aviso: el rol '${APP_ROLE}' tiene SUPERUSER o BYPASSRLS; revísalo con el proveedor.`,
        );
      }
      await admin.$executeRawUnsafe(
        `ALTER ROLE ${APP_ROLE} WITH LOGIN PASSWORD '${APP_ROLE_PASSWORD}'`,
      );
      console.log(`Rol '${APP_ROLE}' actualizado.`);
    }

    for (const statement of rlsStatements) {
      await admin.$executeRawUnsafe(statement);
    }

    const dbName = (await admin.$queryRawUnsafe('SELECT current_database() AS name')) as {
      name: string;
    }[];
    await admin.$executeRawUnsafe(
      `GRANT CONNECT ON DATABASE "${dbName[0].name}" TO ${APP_ROLE}`,
    );

    console.log(`RLS aplicada (${rlsStatements.length} sentencias) en '${dbName[0].name}'.`);
  } finally {
    await admin.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
