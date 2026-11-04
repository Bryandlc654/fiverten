import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const AUTH = '/api/auth';
const MEDIA = '/api/media';
const PASSWORD = 'Secret1234';

describe('FIVERTEN logo de empresa (e2e)', () => {
  type HttpAgent = ReturnType<typeof request>;
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => HttpAgent;
  let token: string;

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
      .send({ email: 'logo@fiverten.test', password: PASSWORD, companyName: 'Logo SL' })
      .expect(201);
    token = registered.body.accessToken as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('sube el logo y devuelve la URL pública', async () => {
    const response = await http()
      .post(`${MEDIA}/organization-logo`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('fake-png'), {
        filename: 'logo.png',
        contentType: 'image/png',
      })
      .expect(201);
    expect(response.body.url).toMatch(/^\/api\/media\/files\/[0-9a-f-]+$/);

    const file = await http().get(response.body.url).expect(200);
    expect(file.headers['content-type']).toContain('image/png');
    expect(file.body).toEqual(Buffer.from('fake-png'));
  });

  it('rechaza archivos que no son imágenes', async () => {
    await http()
      .post(`${MEDIA}/organization-logo`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('texto'), {
        filename: 'logo.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });

  it('exige sesión', async () => {
    await http()
      .post(`${MEDIA}/organization-logo`)
      .attach('file', Buffer.from('fake-png'), {
        filename: 'logo.png',
        contentType: 'image/png',
      })
      .expect(401);
  });
});
