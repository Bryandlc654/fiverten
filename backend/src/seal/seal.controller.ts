import { Controller, Get, Header, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';
import {
  effectiveVerificationStatus,
  type EffectiveVerificationStatus,
} from '../verification/verification-status';

const PALETTE: Record<EffectiveVerificationStatus, { color: string; soft: string; label: string }> =
  {
    verified: { color: '#059669', soft: '#ecfdf5', label: 'Empresa verificada' },
    pending: { color: '#d97706', soft: '#fffbeb', label: 'Verificación pendiente' },
    expired: { color: '#64748b', soft: '#f8fafc', label: 'Verificación caducada' },
    rejected: { color: '#dc2626', soft: '#fef2f2', label: 'Verificación rechazada' },
    not_verified: { color: '#94a3b8', soft: '#f8fafc', label: 'Sin verificar' },
  };

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function dateLabel(value: Date | null): string {
  if (!value) return '';
  return value.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function sealSvg(options: {
  name: string;
  status: EffectiveVerificationStatus;
  expiresAt: Date | null;
}): string {
  const palette = PALETTE[options.status];
  const name = escapeXml(truncate(options.name, 34));
  const detail =
    options.status === 'verified' && options.expiresAt
      ? `Válido hasta ${dateLabel(options.expiresAt)}`
      : options.status === 'pending'
        ? 'En revisión por FIVERTEN'
        : options.status === 'expired'
          ? 'Renueva tu verificación'
          : options.status === 'rejected'
            ? 'Revisa el motivo en tu panel'
            : 'Solicita tu verificación';
  const icon =
    options.status === 'verified'
      ? '<path d="M8 14.5l4 4 8-8" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
      : '<circle cx="14" cy="14" r="6" stroke="#ffffff" stroke-width="2.5" fill="none"/><path d="M14 10.5v4.5l3 2" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round"/>';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="104" viewBox="0 0 300 104" role="img" aria-label="${escapeXml(palette.label)} de ${name}">
  <title>${escapeXml(palette.label)} · ${name}</title>
  <rect x="1" y="1" width="298" height="102" rx="16" fill="#ffffff" stroke="#e2e8f0"/>
  <rect x="1" y="1" width="298" height="102" rx="16" fill="${palette.soft}" opacity="0.65"/>
  <rect x="16" y="18" width="44" height="44" rx="12" fill="${palette.color}"/>
  <g transform="translate(16 18)">${icon}</g>
  <text x="74" y="38" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="10" font-weight="700" letter-spacing="2.2" fill="#0b101b">FIVERTEN</text>
  <text x="74" y="56" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="700" fill="#0f172a">${name}</text>
  <text x="74" y="72" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="11" font-weight="600" fill="${palette.color}">${escapeXml(palette.label)}</text>
  <text x="74" y="88" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="10" fill="#64748b">${escapeXml(detail)}</text>
</svg>`;
}

@Controller('seal')
export class SealController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':file')
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  @Header('Access-Control-Allow-Origin', '*')
  // El sello se inserta como <img> en webs de terceros. El CORP por defecto de
  // helmet (same-origin) bloquearía esa carga entre orígenes.
  @Header('Cross-Origin-Resource-Policy', 'cross-origin')
  async seal(
    @Param('file') file: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Buffer | string> {
    const match = /^(.+)\.(svg|png)$/i.exec(file);
    if (!match) {
      throw new NotFoundException('Sello no encontrado');
    }
    const publicId = match[1];
    const format = match[2].toLowerCase();

    const org = await this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.organization.findFirst({
        where: {
          deletedAt: null,
          OR: [{ publicId }, { publicBadge: { embedToken: publicId, state: 'active' } }],
        },
        select: {
          tradeName: true,
          verificationStatus: true,
          verificationExpiresAt: true,
        },
      }),
    );
    if (!org) {
      throw new NotFoundException('Sello no encontrado');
    }

    const status = effectiveVerificationStatus(org);
    const svg = sealSvg({
      name: org.tradeName,
      status,
      expiresAt: org.verificationExpiresAt,
    });

    if (format === 'svg') {
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      return svg;
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'attachment; filename="sello-fiverten.png"');
    return sharp(Buffer.from(svg)).png().toBuffer();
  }
}
