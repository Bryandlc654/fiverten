import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformSettingsService } from '../settings/settings.service';
import {
  CreateTicketDto,
  TicketMessageDto,
  UpdateTicketDto,
} from './dto/support.dto';

interface ListQuery {
  page: number;
  pageSize: number;
  status?: string;
  priority?: string;
  search?: string;
  assigned?: string;
}

interface TicketRow {
  id: string;
  organizationId: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  assignedTo: string | null;
  lastMessageAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  organization: { id: string; tradeName: string; slug: string };
  creator: { id: string; email: string; firstName: string | null; lastName: string | null };
  assignee:
    | { id: string; email: string; firstName: string | null; lastName: string | null }
    | null;
  _count?: { messages: number };
}

interface MessageRow {
  id: string;
  senderType: string;
  senderUserId: string | null;
  body: string;
  isInternal: boolean;
  createdAt: Date;
  sender:
    | { id: string; email: string; firstName: string | null; lastName: string | null }
    | null;
}

const TICKET_INCLUDE = {
  organization: { select: { id: true, tradeName: true, slug: true } },
  creator: { select: { id: true, email: true, firstName: true, lastName: true } },
  assignee: { select: { id: true, email: true, firstName: true, lastName: true } },
  _count: { select: { messages: true } },
} satisfies Prisma.SupportTicketInclude;

const MESSAGE_INCLUDE = {
  sender: { select: { id: true, email: true, firstName: true, lastName: true } },
} satisfies Prisma.SupportTicketMessageInclude;

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly settings: PlatformSettingsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Empresa
  // ---------------------------------------------------------------------------
  async createForCompany(orgId: string, userId: string, dto: CreateTicketDto) {
    const { ticket, organization } = await this.prisma.withContext(
      { orgId, userId },
      async (tx) => {
        const organization = await tx.organization.findFirst({
          where: { id: orgId, deletedAt: null },
          select: { tradeName: true },
        });
        if (!organization) {
          throw new NotFoundException('Empresa no encontrada');
        }
        const ticket = await tx.supportTicket.create({
          data: {
            organizationId: orgId,
            createdBy: userId,
            subject: dto.subject.trim(),
            category: dto.category ?? 'general',
            priority: dto.priority ?? 'normal',
            status: 'open',
            messages: {
              create: {
                organizationId: orgId,
                senderType: 'company',
                senderUserId: userId,
                body: dto.message.trim(),
              },
            },
          },
          include: TICKET_INCLUDE,
        });
        return { ticket, organization };
      },
    );

    const supportEmail = await this.supportEmail();
    if (supportEmail) {
      this.mail
        .sendSupportTicketCreated(supportEmail, ticket.subject, organization.tradeName, ticket.id)
        .catch(() => undefined);
    }
    return this.ticketView(ticket);
  }

  async listForCompany(orgId: string, query: ListQuery) {
    const page = Math.max(1, query.page);
    const pageSize = Math.min(50, Math.max(1, query.pageSize));
    const search = query.search?.trim();
    const where: Prisma.SupportTicketWhereInput = {
      organizationId: orgId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(search
        ? {
            OR: [
              { subject: { contains: search, mode: 'insensitive' } },
              { messages: { some: { body: { contains: search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    return this.prisma.withContext({ orgId }, async (tx) => {
      const [total, rows, grouped] = await Promise.all([
        tx.supportTicket.count({ where }),
        tx.supportTicket.findMany({
          where,
          include: TICKET_INCLUDE,
          orderBy: { lastMessageAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        tx.supportTicket.groupBy({
          by: ['status'],
          where: { organizationId: orgId },
          _count: { _all: true },
        }),
      ]);
      const counts = this.counts(grouped);
      return {
        items: rows.map((row) => this.ticketView(row)),
        total,
        page,
        pageSize,
        counts,
      };
    });
  }

  async getForCompany(orgId: string, ticketId: string) {
    return this.prisma.withContext({ orgId }, async (tx) => {
      const ticket = await tx.supportTicket.findFirst({
        where: { id: ticketId, organizationId: orgId },
        include: {
          ...TICKET_INCLUDE,
          messages: {
            where: { isInternal: false },
            include: MESSAGE_INCLUDE,
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      if (!ticket) throw new NotFoundException('Ticket no encontrado');
      return this.detailView(ticket);
    });
  }

  async replyAsCompany(
    orgId: string,
    userId: string,
    ticketId: string,
    dto: TicketMessageDto,
  ) {
    const result = await this.prisma.withContext({ orgId, userId }, async (tx) => {
      const ticket = await tx.supportTicket.findFirst({
        where: { id: ticketId, organizationId: orgId },
        include: { organization: { select: { tradeName: true } }, assignee: true },
      });
      if (!ticket) throw new NotFoundException('Ticket no encontrado');
      if (ticket.status === 'closed') {
        throw new BadRequestException('El ticket está cerrado');
      }
      const message = await tx.supportTicketMessage.create({
        data: {
          ticketId,
          organizationId: orgId,
          senderType: 'company',
          senderUserId: userId,
          body: dto.body.trim(),
        },
        include: MESSAGE_INCLUDE,
      });
      await tx.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'open', lastMessageAt: new Date() },
      });
      return { ticket, message };
    });

    const recipient = result.ticket.assignee?.email ?? (await this.supportEmail());
    if (recipient) {
      this.mail
        .sendSupportTicketReply(
          recipient,
          result.ticket.subject,
          result.ticket.organization.tradeName,
          ticketId,
          false,
        )
        .catch(() => undefined);
    }
    return this.messageView(result.message);
  }

  async closeAsCompany(orgId: string, userId: string, ticketId: string) {
    return this.prisma.withContext({ orgId, userId }, async (tx) => {
      const ticket = await tx.supportTicket.findFirst({
        where: { id: ticketId, organizationId: orgId },
      });
      if (!ticket) throw new NotFoundException('Ticket no encontrado');
      const updated = await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: 'closed',
          closedAt: new Date(),
          lastMessageAt: new Date(),
          messages: {
            create: {
              organizationId: orgId,
              senderType: 'system',
              body: 'El cliente ha cerrado el ticket.',
            },
          },
        },
        include: TICKET_INCLUDE,
      });
      return this.ticketView(updated);
    });
  }

  // ---------------------------------------------------------------------------
  // Staff de soporte
  // ---------------------------------------------------------------------------
  async listForSupport(query: ListQuery, agentUserId: string) {
    const page = Math.max(1, query.page);
    const pageSize = Math.min(100, Math.max(1, query.pageSize));
    const search = query.search?.trim();
    const assigned =
      query.assigned === 'me'
        ? agentUserId
        : query.assigned === 'unassigned'
          ? null
          : query.assigned;

    const where: Prisma.SupportTicketWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(assigned !== undefined ? { assignedTo: assigned } : {}),
      ...(search
        ? {
            OR: [
              { subject: { contains: search, mode: 'insensitive' } },
              { organization: { tradeName: { contains: search, mode: 'insensitive' } } },
              { creator: { email: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const [total, rows, stats] = await Promise.all([
        tx.supportTicket.count({ where }),
        tx.supportTicket.findMany({
          where,
          include: TICKET_INCLUDE,
          orderBy: { lastMessageAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.statsWith(tx, agentUserId),
      ]);
      return {
        items: rows.map((row) => this.ticketView(row)),
        total,
        page,
        pageSize,
        stats,
      };
    });
  }

  async getForSupport(ticketId: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const ticket = await tx.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
          ...TICKET_INCLUDE,
          messages: { include: MESSAGE_INCLUDE, orderBy: { createdAt: 'asc' } },
        },
      });
      if (!ticket) throw new NotFoundException('Ticket no encontrado');
      return this.detailView(ticket);
    });
  }

  async replyAsSupport(agentUserId: string, ticketId: string, dto: TicketMessageDto) {
    const result = await this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const ticket = await tx.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
          organization: { select: { tradeName: true } },
          creator: { select: { email: true } },
        },
      });
      if (!ticket) throw new NotFoundException('Ticket no encontrado');

      const message = await tx.supportTicketMessage.create({
        data: {
          ticketId,
          organizationId: ticket.organizationId,
          senderType: 'support',
          senderUserId: agentUserId,
          body: dto.body.trim(),
          isInternal: dto.isInternal ?? false,
        },
        include: MESSAGE_INCLUDE,
      });

      if (!dto.isInternal) {
        await tx.supportTicket.update({
          where: { id: ticketId },
          data: {
            status: 'pending',
            assignedTo: ticket.assignedTo ?? agentUserId,
            lastMessageAt: new Date(),
            closedAt: null,
          },
        });
      } else {
        await tx.supportTicket.update({
          where: { id: ticketId },
          data: { lastMessageAt: new Date() },
        });
      }
      return { ticket, message };
    });

    if (!dto.isInternal && result.ticket.creator.email) {
      this.mail
        .sendSupportTicketReply(
          result.ticket.creator.email,
          result.ticket.subject,
          result.ticket.organization.tradeName,
          ticketId,
          true,
        )
        .catch(() => undefined);
    }
    return this.messageView(result.message);
  }

  async updateTicket(ticketId: string, dto: UpdateTicketDto) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const ticket = await tx.supportTicket.findUnique({ where: { id: ticketId } });
      if (!ticket) throw new NotFoundException('Ticket no encontrado');

      if (dto.assignedTo) {
        const agent = await tx.user.findFirst({
          where: {
            id: dto.assignedTo,
            deletedAt: null,
            isActive: true,
            OR: [{ isSupportAgent: true }, { isSuperAdmin: true }],
          },
          select: { id: true },
        });
        if (!agent) {
          throw new BadRequestException('El usuario asignado no es personal de soporte');
        }
      }

      const status = dto.status ?? ticket.status;
      const closed = status === 'closed' || status === 'resolved';
      const updated = await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: dto.status,
          priority: dto.priority,
          category: dto.category,
          assignedTo: dto.assignedTo === undefined ? undefined : dto.assignedTo,
          closedAt: closed ? (ticket.closedAt ?? new Date()) : null,
        },
        include: TICKET_INCLUDE,
      });
      return this.ticketView(updated);
    });
  }

  async assignToMe(ticketId: string, agentUserId: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const ticket = await tx.supportTicket.findUnique({ where: { id: ticketId } });
      if (!ticket) throw new NotFoundException('Ticket no encontrado');
      const updated = await tx.supportTicket.update({
        where: { id: ticketId },
        data: {
          assignedTo: agentUserId,
          status: ticket.status === 'closed' ? 'open' : ticket.status,
          closedAt: ticket.status === 'closed' ? null : undefined,
        },
        include: TICKET_INCLUDE,
      });
      return this.ticketView(updated);
    });
  }

  async stats(agentUserId: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      this.statsWith(tx, agentUserId),
    );
  }

  // ---------------------------------------------------------------------------
  // Internos
  // ---------------------------------------------------------------------------
  private async statsWith(tx: Prisma.TransactionClient, agentUserId: string) {
    const [status, priority, unassigned, mine] = await Promise.all([
      tx.supportTicket.groupBy({ by: ['status'], _count: { _all: true } }),
      tx.supportTicket.groupBy({ by: ['priority'], _count: { _all: true } }),
      tx.supportTicket.count({ where: { assignedTo: null, status: { not: 'closed' } } }),
      tx.supportTicket.count({
        where: { assignedTo: agentUserId, status: { not: 'closed' } },
      }),
    ]);
    return {
      status: this.counts(status),
      priority: Object.fromEntries(
        priority.map((row) => [row.priority, row._count._all]),
      ) as Record<string, number>,
      unassigned,
      mine,
    };
  }

  private counts(
    rows: { status: string; _count: { _all: number } }[],
  ): Record<string, number> {
    const counts: Record<string, number> = { open: 0, pending: 0, resolved: 0, closed: 0 };
    for (const row of rows) {
      counts[row.status] = row._count._all;
    }
    return counts;
  }

  private ticketView(ticket: TicketRow) {
    return {
      id: ticket.id,
      organizationId: ticket.organizationId,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      assignedTo: ticket.assignedTo,
      lastMessageAt: ticket.lastMessageAt,
      closedAt: ticket.closedAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      organization: ticket.organization,
      creator: ticket.creator,
      assignee: ticket.assignee,
      messageCount: ticket._count?.messages ?? 0,
    };
  }

  private messageView(message: MessageRow) {
    return {
      id: message.id,
      senderType: message.senderType,
      senderUserId: message.senderUserId,
      body: message.body,
      isInternal: message.isInternal,
      createdAt: message.createdAt,
      sender: message.sender,
    };
  }

  private detailView(ticket: TicketRow & { messages: MessageRow[] }) {
    return {
      ...this.ticketView(ticket),
      messages: ticket.messages.map((message) => this.messageView(message)),
    };
  }

  private async supportEmail(): Promise<string | null> {
    const email = await this.settings.get<string>('general.support_email');
    return email?.trim() || null;
  }
}
