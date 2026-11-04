import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { totpCode } from '../src/common/totp';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const AUTH = '/api/auth';
const PASSWORD = 'Secret1234';

describe('FIVERTEN verificación en dos pasos (e2e)', () => {
  type HttpAgent = ReturnType<typeof request>;
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => HttpAgent;
  let accessToken: string;
  let secret: string;

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
      'TRUNCATE TABLE "organizations","users","roles","permissions","role_permissions","organization_memberships","organization_invitations","reviews","review_requests","review_responses","sessions","refresh_tokens","email_verifications","password_reset_tokens","auth_attempts","notifications" RESTART IDENTITY CASCADE',
    );

    await http()
      .post(`${AUTH}/register`)
      .send({ email: 'mfa@fiverten.test', password: PASSWORD, companyName: 'MFA Corp' })
      .expect(201);

    const login = await http()
      .post(`${AUTH}/login`)
      .send({ email: 'mfa@fiverten.test', password: PASSWORD })
      .expect(200);
    accessToken = login.body.accessToken as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('genera el secreto y activa el 2FA con un código válido', async () => {
    const setup = await http()
      .post(`${AUTH}/mfa/setup`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(setup.body.otpauthUrl).toContain('otpauth://totp/');
    secret = setup.body.secret as string;

    await http()
      .post(`${AUTH}/mfa/enable`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: '000000' })
      .expect(400);

    const enabled = await http()
      .post(`${AUTH}/mfa/enable`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ code: totpCode(secret) })
      .expect(200);
    expect(enabled.body).toEqual({ enabled: true });
  });

  it('el login pide el segundo factor y no abre sesión todavía', async () => {
    const login = await http()
      .post(`${AUTH}/login`)
      .send({ email: 'mfa@fiverten.test', password: PASSWORD })
      .expect(200);

    expect(login.body.mfaRequired).toBe(true);
    expect(login.body.accessToken).toBeNull();
    expect(login.body.mfaToken).toBeTruthy();
    expect(login.headers['set-cookie'] ?? []).toHaveLength(0);

    await http()
      .post(`${AUTH}/mfa/verify`)
      .send({ mfaToken: login.body.mfaToken, code: '000000' })
      .expect(401);
  });

  it('verifica el código y devuelve una sesión utilizable', async () => {
    const login = await http()
      .post(`${AUTH}/login`)
      .send({ email: 'mfa@fiverten.test', password: PASSWORD })
      .expect(200);

    const verified = await http()
      .post(`${AUTH}/mfa/verify`)
      .send({ mfaToken: login.body.mfaToken, code: totpCode(secret) })
      .expect(200);
    expect(verified.body.accessToken).toBeTruthy();
    expect(verified.body.mfaRequired).toBeUndefined();

    const me = await http()
      .get(`${AUTH}/me`)
      .set('Authorization', `Bearer ${verified.body.accessToken}`)
      .expect(200);
    expect(me.body.user.mfaEnabled).toBe(true);
  });

  it('desactiva el 2FA con contraseña y código', async () => {
    await http()
      .post(`${AUTH}/mfa/disable`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: 'Incorrecta1', code: totpCode(secret) })
      .expect(400);

    const disabled = await http()
      .post(`${AUTH}/mfa/disable`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: PASSWORD, code: totpCode(secret) })
      .expect(200);
    expect(disabled.body).toEqual({ enabled: false });

    const login = await http()
      .post(`${AUTH}/login`)
      .send({ email: 'mfa@fiverten.test', password: PASSWORD })
      .expect(200);
    expect(login.body.mfaRequired).toBeUndefined();
    expect(login.body.accessToken).toBeTruthy();
  });
});
