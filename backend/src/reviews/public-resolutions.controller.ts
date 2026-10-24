import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ClientRejectDto,
  ClientResolutionMessageDto,
  ClientReviewUpdateDto,
  ResolutionTokenDto,
} from './dto/resolution.dto';
import { ResolutionsService } from './resolutions.service';

/**
 * Resolución desde el enlace del correo. Todas las rutas reciben el token en el
 * cuerpo (no en la URL) para que no quede en logs de acceso ni en el historial.
 */
@Controller('public/resolutions')
export class PublicResolutionsController {
  constructor(private readonly resolutions: ResolutionsService) {}

  @Post('lookup')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  lookup(@Body() dto: ResolutionTokenDto) {
    return this.resolutions.lookup(dto.token);
  }

  @Post('messages')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  message(@Body() dto: ClientResolutionMessageDto) {
    return this.resolutions.clientMessage(dto.token, dto.body);
  }

  @Post('review')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  updateReview(@Body() dto: ClientReviewUpdateDto) {
    return this.resolutions.updateReview(dto);
  }

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  accept(@Body() dto: ResolutionTokenDto) {
    return this.resolutions.accept(dto.token);
  }

  @Post('reject')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  reject(@Body() dto: ClientRejectDto) {
    return this.resolutions.reject(dto);
  }
}
