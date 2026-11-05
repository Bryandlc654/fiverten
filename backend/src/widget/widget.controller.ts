import { Controller, Get, Header, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { effectiveVerificationStatus } from '../verification/verification-status';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Script embebible que pinta el sello de reputación de una empresa en su web.
 * Es autocontenido (no hace fetch), así que funciona en cualquier dominio.
 */
@Controller('widget')
export class WidgetController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get(':file')
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  @Header('Content-Type', 'application/javascript; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=120, stale-while-revalidate=600')
  @Header('Access-Control-Allow-Origin', '*')
  async script(@Param('file') file: string): Promise<string> {
    const publicId = file.endsWith('.js') ? file.slice(0, -3) : file;

    const org = await this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.organization.findFirst({
        where: {
          deletedAt: null,
          isActive: true,
          isPublic: true,
          status: 'active',
          OR: [
            { publicId },
            { publicBadge: { embedToken: publicId, state: 'active' } },
          ],
        },
        select: {
          id: true,
          publicId: true,
          tradeName: true,
          slug: true,
          verificationStatus: true,
          verificationExpiresAt: true,
        },
      }),
    );

    if (!org) {
      return '/* FIVERTEN: empresa no disponible */';
    }

    const grouped = await this.prisma.withContext({}, (tx) =>
      tx.review.groupBy({
        by: ['rating'],
        where: {
          organizationId: org.id,
          lifecycleStatus: 'published',
          visibility: 'public',
          deletedAt: null,
        },
        _count: { _all: true },
      }),
    );

    let total = 0;
    let sum = 0;
    for (const row of grouped) {
      total += row._count._all;
      sum += row.rating * row._count._all;
    }
    const average = total > 0 ? Math.round((sum / total) * 10) / 10 : null;
    const filled = average === null ? 0 : Math.round(average);
    const stars = '★'.repeat(filled) + '☆'.repeat(Math.max(0, 5 - filled));
    const ratingText = average === null ? 'Sin reseñas' : `${average.toFixed(1)} / 5`;
    const countText = `${total} ${total === 1 ? 'reseña' : 'reseñas'}`;
    const baseUrl = (
      this.config.get<string>('FRONTEND_URL') ?? 'https://fiverten.com'
    ).replace(/\/+$/, '');
    const profileUrl = `${baseUrl}/empresa/${encodeURIComponent(org.slug)}`;
    const verified = effectiveVerificationStatus(org) === 'verified';
    const name = escapeHtml(org.tradeName);
    const idAttr = escapeHtml(org.publicId);

    return `(function () {
  var id = ${JSON.stringify(idAttr)};
  var previous = document.querySelector('[data-fiverten-widget="' + id + '"]');
  if (previous) previous.remove();

  var script = document.currentScript;
  if (!script) {
    var scripts = document.querySelectorAll('script[src*="/widget/' + id + '.js"]');
    script = scripts[scripts.length - 1] || null;
  }

  var card = document.createElement('a');
  card.setAttribute('data-fiverten-widget', id);
  card.href = ${JSON.stringify(profileUrl)};
  card.target = '_blank';
  card.rel = 'noopener noreferrer nofollow';
  card.style.cssText = 'display:inline-flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;box-shadow:0 4px 14px rgba(15,23,42,.06);font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;text-decoration:none;color:#0f172a;line-height:1.2;';

  card.innerHTML = '<span style="display:flex;flex-direction:column;gap:2px;">' +
    '<span style="font-size:13px;font-weight:700;">' + ${JSON.stringify(name)} + '</span>' +
    '<span style="font-size:15px;letter-spacing:1px;color:#f59e0b;">' + ${JSON.stringify(stars)} + '</span>' +
    '<span style="font-size:11px;color:#64748b;">' + ${JSON.stringify(ratingText + ' · ' + countText)} + '</span>' +
    '</span>' +
    '<span style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;padding-left:12px;border-left:1px solid #e2e8f0;">' +
    '<span style="font-size:10px;font-weight:800;letter-spacing:2px;color:#0b101b;">FIVERTEN</span>' +
    '<span style="font-size:10px;color:' + ${JSON.stringify(verified ? '#059669' : '#94a3b8')} + ';">' +
    ${JSON.stringify(verified ? '✓ Empresa verificada' : 'Reseñas verificadas')} + '</span>' +
    '</span>';

  if (script && script.parentNode) {
    script.parentNode.insertBefore(card, script.nextSibling);
  } else {
    document.body.appendChild(card);
  }
})();`;
  }
}
