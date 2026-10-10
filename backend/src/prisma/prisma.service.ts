import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

export interface TenantContext {
  userId?: string | null;
  orgId?: string | null;
  isPlatformAdmin?: boolean;
}

// Si DB_RLS_ENABLED=true, la app se conecta con el rol NO propietario
// (APP_DATABASE_URL) para que PostgreSQL aplique las politicas de RLS.
//
// ESCALABILIDAD / POOLING: `withContext` fija el contexto de RLS con
// set_config(..., true) (ambito de transaccion), por lo que debe ejecutarse en
// la MISMA conexion que las consultas. Si se usa PgBouncer, configurarlo en
// modo transaction (o session) y anadir `?pgbouncer=true` a la URL de Prisma
// para desactivar las sentencias preparadas. Alternativa: pooling nativo de
// Prisma (connection_limit) o un proxy por instancia.
function resolveDatasourceUrl(): string | undefined {
  const rlsEnabled = (process.env.DB_RLS_ENABLED ?? '').toLowerCase() === 'true';
  const appUrl = process.env.APP_DATABASE_URL;
  return rlsEnabled && appUrl ? appUrl : undefined;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const url = resolveDatasourceUrl();
    super(url ? { datasources: { db: { url } } } : undefined);
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Ejecuta `fn` dentro de una transaccion que fija el contexto de RLS
   * (app.current_user / app.current_org / app.is_platform_admin).
   * Las consultas deben usar el `tx` recibido para compartir la conexion.
   */
  async withContext<T>(
    context: TenantContext,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT
        set_config('app.current_user', ${context.userId ?? ''}, true),
        set_config('app.current_org', ${context.orgId ?? ''}, true),
        set_config('app.is_platform_admin', ${context.isPlatformAdmin ? 'true' : 'false'}, true)`;
      return fn(tx);
    });
  }
}
