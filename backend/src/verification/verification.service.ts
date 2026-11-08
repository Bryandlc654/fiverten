import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { decryptFile, secureFile } from '../common/file-security';
import { MailService } from '../mail/mail.service';
import { recordConsent } from '../privacy/consent';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformSettingsService } from '../settings/settings.service';
import {
  ApproveVerificationDto,
  CreateCertificationDto,
  CreateVerificationProjectDto,
  RejectCertificationDto,
  RejectVerificationDto,
  ReviewCertificationDto,
  RevokeVerificationDto,
  UpdateVerificationInquiryDto,
  VerificationInquiryDto,
} from './dto/verification.dto';
import { effectiveVerificationStatus } from './verification-status';
import { missingProfileRequirements } from './company-profile-requirements';

export interface VerificationUpload {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

export interface VerificationDocumentDetails {
  issuer?: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
}

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

const DAY_MS = 24 * 60 * 60 * 1000;

function newEmbedToken(): string {
  return randomBytes(24).toString('base64url');
}

function defaultBadgeUrl(slug: string): string {
  return `/empresa/${slug}`;
}

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
      evidenceId: true,
      category: true,
      evidenceType: true,
      projectId: true,
      issuer: true,
      documentNumber: true,
      version: true,
      issueDate: true,
      expiryDate: true,
      filename: true,
      mimeType: true,
      size: true,
      dataOrigin: true,
      createdAt: true,
      evidence: {
        select: {
          id: true,
          type: true,
          fileRef: true,
          sourceRef: true,
          visibility: true,
          status: true,
          hash: true,
          issueDate: true,
          expiryDate: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  projects: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      documents: {
        select: {
          id: true,
          evidenceId: true,
          category: true,
          evidenceType: true,
          projectId: true,
          issuer: true,
          documentNumber: true,
          version: true,
          issueDate: true,
          expiryDate: true,
          filename: true,
          mimeType: true,
          size: true,
          encryptionVersion: true,
          scanStatus: true,
          dataOrigin: true,
          createdAt: true,
          evidence: {
            select: {
              id: true,
              type: true,
              fileRef: true,
              sourceRef: true,
              visibility: true,
              status: true,
              hash: true,
              issueDate: true,
              expiryDate: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' as const },
      },
    },
  },
  events: {
    orderBy: { createdAt: 'desc' as const },
  },
  _count: { select: { documents: true, projects: true } },
} satisfies Prisma.VerificationRequestInclude;

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: PlatformSettingsService,
    private readonly mail: MailService,
  ) {}

  /** Formulario público de captación de /verificar-empresa. */
  async submitInquiry(dto: VerificationInquiryDto) {
    // Respuesta neutra: no se crea nada y el bot no recibe una señal distinta.
    if (dto.honeypot?.trim()) return { received: true };
    const support =
      (await this.settings.get<string>('general.support_email'))?.trim() || 'soporte@fiverten.com';
    await this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const inquiry = await tx.verificationInquiry.create({
        data: {
          companyName: dto.companyName.trim(),
          taxId: dto.taxId?.trim() || null,
          sector: dto.sector?.trim() || null,
          contactName: dto.contactName.trim(),
          email: dto.email.trim().toLowerCase(),
          phone: dto.phone?.trim() || null,
          website: dto.website?.trim() || null,
          country: dto.country?.trim() || null,
          message: dto.message?.trim() || null,
        },
      });
      await recordConsent(tx, {
        subjectType: 'verification_inquiry',
        subjectId: inquiry.id,
        email: dto.email.trim().toLowerCase(),
        type: 'verification_inquiry',
        granted: dto.consent,
      });
    });
    const email = dto.email.trim().toLowerCase();
    this.mail
      .sendVerificationInquiry(
        support,
        dto.companyName.trim(),
        dto.contactName.trim(),
        email,
        dto.phone?.trim(),
        dto.message?.trim(),
      )
      .catch(() => undefined);
    this.mail
      .sendVerificationInquiryConfirmation(email, dto.companyName.trim(), dto.contactName.trim())
      .catch(() => undefined);
    return { received: true };
  }

  // ---------------------------------------------------------------------------
  // Empresa
  // ---------------------------------------------------------------------------
  async getCompanyStatus(orgId: string) {
    const [requiredDocs, minProjects, reviewDays, expiryDays, renewalDays, reminderDaysSetting] =
      await Promise.all([
        this.settings.get<string[]>('verification.required_documents'),
        this.settings.get<number>('verification.min_projects'),
        this.settings.get<number>('verification.review_days'),
        this.settings.get<number>('verification.expiry_days'),
        this.settings.get<number>('verification.renewal_days'),
        this.settings.get<number>('notifications.reminder_days'),
      ]);

    return this.prisma.withContext({ orgId }, async (tx) => {
      const org = await tx.organization.findFirst({
        where: { id: orgId, deletedAt: null },
        select: {
          id: true,
          tradeName: true,
          legalName: true,
          taxId: true,
          email: true,
          description: true,
          isPublic: true,
          slug: true,
          publicId: true,
          verificationStatus: true,
          verifiedAt: true,
          verificationExpiresAt: true,
          publicBadge: {
            select: {
              id: true,
              state: true,
              embedToken: true,
              currentUrl: true,
              revokedAt: true,
            },
          },
        },
      });
      if (!org) throw new NotFoundException('Empresa no encontrada');

      const status = effectiveVerificationStatus(org);
      let badge = org.publicBadge;
      if (status === 'verified') {
        if (!badge) {
          badge = await tx.publicBadge.create({
            data: {
              organizationId: org.id,
              state: 'active',
              embedToken: newEmbedToken(),
              currentUrl: defaultBadgeUrl(org.slug),
            },
            select: {
              id: true,
              state: true,
              embedToken: true,
              currentUrl: true,
              revokedAt: true,
            },
          });
        } else if (badge.state !== 'active') {
          badge = await tx.publicBadge.update({
            where: { id: badge.id },
            data: {
              state: 'active',
              revokedAt: null,
              embedToken: newEmbedToken(),
            },
            select: {
              id: true,
              state: true,
              embedToken: true,
              currentUrl: true,
              revokedAt: true,
            },
          });
        }
      } else if (badge && badge.state === 'active') {
        badge = await tx.publicBadge.update({
          where: { id: badge.id },
          data: {
            state: status === 'rejected' ? 'revoked' : 'expired',
            revokedAt: status === 'rejected' ? new Date() : null,
          },
          select: {
            id: true,
            state: true,
            embedToken: true,
            currentUrl: true,
            revokedAt: true,
          },
        });
      }

      const [request, certifications] = await Promise.all([
        tx.verificationRequest.findFirst({
          where: { organizationId: orgId },
          orderBy: { createdAt: 'desc' },
          include: REQUEST_INCLUDE,
        }),
        tx.certification.findMany({
          where: { organizationId: orgId },
          orderBy: { createdAt: 'desc' },
        }),
      ]);
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

      const required = Array.isArray(requiredDocs) ? requiredDocs : ['identity', 'tax', 'address'];
      const documentCategories = new Set(
        (request?.documents ?? []).map((document) => document.category),
      );
      const missingDocuments = required.filter((category) => !documentCategories.has(category));
      const projectCount = request?.projects.length ?? 0;
      const minProjectCount = Number(minProjects) || 1;
      const profileMissing = missingProfileRequirements(org);
      const readyToSubmit =
        canSubmit &&
        request?.status === 'draft' &&
        profileMissing.length === 0 &&
        missingDocuments.length === 0 &&
        projectCount >= minProjectCount;

      return {
        organization: org,
        status,
        verifiedAt: org.verifiedAt,
        expiresAt: org.verificationExpiresAt,
        badge,
        canSubmit,
        readyToSubmit,
        profile: {
          complete: profileMissing.length === 0,
          missing: profileMissing,
        },
        requirements: {
          requiredDocuments: required,
          minProjects: minProjectCount,
          reviewDays: Number(reviewDays) || 5,
          expiryDays: Number(expiryDays) || 365,
          renewalDays: Number(renewalDays) || 30,
          reminderDays: Math.max(
            1,
            Math.min(Number(reminderDaysSetting) || 30, Number(renewalDays) || 30),
          ),
        },
        certifications,
        request: request ? this.requestView(request) : null,
      };
    });
  }

  async uploadDocument(
    orgId: string,
    userId: string,
    category: string,
    file: VerificationUpload,
    details: VerificationDocumentDetails = {},
  ) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Formato no permitido. Usa PDF, JPG, PNG, WEBP o AVIF.');
    }
    const secured = await secureFile(file);
    return this.prisma.withContext({ orgId, userId }, async (tx) => {
      const draft = await this.ensureDraft(tx, orgId);
      const last = await tx.verificationDocument.aggregate({
        where: { organizationId: orgId, category },
        _max: { version: true },
      });
      const documentId = randomUUID();
      const evidenceId = randomUUID();
      const issueDate = details.issueDate ? new Date(details.issueDate) : null;
      const expiryDate = details.expiryDate ? new Date(details.expiryDate) : null;
      await tx.evidence.create({
        data: {
          id: evidenceId,
          organizationId: orgId,
          requestId: draft.id,
          ownerType: 'organization',
          ownerId: orgId,
          type: category,
          fileRef: `db://verification-documents/${documentId}`,
          sourceRef: file.originalname.slice(0, 500),
          visibility: 'private',
          issueDate,
          expiryDate,
          status: 'submitted',
          hash: secured.hash,
          createdBy: userId,
        },
      });
      const document = await tx.verificationDocument.create({
        data: {
          id: documentId,
          organizationId: orgId,
          requestId: draft.id,
          evidenceId,
          category,
          issuer: details.issuer?.trim() || null,
          documentNumber: details.documentNumber?.trim() || null,
          version: (last._max.version ?? 0) + 1,
          issueDate,
          expiryDate,
          filename: file.originalname.slice(0, 255),
          mimeType: file.mimetype,
          size: secured.size,
          data: secured.data,
          encryptionVersion: secured.encryptionVersion,
          scanStatus: secured.scanStatus,
          createdBy: userId,
        },
        select: {
          id: true,
          evidenceId: true,
          category: true,
          projectId: true,
          issuer: true,
          documentNumber: true,
          version: true,
          issueDate: true,
          expiryDate: true,
          filename: true,
          mimeType: true,
          size: true,
          createdAt: true,
        },
      });
      await tx.verificationEvent.create({
        data: {
          organizationId: orgId,
          requestId: draft.id,
          entityType: 'evidence',
          entityId: evidenceId,
          actorId: userId,
          actorType: 'company_admin',
          action: 'evidence_uploaded',
          reason: 'Documento aportado por la empresa',
          source: 'company_submission',
          dataOrigin: 'company_submitted',
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
    evidenceType?: string,
  ) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Formato no permitido. Usa PDF, JPG, PNG, WEBP o AVIF.');
    }
    const secured = await secureFile(file);
    return this.prisma.withContext({ orgId, userId }, async (tx) => {
      const project = await tx.verificationProject.findFirst({
        where: { id: projectId, organizationId: orgId },
        include: { request: { select: { id: true, status: true } } },
      });
      if (!project) throw new NotFoundException('Proyecto no encontrado');
      if (project.request && project.request.status !== 'draft') {
        throw new BadRequestException('La solicitud ya está enviada y no se puede modificar');
      }
      const last = await tx.verificationDocument.aggregate({
        where: { organizationId: orgId, category: 'project' },
        _max: { version: true },
      });
      const documentId = randomUUID();
      const evidenceId = randomUUID();
      await tx.evidence.create({
        data: {
          id: evidenceId,
          organizationId: orgId,
          requestId: project.requestId,
          projectId,
          ownerType: 'project',
          ownerId: projectId,
          type: evidenceType ?? 'project',
          fileRef: `db://verification-documents/${documentId}`,
          sourceRef: file.originalname.slice(0, 500),
          visibility: 'private',
          status: 'submitted',
          hash: secured.hash,
          createdBy: userId,
        },
      });
      const document = await tx.verificationDocument.create({
        data: {
          id: documentId,
          organizationId: orgId,
          requestId: project.requestId,
          projectId,
          evidenceId,
          category: 'project',
          evidenceType: evidenceType ?? null,
          version: (last._max.version ?? 0) + 1,
          filename: file.originalname.slice(0, 255),
          mimeType: file.mimetype,
          size: secured.size,
          data: secured.data,
          encryptionVersion: secured.encryptionVersion,
          scanStatus: secured.scanStatus,
          createdBy: userId,
        },
        select: {
          id: true,
          evidenceId: true,
          category: true,
          evidenceType: true,
          projectId: true,
          issuer: true,
          documentNumber: true,
          version: true,
          issueDate: true,
          expiryDate: true,
          filename: true,
          mimeType: true,
          size: true,
          createdAt: true,
        },
      });
      await tx.verificationEvent.create({
        data: {
          organizationId: orgId,
          requestId: project.requestId,
          entityType: 'evidence',
          entityId: evidenceId,
          actorId: userId,
          actorType: 'company_admin',
          action: 'evidence_uploaded',
          reason: `Evidencia del proyecto ${project.name}`,
          source: 'company_submission',
          dataOrigin: 'company_submitted',
        },
      });
      return document;
    });
  }

  async deleteDocument(orgId: string, documentId: string) {
    return this.prisma.withContext({ orgId }, async (tx) => {
      const document = await tx.verificationDocument.findFirst({
        where: { id: documentId, organizationId: orgId },
        select: {
          id: true,
          evidenceId: true,
          requestId: true,
          filename: true,
          request: { select: { status: true } },
        },
      });
      if (!document) throw new NotFoundException('Documento no encontrado');
      if (document.request && document.request.status !== 'draft') {
        throw new BadRequestException('La solicitud ya está enviada y no se puede modificar');
      }
      await tx.verificationEvent.create({
        data: {
          organizationId: orgId,
          requestId: document.requestId,
          entityType: 'evidence',
          entityId: document.evidenceId,
          actorType: 'company_admin',
          action: 'evidence_deleted',
          reason: `Documento eliminado: ${document.filename}`,
          source: 'company_submission',
          dataOrigin: 'company_submitted',
        },
      });
      await tx.evidence.delete({ where: { id: document.evidenceId } });
      return { success: true };
    });
  }

  async addProject(orgId: string, userId: string, dto: CreateVerificationProjectDto) {
    return this.prisma.withContext({ orgId, userId }, async (tx) => {
      const draft = await this.ensureDraft(tx, orgId);
      const project = await tx.verificationProject.create({
        data: {
          organizationId: orgId,
          requestId: draft.id,
          name: dto.name.trim(),
          projectType: dto.projectType ?? null,
          city: dto.city?.trim() || null,
          location: dto.location?.trim() || null,
          year: dto.year ?? null,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          status: dto.status ?? 'completed',
          publicVisibility: dto.publicVisibility ?? 'public',
          clientStatus: 'identified',
          description: dto.description?.trim() || null,
          url: dto.url?.trim() || null,
          createdBy: userId,
        },
      });
      await tx.verificationEvent.create({
        data: {
          organizationId: orgId,
          requestId: draft.id,
          entityType: 'project',
          entityId: project.id,
          actorId: userId,
          actorType: 'company_admin',
          action: 'project_created',
          reason: `Proyecto añadido: ${project.name}`,
          source: 'company_submission',
          dataOrigin: 'company_submitted',
        },
      });
      return project;
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

  async submit(orgId: string, actorId: string) {
    const [requiredDocs, minProjects] = await Promise.all([
      this.settings.get<string[]>('verification.required_documents'),
      this.settings.get<number>('verification.min_projects'),
    ]);

    return this.prisma.withContext({ orgId }, async (tx) => {
      const org = await tx.organization.findFirst({
        where: { id: orgId, deletedAt: null },
        select: {
          verificationStatus: true,
          verificationExpiresAt: true,
          legalName: true,
          taxId: true,
          email: true,
          description: true,
          isPublic: true,
        },
      });
      if (!org) throw new NotFoundException('Empresa no encontrada');

      const missingProfile = missingProfileRequirements(org);
      if (missingProfile.length > 0) {
        throw new BadRequestException(
          `Completa tu perfil antes de solicitar la verificación: ${missingProfile
            .map((item) => item.label)
            .join(', ')}`,
        );
      }

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
        throw new BadRequestException(`Faltan documentos obligatorios: ${missing.join(', ')}`);
      }
      if (request.projects.length < (Number(minProjects) || 1)) {
        throw new BadRequestException(
          `Añade al menos ${Number(minProjects) || 1} proyecto o evidencia`,
        );
      }

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
      await tx.evidence.updateMany({
        where: { requestId: updated.id },
        data: { status: 'submitted' },
      });
      await tx.verificationEvent.create({
        data: {
          organizationId: orgId,
          requestId: updated.id,
          entityType: 'organization_verification',
          entityId: updated.id,
          actorId,
          actorType: 'company_admin',
          action: status === 'verified' ? 'renewal_submitted' : 'submitted',
          previousStatus: status,
          newStatus: status === 'verified' ? 'verified' : 'pending',
          reason:
            status === 'verified'
              ? 'Solicitud de renovación enviada por la empresa'
              : 'Solicitud de verificación enviada por la empresa',
          source: 'company_submission',
          evidence: updated.id,
          dataOrigin: 'company_submitted',
        },
      });
      const refreshed = await tx.verificationRequest.findUniqueOrThrow({
        where: { id: updated.id },
        include: REQUEST_INCLUDE,
      });
      return this.requestView(refreshed);
    });
  }

  async getCompanyDocument(orgId: string, documentId: string) {
    const document = await this.prisma.withContext({ orgId }, (tx) =>
      tx.verificationDocument.findFirst({
        where: { id: documentId, organizationId: orgId },
        select: { data: true, encryptionVersion: true, mimeType: true, filename: true },
      }),
    );
    if (!document) throw new NotFoundException('Documento no encontrado');
    return {
      data: decryptFile(Buffer.from(document.data), document.encryptionVersion),
      mimeType: document.mimeType,
      filename: document.filename,
    };
  }

  /** Información pública de verificación: sin documentos ni datos privados. */
  async getPublicVerification(slug: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const org = await tx.organization.findFirst({
        where: {
          slug: slug.toLowerCase(),
          deletedAt: null,
          isActive: true,
          isPublic: true,
          status: 'active',
        },
        include: {
          sector: { select: { slug: true, name: true } },
          country: { select: { iso2: true, name: true } },
          locations: {
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            select: {
              id: true,
              label: true,
              addressLine: true,
              city: true,
              region: true,
              postalCode: true,
              country: true,
              isPrimary: true,
            },
          },
        },
      });
      if (!org) throw new NotFoundException('Empresa no encontrada');

      const status = effectiveVerificationStatus(org);
      const approved =
        status === 'verified'
          ? await tx.verificationRequest.findFirst({
              where: { organizationId: org.id, status: 'approved' },
              orderBy: { reviewedAt: 'desc' },
              include: {
                documents: { select: { category: true } },
                projects: {
                  where: { publicVisibility: 'public' },
                  orderBy: { createdAt: 'asc' },
                  include: {
                    documents: {
                      select: {
                        id: true,
                        mimeType: true,
                        size: true,
                        evidenceType: true,
                        createdAt: true,
                      },
                      orderBy: { createdAt: 'asc' },
                    },
                  },
                },
              },
            })
          : null;

      const categories = approved
        ? Array.from(new Set(approved.documents.map((document) => document.category))).filter(
            (category) => category !== 'project',
          )
        : [];

      const certifications =
        status === 'verified'
          ? await tx.certification.findMany({
              where: {
                organizationId: org.id,
                status: 'verified',
                OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
              },
              orderBy: [{ issuedAt: 'desc' }, { createdAt: 'desc' }],
            })
          : [];

      return {
        organization: {
          tradeName: org.tradeName,
          slug: org.slug,
          publicId: org.publicId,
          description: org.description,
          logoUrl: org.logoUrl,
          sector: org.sector,
          country: org.country,
          locations: org.locations,
        },
        status,
        verifiedAt: org.verifiedAt,
        expiresAt: org.verificationExpiresAt,
        scope: approved?.scope ?? null,
        methodologyVersion: approved?.methodologyVersion ?? null,
        reviewedAt: approved?.reviewedAt ?? null,
        documentsCount: approved?.documents.length ?? 0,
        categories,
        certifications: certifications.map((certification) => ({
          id: certification.id,
          name: certification.name,
          issuer: certification.issuer,
          credentialId: certification.publicCredential ? certification.credentialId : null,
          credentialUrl: certification.publicCredential ? certification.credentialUrl : null,
          issuedAt: certification.issuedAt,
          expiresAt: certification.expiresAt,
        })),
        projects: (approved?.projects ?? []).map((project) => ({
          id: project.id,
          name: project.name,
          projectType: project.projectType,
          city: project.city,
          location: project.location,
          year: project.year,
          startDate: project.startDate,
          endDate: project.endDate,
          status: project.status,
          publicVisibility: project.publicVisibility,
          clientStatus: project.clientStatus,
          description: project.description,
          url: project.url,
          verificationScope: project.verificationScope,
          methodology: project.methodology,
          evidenceTypes: project.evidenceTypes,
          verifiedAt: project.verifiedAt,
          createdAt: project.createdAt,
          evidenceCount: project.documents.length,
          evidence: project.documents.map((document) => ({
            id: document.id,
            kind: document.mimeType.startsWith('image/') ? 'image' : 'pdf',
            evidenceType: document.evidenceType,
            size: document.size,
            createdAt: document.createdAt,
          })),
        })),
      };
    });
  }

  /** Datos configurables que se muestran en las páginas públicas del proceso. */
  async getPublicVerificationInfo() {
    const [reviewDays, expiryDays, renewalDays, minProjects, requiredDocuments] = await Promise.all(
      [
        this.settings.get<number>('verification.review_days'),
        this.settings.get<number>('verification.expiry_days'),
        this.settings.get<number>('verification.renewal_days'),
        this.settings.get<number>('verification.min_projects'),
        this.settings.get<string[]>('verification.required_documents'),
      ],
    );
    return {
      reviewDays: Number(reviewDays) || 5,
      expiryDays: Number(expiryDays) || 365,
      renewalDays: Number(renewalDays) || 30,
      minProjects: Number(minProjects) || 1,
      requiredDocuments: Array.isArray(requiredDocuments)
        ? requiredDocuments
        : ['identity', 'tax', 'address'],
    };
  }

  // ---------------------------------------------------------------------------
  // Certificaciones externas (empresa)
  // ---------------------------------------------------------------------------
  async addCertification(orgId: string, userId: string, dto: CreateCertificationDto) {
    return this.prisma.withContext({ orgId, userId }, async (tx) => {
      const org = await tx.organization.findFirst({
        where: { id: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!org) throw new NotFoundException('Empresa no encontrada');
      return tx.certification.create({
        data: {
          organizationId: orgId,
          name: dto.name.trim(),
          issuer: dto.issuer.trim(),
          credentialId: dto.credentialId?.trim() || null,
          credentialUrl: dto.credentialUrl?.trim() || null,
          issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          publicCredential: dto.publicCredential ?? false,
          createdBy: userId,
        },
      });
    });
  }

  async deleteCertification(orgId: string, id: string) {
    return this.prisma.withContext({ orgId }, async (tx) => {
      const certification = await tx.certification.findFirst({
        where: { id, organizationId: orgId },
        select: { id: true, status: true },
      });
      if (!certification) throw new NotFoundException('Certificación no encontrada');
      if (certification.status === 'verified') {
        throw new BadRequestException(
          'Una certificación validada solo puede retirarse mediante una nueva revisión',
        );
      }
      await tx.certification.delete({ where: { id } });
      return { success: true };
    });
  }

  // ---------------------------------------------------------------------------
  // Super admin
  // ---------------------------------------------------------------------------
  async adminList(query: { page: number; pageSize: number; status?: string; search?: string }) {
    const page = Math.max(1, query.page);
    const pageSize = Math.min(100, Math.max(1, query.pageSize));
    const search = query.search?.trim();
    const where: Prisma.VerificationRequestWhereInput = {
      ...(query.status ? { status: query.status } : { status: { in: ['submitted', 'in_review'] } }),
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
        select: { data: true, encryptionVersion: true, mimeType: true, filename: true },
      }),
    );
    if (!document) throw new NotFoundException('Documento no encontrado');
    return {
      data: decryptFile(Buffer.from(document.data), document.encryptionVersion),
      mimeType: document.mimeType,
      filename: document.filename,
    };
  }

  async approve(id: string, reviewerId: string, dto: ApproveVerificationDto) {
    const defaultDays = Number(await this.settings.get<number>('verification.expiry_days'));
    const days = dto.expiresInDays ?? (Number(defaultDays) || 365);
    await this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const request = await tx.verificationRequest.findUnique({
        where: { id },
        include: {
          organization: {
            select: {
              verificationStatus: true,
              verificationExpiresAt: true,
              slug: true,
            },
          },
          projects: {
            include: {
              documents: {
                select: { evidenceType: true, evidence: { select: { type: true } } },
              },
            },
          },
        },
      });
      if (!request) throw new NotFoundException('Solicitud no encontrada');
      if (!['submitted', 'in_review'].includes(request.status)) {
        throw new BadRequestException('La solicitud ya está cerrada');
      }
      const now = new Date();
      const expiresAt = new Date(now.getTime() + days * DAY_MS);
      const previousStatus = effectiveVerificationStatus(request.organization);
      const scope = dto.scope?.trim() || 'identity,documentation,projects';
      const methodologyVersion = dto.methodologyVersion?.trim() || 'v1.0';
      await tx.verificationRequest.update({
        where: { id },
        data: {
          status: 'approved',
          scope,
          methodologyVersion,
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
      for (const project of request.projects) {
        const evidenceTypes = Array.from(
          new Set(
            project.documents
              .map((document) => document.evidenceType ?? document.evidence.type)
              .filter(Boolean),
          ),
        );
        await tx.verificationProject.update({
          where: { id: project.id },
          data: {
            verifiedAt: now,
            verificationReviewerId: reviewerId,
            evidenceTypes,
            methodology: 'Revisión documental y de evidencias por FIVERTEN',
            verificationScope: 'Identidad, documentación y evidencias del proyecto',
          },
        });
      }
      await tx.evidence.updateMany({
        where: { requestId: request.id },
        data: { status: 'verified', expiryDate: expiresAt },
      });
      const currentBadge = await tx.publicBadge.findUnique({
        where: { organizationId: request.organizationId },
        select: { state: true },
      });
      await tx.publicBadge.upsert({
        where: { organizationId: request.organizationId },
        create: {
          organizationId: request.organizationId,
          state: 'active',
          embedToken: newEmbedToken(),
          currentUrl: defaultBadgeUrl(request.organization.slug),
        },
        update: {
          state: 'active',
          currentUrl: defaultBadgeUrl(request.organization.slug),
          revokedAt: null,
          ...(currentBadge && currentBadge.state !== 'active'
            ? { embedToken: newEmbedToken() }
            : {}),
        },
      });
      await tx.verificationEvent.create({
        data: {
          organizationId: request.organizationId,
          requestId: request.id,
          entityType: 'organization_verification',
          entityId: request.id,
          actorId: reviewerId,
          actorType: await this.reviewerType(tx, reviewerId),
          action: 'approved',
          previousStatus,
          newStatus: 'verified',
          reason: dto.note?.trim() || 'Verificación aprobada',
          source: 'FIVERTEN review',
          evidence: `verification_request:${request.id}`,
          dataOrigin: 'fiverten_verified',
          expiresAt,
        },
      });
    });
    return this.adminGet(id);
  }

  async reject(id: string, reviewerId: string, dto: RejectVerificationDto) {
    await this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const request = await tx.verificationRequest.findUnique({
        where: { id },
        include: {
          organization: { select: { verificationStatus: true, verificationExpiresAt: true } },
        },
      });
      if (!request) throw new NotFoundException('Solicitud no encontrada');
      if (!['submitted', 'in_review'].includes(request.status)) {
        throw new BadRequestException('La solicitud ya está cerrada');
      }
      const now = new Date();
      const previousStatus = effectiveVerificationStatus(request.organization);
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
      await tx.evidence.updateMany({
        where: { requestId: request.id },
        data: { status: 'rejected' },
      });
      if (!stillVerified) {
        await tx.organization.update({
          where: { id: request.organizationId },
          data: {
            verificationStatus: 'rejected',
            verificationExpiresAt: null,
            verificationComputedAt: now,
          },
        });
        await tx.publicBadge.updateMany({
          where: { organizationId: request.organizationId, state: 'active' },
          data: { state: 'revoked', revokedAt: now },
        });
      }
      await tx.verificationEvent.create({
        data: {
          organizationId: request.organizationId,
          requestId: request.id,
          entityType: 'organization_verification',
          entityId: request.id,
          actorId: reviewerId,
          actorType: await this.reviewerType(tx, reviewerId),
          action: 'rejected',
          previousStatus,
          newStatus: stillVerified ? 'verified' : 'rejected',
          reason: dto.reason.trim(),
          source: 'FIVERTEN review',
          evidence: `verification_request:${request.id}`,
          dataOrigin: 'fiverten_verified',
        },
      });
    });
    return this.adminGet(id);
  }

  async revoke(id: string, reviewerId: string, dto: RevokeVerificationDto) {
    await this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const request = await tx.verificationRequest.findUnique({
        where: { id },
        include: {
          organization: {
            select: { verificationStatus: true, verificationExpiresAt: true },
          },
        },
      });
      if (!request) throw new NotFoundException('Solicitud no encontrada');
      const now = new Date();
      const previousStatus = effectiveVerificationStatus(request.organization);
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
      await tx.evidence.updateMany({
        where: { requestId: request.id },
        data: { status: 'expired' },
      });
      await tx.publicBadge.updateMany({
        where: { organizationId: request.organizationId },
        data: { state: 'revoked', revokedAt: now },
      });
      await tx.verificationEvent.create({
        data: {
          organizationId: request.organizationId,
          requestId: request.id,
          entityType: 'organization_verification',
          entityId: request.id,
          actorId: reviewerId,
          actorType: await this.reviewerType(tx, reviewerId),
          action: 'revoked',
          previousStatus,
          newStatus: 'expired',
          reason: dto.reason?.trim() || 'Verificación revocada',
          source: 'FIVERTEN review',
          evidence: `verification_request:${request.id}`,
          dataOrigin: 'fiverten_verified',
          expiresAt: now,
        },
      });
    });
    return this.adminGet(id);
  }

  async adminListCertifications(query: {
    page: number;
    pageSize: number;
    status?: string;
    search?: string;
  }) {
    const page = Math.max(1, query.page);
    const pageSize = Math.min(100, Math.max(1, query.pageSize));
    const search = query.search?.trim();
    const where: Prisma.CertificationWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { issuer: { contains: search, mode: 'insensitive' } },
              { organization: { tradeName: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const [total, rows] = await Promise.all([
        tx.certification.count({ where }),
        tx.certification.findMany({
          where,
          include: {
            organization: { select: { id: true, tradeName: true, slug: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);
      return { items: rows, total, page, pageSize };
    });
  }

  async approveCertification(id: string, reviewerId: string, dto: ReviewCertificationDto) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const certification = await tx.certification.findUnique({ where: { id } });
      if (!certification) throw new NotFoundException('Certificación no encontrada');
      if (certification.status !== 'pending') {
        throw new BadRequestException('La certificación ya está revisada');
      }
      return tx.certification.update({
        where: { id },
        data: {
          status: 'verified',
          reviewedAt: new Date(),
          reviewedBy: reviewerId,
          decisionReason: dto.note?.trim() || null,
        },
        include: {
          organization: { select: { id: true, tradeName: true, slug: true, email: true } },
        },
      });
    });
  }

  async rejectCertification(id: string, reviewerId: string, dto: RejectCertificationDto) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const certification = await tx.certification.findUnique({ where: { id } });
      if (!certification) throw new NotFoundException('Certificación no encontrada');
      if (certification.status !== 'pending') {
        throw new BadRequestException('La certificación ya está revisada');
      }
      return tx.certification.update({
        where: { id },
        data: {
          status: 'rejected',
          reviewedAt: new Date(),
          reviewedBy: reviewerId,
          decisionReason: dto.reason.trim(),
        },
        include: {
          organization: { select: { id: true, tradeName: true, slug: true, email: true } },
        },
      });
    });
  }

  async adminListInquiries(query: {
    page: number;
    pageSize: number;
    status?: string;
    search?: string;
  }) {
    const page = Math.max(1, query.page);
    const pageSize = Math.min(100, Math.max(1, query.pageSize));
    const search = query.search?.trim();
    const where: Prisma.VerificationInquiryWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { companyName: { contains: search, mode: 'insensitive' } },
              { contactName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const [total, rows] = await Promise.all([
        tx.verificationInquiry.count({ where }),
        tx.verificationInquiry.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);
      return { items: rows, total, page, pageSize };
    });
  }

  async updateInquiry(id: string, userId: string, dto: UpdateVerificationInquiryDto) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const inquiry = await tx.verificationInquiry.findUnique({ where: { id } });
      if (!inquiry) throw new NotFoundException('Solicitud no encontrada');
      return tx.verificationInquiry.update({
        where: { id },
        data: {
          status: dto.status,
          notes: dto.notes?.trim() || inquiry.notes,
          handledBy: userId,
          handledAt: new Date(),
        },
      });
    });
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
      if (org.verificationExpiresAt.getTime() > Date.now() + (Number(renewalDays) || 30) * DAY_MS) {
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

  private async reviewerType(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<'fiverten_admin' | 'fiverten_verifier'> {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true, isVerifier: true },
    });
    return user?.isSuperAdmin ? 'fiverten_admin' : 'fiverten_verifier';
  }

  private requestView(
    request: Prisma.VerificationRequestGetPayload<{ include: typeof REQUEST_INCLUDE }>,
  ) {
    return {
      id: request.id,
      status: request.status,
      scope: request.scope,
      methodologyVersion: request.methodologyVersion,
      submittedAt: request.submittedAt,
      reviewedAt: request.reviewedAt,
      reviewedBy: request.reviewedBy,
      decisionReason: request.decisionReason,
      expiresAt: request.expiresAt,
      createdAt: request.createdAt,
      organization: request.organization,
      documents: request.documents,
      events: request.events,
      projects: request.projects.map((project) => ({
        id: project.id,
        name: project.name,
        projectType: project.projectType,
        city: project.city,
        location: project.location,
        year: project.year,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status,
        publicVisibility: project.publicVisibility,
        clientStatus: project.clientStatus,
        description: project.description,
        url: project.url,
        dataOrigin: project.dataOrigin,
        verificationScope: project.verificationScope,
        methodology: project.methodology,
        evidenceTypes: project.evidenceTypes,
        verificationReviewerId: project.verificationReviewerId,
        verifiedAt: project.verifiedAt,
        createdAt: project.createdAt,
        documents: project.documents,
      })),
    };
  }
}
