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
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { VerificationReviewer } from '../auth/decorators/verification-reviewer.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StaffMfaGuard } from '../auth/guards/staff-mfa.guard';
import { VerificationReviewerGuard } from '../auth/guards/verification-reviewer.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  ApproveVerificationDto,
  CreateCertificationDto,
  CreateVerificationProjectDto,
  RejectCertificationDto,
  RejectVerificationDto,
  ReviewCertificationDto,
  RevokeVerificationDto,
  UpdateVerificationInquiryDto,
  UploadProjectEvidenceDto,
  UploadVerificationDocumentDto,
  VerificationInquiryDto,
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
  @Roles('editor')
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
    return this.verification.uploadDocument(this.requireOrg(orgId), userId, dto.category, file, {
      issuer: dto.issuer,
      documentNumber: dto.documentNumber,
      issueDate: dto.issueDate,
      expiryDate: dto.expiryDate,
    });
  }

  @Delete('documents/:id')
  @Roles('editor')
  @HttpCode(HttpStatus.OK)
  deleteDocument(
    @CurrentUser('organizationId') orgId: string | null,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.verification.deleteDocument(this.requireOrg(orgId), id);
  }

  @Get('documents/:id')
  @Roles('editor')
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
  @Roles('editor')
  addProject(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateVerificationProjectDto,
  ) {
    return this.verification.addProject(this.requireOrg(orgId), userId, dto);
  }

  @Post('projects/:id/documents')
  @Roles('editor')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_VERIFICATION_FILE_BYTES } }),
  )
  uploadProjectDocument(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: UploadProjectEvidenceDto,
    @UploadedFile() file?: VerificationUpload,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    return this.verification.uploadProjectDocument(
      this.requireOrg(orgId),
      userId,
      projectId,
      file,
      dto.evidenceType,
    );
  }

  @Delete('projects/:id')
  @Roles('editor')
  @HttpCode(HttpStatus.OK)
  deleteProject(
    @CurrentUser('organizationId') orgId: string | null,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.verification.deleteProject(this.requireOrg(orgId), id);
  }

  @Post('certifications')
  @Roles('admin')
  addCertification(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateCertificationDto,
  ) {
    return this.verification.addCertification(this.requireOrg(orgId), userId, dto);
  }

  @Delete('certifications/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  deleteCertification(
    @CurrentUser('organizationId') orgId: string | null,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.verification.deleteCertification(this.requireOrg(orgId), id);
  }

  @Post('submit')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  submit(
    @CurrentUser('organizationId') orgId: string | null,
    @CurrentUser('userId') userId: string,
  ) {
    return this.verification.submit(this.requireOrg(orgId), userId);
  }

  private requireOrg(orgId: string | null): string {
    if (!orgId) {
      throw new ForbiddenException('Tu cuenta no está asociada a ninguna empresa');
    }
    return orgId;
  }
}

@Controller('public')
export class PublicVerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Get('organizations/:slug/verification')
  @Header('Cache-Control', 'public, max-age=30, stale-while-revalidate=120')
  get(@Param('slug') slug: string) {
    return this.verification.getPublicVerification(slug);
  }

  @Get('verification-info')
  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  info() {
    return this.verification.getPublicVerificationInfo();
  }

  @Post('verification-inquiry')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  inquiry(@Body() dto: VerificationInquiryDto) {
    return this.verification.submitInquiry(dto);
  }
}

@Controller('admin/verifications')
@UseGuards(JwtAuthGuard, StaffMfaGuard, VerificationReviewerGuard)
@VerificationReviewer()
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

  @Get('certifications')
  listCertifications(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.verification.adminListCertifications({ page, pageSize, status, search });
  }

  @Post('certifications/:id/approve')
  @HttpCode(HttpStatus.OK)
  approveCertification(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewCertificationDto,
  ) {
    return this.verification.approveCertification(id, userId, dto);
  }

  @Post('certifications/:id/reject')
  @HttpCode(HttpStatus.OK)
  rejectCertification(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectCertificationDto,
  ) {
    return this.verification.rejectCertification(id, userId, dto);
  }

  @Get('inquiries')
  listInquiries(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.verification.adminListInquiries({ page, pageSize, status, search });
  }

  @Post('inquiries/:id')
  @HttpCode(HttpStatus.OK)
  updateInquiry(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVerificationInquiryDto,
  ) {
    return this.verification.updateInquiry(id, userId, dto);
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
