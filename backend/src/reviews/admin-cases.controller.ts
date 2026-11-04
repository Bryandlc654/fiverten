import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PlatformAdmin } from '../auth/decorators/platform-admin.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../auth/guards/platform-admin.guard';
import { evidenceResponse } from './case-files';
import { ReviewCasesService, type CaseListQuery } from './cases.service';
import { CaseAdminMessageDto, CaseDecisionDto, CaseRejectDto } from './dto/case.dto';

const SCOPES: CaseListQuery['scope'][] = ['active', 'closed', 'all'];

/** Casos de evidencias de reseñas de baja valoración (super admin). */
@Controller('admin/cases')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@PlatformAdmin()
export class AdminCasesController {
  constructor(private readonly cases: ReviewCasesService) {}

  @Get()
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('scope', new DefaultValuePipe('active')) scope: string,
  ) {
    if (!SCOPES.includes(scope as CaseListQuery['scope'])) {
      throw new BadRequestException('Filtro no válido');
    }
    return this.cases.adminList({ page, pageSize, scope: scope as CaseListQuery['scope'] });
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.cases.adminDetail(id);
  }

  @Post(':id/request-evidence')
  @HttpCode(HttpStatus.OK)
  requestEvidence(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CaseAdminMessageDto,
  ) {
    return this.cases.requestEvidence(userId, id, dto.message);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.OK)
  message(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CaseAdminMessageDto,
  ) {
    return this.cases.adminMessage(userId, id, dto.message);
  }

  @Post(':id/validate')
  @HttpCode(HttpStatus.OK)
  validate(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CaseAdminMessageDto,
  ) {
    return this.cases.validateEvidence(userId, id, dto.message);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CaseRejectDto,
  ) {
    return this.cases.reject(userId, id, dto.reason);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  publish(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CaseDecisionDto,
  ) {
    return this.cases.publish(userId, id, dto.reason);
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  withdraw(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CaseDecisionDto,
  ) {
    return this.cases.withdraw(userId, id, dto.reason);
  }

  @Get(':id/files/:fileId')
  async file(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return evidenceResponse(res, await this.cases.adminFile(id, fileId));
  }
}
