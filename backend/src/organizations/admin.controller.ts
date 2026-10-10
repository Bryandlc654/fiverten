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
import { AdminUpdateOrganizationDto } from './dto/admin-update-organization.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationsService } from './organizations.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@PlatformAdmin()
export class AdminController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get('stats')
  stats() {
    return this.organizations.stats();
  }

  @Get('organizations')
  listOrganizations(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.organizations.listOrganizations({ search, status, page, pageSize });
  }

  @Post('organizations')
  createOrganization(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizations.createOrganization(dto, userId);
  }

  @Get('organizations/:id')
  getOrganization(@Param('id') id: string) {
    return this.organizations.getOrganization(id);
  }

  @Patch('organizations/:id')
  updateOrganization(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: AdminUpdateOrganizationDto,
  ) {
    return this.organizations.updateOrganization(id, userId, dto);
  }

  @Get('users')
  listUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('search') search?: string,
  ) {
    return this.organizations.listUsers({ search, page, pageSize });
  }

  @Patch('users/:id')
  updateUser(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.organizations.updateUser(id, userId, dto);
  }
}
