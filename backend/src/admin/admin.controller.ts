import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PlatformAdmin } from '../auth/decorators/platform-admin.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../auth/guards/platform-admin.guard';
import { AdminService } from './admin.service';
import { AdminUpdateOrganizationDto } from './dto/admin-update-organization.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@PlatformAdmin()
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('organizations')
  listOrganizations(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.admin.listOrganizations({ search, status, page, pageSize });
  }

  @Post('organizations')
  createOrganization(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.admin.createOrganization(dto, userId);
  }

  @Get('organizations/:id')
  getOrganization(@Param('id') id: string) {
    return this.admin.getOrganization(id);
  }

  @Patch('organizations/:id')
  updateOrganization(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: AdminUpdateOrganizationDto,
  ) {
    return this.admin.updateOrganization(id, userId, dto);
  }

  @Get('users')
  listUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
  ) {
    return this.admin.listUsers({ search, page, pageSize });
  }

  @Patch('users/:id')
  updateUser(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.admin.updateUser(id, userId, dto);
  }
}
