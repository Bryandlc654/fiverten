import { Module } from '@nestjs/common';
import { OrganizationsModule } from '../organizations/organizations.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [OrganizationsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
