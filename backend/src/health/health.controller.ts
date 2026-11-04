import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let database = 'up';
    let databaseName: string | null = null;
    let migrations = 0;
    let hasPlans = false;
    try {
      const rows = await this.prisma.$queryRawUnsafe<
        { name: string; migrations: number; has_plans: boolean }[]
      >(
        `SELECT current_database() AS name,
                (SELECT count(*) FROM "_prisma_migrations"
                  WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL)::int AS migrations,
                (to_regclass('public.plans') IS NOT NULL) AS has_plans`,
      );
      databaseName = rows[0]?.name ?? null;
      migrations = rows[0]?.migrations ?? 0;
      hasPlans = rows[0]?.has_plans ?? false;
    } catch {
      database = 'down';
    }

    if (database === 'down') {
      throw new ServiceUnavailableException({ status: 'error', database });
    }

    return {
      status: 'ok',
      database,
      databaseName,
      migrations,
      hasPlans,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
