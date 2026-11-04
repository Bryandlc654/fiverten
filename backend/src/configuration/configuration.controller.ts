import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PlatformAdmin } from '../auth/decorators/platform-admin.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../auth/guards/platform-admin.guard';
import { ConfigurationService } from './configuration.service';
import {
  CountryDto,
  EmailTemplateDto,
  LanguageDto,
  ReportReasonDto,
  SectorDto,
  UpdateCountryDto,
  UpdateLanguageDto,
  UpdateReportReasonDto,
  UpdateSectorDto,
} from './dto/configuration.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@PlatformAdmin()
export class AdminConfigurationController {
  constructor(private readonly configuration: ConfigurationService) {}

  @Get('sectors')
  listSectors() {
    return this.configuration.listSectors();
  }

  @Post('sectors')
  createSector(@Body() dto: SectorDto) {
    return this.configuration.createSector(dto);
  }

  @Patch('sectors/:id')
  updateSector(@Param('id') id: string, @Body() dto: UpdateSectorDto) {
    return this.configuration.updateSector(id, dto);
  }

  @Delete('sectors/:id')
  deleteSector(@Param('id') id: string) {
    return this.configuration.deleteSector(id);
  }

  @Get('countries')
  listCountries() {
    return this.configuration.listCountries();
  }

  @Post('countries')
  createCountry(@Body() dto: CountryDto) {
    return this.configuration.createCountry(dto);
  }

  @Patch('countries/:id')
  updateCountry(@Param('id') id: string, @Body() dto: UpdateCountryDto) {
    return this.configuration.updateCountry(id, dto);
  }

  @Delete('countries/:id')
  deleteCountry(@Param('id') id: string) {
    return this.configuration.deleteCountry(id);
  }

  @Get('languages')
  listLanguages() {
    return this.configuration.listLanguages();
  }

  @Post('languages')
  createLanguage(@Body() dto: LanguageDto) {
    return this.configuration.createLanguage(dto);
  }

  @Patch('languages/:code')
  updateLanguage(@Param('code') code: string, @Body() dto: UpdateLanguageDto) {
    return this.configuration.updateLanguage(code, dto);
  }

  @Delete('languages/:code')
  deleteLanguage(@Param('code') code: string) {
    return this.configuration.deleteLanguage(code);
  }

  @Get('email-templates')
  listEmailTemplates() {
    return this.configuration.listEmailTemplates();
  }

  @Post('email-templates')
  createEmailTemplate(@CurrentUser('userId') userId: string, @Body() dto: EmailTemplateDto) {
    if (!dto.code) {
      throw new BadRequestException('Indica el código de la plantilla');
    }
    return this.configuration.upsertEmailTemplate(dto.code, dto, userId);
  }

  @Patch('email-templates/:code')
  updateEmailTemplate(
    @CurrentUser('userId') userId: string,
    @Param('code') code: string,
    @Body() dto: EmailTemplateDto,
  ) {
    return this.configuration.upsertEmailTemplate(code, dto, userId);
  }

  @Delete('email-templates/:code')
  deleteEmailTemplate(@Param('code') code: string) {
    return this.configuration.deleteEmailTemplate(code);
  }

  @Get('report-reasons')
  listReportReasons() {
    return this.configuration.listReportReasons();
  }

  @Post('report-reasons')
  createReportReason(@Body() dto: ReportReasonDto) {
    return this.configuration.createReportReason(dto);
  }

  @Patch('report-reasons/:id')
  updateReportReason(@Param('id') id: string, @Body() dto: UpdateReportReasonDto) {
    return this.configuration.updateReportReason(id, dto);
  }

  @Delete('report-reasons/:id')
  deleteReportReason(@Param('id') id: string) {
    return this.configuration.deleteReportReason(id);
  }
}

@Controller('public')
export class PublicConfigurationController {
  constructor(private readonly configuration: ConfigurationService) {}

  @Get('catalogs')
  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=900')
  catalogs() {
    return this.configuration.publicCatalogs();
  }
}
