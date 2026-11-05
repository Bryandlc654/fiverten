import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { PublicAnalyticsEvent, TrackAnalyticsEventDto } from './dto/analytics.dto';

const DAY_MS = 24 * 60 * 60 * 1000;
const SEARCH_SOURCES = ['google', 'bing', 'yahoo', 'duckduckgo', 'ecosia'];
const SOCIAL_SOURCES = [
  'instagram',
  'facebook',
  'linkedin',
  'twitter',
  'tiktok',
  'youtube',
  'pinterest',
  'whatsapp',
];

type Counters = {
  visits: number;
  clicks: number;
  downloads: number;
  conversions: number;
  sent: number;
};

function dayKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function emptyCounters(): Counters {
  return { visits: 0, clicks: 0, downloads: 0, conversions: 0, sent: 0 };
}

function addEvent(counters: Counters, type: string): void {
  if (type === 'profile_view') counters.visits += 1;
  if (type === 'contact_click' || type === 'website_click') counters.clicks += 1;
  if (type === 'seal_download') counters.downloads += 1;
}

function withRates(counters: Counters) {
  return {
    ...counters,
    interactions: counters.visits + counters.clicks + counters.downloads,
    conversionRate:
      counters.sent > 0
        ? Math.round(Math.min(1, counters.conversions / counters.sent) * 1000) / 1000
        : null,
  };
}

function hostOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function normalizeSource(source: string | undefined, referrer?: string): string {
  const provided = source?.trim().toLowerCase();
  if (provided) {
    if (SEARCH_SOURCES.includes(provided)) return provided;
    if (SOCIAL_SOURCES.includes(provided)) return 'social';
    if (['qr', 'widget', 'campaign', 'fiverten', 'direct', 'referral'].includes(provided)) {
      return provided;
    }
    return provided.slice(0, 40);
  }

  const host = hostOf(referrer);
  if (!host) return 'direct';
  if (host.includes('fiverten')) return 'fiverten';
  const search = SEARCH_SOURCES.find((item) => host.includes(item));
  if (search) return search;
  if (SOCIAL_SOURCES.some((item) => host.includes(item))) return 'social';
  return 'referral';
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra un evento del perfil público. Si el slug no existe se responde
   * igualmente con éxito para no revelar qué empresas están dadas de baja.
   */
  async track(dto: TrackAnalyticsEventDto) {
    const org = await this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.organization.findFirst({
        where: { slug: dto.slug, deletedAt: null, isActive: true },
        select: { id: true },
      }),
    );
    if (!org) return { tracked: false };

    await this.prisma.withContext({ orgId: org.id }, (tx) =>
      tx.analyticsEvent.create({
        data: {
          organizationId: org.id,
          type: dto.type,
          source: normalizeSource(dto.source, dto.referrer),
          path: dto.path?.slice(0, 300) ?? null,
          referrer: dto.referrer?.slice(0, 500) ?? null,
        },
      }),
    );
    return { tracked: true };
  }

  /** Resumen de tráfico y conversiones para el panel de la empresa. */
  async summary(orgId: string, days: number) {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const from = new Date(today.getTime() - (days - 1) * DAY_MS);
    const previousFrom = new Date(from.getTime() - days * DAY_MS);
    const tomorrow = new Date(today.getTime() + DAY_MS);

    return this.prisma.withContext({ orgId }, async (tx) => {
      const [events, requests] = await Promise.all([
        tx.analyticsEvent.findMany({
          where: { organizationId: orgId, createdAt: { gte: previousFrom, lt: tomorrow } },
          select: { type: true, source: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        }),
        tx.reviewRequest.findMany({
          where: {
            organizationId: orgId,
            OR: [
              { sentAt: { gte: previousFrom, lt: tomorrow } },
              { completedAt: { gte: previousFrom, lt: tomorrow } },
            ],
          },
          select: { sentAt: true, completedAt: true },
        }),
      ]);

      const current = emptyCounters();
      const previous = emptyCounters();
      const series = new Map<string, Counters>();
      for (let i = 0; i < days; i += 1) {
        series.set(dayKey(new Date(from.getTime() + i * DAY_MS)), emptyCounters());
      }
      const sources = new Map<
        string,
        { source: string; visits: number; clicks: number; downloads: number }
      >();

      for (const event of events) {
        const isCurrent = event.createdAt >= from;
        addEvent(isCurrent ? current : previous, event.type);
        if (!isCurrent) continue;

        const day = series.get(dayKey(event.createdAt));
        if (day) addEvent(day, event.type);

        const source = sources.get(event.source) ?? {
          source: event.source,
          visits: 0,
          clicks: 0,
          downloads: 0,
        };
        if (event.type === 'profile_view') source.visits += 1;
        if (event.type === 'contact_click' || event.type === 'website_click') source.clicks += 1;
        if (event.type === 'seal_download') source.downloads += 1;
        sources.set(event.source, source);
      }

      for (const request of requests) {
        if (request.sentAt >= from && request.sentAt < tomorrow) current.sent += 1;
        else if (request.sentAt >= previousFrom && request.sentAt < from) previous.sent += 1;

        if (!request.completedAt) continue;
        if (request.completedAt >= from && request.completedAt < tomorrow) {
          current.conversions += 1;
          const day = series.get(dayKey(request.completedAt));
          if (day) day.conversions += 1;
        } else if (request.completedAt >= previousFrom && request.completedAt < from) {
          previous.conversions += 1;
        }
      }

      return {
        period: { days, from: from.toISOString(), to: now.toISOString() },
        totals: withRates(current),
        previous: withRates(previous),
        series: Array.from(series, ([date, counters]) => ({ date, ...counters })),
        sources: Array.from(sources.values()).sort(
          (a, b) =>
            b.visits + b.clicks + b.downloads - (a.visits + a.clicks + a.downloads) ||
            a.source.localeCompare(b.source),
        ),
      };
    });
  }
}

export type AnalyticsEventType = PublicAnalyticsEvent;
