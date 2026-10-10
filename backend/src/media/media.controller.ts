import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MediaService, type UploadedImage } from './media.service';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

@Controller('media')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('organization-cover')
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  async uploadOrganizationCover(
    @CurrentUser('organizationId') orgId: string | null,
    @UploadedFile() file?: UploadedImage,
  ): Promise<{ url: string }> {
    if (!orgId) {
      throw new ForbiddenException('Tu cuenta no pertenece a ninguna empresa');
    }
    if (!file) {
      throw new BadRequestException('No se recibio ninguna imagen');
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Formato no permitido. Usa JPG, PNG, WEBP, GIF o AVIF.');
    }
    const url = await this.media.uploadOrganizationCover(orgId, file);
    return { url };
  }
}
