import { Module } from '@nestjs/common';
import {
  AdminBillingController,
  CompanyBillingController,
  PublicBillingController,
} from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  controllers: [AdminBillingController, CompanyBillingController, PublicBillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
