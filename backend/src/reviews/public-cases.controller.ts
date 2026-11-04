import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  EvidenceUpload,
  evidenceResponse,
  validateEvidence,
  type UploadedEvidence,
} from './case-files';
import { ReviewCasesService } from './cases.service';
import { CaseTokenDto, ClientCaseMessageDto } from './dto/case.dto';

/**
 * Caso de evidencias desde el enlace del correo del cliente. El token va
 * siempre en el cuerpo (no en la URL) para que no quede en logs ni historial.
 */
@Controller('public/cases')
export class PublicCasesController {
  constructor(private readonly cases: ReviewCasesService) {}

  @Post('lookup')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  lookup(@Body() dto: CaseTokenDto) {
    return this.cases.clientLookup(dto.token);
  }

  /** Mensaje y/o evidencias del cliente (multipart: token + body + files). */
  @Post('messages')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(EvidenceUpload)
  message(@Body() dto: ClientCaseMessageDto, @UploadedFiles() files?: UploadedEvidence[]) {
    return this.cases.clientMessage(dto.token, dto.body, validateEvidence(files));
  }

  @Post('agree')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  agree(@Body() dto: CaseTokenDto) {
    return this.cases.clientAgree(dto.token);
  }

  @Post('files/:fileId')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async file(
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Body() dto: CaseTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return evidenceResponse(res, await this.cases.clientFile(dto.token, fileId));
  }
}
