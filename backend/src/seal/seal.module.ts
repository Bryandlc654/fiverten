import { Module } from '@nestjs/common';
import { SealController } from './seal.controller';

@Module({
  controllers: [SealController],
})
export class SealModule {}
