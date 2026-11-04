import { Module } from '@nestjs/common';
import {
  AdminVerificationController,
  CompanyVerificationController,
  PublicVerificationController,
} from './verification.controller';
import { VerificationService } from './verification.service';

@Module({
  controllers: [
    CompanyVerificationController,
    AdminVerificationController,
    PublicVerificationController,
  ],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
