import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { decryptFile, secureFile } from '../common/file-security';
import { effectiveRole, roleAtLeast } from '../common/roles';
import { hashToken, randomToken } from '../common/tokens';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { safeFilename, type UploadedEvidence } from './case-files';
import {
  CASE_COMPANY_STAGES,
  CASE_NEEDS_ADMIN,
  CASE_REJECTABLE,
  dataForStatus,
  type CaseOutcome,
  type CaseStatus,
} from './review-states';
import { reviewStatus } from './reviews.mappers';

const CLIENT_LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LINK_EXPIRED = 'Este enlace no es válido o ha caducado';
const CASE_NOT_FOUND = 'Caso no encontrado';
const CASE_CLOSED = 'Este caso ya está cerrado';

type Tx = Prisma.TransactionClient;
type Sender = 'admin' | 'client' | 'company' | 'system';

const FILE_META = { id: true, filename: true, mimeType: true, size: true } as const;

function decryptCaseFile<T extends { data: Uint8Array; encryptionVersion: number }>(
  file: T,
): T & { data: Buffer } {
  return {
    ...file,
    data: decryptFile(Buffer.from(file.data), file.encryptionVersion),
  };
}

const CASE_INCLUDE = {
  review: { include: { organization: { select: { tradeName: true, slug: true } } } },
  messages: { orderBy: { createdAt: 'asc' }, include: { files: { select: FILE_META } } },
} as const satisfies Prisma.ReviewCaseInclude;

type FullCase = Prisma.ReviewCaseGetPayload<{ include: typeof CASE_INCLUDE }>;
type CaseMessage = FullCase['messages'][number];

export interface CaseListQuery {
  scope: 'active' | 'closed' | 'all';
  page: number;
  pageSize: number;
}

function toMessage(message: CaseMessage) {
  return {
    id: message.id,
    senderType: message.senderType,
    body: message.body,
    createdAt: message.createdAt,
    files: message.files,
  };
}

/**
 * La empresa ve el caso desde que el admin la notifica: los mensajes a partir
 * de ese momento y las evidencias que aportó el cliente antes. La conversación
 * previa entre el admin y el cliente no se le muestra.
 */
function visibleToCompany(
  message: { senderType: string; createdAt: Date; files: unknown[] },
  notifiedAt: Date,
): boolean {
  return (
    message.createdAt >= notifiedAt || (message.senderType === 'client' && message.files.length > 0)
  );
}

/**
 * Caso de evidencias de una reseña de baja valoración. Mientras está abierto la
 * reseña no se publica. Participan el super admin (decide), el cliente (desde un
 * enlace por correo, sin cuenta) y la empresa (desde su panel, una vez notificada).
 */
@Injectable()
export class ReviewCasesService {
  private readonly logger = new Logger(ReviewCasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Apertura (desde la confirmación de la reseña)
  // ---------------------------------------------------------------------------

  /** Crea el caso dentro de la transacción que confirma la reseña. */
  async openForReview(
    tx: Tx,
    review: { id: string; organizationId: string; rating: number },
  ): Promise<string> {
    const created = await tx.reviewCase.create({
      data: { reviewId: review.id, organizationId: review.organizationId },
    });
    await this.addMessage(
      tx,
      created,
      'system',
      null,
      `Reseña de ${review.rating} ${review.rating === 1 ? 'estrella' : 'estrellas'} pendiente de revisar las evidencias.`,
    );
    return created.id;
  }

  /** Avisa a los super admins de un caso nuevo (tras confirmar la transacción). */
  alertNewCase(caseId: string, organizationName: string, rating: number): void {
    this.alertAdmins(
      caseId,
      'Nueva reseña de baja valoración',
      `Un cliente ha confirmado una reseña de ${rating} ${rating === 1 ? 'estrella' : 'estrellas'} sobre ${organizationName}. No se publicará hasta que revises el caso: pide al cliente evidencias de lo que describe.`,
    );
  }

  // ---------------------------------------------------------------------------
  // Super admin
  // ---------------------------------------------------------------------------

  async adminList(query: CaseListQuery) {
    const page = Math.max(1, query.page);
    const pageSize = Math.min(100, Math.max(1, query.pageSize));
    const where: Prisma.ReviewCaseWhereInput =
      query.scope === 'active'
        ? { status: { not: 'closed' } }
        : query.scope === 'closed'
          ? { status: 'closed' }
          : {};

    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const [total, rows, needsAdmin, active] = await Promise.all([
        tx.reviewCase.count({ where }),
        tx.reviewCase.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            review: {
              select: {
                reviewerName: true,
                rating: true,
                title: true,
                organization: { select: { tradeName: true, slug: true } },
              },
            },
          },
        }),
        tx.reviewCase.count({ where: { status: { in: CASE_NEEDS_ADMIN } } }),
        tx.reviewCase.count({ where: { status: { not: 'closed' } } }),
      ]);

      return {
        items: rows.map((row) => ({
          id: row.id,
          status: row.status,
          outcome: row.outcome,
          needsAdmin: CASE_NEEDS_ADMIN.includes(row.status as CaseStatus),
          clientAgreed: row.clientAgreedAt !== null,
          companyAgreed: row.companyAgreedAt !== null,
          organization: row.review.organization,
          review: {
            reviewerName: row.review.reviewerName,
            rating: row.review.rating,
            title: row.review.title,
          },
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        })),
        total,
        page,
        pageSize,
        queue: { needsAdmin, active },
      };
    });
  }

  async adminDetail(id: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const found = await tx.reviewCase.findUnique({ where: { id }, include: CASE_INCLUDE });
      if (!found) {
        throw new NotFoundException(CASE_NOT_FOUND);
      }
      return this.adminView(found);
    });
  }

  /** Pide evidencias al cliente (o se las vuelve a pedir con un enlace nuevo). */
  async requestEvidence(actorId: string, id: string, message: string) {
    const sent = await this.prisma.withContext(
      { isPlatformAdmin: true, userId: actorId },
      async (tx) => {
        const current = await this.loadForAdmin(tx, id);
        this.assertStage(current, ['awaiting_admin', 'evidence_requested']);
        await this.moveTo(tx, current, { status: 'evidence_requested' });
        await this.addMessage(tx, current, 'admin', actorId, message);
        return {
          email: current.review.reviewerEmail,
          company: current.review.organization.tradeName,
          token: await this.issueClientLink(tx, current.id),
        };
      },
    );

    this.mailClient(
      sent.email,
      sent.token,
      'Necesitamos evidencias de tu reseña',
      `Gracias por tu reseña sobre ${sent.company}. Como su valoración es baja, antes de publicarla el equipo de FIVERTEN necesita que aportes pruebas de lo que describes (fotos, facturas, capturas de conversaciones…). Desde el enlace puedes leer nuestro mensaje y subir tus evidencias.`,
    );
    return this.adminDetail(id);
  }

  /** Mensaje del admin: llega al cliente y, si ya participa, a la empresa. */
  async adminMessage(actorId: string, id: string, body: string) {
    const sent = await this.prisma.withContext(
      { isPlatformAdmin: true, userId: actorId },
      async (tx) => {
        const current = await this.loadForAdmin(tx, id);
        this.assertOpen(current);
        await this.addMessage(tx, current, 'admin', actorId, body);
        await tx.reviewCase.update({ where: { id }, data: { updatedAt: new Date() } });
        return {
          email: current.review.reviewerEmail,
          organizationId: current.organizationId,
          companyInvolved: current.companyNotifiedAt !== null,
          token: await this.issueClientLink(tx, current.id),
        };
      },
    );

    this.mailClient(
      sent.email,
      sent.token,
      'Tienes un mensaje sobre tu reseña',
      'El equipo de FIVERTEN te ha escrito sobre el caso de tu reseña. Entra en el enlace para leerlo y responder.',
    );
    if (sent.companyInvolved) {
      this.notifyCompany(
        sent.organizationId,
        id,
        'Nuevo mensaje en un caso de tu empresa',
        'El equipo de FIVERTEN ha escrito en el caso de una reseña sobre tu empresa. Entra en tu panel para leerlo.',
      );
    }
    return this.adminDetail(id);
  }

  /** Las evidencias del cliente son válidas: se notifica a la empresa afectada. */
  async validateEvidence(actorId: string, id: string, message: string) {
    const sent = await this.prisma.withContext(
      { isPlatformAdmin: true, userId: actorId },
      async (tx) => {
        const current = await this.loadForAdmin(tx, id);
        this.assertStage(current, ['evidence_submitted']);
        await this.moveTo(tx, current, {
          status: 'company_notified',
          companyNotifiedAt: new Date(),
        });
        await this.addMessage(tx, current, 'admin', actorId, message);
        return {
          email: current.review.reviewerEmail,
          organizationId: current.organizationId,
          company: current.review.organization.tradeName,
          rating: current.review.rating,
          token: await this.issueClientLink(tx, current.id),
        };
      },
    );

    this.notifyCompany(
      sent.organizationId,
      id,
      'Una reseña sobre tu empresa necesita tu respuesta',
      `Un cliente ha dejado una reseña de ${sent.rating} ${sent.rating === 1 ? 'estrella' : 'estrellas'} sobre ${sent.company} y ha aportado evidencias que el equipo de FIVERTEN considera válidas. La reseña aún no está publicada: entra en tu panel para ver el caso y aportar tus evidencias.`,
    );
    this.mailClient(
      sent.email,
      sent.token,
      'Hemos validado tus evidencias',
      `Hemos revisado tus evidencias y hemos pedido a ${sent.company} que dé su versión. Te avisaremos cuando haya novedades; también puedes seguir el caso desde el enlace.`,
    );
    return this.adminDetail(id);
  }

  /** Evidencias inexistentes o no válidas: la reseña se rechaza. */
  async reject(actorId: string, id: string, reason: string) {
    const sent = await this.decide(actorId, id, CASE_REJECTABLE, 'rejected', reason);
    this.mailClient(
      sent.email,
      sent.token,
      'No hemos podido publicar tu reseña',
      `Tras revisar el caso, tu reseña sobre ${sent.company} no se publicará. Motivo: ${reason}`,
    );
    return this.adminDetail(id);
  }

  /** Sin acuerdo entre las partes: la reseña se publica. */
  async publish(actorId: string, id: string, reason?: string) {
    const sent = await this.decide(actorId, id, CASE_COMPANY_STAGES, 'published', reason);
    this.mailClient(
      sent.email,
      sent.token,
      'Tu reseña se ha publicado',
      `El caso de tu reseña sobre ${sent.company} se ha cerrado sin acuerdo y la reseña ya es pública.`,
    );
    this.notifyCompany(
      sent.organizationId,
      id,
      'Caso cerrado: la reseña se ha publicado',
      'El caso se ha cerrado sin acuerdo entre las partes y la reseña ya es visible en tu perfil.',
    );
    void this.notifications.reviewPublished(sent.review);
    return this.adminDetail(id);
  }

  /** Acuerdo entre cliente, empresa y admin: la reseña se retira. */
  async withdraw(actorId: string, id: string, reason?: string) {
    const sent = await this.decide(actorId, id, CASE_COMPANY_STAGES, 'withdrawn', reason);
    this.mailClient(
      sent.email,
      sent.token,
      'Caso cerrado por acuerdo',
      `Has llegado a un acuerdo con ${sent.company} y la reseña se ha retirado. Gracias por tu colaboración.`,
    );
    this.notifyCompany(
      sent.organizationId,
      id,
      'Caso cerrado por acuerdo',
      'Las partes han llegado a un acuerdo y la reseña se ha retirado.',
    );
    return this.adminDetail(id);
  }

  async adminFile(id: string, fileId: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const file = await tx.reviewCaseFile.findFirst({ where: { id: fileId, caseId: id } });
      if (!file) {
        throw new NotFoundException('Archivo no encontrado');
      }
      return decryptCaseFile(file);
    });
  }

  // ---------------------------------------------------------------------------
  // Cliente (enlace con token, sin cuenta)
  // ---------------------------------------------------------------------------

  async clientLookup(token: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const found = await this.findByToken(tx, token);
      const open = found.status !== 'closed';
      const companyStage = CASE_COMPANY_STAGES.includes(found.status as CaseStatus);
      return {
        company: found.review.organization.tradeName,
        status: found.status,
        outcome: found.outcome,
        decisionReason: open ? null : found.decisionReason,
        review: {
          reviewerName: found.review.reviewerName,
          rating: found.review.rating,
          title: found.review.title,
          body: found.review.body,
          createdAt: found.review.createdAt,
        },
        agreements: {
          client: found.clientAgreedAt !== null,
          company: found.companyAgreedAt !== null,
        },
        messages: found.messages.map(toMessage),
        permissions: {
          canWrite: open,
          canAgree: companyStage && found.clientAgreedAt === null,
        },
      };
    });
  }

  /** El cliente escribe y/o aporta evidencias. */
  async clientMessage(token: string, body: string | undefined, files: UploadedEvidence[]) {
    const sent = await this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const current = await this.findByToken(tx, token);
      this.assertOpen(current);
      const text = this.messageText(body, files);
      await this.addMessage(tx, current, 'client', null, text, files);
      const firstEvidence = current.status === 'evidence_requested';
      if (firstEvidence) {
        await this.moveTo(tx, current, { status: 'evidence_submitted' });
      } else {
        await tx.reviewCase.update({ where: { id: current.id }, data: { updatedAt: new Date() } });
      }
      return {
        id: current.id,
        firstEvidence,
        organizationId: current.organizationId,
        company: current.review.organization.tradeName,
        companyInvolved: current.companyNotifiedAt !== null,
      };
    });

    if (sent.firstEvidence) {
      this.alertAdmins(
        sent.id,
        'El cliente ha aportado evidencias',
        `El autor de una reseña sobre ${sent.company} ha enviado sus evidencias. Revísalas para validarlas o rechazar la reseña.`,
      );
    } else if (sent.companyInvolved) {
      this.notifyCompany(
        sent.organizationId,
        sent.id,
        'Nuevo mensaje del cliente',
        'El autor de la reseña ha escrito en el caso. Entra en tu panel para leerlo.',
      );
    }
    return { ok: true };
  }

  /** El cliente acepta retirar la reseña por acuerdo con la empresa. */
  async clientAgree(token: string) {
    const sent = await this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const current = await this.findByToken(tx, token);
      this.assertStage(current, CASE_COMPANY_STAGES);
      if (current.clientAgreedAt) {
        return { id: current.id, bothAgreed: false };
      }
      await tx.reviewCase.update({
        where: { id: current.id },
        data: { clientAgreedAt: new Date() },
      });
      await this.addMessage(
        tx,
        current,
        'system',
        null,
        'El cliente está de acuerdo en retirar la reseña.',
      );
      return { id: current.id, bothAgreed: current.companyAgreedAt !== null };
    });
    if (sent.bothAgreed) {
      this.alertBothAgreed(sent.id);
    }
    return { ok: true };
  }

  async clientFile(token: string, fileId: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const current = await this.findByToken(tx, token);
      const file = await tx.reviewCaseFile.findFirst({ where: { id: fileId, caseId: current.id } });
      if (!file) {
        throw new NotFoundException('Archivo no encontrado');
      }
      return decryptCaseFile(file);
    });
  }

  // ---------------------------------------------------------------------------
  // Empresa (panel)
  // ---------------------------------------------------------------------------

  async companyList(orgId: string) {
    return this.prisma.withContext({ orgId }, async (tx) => {
      const rows = await tx.reviewCase.findMany({
        where: { organizationId: orgId, companyNotifiedAt: { not: null } },
        orderBy: { updatedAt: 'desc' },
        include: { review: { select: { reviewerName: true, rating: true, title: true } } },
      });
      return {
        items: rows.map((row) => ({
          id: row.id,
          status: row.status,
          outcome: row.outcome,
          clientAgreed: row.clientAgreedAt !== null,
          companyAgreed: row.companyAgreedAt !== null,
          review: row.review,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        })),
      };
    });
  }

  async companyDetail(orgId: string, id: string) {
    return this.prisma.withContext({ orgId }, async (tx) => {
      const found = await this.loadForCompany(tx, orgId, id);
      const notifiedAt = found.companyNotifiedAt as Date;
      const companyStage = CASE_COMPANY_STAGES.includes(found.status as CaseStatus);
      return {
        id: found.id,
        status: found.status,
        outcome: found.outcome,
        decisionReason: found.status === 'closed' ? found.decisionReason : null,
        review: {
          reviewerName: found.review.reviewerName,
          rating: found.review.rating,
          title: found.review.title,
          body: found.review.body,
          experienceDate: found.review.experienceDate,
          orderReference: found.review.orderReference,
          createdAt: found.review.createdAt,
        },
        agreements: {
          client: found.clientAgreedAt !== null,
          company: found.companyAgreedAt !== null,
        },
        messages: found.messages.filter((m) => visibleToCompany(m, notifiedAt)).map(toMessage),
        permissions: {
          canWrite: companyStage,
          canAgree: companyStage && found.companyAgreedAt === null,
        },
      };
    });
  }

  /** La empresa da su versión y aporta sus evidencias. */
  async companyMessage(
    orgId: string,
    actorId: string,
    id: string,
    body: string | undefined,
    files: UploadedEvidence[],
  ) {
    const sent = await this.prisma.withContext({ orgId, userId: actorId }, async (tx) => {
      const current = await this.loadForCompany(tx, orgId, id);
      this.assertStage(current, CASE_COMPANY_STAGES);
      const text = this.messageText(body, files);
      await this.addMessage(tx, current, 'company', actorId, text, files);
      const firstResponse = current.status === 'company_notified';
      if (firstResponse) {
        await this.moveTo(tx, current, { status: 'company_responded' });
      } else {
        await tx.reviewCase.update({ where: { id }, data: { updatedAt: new Date() } });
      }
      return {
        firstResponse,
        email: current.review.reviewerEmail,
        company: current.review.organization.tradeName,
        token: await this.issueClientLink(tx, current.id),
      };
    });

    if (sent.firstResponse) {
      this.alertAdmins(
        id,
        'La empresa ha respondido a un caso',
        `${sent.company} ha dado su versión en el caso de una reseña. Revisa las evidencias de ambas partes para decidir.`,
      );
    }
    this.mailClient(
      sent.email,
      sent.token,
      `${sent.company} ha respondido`,
      `${sent.company} ha escrito en el caso de tu reseña. Entra en el enlace para leer su respuesta.`,
    );
    return { ok: true };
  }

  /** La empresa acepta retirar la reseña por acuerdo con el cliente. */
  async companyAgree(orgId: string, actorId: string, id: string) {
    const sent = await this.prisma.withContext({ orgId, userId: actorId }, async (tx) => {
      const current = await this.loadForCompany(tx, orgId, id);
      this.assertStage(current, CASE_COMPANY_STAGES);
      if (current.companyAgreedAt) {
        return { bothAgreed: false };
      }
      await tx.reviewCase.update({ where: { id }, data: { companyAgreedAt: new Date() } });
      await this.addMessage(
        tx,
        current,
        'system',
        null,
        'La empresa está de acuerdo en retirar la reseña.',
      );
      return { bothAgreed: current.clientAgreedAt !== null };
    });
    if (sent.bothAgreed) {
      this.alertBothAgreed(id);
    }
    return { ok: true };
  }

  async companyFile(orgId: string, id: string, fileId: string) {
    return this.prisma.withContext({ orgId }, async (tx) => {
      const found = await this.loadForCompany(tx, orgId, id);
      const file = await tx.reviewCaseFile.findFirst({
        where: { id: fileId, caseId: id },
        include: { message: { select: { senderType: true, createdAt: true } } },
      });
      if (
        !file ||
        !visibleToCompany({ ...file.message, files: [file] }, found.companyNotifiedAt as Date)
      ) {
        throw new NotFoundException('Archivo no encontrado');
      }
      return decryptCaseFile(file);
    });
  }

  // ---------------------------------------------------------------------------
  // Internos
  // ---------------------------------------------------------------------------

  private adminView(found: FullCase) {
    const metadata = found.review.metadata as { antifraud?: string[] };
    return {
      id: found.id,
      status: found.status,
      outcome: found.outcome,
      decisionReason: found.decisionReason,
      needsAdmin: CASE_NEEDS_ADMIN.includes(found.status as CaseStatus),
      clientAgreed: found.clientAgreedAt !== null,
      companyAgreed: found.companyAgreedAt !== null,
      companyNotifiedAt: found.companyNotifiedAt,
      closedAt: found.closedAt,
      createdAt: found.createdAt,
      updatedAt: found.updatedAt,
      organization: found.review.organization,
      review: {
        id: found.review.id,
        reviewerName: found.review.reviewerName,
        reviewerEmail: found.review.reviewerEmail,
        rating: found.review.rating,
        title: found.review.title,
        body: found.review.body,
        experienceDate: found.review.experienceDate,
        orderReference: found.review.orderReference,
        createdAt: found.review.createdAt,
        antifraud: metadata.antifraud ?? [],
      },
      messages: found.messages.map(toMessage),
    };
  }

  /** Cierra el caso con la decisión del admin y aplica el estado a la reseña. */
  private async decide(
    actorId: string,
    id: string,
    allowed: CaseStatus[],
    outcome: CaseOutcome,
    reason: string | undefined,
  ) {
    return this.prisma.withContext({ isPlatformAdmin: true, userId: actorId }, async (tx) => {
      const current = await this.loadForAdmin(tx, id);
      this.assertStage(current, allowed);
      if (outcome === 'withdrawn' && (!current.clientAgreedAt || !current.companyAgreedAt)) {
        throw new BadRequestException(
          'Para retirar la reseña por acuerdo, el cliente y la empresa deben haberlo aceptado',
        );
      }
      const note = reason?.trim() || null;
      await this.moveTo(tx, current, {
        status: 'closed',
        outcome,
        decisionReason: note,
        decidedBy: actorId,
        closedAt: new Date(),
      });

      const review = current.review;
      const to = outcome === 'published' ? 'published' : 'rejected';
      const updated = await tx.review.updateMany({
        where: { id: review.id, moderationStatus: review.moderationStatus },
        data: dataForStatus(to, review),
      });
      if (updated.count !== 1) {
        throw new BadRequestException('La reseña ha cambiado mientras tanto. Recarga la página.');
      }
      const label = {
        rejected: 'Evidencias no válidas',
        published: 'Sin acuerdo entre las partes',
        withdrawn: 'Retirada por acuerdo entre las partes',
      }[outcome];
      await tx.moderationAction.create({
        data: {
          reviewId: review.id,
          moderatorId: actorId,
          action: to === 'published' ? 'publish' : 'reject',
          fromStatus: reviewStatus(review),
          toStatus: to,
          reason: `Caso de evidencias: ${label}${note ? ` (${note})` : ''}`,
        },
      });
      const closing = {
        rejected: 'Caso cerrado: la reseña se ha rechazado.',
        published: 'Caso cerrado sin acuerdo: la reseña se ha publicado.',
        withdrawn: 'Caso cerrado por acuerdo: la reseña se ha retirado.',
      }[outcome];
      await this.addMessage(tx, current, 'system', null, note ? `${closing} ${note}` : closing);

      return {
        email: review.reviewerEmail,
        organizationId: current.organizationId,
        company: review.organization.tradeName,
        review: {
          id: review.id,
          organizationId: current.organizationId,
          rating: review.rating,
          reviewerName: review.reviewerName,
          title: review.title,
        },
        token: await this.issueClientLink(tx, current.id),
      };
    });
  }

  private async loadForAdmin(tx: Tx, id: string) {
    const found = await tx.reviewCase.findUnique({ where: { id }, include: CASE_INCLUDE });
    if (!found) {
      throw new NotFoundException(CASE_NOT_FOUND);
    }
    return found;
  }

  /** Solo los casos de la empresa en los que ya ha sido notificada (si no, 404). */
  private async loadForCompany(tx: Tx, orgId: string, id: string) {
    const found = await tx.reviewCase.findFirst({
      where: { id, organizationId: orgId, companyNotifiedAt: { not: null } },
      include: CASE_INCLUDE,
    });
    if (!found) {
      throw new NotFoundException(CASE_NOT_FOUND);
    }
    return found;
  }

  private async findByToken(tx: Tx, token: string) {
    const found = await tx.reviewCase.findUnique({
      where: { clientTokenHash: hashToken(token) },
      include: CASE_INCLUDE,
    });
    if (
      !found ||
      !found.clientTokenExpiresAt ||
      found.clientTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException(LINK_EXPIRED);
    }
    return found;
  }

  private assertOpen(current: { status: string }): void {
    if (current.status === 'closed') {
      throw new BadRequestException(CASE_CLOSED);
    }
  }

  private assertStage(current: { status: string }, allowed: CaseStatus[]): void {
    this.assertOpen(current);
    if (!allowed.includes(current.status as CaseStatus)) {
      throw new BadRequestException('Esta acción no está disponible en la fase actual del caso');
    }
  }

  /** Cambia de fase condicionado a la fase leída: dos acciones simultáneas no se pisan. */
  private async moveTo(
    tx: Tx,
    current: { id: string; status: string },
    data: Prisma.ReviewCaseUpdateManyMutationInput,
  ): Promise<void> {
    const moved = await tx.reviewCase.updateMany({
      where: { id: current.id, status: current.status },
      data,
    });
    if (moved.count !== 1) {
      throw new BadRequestException('El caso ha cambiado mientras tanto. Recarga la página.');
    }
  }

  private messageText(body: string | undefined, files: UploadedEvidence[]): string {
    const text = body?.trim() ?? '';
    if (!text && files.length === 0) {
      throw new BadRequestException('Escribe un mensaje o adjunta alguna evidencia');
    }
    return text || 'Evidencias adjuntas.';
  }

  private async addMessage(
    tx: Tx,
    current: { id: string; organizationId: string },
    sender: Sender,
    userId: string | null,
    body: string,
    files: UploadedEvidence[] = [],
  ): Promise<void> {
    // La hora la pone la aplicación (no la base) para compararla con companyNotifiedAt.
    const message = await tx.reviewCaseMessage.create({
      data: {
        caseId: current.id,
        organizationId: current.organizationId,
        senderType: sender,
        senderUserId: userId,
        body: body.trim(),
        createdAt: new Date(),
      },
    });
    if (files.length > 0) {
      const securedFiles = await Promise.all(files.map((file) => secureFile(file)));
      await tx.reviewCaseFile.createMany({
        data: files.map((file, index) => ({
          caseId: current.id,
          messageId: message.id,
          organizationId: current.organizationId,
          filename: safeFilename(file.originalname),
          mimeType: file.mimetype,
          size: securedFiles[index].size,
          data: securedFiles[index].data,
          encryptionVersion: securedFiles[index].encryptionVersion,
          scanStatus: securedFiles[index].scanStatus,
        })),
      });
    }
  }

  /**
   * Enlace nuevo para el cliente. En la base solo se guarda el hash, así que cada
   * correo lleva un enlace nuevo y el anterior deja de valer.
   */
  private async issueClientLink(tx: Tx, caseId: string): Promise<string> {
    const token = randomToken(32);
    await tx.reviewCase.update({
      where: { id: caseId },
      data: {
        clientTokenHash: hashToken(token),
        clientTokenExpiresAt: new Date(Date.now() + CLIENT_LINK_TTL_MS),
      },
    });
    return token;
  }

  private alertBothAgreed(caseId: string): void {
    this.alertAdmins(
      caseId,
      'Acuerdo en un caso de reseña',
      'El cliente y la empresa están de acuerdo en retirar la reseña. Revisa el caso para cerrarlo.',
    );
  }

  // Los correos no bloquean la respuesta: si fallan, queda registrado en el log.

  private alertAdmins(caseId: string, title: string, intro: string): void {
    void this.prisma
      .withContext({ isPlatformAdmin: true }, (tx) =>
        tx.user.findMany({
          where: { isSuperAdmin: true, isActive: true, deletedAt: null },
          select: { email: true },
        }),
      )
      .then((admins) =>
        Promise.all(
          admins.map((admin) => this.mail.sendCaseAdminAlert(admin.email, title, intro, caseId)),
        ),
      )
      .catch((error: unknown) => {
        this.logger.error(`No se pudo avisar a los administradores: ${String(error)}`);
      });
  }

  /** Avisa a quien gestiona la empresa (responsable o superior); si no hay, al correo de la empresa. */
  private notifyCompany(orgId: string, caseId: string, title: string, intro: string): void {
    void this.prisma
      .withContext({ orgId }, async (tx) => {
        const [memberships, org] = await Promise.all([
          tx.organizationMembership.findMany({
            where: {
              organizationId: orgId,
              isActive: true,
              user: { isActive: true, deletedAt: null },
            },
            include: { user: { select: { email: true } }, role: { select: { baseRole: true } } },
          }),
          tx.organization.findUnique({ where: { id: orgId }, select: { email: true } }),
        ]);
        const managers = memberships
          .filter((m) => roleAtLeast(effectiveRole(m.role.baseRole, m.isOwner), 'editor'))
          .map((m) => m.user.email);
        return managers.length > 0 ? managers : org?.email ? [org.email] : [];
      })
      .then((emails) =>
        Promise.all(
          emails.map((email) => this.mail.sendCaseCompanyNotice(email, title, intro, caseId)),
        ),
      )
      .catch((error: unknown) => {
        this.logger.error(`No se pudo avisar a la empresa: ${String(error)}`);
      });
  }

  private mailClient(to: string, token: string, title: string, intro: string): void {
    this.mail.sendCaseClientNotice(to, title, intro, token).catch((error: unknown) => {
      this.logger.error(`No se pudo avisar al cliente: ${String(error)}`);
    });
  }
}
