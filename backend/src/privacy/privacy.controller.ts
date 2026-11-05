import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PlatformAdmin } from '../auth/decorators/platform-admin.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StaffMfaGuard } from '../auth/guards/staff-mfa.guard';
import { PlatformAdminGuard } from '../auth/guards/platform-admin.guard';
import { CompletePrivacyRequestDto, CreatePrivacyRequestDto } from './dto/privacy.dto';
import { PrivacyService } from './privacy.service';

@Controller('privacy')
@UseGuards(JwtAuthGuard)
export class PrivacyController {
  constructor(private readonly privacy: PrivacyService) {}

  @Post('requests')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create(
    @CurrentUser('userId') userId: string,
    @CurrentUser('organizationId') orgId: string | null,
    @Body() dto: CreatePrivacyRequestDto,
  ) {
    return this.privacy.create(userId, orgId, dto);
  }

  @Get('requests')
  listMine(@CurrentUser('userId') userId: string) {
    return this.privacy.listMine(userId);
  }

  @Get('export')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  exportMine(@CurrentUser('userId') userId: string) {
    return this.privacy.exportMine(userId);
  }
}

@Controller('admin/privacy/requests')
@UseGuards(JwtAuthGuard, StaffMfaGuard, PlatformAdminGuard)
@PlatformAdmin()
export class AdminPrivacyController {
  constructor(private readonly privacy: PrivacyService) {}

  @Get()
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('status') status?: string,
  ) {
    return this.privacy.adminList({ status, page, pageSize });
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: CompletePrivacyRequestDto,
  ) {
    return this.privacy.complete(userId, id, dto);
  }
}
