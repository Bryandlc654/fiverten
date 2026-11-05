import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const AUTH = '/api/auth';
const VERIFY = '/api/organizations/me/verification';
const PASSWORD = 'Secret1234';

describe('FIVERTEN hardening de seguridad (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let companyToken: string;
  let adminToken: string;
  let organizationId: string;

  const company = () => ({ Authorization: `Bearer ${companyToken}` });
  const admin = () => ({ Authorization: `Bearer ${adminToken}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0);

    prisma = app.get(PrismaService);
    jest.spyOn(app.get(MailService), 'sendEmailVerification').mockResolvedValue(undefined);

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "privacy_requests","consent_records","organization_locations","client_relations","public_badges","evidence","analytics_events","verification_requests","verification_documents","verification_projects","certifications","verification_inquiries","organizations","users","roles","permissions","role_permissions","organization_memberships","organization_invitations","reviews","review_requests","review_campaigns","review_revisions","review_responses","sessions","refresh_tokens","email_verifications","password_reset_tokens","auth_attempts","notifications","review_cases","review_case_messages","review_case_files","review_resolutions","resolution_messages","review_reports","moderation_actions","plans","subscriptions","subscription_events","payments","platform_settings","email_templates","sectors","countries","languages","report_reasons","support_tickets","support_ticket_messages","media_files" RESTART IDENTITY CASCADE',
    );

    const registered = await request(app.getHttpServer())
      .post(`${AUTH}/register`)
      .send({ email: 'security@fiverten.test', password: PASSWORD, companyName: 'Security SL' })
      .expect(201);
    companyToken = registered.body.accessToken as string;
    organizationId = registered.body.organization.id as string;

    await request(app.getHttpServer())
      .post(`${AUTH}/register`)
      .send({ email: 'security-admin@fiverten.test', password: PASSWORD, companyName: 'Admin Security' })
      .expect(201);
    await prisma.user.update({
      where: { email: 'security-admin@fiverten.test' },
      data: { isSuperAdmin: true, isFivertenStaff: true },
    });
    const login = await request(app.getHttpServer())
      .post(`${AUTH}/login`)
      .send({ email: 'security-admin@fiverten.test', password: PASSWORD })
      .expect(200);
    adminToken = login.body.accessToken as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('bloquea honeypots en registro y captación sin crear datos', async () => {
    await request(app.getHttpServer())
      .post(`${AUTH}/register`)
      .send({
        email: 'bot@fiverten.test',
        password: PASSWORD,
        companyName: 'Bot SL',
        website: 'https://spam.example',
      })
      .expect(409);

    const inquiry = await request(app.getHttpServer())
      .post('/api/public/verification-inquiry')
      .send({
        companyName: 'Bot Inquiry',
        contactName: 'Bot',
        email: 'bot-inquiry@fiverten.test',
        consent: true,
        honeypot: 'filled',
      })
      .expect(200);
    expect(inquiry.body).toEqual({ received: true });
    await expect(
      prisma.verificationInquiry.count({ where: { email: 'bot-inquiry@fiverten.test' } }),
    ).resolves.toBe(0);
  });

  it('valida firma real del archivo, cifra en reposo y descifra al servir', async () => {
    await request(app.getHttpServer())
      .post(`${VERIFY}/documents`)
      .set(company())
      .field('category', 'identity')
      .attach('file', Buffer.from('<html>no es un pdf</html>'), {
        filename: 'falso.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);

    const uploaded = await request(app.getHttpServer())
      .post(`${VERIFY}/documents`)
      .set(company())
      .field('category', 'identity')
      .attach('file', Buffer.from('%PDF-1.4 documento real'), {
        filename: 'real.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const stored = await prisma.verificationDocument.findUniqueOrThrow({
      where: { id: uploaded.body.id as string },
      select: { data: true, encryptionVersion: true, scanStatus: true },
    });
    expect(stored.encryptionVersion).toBe(1);
    expect(stored.scanStatus).toBe('not_scanned');
    expect(Buffer.from(stored.data).toString('utf8')).not.toContain('%PDF-1.4 documento real');

    const downloaded = await request(app.getHttpServer())
      .get(`${VERIFY}/documents/${uploaded.body.id}`)
      .set(company())
      .expect(200);
    expect(downloaded.body.toString('utf8')).toContain('%PDF-1.4 documento real');
  });

  it('registra consentimiento versionado', async () => {
    await request(app.getHttpServer())
      .post('/api/public/verification-inquiry')
      .send({
        companyName: 'Consent SL',
        contactName: 'Ana',
        email: 'consent@fiverten.test',
        consent: true,
      })
      .expect(200);

    const consent = await prisma.consentRecord.findFirstOrThrow({
      where: { email: 'consent@fiverten.test' },
    });
    expect(consent.type).toBe('verification_inquiry');
    expect(consent.version).toBe('2026-11');
    expect(consent.granted).toBe(true);
  });

  it('tramita solicitudes GDPR y exporta los datos del usuario', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/privacy/requests')
      .set(company())
      .send({ type: 'access', details: 'Quiero una copia de mis datos' })
      .expect(201);
    expect(created.body.type).toBe('access');

    const list = await request(app.getHttpServer())
      .get('/api/privacy/requests')
      .set(company())
      .expect(200);
    expect(list.body.items).toHaveLength(1);

    const exported = await request(app.getHttpServer())
      .get('/api/privacy/export')
      .set(company())
      .expect(200);
    expect(exported.body.user.email).toBe('security@fiverten.test');
    expect(exported.body).toHaveProperty('consents');

    const adminList = await request(app.getHttpServer())
      .get('/api/admin/privacy/requests')
      .set(admin())
      .expect(200);
    expect(adminList.body.total).toBe(1);
    await request(app.getHttpServer())
      .post(`/api/admin/privacy/requests/${created.body.id}/complete`)
      .set(admin())
      .send({ status: 'completed', response: 'Exportación enviada' })
      .expect(200);
  });

  it('impide modificar o borrar eventos de auditoría', async () => {
    const event = await prisma.verificationEvent.create({
      data: {
        organizationId,
        actorType: 'system',
        action: 'test_append_only',
        entityType: 'organization',
        entityId: organizationId,
      },
    });
    await expect(
      prisma.verificationEvent.update({
        where: { id: event.id },
        data: { reason: 'alterado' },
      }),
    ).rejects.toThrow();
    await expect(prisma.verificationEvent.delete({ where: { id: event.id } })).rejects.toThrow();
  });

  it('exige MFA al personal cuando la política está activa', async () => {
    process.env.REQUIRE_STAFF_MFA = 'true';
    try {
      const response = await request(app.getHttpServer())
        .get('/api/admin/stats')
        .set(admin())
        .expect(403);
      expect(response.body.code).toBe('MFA_REQUIRED');
    } finally {
      delete process.env.REQUIRE_STAFF_MFA;
    }
  });
});
