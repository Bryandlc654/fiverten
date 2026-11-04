import { Module } from '@nestjs/common';
import {
  AdminConfigurationController,
  PublicConfigurationController,
} from './configuration.controller';
import { ConfigurationService } from './configuration.service';

@Module({
  controllers: [AdminConfigurationController, PublicConfigurationController],
  providers: [ConfigurationService],
  exports: [ConfigurationService],
})
export class ConfigurationModule {}
