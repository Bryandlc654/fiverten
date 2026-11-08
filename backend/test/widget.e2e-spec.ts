import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const AUTH = '/api/auth';
const PASSWORD = 'Secret1234';

describe('FIVERTEN widget embebible (e2e)', () => {
  type HttpAgent = ReturnType<typeof request>;
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => HttpAgent;
  let publicId: string;
  let orgId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0);

    prisma = app.get(PrismaService);
    http = () => request(app.getHttpServer());
    const mail = app.get(MailService);
    jest.spyOn(mail, 'sendEmailVerification').mockResolvedValue(undefined);

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "organizations","users","roles","permissions","role_permissions","organization_memberships","organization_invitations","reviews","review_requests","review_campaigns","review_responses","sessions","refresh_tokens","email_verifications","password_reset_tokens","auth_attempts","notifications","review_cases","review_case_messages","review_case_files","review_resolutions","resolution_messages","review_reports","moderation_actions","plans","subscriptions","subscription_events","payments","platform_settings","email_templates","sectors","countries","languages","report_reasons","support_tickets","support_ticket_messages" RESTART IDENTITY CASCADE',
    );

    const registered = await http()
      .post(`${AUTH}/register`)
      .send({ email: 'widget@fiverten.test', password: PASSWORD, companyName: 'Widget Dental' })
      .expect(201);
    publicId = registered.body.organization.publicId as string;
    orgId = registered.body.organization.id as string;
    const token = registered.body.accessToken as string;

    await http()
      .patch('/api/organizations/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ isPublic: true })
      .expect(200);

    await prisma.review.create({
      data: {
        organizationId: orgId,
        reviewerName: 'Cliente Widget',
        reviewerEmail: 'widget-cliente@fiverten.test',
        rating: 5,
        body: 'Una experiencia excelente.',
        consent: true,
        lifecycleStatus: 'published',
        visibility: 'public',
        moderationStatus: 'none',
        emailConfirmedAt: new Date(),
        publishedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('sirve un script autocontenido con la reputación de la empresa', async () => {
    const response = await http().get(`/api/widget/${publicId}.js`).expect(200);
    expect(response.headers['content-type']).toContain('application/javascript');
    expect(response.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(response.text).toContain('Widget Dental');
    expect(response.text).toContain('utm_source=widget');
    expect(response.text).toContain('5.0 / 5');
    expect(response.text).toContain('1 reseña');
    expect(response.text).toContain('data-fiverten-widget');
  });

  it('devuelve un script inocuo si la empresa no existe', async () => {
    const response = await http().get('/api/widget/no-existe.js').expect(200);
    expect(response.text).toContain('no disponible');
  });
});
