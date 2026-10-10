import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const API = '/api/auth';
const EMAIL = 'verif-required@empresa.test';
const PASSWORD = 'ClaveSegura123';

describe('Verificacion de correo obligatoria (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => ReturnType<typeof request>;
  let lastEmailToken: string | undefined;

  beforeAll(async () => {
    // El flag debe estar definido ANTES de importar AppModule (ConfigModule.forRoot
    // se evalua en el momento del import), por eso se usa import() dinamico.
    process.env.REQUIRE_EMAIL_VERIFICATION = 'true';
    const { AppModule } = await import('../src/app.module');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0);

    prisma = app.get(PrismaService);
    http = () => request(app.getHttpServer());

    const mail = app.get(MailService);
    jest
      .spyOn(mail, 'sendEmailVerification')
      .mockImplementation(async (_to: string, token: string) => {
        lastEmailToken = token;
      });

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "organizations","users","roles","permissions","role_permissions","organization_memberships","sessions","refresh_tokens","email_verifications","password_reset_tokens","auth_attempts" RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "organizations","users","roles","permissions","role_permissions","organization_memberships","sessions","refresh_tokens","email_verifications","password_reset_tokens","auth_attempts" RESTART IDENTITY CASCADE',
    );
    await app.close();
    process.env.REQUIRE_EMAIL_VERIFICATION = 'false';
  });

  it('el registro no emite sesion y pide verificar el correo', async () => {
    const response = await http()
      .post(`${API}/register`)
      .send({ email: EMAIL, password: PASSWORD, companyName: 'Verif S.L.' })
      .expect(201);

    expect(response.body.requiresEmailVerification).toBe(true);
    expect(response.body.accessToken).toBeNull();
    expect(lastEmailToken).toBeDefined();
  });

  it('rechaza el login mientras el correo no este verificado', async () => {
    await http().post(`${API}/login`).send({ email: EMAIL, password: PASSWORD }).expect(401);
  });

  it('permite iniciar sesion tras verificar el correo', async () => {
    await http().post(`${API}/verify-email`).send({ token: lastEmailToken }).expect(200);

    const login = await http()
      .post(`${API}/login`)
      .send({ email: EMAIL, password: PASSWORD })
      .expect(200);
    expect(login.body.accessToken).toEqual(expect.any(String));
  });
});
