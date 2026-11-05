import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CompanyAnalyticsController, PublicAnalyticsController } from './analytics.controller';

@Module({
  controllers: [CompanyAnalyticsController, PublicAnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
