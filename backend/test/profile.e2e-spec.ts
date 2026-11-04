import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const AUTH = '/api/auth';
const PASSWORD = 'Secret1234';

describe('FIVERTEN perfil de usuario (e2e)', () => {
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
      .send({
        email: 'perfil@fiverten.test',
        password: PASSWORD,
        companyName: 'Perfil SL',
        firstName: 'Nombre',
        lastName: 'Inicial',
        username: 'perfil-inicial',
      })
      .expect(201);
    token = registered.body.accessToken as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('devuelve los datos del perfil', async () => {
    const response = await http()
      .get(`${AUTH}/me`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(response.body.user).toMatchObject({
      email: 'perfil@fiverten.test',
      firstName: 'Nombre',
      lastName: 'Inicial',
      username: 'perfil-inicial',
    });
  });

  it('permite editar nombre, apellidos, usuario, teléfono y avatar', async () => {
    const response = await http()
      .patch(`${AUTH}/me`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        firstName: 'Nombre Nuevo',
        lastName: 'Apellido Nuevo',
        username: 'perfil-nuevo',
        phone: '+34 600 000 000',
        avatarUrl: 'https://example.com/avatar.png',
      })
      .expect(200);

    expect(response.body.user).toMatchObject({
      firstName: 'Nombre Nuevo',
      lastName: 'Apellido Nuevo',
      username: 'perfil-nuevo',
      phone: '+34 600 000 000',
      avatarUrl: 'https://example.com/avatar.png',
    });
  });

  it('rechaza un nombre de usuario ya usado', async () => {
    await http()
      .post(`${AUTH}/register`)
      .send({
        email: 'otro-perfil@fiverten.test',
        password: PASSWORD,
        companyName: 'Otro Perfil SL',
        username: 'usuario-ocupado',
      })
      .expect(201);

    const response = await http()
      .patch(`${AUTH}/me`)
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'usuario-ocupado' })
      .expect(409);
    expect(response.body.message).toContain('nombre de usuario');
  });

  it('valida el formato del usuario y exige sesión', async () => {
    await http()
      .patch(`${AUTH}/me`)
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'a b' })
      .expect(400);

    await http().patch(`${AUTH}/me`).send({ firstName: 'Sin sesión' }).expect(401);
  });

  it('permite quitar la foto de perfil', async () => {
    const response = await http()
      .patch(`${AUTH}/me`)
      .set('Authorization', `Bearer ${token}`)
      .send({ avatarUrl: null })
      .expect(200);
    expect(response.body.user.avatarUrl).toBeNull();
  });
});
