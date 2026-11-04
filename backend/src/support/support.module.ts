import { Module } from '@nestjs/common';
import { CompanySupportController, SupportStaffController } from './support.controller';
import { SupportStaffGuard } from './support.guard';
import { SupportService } from './support.service';

@Module({
  controllers: [CompanySupportController, SupportStaffController],
  providers: [SupportService, SupportStaffGuard],
})
export class SupportModule {}
