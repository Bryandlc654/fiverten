import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { PlatformSettingsService } from '../src/settings/settings.service';
import { VerificationRemindersService } from '../src/verification/verification-reminders.service';

const AUTH = '/api/auth';
const PASSWORD = 'Secret1234';
const DAY_MS = 86_400_000;

describe('FIVERTEN recordatorio de renovación (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mail: MailService;
  let settings: PlatformSettingsService;
  let reminders: VerificationRemindersService;
  let spy: jest.SpyInstance;
  let organizationId: string;
  let userId: string;
  let email: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0);

    prisma = app.get(PrismaService);
    mail = app.get(MailService);
    settings = app.get(PlatformSettingsService);
    reminders = app.get(VerificationRemindersService);
    jest.spyOn(mail, 'sendEmailVerification').mockResolvedValue(undefined);
    spy = jest.spyOn(mail, 'sendVerificationExpiryReminder').mockResolvedValue(undefined);

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "verification_requests","verification_documents","verification_projects","certifications","organizations","users","roles","permissions","role_permissions","organization_memberships","organization_invitations","reviews","review_requests","review_campaigns","review_responses","sessions","refresh_tokens","email_verifications","password_reset_tokens","auth_attempts","notifications","review_cases","review_case_messages","review_case_files","review_resolutions","resolution_messages","review_reports","moderation_actions","plans","subscriptions","subscription_events","payments","platform_settings","email_templates","sectors","countries","languages","report_reasons","support_tickets","support_ticket_messages","media_files" RESTART IDENTITY CASCADE',
    );

    email = 'renovacion@fiverten.test';
    const registered = await request(app.getHttpServer())
      .post(`${AUTH}/register`)
      .send({ email, password: PASSWORD, companyName: 'Renovación SL' })
      .expect(201);
    organizationId = registered.body.organization.id as string;
    userId = registered.body.user.id as string;
  });

  beforeEach(() => {
    spy.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  async function setExpiry(days: number, reminderFor: Date | null = null) {
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        verificationStatus: 'verified',
        verifiedAt: new Date(),
        verificationExpiresAt: new Date(Date.now() + days * DAY_MS),
        verificationReminderFor: reminderFor,
      },
    });
  }

  it('envía un solo correo dentro de la ventana de 30 días', async () => {
    await setExpiry(10);

    const first = await reminders.sendRenewalReminders();
    expect(first.skipped).toBeNull();
    expect(first.sent).toBe(1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(email, 'Renovación SL', expect.any(Date), expect.any(Number));
    const daysLeft = spy.mock.calls[0][3] as number;
    expect(daysLeft).toBeGreaterThanOrEqual(9);
    expect(daysLeft).toBeLessThanOrEqual(10);

    // La marca evita repetir el aviso para la misma caducidad.
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    expect(org.verificationReminderFor).not.toBeNull();
    const second = await reminders.sendRenewalReminders();
    expect(second.sent).toBe(0);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('no envía fuera de la ventana de aviso', async () => {
    await setExpiry(120, null);

    const outside = await reminders.sendRenewalReminders();
    expect(outside.sent).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it('respeta la configuración de avisos por correo desactivados', async () => {
    await setExpiry(10, null);
    await settings.update({ 'notifications.email_enabled': false }, userId);

    const disabled = await reminders.sendRenewalReminders();
    expect(disabled).toEqual({ sent: 0, skipped: 'emails_disabled' });
    expect(spy).not.toHaveBeenCalled();

    await settings.update({ 'notifications.email_enabled': true }, userId);
  });

  it('vuelve a avisar cuando la verificación se renueva', async () => {
    const previousExpiry = new Date(Date.now() + 5 * DAY_MS);
    await setExpiry(20, previousExpiry);

    const result = await reminders.sendRenewalReminders();
    expect(result.sent).toBe(1);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
