import { Global, Module } from '@nestjs/common';
import { AdminSettingsController, PublicSettingsController } from './settings.controller';
import { PlatformSettingsService } from './settings.service';

@Global()
@Module({
  controllers: [AdminSettingsController, PublicSettingsController],
  providers: [PlatformSettingsService],
  exports: [PlatformSettingsService],
})
export class SettingsModule {}
