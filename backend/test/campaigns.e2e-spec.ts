import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const AUTH = '/api/auth';
const CAMPAIGNS = '/api/organizations/me/review-requests/campaigns';
const PUBLIC = '/api/public';
const PASSWORD = 'Secret1234';

describe('FIVERTEN campañas de solicitud de reseñas (e2e)', () => {
  type HttpAgent = ReturnType<typeof request>;
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => HttpAgent;
  let ownerToken: string;
  let slug: string;
  let campaignId: string;
  let tokenForLucia: string;
  const confirmTokens = new Map<string, string>();

  const auth = () => ({ Authorization: `Bearer ${ownerToken}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0);

    prisma = app.get(PrismaService);
    http = () => request(app.getHttpServer());
    const mail = app.get(MailService);
    jest.spyOn(mail, 'sendEmailVerification').mockResolvedValue(undefined);
    jest
      .spyOn(mail, 'sendReviewRequest')
      .mockImplementation(async (to: string, _name, _org, url: string) => {
        if (to === 'lucia@campaign.test') {
          tokenForLucia = new URL(url).searchParams.get('rt') ?? '';
        }
      });
    jest
      .spyOn(mail, 'sendReviewConfirmation')
      .mockImplementation(async (to: string, token: string) => {
        confirmTokens.set(to, token);
      });

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "organizations","users","roles","permissions","role_permissions","organization_memberships","organization_invitations","reviews","review_requests","review_campaigns","review_responses","sessions","refresh_tokens","email_verifications","password_reset_tokens","auth_attempts","notifications","review_cases","review_case_messages","review_case_files","review_resolutions","resolution_messages","review_reports","moderation_actions","plans","subscriptions","subscription_events","payments","platform_settings","email_templates","sectors","countries","languages","report_reasons","support_tickets","support_ticket_messages" RESTART IDENTITY CASCADE',
    );

    const registered = await http()
      .post(`${AUTH}/register`)
      .send({ email: 'campaign@fiverten.test', password: PASSWORD, companyName: 'Campañas SL' })
      .expect(201);
    slug = registered.body.organization.slug as string;
    ownerToken = registered.body.accessToken as string;

    await http()
      .patch('/api/organizations/me')
      .set(auth())
      .send({ isPublic: true })
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  it('crea una campaña y envía un enlace único por cliente', async () => {
    const created = await http()
      .post(CAMPAIGNS)
      .set(auth())
      .send({
        name: 'Clientes septiembre',
        recipients: [
          { name: 'Lucía Pérez', email: 'lucia@campaign.test' },
          { name: 'Mario Ruiz', email: 'mario@campaign.test' },
          { name: 'Lucía repetida', email: 'lucia@campaign.test' },
        ],
      })
      .expect(201);

    campaignId = created.body.id as string;
    expect(created.body.stats).toMatchObject({ sent: 2, opened: 0, completed: 0, conversion: 0 });
    expect(tokenForLucia).toBeTruthy();

    const list = await http().get(CAMPAIGNS).set(auth()).expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0].stats.sent).toBe(2);
  });

  it('registra apertura y conversión', async () => {
    const opened = await http()
      .get(`${PUBLIC}/organizations/${slug}/review-request`)
      .query({ token: tokenForLucia })
      .expect(200);
    expect(opened.body.reviewerName).toBe('Lucía Pérez');

    const submitted = await http()
      .post(`${PUBLIC}/organizations/${slug}/reviews`)
      .send({
        name: 'Lucía Pérez',
        email: 'lucia@campaign.test',
        rating: 5,
        body: 'Todo perfecto, gracias por el enlace personalizado.',
        consent: true,
        requestToken: tokenForLucia,
      })
      .expect(201);
    expect(submitted.body.status).toBe('pending_confirmation');

    await http()
      .post(`${PUBLIC}/reviews/confirm`)
      .send({ token: confirmTokens.get('lucia@campaign.test') })
      .expect(200);

    const detail = await http()
      .get(`${CAMPAIGNS}/${campaignId}`)
      .set(auth())
      .expect(200);
    expect(detail.body.stats).toMatchObject({
      sent: 2,
      opened: 1,
      completed: 1,
      conversion: 0.5,
    });
    expect(detail.body.requests).toHaveLength(2);
  });
});
