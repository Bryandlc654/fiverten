import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  EvidenceUpload,
  evidenceResponse,
  validateEvidence,
  type UploadedEvidence,
} from './case-files';
import { ReviewCasesService } from './cases.service';
import { CaseMessageDto } from './dto/case.dto';

/** Casos de evidencias en los que la empresa ha sido notificada. */
@Controller('organizations/me/cases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanyCasesController {
  constructor(private readonly cases: ReviewCasesService) {}

  @Get()
  list(@CurrentUser('organizationId') orgId: string | null) {
    return this.cases.companyList(this.requireOrg(orgId));
  }

  @Get(':id')
  detail(
    @CurrentUser('organizationId') orgId: string | null,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cases.companyDetail(this.requireOrg(orgId), id);
  }

  /** Versión de la empresa con sus evidencias (multipart: body + files). */
  @Post(':id/messages')
  @HttpCode(HttpStatus.OK)
  @Roles('editor')
  @UseInterceptors(EvidenceUpload)
  message(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CaseMessageDto,
    @UploadedFiles() files?: UploadedEvidence[],
  ) {
    return this.cases.companyMessage(
      this.requireOrg(orgId),
      userId,
      id,
      dto.body,
      validateEvidence(files),
    );
  }

  /** Aceptar el acuerdo de retirar la reseña: lo decide un responsable o superior. */
  @Post(':id/agree')
  @HttpCode(HttpStatus.OK)
  @Roles('editor')
  agree(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cases.companyAgree(this.requireOrg(orgId), userId, id);
  }

  @Get(':id/files/:fileId')
  async file(
    @CurrentUser('organizationId') orgId: string | null,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return evidenceResponse(res, await this.cases.companyFile(this.requireOrg(orgId), id, fileId));
  }

  private requireOrg(orgId: string | null): string {
    if (!orgId) {
      throw new ForbiddenException('Tu cuenta no está asociada a ninguna empresa');
    }
    return orgId;
  }
}
