import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { ClientsModule } from './clients/clients.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { validateEnvironment } from './config/env.validation';
import { HealthController } from './health/health.controller';
import { MailModule } from './mail/mail.module';
import { MediaModule } from './media/media.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PrismaModule } from './prisma/prisma.module';
import { PrivacyModule } from './privacy/privacy.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SettingsModule } from './settings/settings.module';
import { SupportModule } from './support/support.module';
import { SealModule } from './seal/seal.module';
import { VerificationModule } from './verification/verification.module';
import { WidgetModule } from './widget/widget.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    ScheduleModule.forRoot(),
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
    PrivacyModule,
    SettingsModule,
    MailModule,
    AuthModule,
    AnalyticsModule,
    OrganizationsModule,
    AdminModule,
    MediaModule,
    ReviewsModule,
    ClientsModule,
    BillingModule,
    ConfigurationModule,
    SupportModule,
    VerificationModule,
    SealModule,
    WidgetModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
