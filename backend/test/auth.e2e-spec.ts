import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const API = '/api/auth';
const USER_EMAIL = 'ana@empresa.test';
const USER_PASSWORD = 'Secret1234';

function extractRefreshCookie(response: request.Response): string {
  const header = response.headers['set-cookie'] as unknown;
  const cookies = Array.isArray(header) ? (header as string[]) : header ? [String(header)] : [];
  const cookie = cookies.find((value) => value.startsWith('fiverten_refresh='));
  return cookie ? cookie.split(';')[0] : '';
}

describe('FIVERTEN Auth (e2e)', () => {
  type HttpAgent = ReturnType<typeof request>;
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => HttpAgent;
  let lastEmailToken: string | undefined;
  let lastResetToken: string | undefined;

  const register = (body: Record<string, unknown>) => http().post(`${API}/register`).send(body);
  const loginUser = (email: string, password: string) =>
    http().post(`${API}/login`).send({ email, password });
  const authToken = async (email = USER_EMAIL, password = USER_PASSWORD): Promise<string> => {
    const response = await loginUser(email, password);
    return response.body.accessToken as string;
  };
  const bearer = async (email = USER_EMAIL, password = USER_PASSWORD) =>
    `Bearer ${await authToken(email, password)}`;

  beforeAll(async () => {
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
    jest
      .spyOn(mail, 'sendPasswordReset')
      .mockImplementation(async (_to: string, token: string) => {
        lastResetToken = token;
      });

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "organizations","users","roles","permissions","role_permissions","organization_memberships","sessions","refresh_tokens","email_verifications","password_reset_tokens","auth_attempts" RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Registro', () => {
    it('crea usuario + organización + rol admin y cookie httpOnly', async () => {
      const response = await register({
        email: USER_EMAIL,
        password: USER_PASSWORD,
        companyName: 'Empresa Test S.L.',
        firstName: 'Ana',
        lastName: 'García',
      }).expect(201);

      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.user.email).toBe(USER_EMAIL);
      expect(response.body.organization.tradeName).toBe('Empresa Test S.L.');
      expect(response.body.organization.publicId).toMatch(/^FT-[A-Z0-9]{5}-[A-Z0-9]{3}$/);
      expect(response.body.role).toBe('admin');

      const setCookie = (response.headers['set-cookie'] as unknown as string[]).join(';');
      expect(setCookie).toContain('fiverten_refresh=');
      expect(setCookie).toContain('HttpOnly');
      expect(lastEmailToken).toBeDefined();

      const user = await prisma.user.findUnique({ where: { email: USER_EMAIL } });
      expect(user).not.toBeNull();
      const membership = await prisma.organizationMembership.findFirst({
        where: { userId: user!.id },
      });
      expect(membership?.isOwner).toBe(true);
    });

    it('rechaza email duplicado con 409', async () => {
      await register({ email: USER_EMAIL, password: USER_PASSWORD, companyName: 'Otra S.L.' }).expect(
        409,
      );
    });

    it('rechaza payload inválido con 400', async () => {
      await register({ email: 'nuevo@empresa.test', password: '123', companyName: 'X' }).expect(400);
    });

    it('rechaza campos desconocidos con 400', async () => {
      await register({
        email: 'hacker@empresa.test',
        password: USER_PASSWORD,
        companyName: 'X S.L.',
        role: 'superadmin',
      }).expect(400);
    });
  });

  describe('Inicio de sesión', () => {
    it('inicia sesión con credenciales válidas', async () => {
      const response = await loginUser(USER_EMAIL, USER_PASSWORD).expect(200);
      expect(response.body.accessToken).toEqual(expect.any(String));
      expect(response.body.role).toBe('admin');
    });

    it('rechaza contraseña incorrecta con 401', async () => {
      await loginUser(USER_EMAIL, 'incorrecta123').expect(401);
    });

    it('rechaza email inexistente con 401', async () => {
      await loginUser('nadie@empresa.test', USER_PASSWORD).expect(401);
    });

    it('bloquea la cuenta tras superar el máximo de intentos fallidos', async () => {
      const email = 'lock@empresa.test';
      await register({ email, password: USER_PASSWORD, companyName: 'Lock S.L.' }).expect(201);

      for (let i = 0; i < 5; i += 1) {
        await loginUser(email, 'mal-mal-mal').expect(401);
      }
      const locked = await loginUser(email, USER_PASSWORD).expect(401);
      expect(locked.body.message).toMatch(/bloqueada/);

      const user = await prisma.user.findUnique({ where: { email } });
      expect(user?.lockedUntil).not.toBeNull();
    });

    it('con la cuenta bloqueada y contraseña incorrecta responde igual que si no existiera', async () => {
      const locked = await loginUser('lock@empresa.test', 'mal-mal-mal').expect(401);
      const missing = await loginUser('nadie@empresa.test', 'mal-mal-mal').expect(401);
      expect(locked.body.message).toBe(missing.body.message);
    });

    it('un correo inexistente también calcula el hash (tiempo similar)', async () => {
      const time = async (email: string) => {
        const start = process.hrtime.bigint();
        await loginUser(email, 'incorrecta123').expect(401);
        return Number(process.hrtime.bigint() - start) / 1e6;
      };
      // Calentamiento (el hash ficticio se genera en la primera llamada).
      await time('nadie@empresa.test');
      const existing = await time(USER_EMAIL);
      const missing = await time('nadie@empresa.test');
      // Sin el hash ficticio el caso inexistente tardaba ~0 ms frente a decenas.
      expect(missing).toBeGreaterThan(existing * 0.4);
    });
  });

  describe('Perfil (auth guard)', () => {
    it('devuelve el perfil con token válido', async () => {
      const response = await http()
        .get(`${API}/me`)
        .set('Authorization', await bearer())
        .expect(200);
      expect(response.body.user.email).toBe(USER_EMAIL);
      expect(response.body.organization.publicId).toMatch(/^FT-/);
    });

    it('rechaza sin token con 401', async () => {
      await http().get(`${API}/me`).expect(401);
    });

    it('rechaza token inválido con 401', async () => {
      await http().get(`${API}/me`).set('Authorization', 'Bearer no-es-un-jwt').expect(401);
    });
  });

  describe('Verificación de correo', () => {
    it('reenvía y verifica el correo con el token emitido', async () => {
      await http()
        .post(`${API}/verify-email/request`)
        .set('Authorization', await bearer())
        .expect(200);
      expect(lastEmailToken).toBeDefined();

      await http().post(`${API}/verify-email`).send({ token: lastEmailToken }).expect(200);

      const response = await http()
        .get(`${API}/me`)
        .set('Authorization', await bearer())
        .expect(200);
      expect(response.body.user.isVerified).toBe(true);
    });

    it('rechaza token de verificación inválido con 400', async () => {
      await http()
        .post(`${API}/verify-email`)
        .send({ token: 'token-invalido-000000000000000000000000' })
        .expect(400);
    });
  });

  describe('Refresco con rotación y detección de reutilización', () => {
    it('rota el token y revoca la familia si se reutiliza', async () => {
      const login = await loginUser(USER_EMAIL, USER_PASSWORD).expect(200);
      const cookie1 = extractRefreshCookie(login);
      expect(cookie1).toContain('fiverten_refresh=');

      const refresh1 = await http().post(`${API}/refresh`).set('Cookie', cookie1).expect(200);
      const cookie2 = extractRefreshCookie(refresh1);
      expect(cookie2).toContain('fiverten_refresh=');
      expect(cookie2).not.toBe(cookie1);

      // Reutilizar el token antiguo => sesión comprometida.
      await http().post(`${API}/refresh`).set('Cookie', cookie1).expect(401);
      // El token nuevo de la familia también queda revocado.
      await http().post(`${API}/refresh`).set('Cookie', cookie2).expect(401);
    });

    it('dos refresh simultáneos con el mismo token no rotan dos veces', async () => {
      const login = await loginUser(USER_EMAIL, USER_PASSWORD).expect(200);
      const cookie = extractRefreshCookie(login);

      const responses = await Promise.all(
        Array.from({ length: 5 }, () => http().post(`${API}/refresh`).set('Cookie', cookie)),
      );
      const ok = responses.filter((response) => response.status === 200);
      expect(ok.length).toBeLessThanOrEqual(1);

      const session = await prisma.session.findFirst({
        where: { user: { email: USER_EMAIL } },
        orderBy: { createdAt: 'desc' },
      });
      const alive = await prisma.refreshToken.count({
        where: { sessionId: session!.id, isUsed: false, revokedAt: null },
      });
      // Ningún token de la familia queda vivo: la carrera se trata como reutilización.
      expect(alive).toBe(0);
    });

    it('fija y borra la cookie indicadora de sesión para el middleware', async () => {
      const login = await loginUser(USER_EMAIL, USER_PASSWORD).expect(200);
      const hint = (login.headers['set-cookie'] as unknown as string[]).find((cookie) =>
        cookie.startsWith('fiverten_session='),
      );
      expect(hint).toMatch(/^fiverten_session=1;.*Path=\/;/);

      const failed = await http()
        .post(`${API}/refresh`)
        .set('Cookie', 'fiverten_refresh=invalido')
        .expect(401);
      const cleared = (failed.headers['set-cookie'] as unknown as string[]).find((cookie) =>
        cookie.startsWith('fiverten_session='),
      );
      expect(cleared).toMatch(/^fiverten_session=;/);
    });
  });

  describe('Recuperación de contraseña', () => {
    const RESET_EMAIL = 'reset@empresa.test';
    const NEW_PASSWORD = 'NuevaClave123';

    it('flujo completo: forgot -> reset -> login con nueva contraseña', async () => {
      await register({ email: RESET_EMAIL, password: USER_PASSWORD, companyName: 'Reset S.L.' }).expect(
        201,
      );

      await http().post(`${API}/password/forgot`).send({ email: RESET_EMAIL }).expect(200);
      expect(lastResetToken).toBeDefined();

      await http()
        .post(`${API}/password/reset`)
        .send({ token: lastResetToken, newPassword: NEW_PASSWORD })
        .expect(200);

      await loginUser(RESET_EMAIL, USER_PASSWORD).expect(401);
      await loginUser(RESET_EMAIL, NEW_PASSWORD).expect(200);
    });

    it('no revela si el correo existe (respuesta uniforme)', async () => {
      await http().post(`${API}/password/forgot`).send({ email: 'no-existe@empresa.test' }).expect(200);
    });

    it('rechaza token de reset inválido con 400', async () => {
      await http()
        .post(`${API}/password/reset`)
        .send({ token: 'token-invalido-000000000000000000000000', newPassword: NEW_PASSWORD })
        .expect(400);
    });
  });

  describe('Gestión de sesiones', () => {
    it('lista, revoca una sesión y cierra todas', async () => {
      const token = await authToken();

      await loginUser(USER_EMAIL, USER_PASSWORD).expect(200);
      await loginUser(USER_EMAIL, USER_PASSWORD).expect(200);

      const list = await http()
        .get(`${API}/sessions`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const sessions = list.body.sessions as Array<{ id: string; current: boolean }>;
      expect(sessions.length).toBeGreaterThanOrEqual(2);
      expect(sessions.filter((s) => s.current).length).toBe(1);

      const other = sessions.find((s) => !s.current);
      expect(other).toBeDefined();
      await http()
        .delete(`${API}/sessions/${other!.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const after = await http()
        .get(`${API}/sessions`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(after.body.sessions.length).toBe(sessions.length - 1);

      await http()
        .post(`${API}/logout-all`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // El access token queda invalidado de inmediato al revocar la sesión.
      await http()
        .get(`${API}/sessions`)
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      const fresh = await authToken();
      const empty = await http()
        .get(`${API}/sessions`)
        .set('Authorization', `Bearer ${fresh}`)
        .expect(200);
      expect(empty.body.sessions.length).toBe(1);
    });
  });

  describe('Logout', () => {
    it('revoca el refresh token al cerrar sesión', async () => {
      const login = await loginUser(USER_EMAIL, USER_PASSWORD).expect(200);
      const cookie = extractRefreshCookie(login);

      await http().post(`${API}/logout`).set('Cookie', cookie).expect(200);
      await http().post(`${API}/refresh`).set('Cookie', cookie).expect(401);
    });
  });
});
