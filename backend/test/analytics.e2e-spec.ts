import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const AUTH = '/api/auth';
const EVENTS = '/api/public/analytics/events';
const SUMMARY = '/api/organizations/me/analytics';
const PASSWORD = 'Secret1234';
const DAY_MS = 24 * 60 * 60 * 1000;

describe('FIVERTEN analítica del perfil (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;
  let slug: string;
  let otherSlug: string;
  let organizationId: string;

  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0);

    prisma = app.get(PrismaService);
    jest.spyOn(app.get(MailService), 'sendEmailVerification').mockResolvedValue(undefined);

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "analytics_events","verification_requests","verification_documents","verification_projects","certifications","verification_inquiries","organizations","users","roles","permissions","role_permissions","organization_memberships","organization_invitations","reviews","review_requests","review_campaigns","review_responses","sessions","refresh_tokens","email_verifications","password_reset_tokens","auth_attempts","notifications","review_cases","review_case_messages","review_case_files","review_resolutions","resolution_messages","review_reports","moderation_actions","plans","subscriptions","subscription_events","payments","platform_settings","email_templates","sectors","countries","languages","report_reasons","support_tickets","support_ticket_messages","media_files" RESTART IDENTITY CASCADE',
    );

    const company = await request(app.getHttpServer())
      .post(`${AUTH}/register`)
      .send({ email: 'analytics@fiverten.test', password: PASSWORD, companyName: 'Analítica SL' })
      .expect(201);
    token = company.body.accessToken as string;
    slug = company.body.organization.slug as string;
    organizationId = company.body.organization.id as string;

    const other = await request(app.getHttpServer())
      .post(`${AUTH}/register`)
      .send({ email: 'analytics-otra@fiverten.test', password: PASSWORD, companyName: 'Otra SL' })
      .expect(201);
    otherSlug = other.body.organization.slug as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('registra visitas, clics y descargas desde el perfil público', async () => {
    await request(app.getHttpServer())
      .post(EVENTS)
      .send({
        slug,
        type: 'profile_view',
        referrer: 'https://www.google.com/search?q=fiverten',
        path: `/empresa/${slug}`,
      })
      .expect(200)
      .expect({ tracked: true });

    await request(app.getHttpServer())
      .post(EVENTS)
      .send({ slug, type: 'contact_click', source: 'qr', path: `/empresa/${slug}` })
      .expect(200);

    await request(app.getHttpServer())
      .post(EVENTS)
      .send({ slug, type: 'seal_download', source: 'fiverten' })
      .expect(200);

    await request(app.getHttpServer())
      .post(EVENTS)
      .send({ slug, type: 'invented_event' })
      .expect(400);

    const unknown = await request(app.getHttpServer())
      .post(EVENTS)
      .send({ slug: 'empresa-que-no-existe', type: 'profile_view' })
      .expect(200);
    expect(unknown.body.tracked).toBe(false);
  });

  it('devuelve el resumen de tráfico y fuentes sólo a su empresa', async () => {
    const summary = await request(app.getHttpServer())
      .get(`${SUMMARY}?days=30`)
      .set(auth())
      .expect(200);

    expect(summary.body.totals).toMatchObject({ visits: 1, clicks: 1, downloads: 1 });
    expect(summary.body.series).toHaveLength(30);
    expect(summary.body.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: 'google', visits: 1 }),
        expect.objectContaining({ source: 'qr', clicks: 1 }),
        expect.objectContaining({ source: 'fiverten', downloads: 1 }),
      ]),
    );

    const other = await request(app.getHttpServer())
      .post(`${AUTH}/login`)
      .send({ email: 'analytics-otra@fiverten.test', password: PASSWORD })
      .expect(200);
    const otherSummary = await request(app.getHttpServer())
      .get(`${SUMMARY}?days=30`)
      .set({ Authorization: `Bearer ${other.body.accessToken as string}` })
      .expect(200);
    expect(otherSummary.body.totals.visits).toBe(0);
  });

  it('calcula conversiones con las solicitudes de reseña completadas', async () => {
    const now = new Date();
    await prisma.reviewRequest.create({
      data: {
        organizationId,
        tokenHash: `analytics-current-${Date.now()}`,
        reviewerName: 'Cliente actual',
        reviewerEmail: 'actual@analytics.test',
        status: 'completed',
        sentAt: new Date(now.getTime() - 2 * DAY_MS),
        completedAt: new Date(now.getTime() - 1 * DAY_MS),
        expiresAt: new Date(now.getTime() + 10 * DAY_MS),
      },
    });
    await prisma.reviewRequest.create({
      data: {
        organizationId,
        tokenHash: `analytics-previous-${Date.now()}`,
        reviewerName: 'Cliente anterior',
        reviewerEmail: 'anterior@analytics.test',
        status: 'completed',
        sentAt: new Date(now.getTime() - 40 * DAY_MS),
        completedAt: new Date(now.getTime() - 39 * DAY_MS),
        expiresAt: new Date(now.getTime() - 20 * DAY_MS),
      },
    });

    const summary = await request(app.getHttpServer())
      .get(`${SUMMARY}?days=30`)
      .set(auth())
      .expect(200);

    expect(summary.body.totals).toMatchObject({
      conversions: 1,
      sent: 1,
      conversionRate: 1,
    });
    expect(summary.body.previous).toMatchObject({ conversions: 1, sent: 1 });
  });

  it('valida el periodo y exige sesión para el resumen', async () => {
    await request(app.getHttpServer()).get(`${SUMMARY}?days=30`).expect(401);
    await request(app.getHttpServer())
      .get(`${SUMMARY}?days=0`)
      .set(auth())
      .expect(400);
    await request(app.getHttpServer())
      .get(`${SUMMARY}?days=365`)
      .set(auth())
      .expect(200);
  });

  it('no expone el tráfico de otra empresa', async () => {
    await request(app.getHttpServer())
      .post(EVENTS)
      .send({ slug: otherSlug, type: 'profile_view', source: 'direct' })
      .expect(200);

    const summary = await request(app.getHttpServer())
      .get(`${SUMMARY}?days=30`)
      .set(auth())
      .expect(200);
    expect(summary.body.totals.visits).toBe(1);
  });
});
