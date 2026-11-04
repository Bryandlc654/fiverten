import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CONFIRM_TTL_MS } from './public-reviews.service';
import { statusFilter } from './reviews.mappers';
import { ACTIVE_RESOLUTION_STATUSES } from './review-states';

// Reseñas que cuentan en la reputación: las mismas que la media del perfil
// público (publicadas y visibles, aunque tengan un reporte pendiente). Las de
// 1-2 estrellas solo llegan aquí cuando su caso de evidencias las publica.
const PUBLISHED: Prisma.ReviewWhereInput = {
  lifecycleStatus: 'published',
  visibility: 'public',
  deletedAt: null,
};
const PUBLISHED_SQL = Prisma.sql`r.lifecycle_status = 'published' AND r.visibility = 'public' AND r.deleted_at IS NULL`;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Fracción redondeada a 3 decimales, o null si no hay base. */
function ratio(part: number, total: number): number | null {
  return total > 0 ? Math.round((part / total) * 1000) / 1000 : null;
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Estadísticas de reputación del panel de la empresa. */
@Injectable()
export class ReviewStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(orgId: string, months: number) {
    const now = new Date();
    const firstMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1),
    );
    const ago = (days: number) => new Date(now.getTime() - days * DAY_MS);

    return this.prisma.withContext({ orgId }, async (tx) => {
      const [distribution, periods, monthly, responses, pending, underReview, resolutions, cases] =
        await Promise.all([
          tx.review.groupBy({
            by: ['rating'],
            where: { organizationId: orgId, ...PUBLISHED },
            _count: { _all: true },
          }),
          tx.$queryRaw<{ last30: number; previous30: number; last90: number; last365: number }[]>`
            SELECT
              COUNT(*) FILTER (WHERE r.published_at >= ${ago(30)})::int AS "last30",
              COUNT(*) FILTER (WHERE r.published_at >= ${ago(60)} AND r.published_at < ${ago(30)})::int AS "previous30",
              COUNT(*) FILTER (WHERE r.published_at >= ${ago(90)})::int AS "last90",
              COUNT(*) FILTER (WHERE r.published_at >= ${ago(365)})::int AS "last365"
            FROM reviews r
            WHERE r.organization_id = ${orgId}::uuid AND ${PUBLISHED_SQL}`,
          tx.$queryRaw<{ month: string; count: number; average: number }[]>`
            SELECT to_char(date_trunc('month', r.published_at AT TIME ZONE 'UTC'), 'YYYY-MM') AS month,
                   COUNT(*)::int AS count,
                   AVG(r.rating)::float AS average
            FROM reviews r
            WHERE r.organization_id = ${orgId}::uuid AND ${PUBLISHED_SQL}
              AND r.published_at >= ${firstMonth}
            GROUP BY 1
            ORDER BY 1`,
          // Tiempo de respuesta: desde que la reseña es pública (no antes, si la
          // empresa respondió mientras estaba en revisión cuenta como inmediata).
          tx.$queryRaw<{ published: number; answered: number; avgSeconds: number | null }[]>`
            SELECT COUNT(*)::int AS published,
                   COUNT(rr.id)::int AS answered,
                   AVG(GREATEST(EXTRACT(EPOCH FROM (rr.created_at - r.published_at)), 0))::float AS "avgSeconds"
            FROM reviews r
            LEFT JOIN review_responses rr ON rr.review_id = r.id
            WHERE r.organization_id = ${orgId}::uuid AND ${PUBLISHED_SQL}`,
          tx.review.count({
            where: {
              organizationId: orgId,
              deletedAt: null,
              ...statusFilter('pending'),
              createdAt: { gt: new Date(now.getTime() - CONFIRM_TTL_MS) },
            },
          }),
          tx.review.count({
            where: { organizationId: orgId, deletedAt: null, ...statusFilter('under_review') },
          }),
          tx.reviewResolution.groupBy({
            by: ['status', 'outcome'],
            where: { organizationId: orgId },
            _count: { _all: true },
          }),
          // La empresa solo ve los casos en los que ya ha sido notificada.
          tx.reviewCase.groupBy({
            by: ['status', 'outcome'],
            where: { organizationId: orgId, companyNotifiedAt: { not: null } },
            _count: { _all: true },
          }),
        ]);

      const stars: Record<string, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let total = 0;
      let sum = 0;
      for (const row of distribution) {
        stars[row.rating] = row._count._all;
        total += row._count._all;
        sum += row.rating * row._count._all;
      }

      const byMonth = new Map(monthly.map((row) => [row.month, row]));
      const series = Array.from({ length: months }, (_, i) => {
        const key = monthKey(
          new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + i, 1)),
        );
        const row = byMonth.get(key);
        return {
          month: key,
          count: row?.count ?? 0,
          average: row ? Math.round(row.average * 100) / 100 : null,
        };
      });

      const response = responses[0];
      const resolutionCounts = { open: 0, resolved: 0, unresolved: 0 };
      for (const row of resolutions) {
        const n = row._count._all;
        if (ACTIVE_RESOLUTION_STATUSES.includes(row.status)) resolutionCounts.open += n;
        // Retirada por el cliente tras el acuerdo: también es una incidencia resuelta.
        else if (row.outcome === 'resolved' || row.outcome === 'withdrawn')
          resolutionCounts.resolved += n;
        else resolutionCounts.unresolved += n;
      }
      const caseCounts = { open: 0, published: 0, rejected: 0, withdrawn: 0 };
      for (const row of cases) {
        const n = row._count._all;
        if (row.status !== 'closed') caseCounts.open += n;
        else if (row.outcome === 'published') caseCounts.published += n;
        else if (row.outcome === 'rejected') caseCounts.rejected += n;
        else if (row.outcome === 'withdrawn') caseCounts.withdrawn += n;
      }
      const resolutionTotal =
        resolutionCounts.open + resolutionCounts.resolved + resolutionCounts.unresolved;
      const casesClosed = caseCounts.published + caseCounts.rejected + caseCounts.withdrawn;

      return {
        rating: {
          average: total > 0 ? Math.round((sum / total) * 10) / 10 : null,
          total,
          distribution: stars,
        },
        periods: periods[0],
        monthly: series,
        responses: {
          published: response.published,
          answered: response.answered,
          rate: ratio(response.answered, response.published),
          averageHours:
            response.avgSeconds === null
              ? null
              : Math.round((response.avgSeconds / 3600) * 10) / 10,
        },
        requests: {
          pendingConfirmation: pending,
          underReview,
          resolutions: {
            ...resolutionCounts,
            total: resolutionTotal,
            resolutionRate: ratio(
              resolutionCounts.resolved,
              resolutionCounts.resolved + resolutionCounts.unresolved,
            ),
          },
          cases: {
            ...caseCounts,
            total: caseCounts.open + casesClosed,
            resolutionRate: ratio(casesClosed, caseCounts.open + casesClosed),
          },
        },
      };
    });
  }
}
