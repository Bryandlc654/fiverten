import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { recordConsent } from '../privacy/consent';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientRelationDto, UpdateClientRelationDto } from './dto/client-relation.dto';

function view(relation: {
  id: string;
  projectId: string;
  contactName: string;
  contactEmail: string;
  status: string;
  consent: boolean;
  consentAt: Date | null;
  verificationLevel: string;
  createdAt: Date;
  updatedAt: Date;
  project: { name: string };
  _count?: { reviews: number; reviewRequests: number };
}) {
  return {
    id: relation.id,
    projectId: relation.projectId,
    projectName: relation.project.name,
    contactName: relation.contactName,
    contactEmail: relation.contactEmail,
    status: relation.status,
    consent: relation.consent,
    consentAt: relation.consentAt,
    verificationLevel: relation.verificationLevel,
    reviews: relation._count?.reviews ?? 0,
    reviewRequests: relation._count?.reviewRequests ?? 0,
    createdAt: relation.createdAt,
    updatedAt: relation.updatedAt,
  };
}

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(orgId: string, projectId?: string) {
    return this.prisma.withContext({ orgId }, async (tx) => {
      const relations = await tx.clientRelation.findMany({
        where: { organizationId: orgId, ...(projectId ? { projectId } : {}) },
        include: {
          project: { select: { name: true } },
          _count: { select: { reviews: true, reviewRequests: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return { items: relations.map(view) };
    });
  }

  async create(orgId: string, userId: string, dto: CreateClientRelationDto) {
    return this.prisma.withContext({ orgId, userId }, async (tx) => {
      const project = await tx.verificationProject.findFirst({
        where: { id: dto.projectId, organizationId: orgId },
        select: { id: true },
      });
      if (!project) throw new NotFoundException('Proyecto no encontrado');
      const existing = await tx.clientRelation.findFirst({
        where: {
          projectId: dto.projectId,
          contactEmail: dto.contactEmail.trim().toLowerCase(),
        },
        include: { project: { select: { name: true } } },
      });
      if (existing) {
        throw new BadRequestException('Ya existe una relación con este cliente para el proyecto');
      }
      const consent = dto.consent ?? false;
      const relation = await tx.clientRelation.create({
        data: {
          organizationId: orgId,
          projectId: dto.projectId,
          contactName: dto.contactName.trim(),
          contactEmail: dto.contactEmail.trim().toLowerCase(),
          status: consent ? 'active' : 'invited',
          consent,
          consentAt: consent ? new Date() : null,
          verificationLevel: dto.verificationLevel ?? 'identified',
          createdBy: userId,
        },
        include: {
          project: { select: { name: true } },
          _count: { select: { reviews: true, reviewRequests: true } },
        },
      });
      await recordConsent(tx, {
        organizationId: orgId,
        userId,
        subjectType: 'client_relation',
        subjectId: relation.id,
        email: relation.contactEmail,
        type: 'client_relation',
        granted: consent,
      });
      return view(relation);
    });
  }

  async update(orgId: string, relationId: string, dto: UpdateClientRelationDto) {
    return this.prisma.withContext({ orgId }, async (tx) => {
      const current = await tx.clientRelation.findFirst({
        where: { id: relationId, organizationId: orgId },
      });
      if (!current) throw new NotFoundException('Relación con cliente no encontrada');
      const relation = await tx.clientRelation.update({
        where: { id: relationId },
        data: {
          ...(dto.contactName !== undefined ? { contactName: dto.contactName.trim() } : {}),
          ...(dto.contactEmail !== undefined
            ? { contactEmail: dto.contactEmail.trim().toLowerCase() }
            : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.verificationLevel !== undefined
            ? { verificationLevel: dto.verificationLevel }
            : {}),
          ...(dto.consent !== undefined ? { consent: dto.consent } : {}),
          ...(dto.consent === true && !current.consentAt ? { consentAt: new Date() } : {}),
        },
        include: {
          project: { select: { name: true } },
          _count: { select: { reviews: true, reviewRequests: true } },
        },
      });
      return view(relation);
    });
  }

  async remove(orgId: string, relationId: string) {
    return this.prisma.withContext({ orgId }, async (tx) => {
      const current = await tx.clientRelation.findFirst({
        where: { id: relationId, organizationId: orgId },
        select: { id: true },
      });
      if (!current) throw new NotFoundException('Relación con cliente no encontrada');
      await tx.clientRelation.delete({ where: { id: relationId } });
      return { success: true };
    });
  }
}
