import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CancelSubscriptionDto,
  CreatePaymentDto,
  PlanDto,
  UpdatePlanDto,
  UpdatePaymentDto,
  UpdateSubscriptionDto,
  UpsertSubscriptionDto,
} from './dto/billing.dto';

interface ListQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function number(value: Prisma.Decimal | number | null | undefined): number {
  return value === null || value === undefined ? 0 : Number(value);
}

function planView(plan: {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceMonthly: Prisma.Decimal;
  priceYearly: Prisma.Decimal;
  currency: string;
  reviewLimit: number | null;
  userLimit: number | null;
  features: Prisma.JsonValue;
  isActive: boolean;
  isPublic: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...plan,
    priceMonthly: number(plan.priceMonthly),
    priceYearly: number(plan.priceYearly),
    features: (plan.features ?? {}) as Record<string, unknown>,
  };
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Planes
  // ---------------------------------------------------------------------------
  async listPlans(includeInactive = true) {
    const plans = await this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.plan.findMany({
        where: includeInactive ? {} : { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { priceMonthly: 'asc' }],
      }),
    );
    return { plans: plans.map(planView) };
  }

  async createPlan(dto: PlanDto) {
    const plan = await this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const code = dto.code.trim().toLowerCase();
      const existing = await tx.plan.findUnique({ where: { code } });
      if (existing) throw new BadRequestException('Ya existe un plan con ese código');
      return tx.plan.create({
        data: {
          code,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          priceMonthly: dto.priceMonthly ?? 0,
          priceYearly: dto.priceYearly ?? 0,
          currency: (dto.currency ?? 'EUR').toUpperCase(),
          reviewLimit: dto.reviewLimit ?? null,
          userLimit: dto.userLimit ?? null,
          features: (dto.features ?? {}) as Prisma.InputJsonValue,
          isActive: dto.isActive ?? true,
          isPublic: dto.isPublic ?? true,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    });
    return planView(plan);
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    const plan = await this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const existing = await tx.plan.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Plan no encontrado');
      return tx.plan.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description: dto.description === undefined ? undefined : dto.description?.trim() || null,
          priceMonthly: dto.priceMonthly,
          priceYearly: dto.priceYearly,
          currency: dto.currency?.toUpperCase(),
          reviewLimit: dto.reviewLimit,
          userLimit: dto.userLimit,
          features: dto.features as Prisma.InputJsonValue | undefined,
          isActive: dto.isActive,
          isPublic: dto.isPublic,
          sortOrder: dto.sortOrder,
        },
      });
    });
    return planView(plan);
  }

  // ---------------------------------------------------------------------------
  // Suscripciones
  // ---------------------------------------------------------------------------
  async listSubscriptions(query: ListQuery) {
    const page = Math.max(1, query.page);
    const pageSize = Math.min(100, Math.max(1, query.pageSize));
    const search = query.search?.trim();
    const where: Prisma.SubscriptionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            organization: {
              OR: [
                { tradeName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { slug: { contains: search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const [total, rows] = await this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      Promise.all([
        tx.subscription.count({ where }),
        tx.subscription.findMany({
          where,
          include: {
            plan: true,
            organization: { select: { id: true, tradeName: true, slug: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]),
    );

    return {
      items: rows.map((row) => this.subscriptionView(row)),
      total,
      page,
      pageSize,
    };
  }

  async getOrganizationSubscription(orgId: string) {
    const row = await this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.subscription.findUnique({
        where: { organizationId: orgId },
        include: { plan: true, organization: true },
      }),
    );
    if (!row) return { subscription: null };
    const events = await this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.subscriptionEvent.findMany({
        where: { subscriptionId: row.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    );
    return { subscription: { ...this.subscriptionView(row), events } };
  }

  async upsertOrganizationSubscription(
    orgId: string,
    dto: UpsertSubscriptionDto,
    actorId: string,
  ) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const organization = await tx.organization.findFirst({
        where: { id: orgId, deletedAt: null },
        select: { id: true },
      });
      if (!organization) throw new NotFoundException('Empresa no encontrada');
      const plan = await tx.plan.findUnique({ where: { id: dto.planId } });
      if (!plan) throw new NotFoundException('Plan no encontrado');

      const existing = await tx.subscription.findUnique({ where: { organizationId: orgId } });
      const now = new Date();
      const cycle = dto.billingCycle ?? existing?.billingCycle ?? 'monthly';
      const periodStart = dto.currentPeriodStart ? new Date(dto.currentPeriodStart) : now;
      const periodEnd = dto.currentPeriodEnd
        ? new Date(dto.currentPeriodEnd)
        : addMonths(periodStart, cycle === 'yearly' ? 12 : 1);
      const status = dto.status ?? existing?.status ?? 'active';

      if (existing) {
        const updated = await tx.subscription.update({
          where: { id: existing.id },
          data: {
            planId: plan.id,
            status,
            billingCycle: cycle,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            trialEndsAt: dto.trialEndsAt ? new Date(dto.trialEndsAt) : existing.trialEndsAt,
            cancelAtPeriodEnd: dto.cancelAtPeriodEnd ?? existing.cancelAtPeriodEnd,
            cancelledAt: status === 'cancelled' ? (existing.cancelledAt ?? now) : null,
          },
          include: { plan: true, organization: true },
        });
        if (existing.planId !== plan.id) {
          await tx.subscriptionEvent.create({
            data: {
              subscriptionId: existing.id,
              organizationId: orgId,
              type: 'plan_changed',
              fromPlanId: existing.planId,
              toPlanId: plan.id,
              fromStatus: existing.status,
              toStatus: status,
              note: dto.note ?? null,
              actorUserId: actorId,
            },
          });
        } else if (existing.status !== status) {
          await tx.subscriptionEvent.create({
            data: {
              subscriptionId: existing.id,
              organizationId: orgId,
              type: 'status_changed',
              fromStatus: existing.status,
              toStatus: status,
              note: dto.note ?? null,
              actorUserId: actorId,
            },
          });
        }
        return this.subscriptionView(updated);
      }

      const created = await tx.subscription.create({
        data: {
          organizationId: orgId,
          planId: plan.id,
          status,
          billingCycle: cycle,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          trialEndsAt: dto.trialEndsAt ? new Date(dto.trialEndsAt) : null,
          cancelAtPeriodEnd: dto.cancelAtPeriodEnd ?? false,
          cancelledAt: status === 'cancelled' ? now : null,
        },
        include: { plan: true, organization: true },
      });
      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: created.id,
          organizationId: orgId,
          type: 'created',
          toPlanId: plan.id,
          toStatus: status,
          note: dto.note ?? null,
          actorUserId: actorId,
        },
      });
      return this.subscriptionView(created);
    });
  }

  async updateSubscription(id: string, dto: UpdateSubscriptionDto, actorId: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const existing = await tx.subscription.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Suscripción no encontrada');
      if (dto.planId) {
        const plan = await tx.plan.findUnique({ where: { id: dto.planId } });
        if (!plan) throw new NotFoundException('Plan no encontrado');
      }
      const updated = await tx.subscription.update({
        where: { id },
        data: {
          planId: dto.planId,
          status: dto.status,
          billingCycle: dto.billingCycle,
          currentPeriodStart: dto.currentPeriodStart ? new Date(dto.currentPeriodStart) : undefined,
          currentPeriodEnd: dto.currentPeriodEnd ? new Date(dto.currentPeriodEnd) : undefined,
          trialEndsAt: dto.trialEndsAt ? new Date(dto.trialEndsAt) : undefined,
          cancelAtPeriodEnd: dto.cancelAtPeriodEnd,
          cancelledAt:
            dto.status === 'cancelled' ? (existing.cancelledAt ?? new Date()) : undefined,
        },
        include: { plan: true, organization: true },
      });
      const type =
        dto.planId && dto.planId !== existing.planId
          ? 'plan_changed'
          : dto.status && dto.status !== existing.status
            ? 'status_changed'
            : null;
      if (type) {
        await tx.subscriptionEvent.create({
          data: {
            subscriptionId: id,
            organizationId: existing.organizationId,
            type,
            fromPlanId: existing.planId,
            toPlanId: updated.planId,
            fromStatus: existing.status,
            toStatus: updated.status,
            note: dto.note ?? null,
            actorUserId: actorId,
          },
        });
      }
      return this.subscriptionView(updated);
    });
  }

  async cancelSubscription(id: string, dto: CancelSubscriptionDto, actorId: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const existing = await tx.subscription.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Suscripción no encontrada');
      const now = new Date();
      const updated = await tx.subscription.update({
        where: { id },
        data: dto.immediate
          ? { status: 'cancelled', cancelledAt: now, cancelAtPeriodEnd: false }
          : { cancelAtPeriodEnd: true },
        include: { plan: true, organization: true },
      });
      await tx.subscriptionEvent.create({
        data: {
          subscriptionId: id,
          organizationId: existing.organizationId,
          type: 'cancelled',
          fromStatus: existing.status,
          toStatus: updated.status,
          note: dto.note ?? (dto.immediate ? 'Cancelación inmediata' : 'Cancelación al final del periodo'),
          actorUserId: actorId,
        },
      });
      return this.subscriptionView(updated);
    });
  }

  // ---------------------------------------------------------------------------
  // Pagos
  // ---------------------------------------------------------------------------
  async listPayments(query: ListQuery & { organizationId?: string }) {
    const page = Math.max(1, query.page);
    const pageSize = Math.min(100, Math.max(1, query.pageSize));
    const where: Prisma.PaymentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
    };
    const [total, rows] = await this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      Promise.all([
        tx.payment.count({ where }),
        tx.payment.findMany({
          where,
          include: { organization: { select: { id: true, tradeName: true, slug: true } } },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]),
    );
    return {
      items: rows.map((row) => this.paymentView(row)),
      total,
      page,
      pageSize,
    };
  }

  async createPayment(dto: CreatePaymentDto, actorId: string) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const organization = await tx.organization.findFirst({
        where: { id: dto.organizationId, deletedAt: null },
        select: { id: true, billingCurrency: true },
      });
      if (!organization) throw new NotFoundException('Empresa no encontrada');
      const payment = await tx.payment.create({
        data: {
          organizationId: dto.organizationId,
          subscriptionId: dto.subscriptionId ?? null,
          amount: dto.amount,
          currency: (dto.currency ?? organization.billingCurrency ?? 'EUR').toUpperCase(),
          status: dto.status ?? 'paid',
          method: dto.method ?? 'manual',
          reference: dto.reference?.trim() || null,
          periodStart: dto.periodStart ? new Date(dto.periodStart) : null,
          periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : null,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : (dto.status ?? 'paid') === 'paid' ? new Date() : null,
          createdBy: actorId,
        },
        include: { organization: { select: { id: true, tradeName: true, slug: true } } },
      });
      return this.paymentView(payment);
    });
  }

  async updatePayment(id: string, dto: UpdatePaymentDto) {
    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const existing = await tx.payment.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Pago no encontrado');
      const payment = await tx.payment.update({
        where: { id },
        data: {
          status: dto.status,
          paidAt:
            dto.status === 'paid' ? (existing.paidAt ?? new Date()) : undefined,
        },
        include: { organization: { select: { id: true, tradeName: true, slug: true } } },
      });
      return this.paymentView(payment);
    });
  }

  // ---------------------------------------------------------------------------
  // Ámbito empresa: estado de suscripción, uso y pagos
  // ---------------------------------------------------------------------------
  async companySubscription(orgId: string) {
    return this.prisma.withContext({ orgId }, async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { organizationId: orgId },
        include: {
          plan: true,
          organization: { select: { id: true, tradeName: true, slug: true, email: true } },
        },
      });
      const plan = subscription?.plan ?? (await tx.plan.findFirst({ where: { code: 'free' } }));
      const [members, pendingInvitations, reviews] = await Promise.all([
        tx.organizationMembership.count({ where: { organizationId: orgId, isActive: true } }),
        tx.organizationInvitation.count({
          where: { organizationId: orgId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
        }),
        tx.review.count({ where: { organizationId: orgId, deletedAt: null } }),
      ]);
      return {
        subscription: subscription ? this.subscriptionView(subscription) : null,
        plan: plan ? planView(plan) : null,
        usage: {
          users: members + pendingInvitations,
          reviews,
        },
      };
    });
  }

  async companyPayments(orgId: string, query: ListQuery) {
    const page = Math.max(1, query.page);
    const pageSize = Math.min(50, Math.max(1, query.pageSize));
    const [total, rows] = await this.prisma.withContext({ orgId }, (tx) =>
      Promise.all([
        tx.payment.count({ where: { organizationId: orgId } }),
        tx.payment.findMany({
          where: { organizationId: orgId },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]),
    );
    return {
      items: rows.map((row) => this.paymentView(row)),
      total,
      page,
      pageSize,
    };
  }

  // ---------------------------------------------------------------------------
  // Límites de plan (se usan dentro de transacciones existentes)
  // ---------------------------------------------------------------------------
  async assertCanAddUser(tx: Prisma.TransactionClient, orgId: string) {
    const plan = await this.planFor(tx, orgId);
    if (!plan?.userLimit) return;
    const [members, invitations] = await Promise.all([
      tx.organizationMembership.count({ where: { organizationId: orgId, isActive: true } }),
      tx.organizationInvitation.count({
        where: {
          organizationId: orgId,
          acceptedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      }),
    ]);
    if (members + invitations >= plan.userLimit) {
      throw new BadRequestException(
        `El plan ${plan.name} permite ${plan.userLimit} usuarios. Mejora el plan para añadir más.`,
      );
    }
  }

  async assertCanReceiveReview(tx: Prisma.TransactionClient, orgId: string) {
    const subscription = await tx.subscription.findUnique({
      where: { organizationId: orgId },
      include: { plan: true },
    });
    const plan = subscription?.plan ?? (await tx.plan.findFirst({ where: { code: 'free' } }));
    if (!plan?.reviewLimit) return;
    const from = subscription?.currentPeriodStart ?? new Date(Date.now() - MONTH_MS);
    const to = subscription?.currentPeriodEnd ?? new Date();
    const used = await tx.review.count({
      where: {
        organizationId: orgId,
        deletedAt: null,
        createdAt: { gte: from, lte: to > new Date() ? new Date() : to },
      },
    });
    if (used >= plan.reviewLimit) {
      throw new ForbiddenException(
        `El plan ${plan.name} ha alcanzado su límite de ${plan.reviewLimit} reseñas en este periodo.`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Métricas de plataforma
  // ---------------------------------------------------------------------------
  async stats() {
    const now = new Date();
    const yearAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));

    return this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      const [statusRows, activeSubs, paidTotal, recentPayments] = await Promise.all([
        tx.subscription.groupBy({ by: ['status'], _count: { _all: true } }),
        tx.subscription.findMany({
          where: { status: { in: ['active', 'trialing'] } },
          include: { plan: { select: { priceMonthly: true, priceYearly: true } } },
        }),
        tx.payment.aggregate({ where: { status: 'paid' }, _sum: { amount: true } }),
        tx.payment.findMany({
          where: { status: 'paid', createdAt: { gte: yearAgo } },
          select: { amount: true, createdAt: true },
        }),
      ]);

      const counts: Record<string, number> = {
        trialing: 0,
        active: 0,
        past_due: 0,
        cancelled: 0,
        expired: 0,
      };
      for (const row of statusRows) counts[row.status] = row._count._all;

      const mrr = activeSubs.reduce((total, sub) => {
        const monthly = number(sub.plan.priceMonthly);
        const yearly = number(sub.plan.priceYearly);
        return total + (sub.billingCycle === 'yearly' ? yearly / 12 : monthly);
      }, 0);

      const seriesMap = new Map<string, number>();
      for (let i = 0; i < 12; i += 1) {
        const date = new Date(Date.UTC(yearAgo.getUTCFullYear(), yearAgo.getUTCMonth() + i, 1));
        seriesMap.set(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`, 0);
      }
      let last30 = 0;
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      for (const payment of recentPayments) {
        const key = `${payment.createdAt.getUTCFullYear()}-${String(payment.createdAt.getUTCMonth() + 1).padStart(2, '0')}`;
        seriesMap.set(key, (seriesMap.get(key) ?? 0) + number(payment.amount));
        if (payment.createdAt >= thirtyDaysAgo) last30 += number(payment.amount);
      }

      return {
        subscriptions: {
          total: Object.values(counts).reduce((a, b) => a + b, 0),
          active: counts.active,
          trialing: counts.trialing,
          pastDue: counts.past_due,
          cancelled: counts.cancelled,
          expired: counts.expired,
        },
        mrr: Math.round(mrr * 100) / 100,
        revenue: {
          total: Math.round(number(paidTotal._sum.amount) * 100) / 100,
          last30: Math.round(last30 * 100) / 100,
          series: Array.from(seriesMap, ([month, amount]) => ({
            month,
            amount: Math.round(amount * 100) / 100,
          })),
        },
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Internos
  // ---------------------------------------------------------------------------
  private async planFor(tx: Prisma.TransactionClient, orgId: string) {
    const subscription = await tx.subscription.findUnique({
      where: { organizationId: orgId },
      include: { plan: true },
    });
    return subscription?.plan ?? (await tx.plan.findFirst({ where: { code: 'free' } }));
  }

  private subscriptionView(
    row: Prisma.SubscriptionGetPayload<{
      include: {
        plan: true;
        organization: { select: { id: true; tradeName: true; slug: true; email: true } };
      };
    }>,
  ) {
    return {
      id: row.id,
      organizationId: row.organizationId,
      organization: {
        id: row.organization.id,
        tradeName: row.organization.tradeName,
        slug: row.organization.slug,
        email: row.organization.email,
      },
      plan: planView(row.plan),
      status: row.status,
      billingCycle: row.billingCycle,
      currentPeriodStart: row.currentPeriodStart,
      currentPeriodEnd: row.currentPeriodEnd,
      trialEndsAt: row.trialEndsAt,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      cancelledAt: row.cancelledAt,
      startedAt: row.startedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private paymentView<T extends { amount: Prisma.Decimal | number }>(row: T) {
    return { ...row, amount: number(row.amount) };
  }
}
