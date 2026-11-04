import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const SETTING_DEFAULTS: Record<string, { value: Prisma.InputJsonValue; description: string }> =
  {
    'general.site_name': { value: 'FIVERTEN', description: 'Nombre comercial de la plataforma' },
    'general.support_email': {
      value: 'soporte@fiverten.com',
      description: 'Correo de soporte mostrado a las empresas',
    },
    'general.default_locale': { value: 'es', description: 'Idioma por defecto' },
    'general.default_currency': { value: 'EUR', description: 'Moneda por defecto para precios' },
    'general.registrations_enabled': {
      value: true,
      description: 'Permite el registro público de nuevas empresas',
    },
    'general.maintenance_mode': {
      value: false,
      description: 'Muestra un aviso de mantenimiento en la plataforma',
    },
    'reviews.low_rating_max': {
      value: 2,
      description: 'Puntuación máxima considerada reseña de baja valoración',
    },
    'reviews.allow_low_rating_resolution': {
      value: true,
      description: 'Permite abrir incidencias para reseñas de baja valoración',
    },
    'reviews.require_email_confirmation': {
      value: true,
      description: 'La reseña se publica solo tras confirmar el correo',
    },
    'reviews.max_reviews_per_ip_day': {
      value: 3,
      description: 'Máximo de reseñas por IP en 24 horas',
    },
    'notifications.email_enabled': {
      value: true,
      description: 'Envía avisos por correo además de las notificaciones internas',
    },
    'notifications.default_new_reviews': {
      value: true,
      description: 'Valor inicial del aviso de reseñas nuevas por empresa',
    },
    'notifications.default_negative_reviews': {
      value: true,
      description: 'Valor inicial del aviso de reseñas negativas por empresa',
    },
    'notifications.reminder_days': {
      value: 7,
      description: 'Días antes del vencimiento para recordar la renovación',
    },
  };

const CACHE_TTL_MS = 30_000;

/** Configuración global de la plataforma (clave/valor con caché corta). */
@Injectable()
export class PlatformSettingsService {
  private cache: { values: Map<string, unknown>; expiresAt: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const values = await this.values();
    return Object.entries(SETTING_DEFAULTS).map(([key, definition]) => ({
      key,
      value: values.get(key) ?? definition.value,
      description: definition.description,
    }));
  }

  async update(entries: Record<string, unknown>, actorId: string) {
    const rows = Object.entries(entries).filter(([key]) => key in SETTING_DEFAULTS);
    await this.prisma.withContext({ isPlatformAdmin: true }, async (tx) => {
      for (const [key, value] of rows) {
        await tx.platformSetting.upsert({
          where: { key },
          update: { value: value as Prisma.InputJsonValue, updatedBy: actorId },
          create: {
            key,
            value: value as Prisma.InputJsonValue,
            description: SETTING_DEFAULTS[key].description,
            updatedBy: actorId,
          },
        });
      }
    });
    this.cache = null;
    return this.list();
  }

  async get<T = unknown>(key: string): Promise<T> {
    const values = await this.values();
    return (values.get(key) ?? SETTING_DEFAULTS[key]?.value) as T;
  }

  async lowRatingMax(): Promise<number> {
    const value = Number(await this.get('reviews.low_rating_max'));
    return Number.isFinite(value) && value >= 1 && value <= 5 ? value : 2;
  }

  async allowLowRatingResolution(): Promise<boolean> {
    return Boolean(await this.get('reviews.allow_low_rating_resolution'));
  }

  async registrationsEnabled(): Promise<boolean> {
    return Boolean(await this.get('general.registrations_enabled'));
  }

  async publicConfig() {
    const values = await this.values();
    const read = (key: string) => values.get(key) ?? SETTING_DEFAULTS[key].value;
    return {
      siteName: read('general.site_name'),
      supportEmail: read('general.support_email'),
      defaultLocale: read('general.default_locale'),
      defaultCurrency: read('general.default_currency'),
      registrationsEnabled: read('general.registrations_enabled'),
      maintenanceMode: read('general.maintenance_mode'),
      lowRatingMax: read('reviews.low_rating_max'),
      allowLowRatingResolution: read('reviews.allow_low_rating_resolution'),
    };
  }

  private async values(): Promise<Map<string, unknown>> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      return this.cache.values;
    }
    const rows = await this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.platformSetting.findMany(),
    );
    const values = new Map<string, unknown>();
    for (const [key, definition] of Object.entries(SETTING_DEFAULTS)) {
      values.set(key, definition.value);
    }
    for (const row of rows) {
      values.set(row.key, row.value);
    }
    this.cache = { values, expiresAt: now + CACHE_TTL_MS };
    return values;
  }
}
