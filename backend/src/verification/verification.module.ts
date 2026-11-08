import { Module } from '@nestjs/common';
import {
  AdminVerificationController,
  CompanyVerificationController,
  PublicVerificationController,
} from './verification.controller';
import { VerificationRemindersService } from './verification-reminders.service';
import { VerificationService } from './verification.service';

@Module({
  controllers: [
    CompanyVerificationController,
    AdminVerificationController,
    PublicVerificationController,
  ],
  providers: [VerificationService, VerificationRemindersService],
  exports: [VerificationService],
})
export class VerificationModule {}
