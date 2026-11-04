import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  ForbiddenException,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PlatformAdmin } from '../auth/decorators/platform-admin.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../auth/guards/platform-admin.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  ApproveVerificationDto,
  CreateVerificationProjectDto,
  RejectVerificationDto,
  RevokeVerificationDto,
  UploadVerificationDocumentDto,
} from './dto/verification.dto';
import { VerificationService, type VerificationUpload } from './verification.service';

export const MAX_VERIFICATION_FILE_BYTES = 10 * 1024 * 1024;

@Controller('organizations/me/verification')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompanyVerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Get()
  status(@CurrentUser('organizationId') orgId: string | null) {
    return this.verification.getCompanyStatus(this.requireOrg(orgId));
  }

  @Post('documents')
  @Roles('admin')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_VERIFICATION_FILE_BYTES } }),
  )
  uploadDocument(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Body() dto: UploadVerificationDocumentDto,
    @UploadedFile() file?: VerificationUpload,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    return this.verification.uploadDocument(this.requireOrg(orgId), userId, dto.category, file);
  }

  @Delete('documents/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  deleteDocument(
    @CurrentUser('organizationId') orgId: string | null,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.verification.deleteDocument(this.requireOrg(orgId), id);
  }

  @Get('documents/:id')
  @Header('Cache-Control', 'private, no-store')
  async document(
    @CurrentUser('organizationId') orgId: string | null,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.verification.getCompanyDocument(this.requireOrg(orgId), id);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
    return new StreamableFile(file.data);
  }

  @Post('projects')
  @Roles('admin')
  addProject(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateVerificationProjectDto,
  ) {
    return this.verification.addProject(this.requireOrg(orgId), userId, dto);
  }

  @Delete('projects/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  deleteProject(
    @CurrentUser('organizationId') orgId: string | null,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.verification.deleteProject(this.requireOrg(orgId), id);
  }

  @Post('submit')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  submit(@CurrentUser('organizationId') orgId: string | null) {
    return this.verification.submit(this.requireOrg(orgId));
  }

  private requireOrg(orgId: string | null): string {
    if (!orgId) {
      throw new ForbiddenException('Tu cuenta no está asociada a ninguna empresa');
    }
    return orgId;
  }
}

@Controller('admin/verifications')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@PlatformAdmin()
export class AdminVerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Get()
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.verification.adminList({ page, pageSize, status, search });
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.verification.adminGet(id);
  }

  @Get(':id/documents/:documentId')
  @Header('Cache-Control', 'private, no-store')
  async document(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.verification.adminDocument(id, documentId);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
    return new StreamableFile(file.data);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveVerificationDto,
  ) {
    return this.verification.approve(id, userId, dto);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectVerificationDto,
  ) {
    return this.verification.reject(id, userId, dto);
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  revoke(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokeVerificationDto,
  ) {
    return this.verification.revoke(id, userId, dto);
  }
}
