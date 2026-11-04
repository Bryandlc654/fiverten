import {
  Body,
  Controller,
  Get,
  Header,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PlatformAdmin } from '../auth/decorators/platform-admin.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../auth/guards/platform-admin.guard';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { PlatformSettingsService } from './settings.service';

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@PlatformAdmin()
export class AdminSettingsController {
  constructor(private readonly settings: PlatformSettingsService) {}

  @Get()
  list() {
    return this.settings.list();
  }

  @Patch()
  update(@CurrentUser('userId') userId: string, @Body() dto: UpdateSettingsDto) {
    return this.settings.update(dto.settings, userId);
  }
}

@Controller('public')
export class PublicSettingsController {
  constructor(private readonly settings: PlatformSettingsService) {}

  @Get('config')
  @Header('Cache-Control', 'public, max-age=120, stale-while-revalidate=600')
  config() {
    return this.settings.publicConfig();
  }
}
