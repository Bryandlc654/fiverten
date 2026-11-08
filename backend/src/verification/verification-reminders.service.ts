import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformSettingsService } from '../settings/settings.service';

const DAY_MS = 86_400_000;

/**
 * Recordatorio por correo para renovar la verificación antes de que caduque.
 * Se ejecuta a diario y solo envía una vez por cada fecha de caducidad.
 */
@Injectable()
export class VerificationRemindersService {
  private readonly logger = new Logger(VerificationRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly settings: PlatformSettingsService,
  ) {}

  @Cron('0 9 * * *', {
    name: 'verification-renewal-reminders',
    timeZone: 'Europe/Madrid',
  })
  async handleCron(): Promise<void> {
    const result = await this.sendRenewalReminders();
    if (result.sent > 0) {
      this.logger.log(`Recordatorios de renovación enviados: ${result.sent}`);
    }
  }

  async sendRenewalReminders(
    now = new Date(),
  ): Promise<{ sent: number; skipped: 'emails_disabled' | null }> {
    const emailEnabled = await this.settings.get<boolean>('notifications.email_enabled');
    if (!emailEnabled) {
      return { sent: 0, skipped: 'emails_disabled' };
    }

    const [reminderSetting, renewalSetting] = await Promise.all([
      this.settings.get<number>('notifications.reminder_days'),
      this.settings.get<number>('verification.renewal_days'),
    ]);
    // Nunca avisar antes de que la renovación esté permitida.
    const reminderDays = Math.max(
      1,
      Math.min(Number(reminderSetting) || 30, Number(renewalSetting) || 30),
    );
    const horizon = new Date(now.getTime() + reminderDays * DAY_MS);

    const candidates = await this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
      tx.organization.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          status: 'active',
          verificationStatus: 'verified',
          verificationExpiresAt: { gt: now, lte: horizon },
        },
        select: {
          id: true,
          tradeName: true,
          email: true,
          verificationExpiresAt: true,
          verificationReminderFor: true,
          memberships: {
            where: {
              isActive: true,
              user: { isActive: true },
              OR: [{ isOwner: true }, { role: { baseRole: 'admin' } }],
            },
            select: { user: { select: { email: true } } },
          },
        },
      }),
    );

    let sent = 0;
    for (const org of candidates) {
      const expiresAt = org.verificationExpiresAt;
      if (!expiresAt) continue;
      if (
        org.verificationReminderFor &&
        org.verificationReminderFor.getTime() >= expiresAt.getTime()
      ) {
        continue;
      }

      const recipients = Array.from(
        new Set(
          [...org.memberships.map((membership) => membership.user.email), org.email ?? '']
            .map((email) => email.trim())
            .filter((email) => email.includes('@')),
        ),
      );
      if (recipients.length === 0) continue;

      const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS));
      const results = await Promise.allSettled(
        recipients.map((to) =>
          this.mail.sendVerificationExpiryReminder(to, org.tradeName, expiresAt, daysLeft),
        ),
      );
      const delivered = results.filter((result) => result.status === 'fulfilled').length;
      if (delivered === 0) {
        this.logger.warn(`No se pudo enviar el recordatorio de renovación a ${org.tradeName}`);
        continue;
      }

      await this.prisma.withContext({ isPlatformAdmin: true }, (tx) =>
        tx.organization.update({
          where: { id: org.id },
          data: { verificationReminderFor: expiresAt },
        }),
      );
      sent += delivered;
    }

    return { sent, skipped: null };
  }
}
