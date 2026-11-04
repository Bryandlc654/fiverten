import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformSettingsService } from '../settings/settings.service';
import {
  ApproveVerificationDto,
  CreateVerificationProjectDto,
  RejectVerificationDto,
  RevokeVerificationDto,
} from './dto/verification.dto';
import { effectiveVerificationStatus } from './verification-status';

export interface VerificationUpload {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

const DAY_MS = 24 * 60 * 60 * 1000;

const REQUEST_INCLUDE = {
  organization: {
    select: {
      id: true,
      tradeName: true,
      slug: true,
      publicId: true,
      verificationStatus: true,
      verifiedAt: true,
      verificationExpiresAt: true,
    },
  },
  documents: {
    select: {
      id: true,
      category: true,
      projectId: true,
      filename: true,
      mimeType: true,
      size: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
  projects: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      documents: {
        select: {
          id: true,
          category: true,
          projectId: true,
          filename: true,
          mimeType: true,
          size: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' as const },
      },
    },
  },
  _count: { select: { documents: true, projects: true } },
} satisfies Prisma.VerificationRequestInclude;

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: PlatformSettingsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Empresa
  // ---------------------------------------------------------------------------
  async getCompanyStatus(orgId: string) {
    const [requiredDocs, minProjects, reviewDays, expiryDays, renewalDays] = await Promise.all([
      this.settings.get<string[]>('verification.required_documents'),
      this.settings.get<number>('verification.min_projects'),
      this.settings.get<number>('verification.review_days'),
      this.settings.get<number>('verification.expiry_days'),
      this.settings.get<number>('verification.renewal_days'),
    ]);

    return this.prisma.withContext({ orgId }, async (tx) => {
      const org = await tx.organization.findFirst({
        where: { id: orgId, deletedAt: null },
        select: {
          id: true,
          tradeName: true,
          slug: true,
          publicId: true,
          verificationStatus: true,
          verifiedAt: true,
          verificationExpiresAt: true,
        },
      });
      if (!org) throw new NotFoundException('Empresa no encontrada');

      const request = await tx.verificationRequest.findFirst({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        include: REQUEST_INCLUDE,
      });
      const status = effectiveVerificationStatus(org);
      const hasOpenRequest =
        request !== null && ['submitted', 'in_review'].includes(request.status);
      const renewalWindow =
        org.verificationExpiresAt !== null &&
        org.verificationExpiresAt.getTime() <= Date.now() + Number(renewalDays) * DAY_MS;
      const canSubmit =
        !hasOpenRequest &&
        (status === 'not_verified' ||
          status === 'rejected' ||
          status === 'expired' ||
          (status === 'verified' && renewalWindow));

      return {
        organization: org,
        status,
        verifiedAt: org.verifiedAt,
        expiresAt: org.verificationExpiresAt,
        canSubmit,
        requirements: {
          requiredDocuments: Array.isArray(requiredDocs) ? requiredDocs : ['identity', 'tax', 'address'],
          minProjects: Number(minProjects) || 1,
          reviewDays: Number(reviewDays) || 5,
          expiryDays: Number(expiryDays) || 365,
          renewalDays: Number(renewalDays) || 30,
        },
        request: request ? this.requestView(request) : null,
      };
    });
  }

  async uploadDocument(
    orgId: string,
    userId: string,
    category: string,
    file: VerificationUpload,
  ) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Formato no permitido. Usa PDF, JPG, PNG, WEBP o AVIF.');
    }
    return this.prisma.withContext({ orgId, userId }, async (tx) => {
      const draft = await this.ensureDraft(tx, orgId);
      const document = await tx.verificationDocument.create({
        data: {
          organizationId: orgId,
          requestId: draft.id,
          category,
          filename: file.originalname.slice(0, 255),
          mimeType: file.mimetype,
          size: file.size,
          data: file.buffer,
          createdBy: userId,
        },
        select: {
          id: true,
          category: true,
          projectId: true,
          filename: true,
          mimeType: true,
          size: true,
          createdAt: true,
        },
      });
      return document;
    });
  }

  /** Evidencia adjunta a un proyecto concreto (imagen o PDF). */
  async uploadProjectDocument(
    orgId: string,
    userId: string,
    projectId: string,
    file: VerificationUpload,
  ) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Formato no permitido. Usa PDF, JPG, PNG, WEBP o AVIF.');
    }
    return this.prisma.withContext({ orgId, userId }, async (tx) => {
      const project = await tx.verificationProject.findFirst({
        where: { id: projectId, organizationId: orgId },
        include: { request: { select: { id: true, status: true } } },
      });
      if (!project) throw new NotFoundException('Proyecto no encontrado');
      if (project.request && project.request.status !== 'draft') {
        throw new BadRequestException('La solicitud ya está enviada y no se puede modificar');
      }
      return tx.verificationDocument.create({
        data: {
          organizationId: orgId,
          requestId: project.requestId,
          projectId,
          category: 'project',
          filename: file.originalname.slice(0, 255),
          mimeType: file.mimetype,
          size: file.size,
          data: file.buffer,
          createdBy: userId,
        },
        select: {
          id: true,
          category: true,
          projectId: true,
          filename: true,
          mimeType: true,
          size: true,
          createdAt: true,
        },
      });
    });
  }

  async deleteDocument(orgId: string, documentId: string) {
    return this.prisma.withContext({ orgId }, async (tx) => {
      const document = await tx.verificationDocument.findFirst({
        where: { id: documentId, organizationId: orgId },
        include: { request: { select: { status: true } } },
      });
      if (!document) throw new NotFoundException('Documento no encontrado');
      if (document.request && document.request.status !== 'draft') {
        throw new BadRequestException('La solicitud ya está enviada y no se puede modificar');
      }
      await tx.verificationDocument.delete({ where: { id: documentId } });
      return { success: true };
    });
  }

  async addProject(orgId: string, userId: string, dto: CreateVerificationProjectDto) {
    return this.prisma.withContext({ orgId, userId }, async (tx) => {
      const draft = await this.ensureDraft(tx, orgId);
      return tx.verificationProject.create({
        data: {
          organizationId: orgId,
          requestId: draft.id,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          url: dto.url?.trim() || null,
          createdBy: userId,
        },
      });
    });
  }

  async deleteProject(orgId: string, projectId: string) {
    return this.prisma.withContext({ orgId }, async (tx) => {
      const project = await tx.verificationProject.findFirst({
        where: { id: projectId, organizationId: orgId },
        include: { request: { select: { status: true } } },
      });
      if (!project) throw new NotFoundException('Proyecto no encontrado');
      if (project.request && project.request.status !== 'draft') {
        throw new BadRequestException('La solicitud ya está enviada y no se puede modificar');
      }
      await tx.verificationProject.delete({ where: { id: projectId } });
      return { success: true };
    });
  }

  async submit(orgId: string) {
    const [requiredDocs, minProjects] = await Promise.all([
      this.settings.get<string[]>('verification.required_documents'),
      this.settings.get<number>('verification.min_projects'),
    ]);

    return this.prisma.withContext({ orgId }, async (tx) => {
      const org = await tx.organization.findFirst({
        where: { id: orgId, deletedAt: null },
        select: { verificationStatus: true, verificationExpiresAt: true },
      });
      if (!org) throw new NotFoundException('Empresa no encontrada');

      const request = await tx.verificationRequest.findFirst({
        where: { organizationId: orgId, status: 'draft' },
        orderBy: { createdAt: 'desc' },
        include: { documents: true, projects: true },
      });
      if (!request) {
        throw new BadRequestException('No hay documentación pendiente de enviar');
      }
      const open = await tx.verificationRequest.findFirst({
        where: { organizationId: orgId, status: { in: ['submitted', 'in_review'] } },
        select: { id: true },
      });
      if (open) {
        throw new BadRequestException('Ya hay una solicitud en revisión');
      }

      const required = Array.isArray(requiredDocs) ? requiredDocs : [];
      const categories = new Set(request.documents.map((document) => document.category));
      const missing = required.filter((category) => !categories.has(category));
      if (missing.length > 0) {
        throw new BadRequestException(
          `Faltan documentos obligatorios: ${missing.join(', ')}`,
        );
      }
      if (request.projects.length < (Number(minProjects) || 1)) {
        throw new BadRequestException(
          `Añade al menos ${Number(minProjects) || 1} proyecto o evidencia`,
        );
      }

      const status = effectiveVerificationStatus(org);
      if (status === 'verified' && org.verificationExpiresAt) {
        const renewalDays = Number(
          await this.settings.get<number>('verification.renewal_days'),
        );
        if (
          org.verificationExpiresAt.getTime() >
          Date.now() + (Number(renewalDays) || 30) * DAY_MS
        ) {
          throw new BadRequestException('Tu verificación sigue vigente');
        }
      }

      const updated = await tx.verificationRequest.update({
        where: { id: request.id },
        data: { status: 'submitted', submittedAt: new Date() },
        include: REQUEST_INCLUDE,
      });
      if (status !== 'verified') {
        await tx.organization.update({
          where: { id: orgId },
          data: { verificationStatus: 'pending', verificationComputedAt: new Date() },
        });
      }
      return this.requestView(updated);
    });
  }

  async getCompanyDocument(orgId: string, documentId: string) {
    const document = await this.prisma.withContext({ orgId }, (tx) =>
      tx.verificationDocument.findFirst({
        where: { id: documentId, organizationId: orgId },
        select: { data: true, mimeType: true, filename: true },
      }),
    );
    if (!document) throw new NotFoundException('Documento no encontrado');
    return {
      data: Buffer.from(document.data),
      mimeType: document.mimeType,
      filename: document.filename,
    };
  }

  // ---------------------------------------------------------------------------
  // Super admin
  // ---------------------------------------------------------------------------
  async adminList(query: { page: number; pageSize: number; status?: string; search?: string }) {
    const page = Math.max(1, query.page);
    const pageSize = Math.min(100, Math.max(1, query.pageSize));
    const search = query.search?.trim();
    const where: Prisma.VerificationRequestWhereInput = {
      ...(query.status
        ? { status: query.status }
        : { status: { in: ['submitted', 'in_review'] } }),
      ...(search
        ? {
            organization: {
              OR: [
                { tradeName: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const [total, rows] = await Promise.all([
        tx.verificationRequest.count({ where }),
        tx.verificationRequest.findMany({
          where,
          include: {
            organization: { select: { id: true, tradeName: true, slug: true, email: true } },
            _count: { select: { documents: true, projects: true } },
          },
          orderBy: { submittedAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);
      return {
        items: rows.map((row) => ({
          id: row.id,
          status: row.status,
          submittedAt: row.submittedAt,
          createdAt: row.createdAt,
          expiresAt: row.expiresAt,
          organization: row.organization,
          documents: row._count.documents,
          projects: row._count.projects,
        })),
        total,
        page,
        pageSize,
      };
    });
  }

  async adminGet(id: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const request = await tx.verificationRequest.findUnique({
        where: { id },
        include: REQUEST_INCLUDE,
      });
      if (!request) throw new NotFoundException('Solicitud no encontrada');
      if (request.status === 'submitted') {
        const updated = await tx.verificationRequest.update({
          where: { id },
          data: { status: 'in_review' },
          include: REQUEST_INCLUDE,
        });
        return this.requestView(updated);
      }
      return this.requestView(request);
    });
  }

  async adminDocument(id: string, documentId: string) {
    const request = await this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.verificationRequest.findUnique({ where: { id }, select: { organizationId: true } }),
    );
    if (!request) throw new NotFoundException('Solicitud no encontrada');
    const document = await this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.verificationDocument.findFirst({
        where: { id: documentId, organizationId: request.organizationId },
        select: { data: true, mimeType: true, filename: true },
      }),
    );
    if (!document) throw new NotFoundException('Documento no encontrado');
    return {
      data: Buffer.from(document.data),
      mimeType: document.mimeType,
      filename: document.filename,
    };
  }

  async approve(id: string, reviewerId: string, dto: ApproveVerificationDto) {
    const defaultDays = Number(await this.settings.get<number>('verification.expiry_days'));
    const days = dto.expiresInDays ?? (Number(defaultDays) || 365);
    await this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const request = await tx.verificationRequest.findUnique({ where: { id } });
      if (!request) throw new NotFoundException('Solicitud no encontrada');
      if (!['submitted', 'in_review'].includes(request.status)) {
        throw new BadRequestException('La solicitud ya está cerrada');
      }
      const now = new Date();
      const expiresAt = new Date(now.getTime() + days * DAY_MS);
      await tx.verificationRequest.update({
        where: { id },
        data: {
          status: 'approved',
          reviewedAt: now,
          reviewedBy: reviewerId,
          decisionReason: dto.note?.trim() || null,
          expiresAt,
        },
      });
      await tx.organization.update({
        where: { id: request.organizationId },
        data: {
          verificationStatus: 'verified',
          verifiedAt: now,
          verificationExpiresAt: expiresAt,
          verificationComputedAt: now,
        },
      });
    });
    return this.adminGet(id);
  }

  async reject(id: string, reviewerId: string, dto: RejectVerificationDto) {
    await this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const request = await tx.verificationRequest.findUnique({
        where: { id },
        include: { organization: { select: { verificationStatus: true, verificationExpiresAt: true } } },
      });
      if (!request) throw new NotFoundException('Solicitud no encontrada');
      if (!['submitted', 'in_review'].includes(request.status)) {
        throw new BadRequestException('La solicitud ya está cerrada');
      }
      const now = new Date();
      await tx.verificationRequest.update({
        where: { id },
        data: {
          status: 'rejected',
          reviewedAt: now,
          reviewedBy: reviewerId,
          decisionReason: dto.reason.trim(),
        },
      });
      // Una renovación rechazada no retira el sello vigente.
      const stillVerified =
        request.organization.verificationStatus === 'verified' &&
        request.organization.verificationExpiresAt !== null &&
        request.organization.verificationExpiresAt.getTime() > now.getTime();
      if (!stillVerified) {
        await tx.organization.update({
          where: { id: request.organizationId },
          data: {
            verificationStatus: 'rejected',
            verificationExpiresAt: null,
            verificationComputedAt: now,
          },
        });
      }
    });
    return this.adminGet(id);
  }

  async revoke(id: string, reviewerId: string, dto: RevokeVerificationDto) {
    await this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const request = await tx.verificationRequest.findUnique({ where: { id } });
      if (!request) throw new NotFoundException('Solicitud no encontrada');
      const now = new Date();
      await tx.verificationRequest.update({
        where: { id },
        data: {
          status: 'revoked',
          reviewedAt: now,
          reviewedBy: reviewerId,
          decisionReason: dto.reason?.trim() || 'Verificación revocada',
          expiresAt: now,
        },
      });
      await tx.organization.update({
        where: { id: request.organizationId },
        data: {
          verificationStatus: 'expired',
          verificationExpiresAt: now,
          verificationComputedAt: now,
        },
      });
    });
    return this.adminGet(id);
  }

  // ---------------------------------------------------------------------------
  // Internos
  // ---------------------------------------------------------------------------
  private async ensureDraft(tx: Prisma.TransactionClient, orgId: string) {
    const org = await tx.organization.findFirst({
      where: { id: orgId, deletedAt: null },
      select: { verificationStatus: true, verificationExpiresAt: true },
    });
    if (!org) throw new NotFoundException('Empresa no encontrada');

    const open = await tx.verificationRequest.findFirst({
      where: { organizationId: orgId, status: { in: ['submitted', 'in_review'] } },
      select: { id: true },
    });
    if (open) throw new BadRequestException('Ya hay una solicitud en revisión');

    const status = effectiveVerificationStatus(org);
    if (status === 'verified' && org.verificationExpiresAt) {
      const renewalDays = Number(await this.settings.get<number>('verification.renewal_days'));
      if (
        org.verificationExpiresAt.getTime() >
        Date.now() + (Number(renewalDays) || 30) * DAY_MS
      ) {
        throw new BadRequestException('Tu verificación sigue vigente');
      }
    }

    let draft = await tx.verificationRequest.findFirst({
      where: { organizationId: orgId, status: 'draft' },
      orderBy: { createdAt: 'desc' },
    });
    if (!draft) {
      draft = await tx.verificationRequest.create({
        data: { organizationId: orgId, status: 'draft' },
      });
    }
    return draft;
  }

  private requestView(
    request: Prisma.VerificationRequestGetPayload<{ include: typeof REQUEST_INCLUDE }>,
  ) {
    return {
      id: request.id,
      status: request.status,
      submittedAt: request.submittedAt,
      reviewedAt: request.reviewedAt,
      decisionReason: request.decisionReason,
      expiresAt: request.expiresAt,
      createdAt: request.createdAt,
      organization: request.organization,
      documents: request.documents,
      projects: request.projects.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        url: project.url,
        createdAt: project.createdAt,
        documents: project.documents,
      })),
    };
  }
}
