import { Module } from '@nestjs/common';
import {
  AdminVerificationController,
  CompanyVerificationController,
} from './verification.controller';
import { VerificationService } from './verification.service';

@Module({
  controllers: [CompanyVerificationController, AdminVerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
