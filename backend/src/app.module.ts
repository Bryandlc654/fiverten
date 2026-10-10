import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { validateEnvironment } from './config/env.validation';
import { HealthController } from './health/health.controller';
import { MailModule } from './mail/mail.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    // Throttler con storage en memoria (suficiente en una sola instancia).
    // ESCALABILIDAD: con multiples instancias el limite por IP no se comparte;
    // usar un storage distribuido (p.ej. ThrottlerStorageRedisService) cuando
    // se despliegue tras un balanceador con varias replicas.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 100 }],
      skipIf: () => (process.env.NODE_ENV ?? 'development') === 'test',
      errorMessage: 'Demasiadas solicitudes. Inténtalo de nuevo mas tarde.',
    }),
    PrismaModule,
    MailModule,
    AuthModule,
    OrganizationsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
