import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CountryDto,
  EmailTemplateDto,
  LanguageDto,
  ReportReasonDto,
  SectorDto,
} from './dto/configuration.dto';

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || `item-${Date.now()}`
  );
}

/** Catálogos y plantillas editables por el super admin. */
@Injectable()
export class ConfigurationService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Sectores / categorías
  // ---------------------------------------------------------------------------
  listSectors() {
    return this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.sector.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    );
  }

  async createSector(dto: SectorDto) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      try {
        return await tx.sector.create({
          data: {
            slug: slugify(dto.slug || dto.name),
            name: dto.name.trim(),
            description: dto.description?.trim() || null,
            isActive: dto.isActive ?? true,
            sortOrder: dto.sortOrder ?? 0,
          },
        });
      } catch (error) {
        throw this.mapUnique(error, 'Ya existe una categoría con ese nombre o slug');
      }
    });
  }

  async updateSector(id: string, dto: Partial<SectorDto>) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const existing = await tx.sector.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Categoría no encontrada');
      try {
        return await tx.sector.update({
          where: { id },
          data: {
            slug: dto.slug ? slugify(dto.slug) : undefined,
            name: dto.name?.trim(),
            description: dto.description === undefined ? undefined : dto.description?.trim() || null,
            isActive: dto.isActive,
            sortOrder: dto.sortOrder,
          },
        });
      } catch (error) {
        throw this.mapUnique(error, 'Ya existe una categoría con ese nombre o slug');
      }
    });
  }

  async deleteSector(id: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const used = await tx.organization.count({ where: { sectorId: id } });
      if (used > 0) {
        throw new BadRequestException(
          'No se puede eliminar: hay empresas usando esta categoría. Desactívala en su lugar.',
        );
      }
      await tx.sector.delete({ where: { id } });
      return { success: true };
    });
  }

  // ---------------------------------------------------------------------------
  // Países
  // ---------------------------------------------------------------------------
  listCountries() {
    return this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.country.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    );
  }

  async createCountry(dto: CountryDto) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      try {
        return await tx.country.create({
          data: {
            iso2: dto.iso2.trim().toUpperCase(),
            name: dto.name.trim(),
            isActive: dto.isActive ?? true,
            sortOrder: dto.sortOrder ?? 0,
          },
        });
      } catch (error) {
        throw this.mapUnique(error, 'Ya existe un país con ese código ISO');
      }
    });
  }

  async updateCountry(id: string, dto: Partial<CountryDto>) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const existing = await tx.country.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('País no encontrado');
      try {
        return await tx.country.update({
          where: { id },
          data: {
            iso2: dto.iso2 ? dto.iso2.trim().toUpperCase() : undefined,
            name: dto.name?.trim(),
            isActive: dto.isActive,
            sortOrder: dto.sortOrder,
          },
        });
      } catch (error) {
        throw this.mapUnique(error, 'Ya existe un país con ese código ISO');
      }
    });
  }

  async deleteCountry(id: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const used = await tx.organization.count({ where: { countryId: id } });
      if (used > 0) {
        throw new BadRequestException(
          'No se puede eliminar: hay empresas usando este país. Desactívalo en su lugar.',
        );
      }
      await tx.country.delete({ where: { id } });
      return { success: true };
    });
  }

  // ---------------------------------------------------------------------------
  // Idiomas
  // ---------------------------------------------------------------------------
  listLanguages() {
    return this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.language.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    );
  }

  async createLanguage(dto: LanguageDto) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      try {
        return await tx.language.create({
          data: {
            code: dto.code.trim().toLowerCase(),
            name: dto.name.trim(),
            isActive: dto.isActive ?? true,
            sortOrder: dto.sortOrder ?? 0,
          },
        });
      } catch (error) {
        throw this.mapUnique(error, 'Ya existe un idioma con ese código');
      }
    });
  }

  async updateLanguage(code: string, dto: Partial<LanguageDto>) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const existing = await tx.language.findUnique({ where: { code } });
      if (!existing) throw new NotFoundException('Idioma no encontrado');
      return tx.language.update({
        where: { code },
        data: {
          name: dto.name?.trim(),
          isActive: dto.isActive,
          sortOrder: dto.sortOrder,
        },
      });
    });
  }

  async deleteLanguage(code: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      await tx.language.delete({ where: { code } });
      return { success: true };
    });
  }

  // ---------------------------------------------------------------------------
  // Plantillas de email
  // ---------------------------------------------------------------------------
  listEmailTemplates() {
    return this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.emailTemplate.findMany({ orderBy: { code: 'asc' } }),
    );
  }

  async upsertEmailTemplate(code: string, dto: EmailTemplateDto, actorId: string) {
    const normalized = code.trim().toLowerCase();
    return this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.emailTemplate.upsert({
        where: { code: normalized },
        update: {
          subject: dto.subject.trim(),
          title: dto.title.trim(),
          intro: dto.intro.trim(),
          action: dto.action.trim(),
          isActive: dto.isActive ?? true,
          updatedBy: actorId,
        },
        create: {
          code: normalized,
          subject: dto.subject.trim(),
          title: dto.title.trim(),
          intro: dto.intro.trim(),
          action: dto.action.trim(),
          isActive: dto.isActive ?? true,
          updatedBy: actorId,
        },
      }),
    );
  }

  async deleteEmailTemplate(code: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      await tx.emailTemplate.delete({ where: { code } });
      return { success: true };
    });
  }

  // ---------------------------------------------------------------------------
  // Motivos de reporte
  // ---------------------------------------------------------------------------
  listReportReasons() {
    return this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.reportReason.findMany({ orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] }),
    );
  }

  async createReportReason(dto: ReportReasonDto) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      try {
        return await tx.reportReason.create({
          data: {
            code: dto.code.trim().toLowerCase(),
            label: dto.label.trim(),
            description: dto.description?.trim() || null,
            isActive: dto.isActive ?? true,
            sortOrder: dto.sortOrder ?? 0,
          },
        });
      } catch (error) {
        throw this.mapUnique(error, 'Ya existe un motivo con ese código');
      }
    });
  }

  async updateReportReason(id: string, dto: Partial<ReportReasonDto>) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const existing = await tx.reportReason.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Motivo no encontrado');
      try {
        return await tx.reportReason.update({
          where: { id },
          data: {
            code: dto.code ? dto.code.trim().toLowerCase() : undefined,
            label: dto.label?.trim(),
            description: dto.description === undefined ? undefined : dto.description?.trim() || null,
            isActive: dto.isActive,
            sortOrder: dto.sortOrder,
          },
        });
      } catch (error) {
        throw this.mapUnique(error, 'Ya existe un motivo con ese código');
      }
    });
  }

  async deleteReportReason(id: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const used = await tx.reviewReport.count({ where: { reasonId: id } });
      if (used > 0) {
        throw new BadRequestException(
          'No se puede eliminar: hay reportes usando este motivo. Desactívalo en su lugar.',
        );
      }
      await tx.reportReason.delete({ where: { id } });
      return { success: true };
    });
  }

  // ---------------------------------------------------------------------------
  // Catálogos públicos
  // ---------------------------------------------------------------------------
  async publicCatalogs() {
    return this.prisma.withContext({}, async (tx) => {
      const [sectors, countries, languages] = await Promise.all([
        tx.sector.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        }),
        tx.country.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        }),
        tx.language.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        }),
      ]);
      return { sectors, countries, languages };
    });
  }

  private mapUnique(error: unknown, message: string): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new ConflictException(message);
    }
    return error;
  }
}
