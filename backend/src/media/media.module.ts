import { Module } from '@nestjs/common';
import { MediaController, MediaFilesController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  controllers: [MediaController, MediaFilesController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
