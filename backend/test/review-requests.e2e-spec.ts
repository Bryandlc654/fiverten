import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const AUTH = '/api/auth';
const PUBLIC = '/api/public';
const REQUESTS = '/api/organizations/me/review-requests';
const PASSWORD = 'Secret1234';

describe('FIVERTEN solicitudes personalizadas de reseña (e2e)', () => {
  type HttpAgent = ReturnType<typeof request>;
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => HttpAgent;
  let ownerToken: string;
  let slug: string;
  let requestToken: string;
  let confirmToken: string;

  const lookup = (token: string) =>
    http().get(`${PUBLIC}/organizations/${slug}/review-request`).query({ token });

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
      .mockImplementation(async (_to, _name, _org, url) => {
        requestToken = new URL(url).searchParams.get('rt') ?? '';
      });
    jest.spyOn(mail, 'sendReviewConfirmation').mockImplementation(async (_to, token) => {
      confirmToken = token;
    });

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "organizations","users","roles","permissions","role_permissions","organization_memberships","organization_invitations","reviews","review_requests","review_responses","sessions","refresh_tokens","email_verifications","password_reset_tokens","auth_attempts","notifications","review_cases","review_case_messages","review_case_files","review_resolutions","resolution_messages","review_reports","moderation_actions" RESTART IDENTITY CASCADE',
    );

    const registered = await http()
      .post(`${AUTH}/register`)
      .send({ email: 'owner@requests.test', password: PASSWORD, companyName: 'Solicitudes SL' })
      .expect(201);
    slug = registered.body.organization.slug as string;

    const login = await http()
      .post(`${AUTH}/login`)
      .send({ email: 'owner@requests.test', password: PASSWORD })
      .expect(200);
    ownerToken = login.body.accessToken as string;

    await http()
      .patch('/api/organizations/me')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isPublic: true })
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  it('crea un enlace único y lo envía por correo', async () => {
    const created = await http()
      .post(REQUESTS)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Lucía Pérez', email: 'lucia@cliente.test' })
      .expect(201);

    expect(created.body).toMatchObject({
      reviewerName: 'Lucía Pérez',
      reviewerEmail: 'lucia@cliente.test',
      status: 'sent',
    });
    expect(created.body.url).toContain(`/review/${slug}?rt=`);
    expect(requestToken).toBeTruthy();

    const list = await http()
      .get(REQUESTS)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(list.body.stats).toMatchObject({ sent: 1, opened: 0, completed: 0, conversion: 0 });
  });

  it('valida el token público y marca la apertura', async () => {
    const opened = await lookup(requestToken).expect(200);
    expect(opened.body).toMatchObject({
      reviewerName: 'Lucía Pérez',
      reviewerEmail: 'lucia@cliente.test',
      completed: false,
      organization: { slug },
    });

    const list = await http()
      .get(REQUESTS)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(list.body.stats).toMatchObject({ sent: 1, opened: 1, completed: 0 });
  });

  it('rechaza un token inexistente', async () => {
    await lookup('token-que-no-existe-123456').expect(404);
  });

  it('vincula la reseña y la marca como completada al confirmar', async () => {
    await http()
      .post(`${PUBLIC}/organizations/${slug}/reviews`)
      .send({
        name: 'Lucía Pérez',
        email: 'lucia@cliente.test',
        rating: 5,
        body: 'Todo perfecto, repetiré sin duda.',
        consent: true,
        requestToken,
      })
      .expect(201);

    await http().post(`${PUBLIC}/reviews/confirm`).send({ token: confirmToken }).expect(200);

    const list = await http()
      .get(REQUESTS)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(list.body.stats).toMatchObject({ sent: 1, opened: 1, completed: 1, conversion: 1 });
    expect(list.body.items[0].reviewId).toBeTruthy();

    const again = await lookup(requestToken).expect(200);
    expect(again.body.completed).toBe(true);
  });

  it('un miembro sin rango de gerente no puede ver las solicitudes', async () => {
    await http()
      .get(REQUESTS)
      .set('Authorization', 'Bearer token-invalido')
      .expect(401);
  });
});
