import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { hashPassword } from '../src/common/passwords';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const PUBLIC = '/api/public';
const STATS = '/api/organizations/me/stats';
const NOTIFICATIONS = '/api/notifications';
const PASSWORD = 'Secret1234';

interface Notification {
  id: string;
  type: string;
  title: string;
  read: boolean;
}

describe('FIVERTEN Estadísticas, notificaciones y seguridad (e2e)', () => {
  type HttpAgent = ReturnType<typeof request>;
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => HttpAgent;
  let ownerToken: string;
  let otherToken: string;
  let adminToken: string;
  let slug: string;
  let ipCounter = 0;
  const confirmTokens = new Map<string, string>();
  const clientTokens = new Map<string, string>();
  let reviewNotice: jest.SpyInstance;

  const login = async (email: string, password = PASSWORD) =>
    (await http().post('/api/auth/login').send({ email, password }).expect(200)).body
      .accessToken as string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  /** Espera a que termine un aviso no bloqueante. */
  const eventually = async (check: () => boolean | Promise<boolean>) => {
    for (let i = 0; i < 60 && !(await check()); i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    expect(await check()).toBe(true);
  };

  const submit = async (
    email: string,
    rating: number,
    body = 'Experiencia descrita con detalle.',
  ) => {
    ipCounter += 1;
    await http()
      .post(`${PUBLIC}/organizations/${slug}/reviews`)
      .set('X-Forwarded-For', `10.88.0.${ipCounter}`)
      .send({
        name: 'Lucía Martín',
        email,
        rating,
        title: `Opinión ${rating}`,
        body,
        consent: true,
      })
      .expect(201);
  };

  const confirm = async (email: string) =>
    (
      await http()
        .post(`${PUBLIC}/reviews/confirm`)
        .send({ token: confirmTokens.get(email) })
        .expect(200)
    ).body as { status: string };

  const reviewOf = (email: string) =>
    prisma.review.findFirstOrThrow({ where: { reviewerEmail: email } });

  const notificationsFor = (email: string) =>
    prisma.notification.findMany({ where: { user: { email } }, orderBy: { createdAt: 'asc' } });

  const stats = async () =>
    (await http().get(STATS).set(auth(ownerToken)).expect(200)).body as {
      rating: { average: number | null; total: number; distribution: Record<string, number> };
      periods: { last30: number; previous30: number; last90: number; last365: number };
      monthly: { month: string; count: number; average: number | null }[];
      responses: {
        published: number;
        answered: number;
        rate: number | null;
        averageHours: number | null;
      };
      requests: {
        pendingConfirmation: number;
        underReview: number;
        resolutions: {
          open: number;
          resolved: number;
          total: number;
          resolutionRate: number | null;
        };
        cases: { open: number; published: number; total: number };
      };
    };

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
      .spyOn(mail, 'sendReviewConfirmation')
      .mockImplementation(async (to: string, token: string) => {
        confirmTokens.set(to, token);
      });
    jest
      .spyOn(mail, 'sendCaseClientNotice')
      .mockImplementation(async (to: string, _title: string, _intro: string, token: string) => {
        clientTokens.set(to, token);
      });
    jest.spyOn(mail, 'sendCaseAdminAlert').mockResolvedValue(undefined);
    jest.spyOn(mail, 'sendCaseCompanyNotice').mockResolvedValue(undefined);
    jest.spyOn(mail, 'sendResolutionLink').mockResolvedValue(undefined);
    reviewNotice = jest.spyOn(mail, 'sendReviewNotice').mockResolvedValue(undefined);

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "organizations","users","roles","organization_memberships","reviews","review_responses","review_cases","review_resolutions","moderation_actions","notifications","sessions","refresh_tokens","email_verifications","auth_attempts" RESTART IDENTITY CASCADE',
    );

    const registered = await http()
      .post('/api/auth/register')
      .send({ email: 'owner@stats.test', password: PASSWORD, companyName: 'Óptica Stats' })
      .expect(201);
    slug = registered.body.organization.slug as string;
    ownerToken = await login('owner@stats.test');
    await http()
      .patch('/api/organizations/me')
      .set(auth(ownerToken))
      .send({ isPublic: true })
      .expect(200);

    await http()
      .post('/api/auth/register')
      .send({ email: 'owner@otra-stats.test', password: PASSWORD, companyName: 'Otra Stats' })
      .expect(201);
    otherToken = await login('owner@otra-stats.test');

    await prisma.user.create({
      data: {
        email: 'root@stats.test',
        username: 'root-stats',
        passwordHash: await hashPassword(PASSWORD),
        isSuperAdmin: true,
      },
    });
    adminToken = await login('root@stats.test');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('estadísticas de reputación', () => {
    it('sin reseñas devuelve ceros y la serie mensual vacía', async () => {
      const body = await stats();
      expect(body.rating).toEqual({
        average: null,
        total: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });
      expect(body.monthly).toHaveLength(12);
      expect(body.monthly.every((m) => m.count === 0 && m.average === null)).toBe(true);
      expect(body.responses).toEqual({ published: 0, answered: 0, rate: null, averageHours: null });
    });

    it('valida el número de meses y exige empresa', async () => {
      await http().get(`${STATS}?months=0`).set(auth(ownerToken)).expect(400);
      await http().get(`${STATS}?months=6`).set(auth(ownerToken)).expect(200);
      await http().get(STATS).set(auth(adminToken)).expect(403);
      await http().get(STATS).expect(401);
    });

    it('cuenta las reseñas publicadas, la distribución y el mes actual', async () => {
      await submit('cinco@cliente.test', 5);
      await confirm('cinco@cliente.test');
      await submit('cuatro@cliente.test', 4);
      await confirm('cuatro@cliente.test');
      // Sin confirmar: es una solicitud pendiente, no cuenta en la media.
      await submit('pendiente@cliente.test', 3);

      const body = await stats();
      expect(body.rating).toMatchObject({ average: 4.5, total: 2 });
      expect(body.rating.distribution).toMatchObject({ 4: 1, 5: 1 });
      expect(body.periods).toMatchObject({ last30: 2, previous30: 0, last90: 2, last365: 2 });
      expect(body.monthly[11]).toMatchObject({ count: 2, average: 4.5 });
      expect(body.requests.pendingConfirmation).toBe(1);
    });

    it('la tasa de respuesta y el tiempo medio salen de las respuestas de la empresa', async () => {
      const review = await reviewOf('cinco@cliente.test');
      await http()
        .put(`/api/organizations/me/reviews/${review.id}/response`)
        .set(auth(ownerToken))
        .send({ body: 'Gracias por tu confianza.' })
        .expect(200);

      const body = await stats();
      expect(body.responses).toMatchObject({ published: 2, answered: 1, rate: 0.5 });
      expect(body.responses.averageHours).toBeGreaterThanOrEqual(0);
    });

    it('otra empresa no ve las estadísticas ajenas', async () => {
      const other = await http().get(STATS).set(auth(otherToken)).expect(200);
      expect(other.body.rating.total).toBe(0);
    });
  });

  describe('avisos de reseñas', () => {
    it('al publicarse una reseña avisa en la app y por correo a los responsables', async () => {
      await eventually(async () => (await notificationsFor('owner@stats.test')).length === 2);
      const [first] = await notificationsFor('owner@stats.test');
      expect(first).toMatchObject({ type: 'new_review', title: 'Nueva reseña de 5 estrellas' });
      expect(reviewNotice).toHaveBeenCalledWith(
        'owner@stats.test',
        'Nueva reseña de 5 estrellas',
        expect.stringContaining('Lucía Martín'),
        false,
      );
      // La otra empresa no recibe nada.
      expect(await notificationsFor('owner@otra-stats.test')).toHaveLength(0);
    });

    it('una reseña de baja valoración no avisa hasta que su caso la publica', async () => {
      await submit('dos@cliente.test', 2);
      expect(await confirm('dos@cliente.test')).toMatchObject({ status: 'under_review' });
      const before = await stats();
      expect(before.rating.total).toBe(2);
      expect(before.requests.underReview).toBe(1);

      const { id } = await prisma.reviewCase.findFirstOrThrow({
        where: { review: { reviewerEmail: 'dos@cliente.test' } },
      });
      const asAdmin = (path: string, body: Record<string, unknown> = {}) =>
        http().post(`/api/admin/cases/${id}/${path}`).set(auth(adminToken)).send(body);
      await asAdmin('request-evidence', { message: 'Envíanos pruebas, por favor.' }).expect(200);
      await http()
        .post(`${PUBLIC}/cases/messages`)
        .send({ token: clientTokens.get('dos@cliente.test'), body: 'Adjunto el ticket.' })
        .expect(200);
      await asAdmin('validate', { message: 'Evidencias válidas.' }).expect(200);
      expect(
        (await notificationsFor('owner@stats.test')).some((n) => n.type === 'negative_review'),
      ).toBe(false);

      await asAdmin('publish', { reason: 'Sin acuerdo' }).expect(200);
      await eventually(async () =>
        (await notificationsFor('owner@stats.test')).some((n) => n.type === 'negative_review'),
      );
      expect(reviewNotice).toHaveBeenCalledWith(
        'owner@stats.test',
        'Reseña negativa de 2 estrellas',
        expect.any(String),
        true,
      );

      const after = await stats();
      expect(after.rating).toMatchObject({ total: 3, average: 3.7 });
      expect(after.requests.cases).toMatchObject({ open: 0, published: 1, total: 1 });
    });

    it('la empresa puede desactivar cada tipo de aviso', async () => {
      const updated = await http()
        .patch('/api/organizations/me')
        .set(auth(ownerToken))
        .send({ notifyNewReviews: false })
        .expect(200);
      expect(updated.body).toMatchObject({ notifyNewReviews: false, notifyNegativeReviews: true });

      reviewNotice.mockClear();
      await submit('tres@cliente.test', 3);
      await confirm('tres@cliente.test');
      // El aviso es asíncrono: se espera a que la reseña cuente y se da margen.
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect((await notificationsFor('owner@stats.test')).length).toBe(3);
      expect(reviewNotice).not.toHaveBeenCalled();
    });

    it('moderación avisa solo en la primera publicación, no al restaurar', async () => {
      await http()
        .patch('/api/organizations/me')
        .set(auth(ownerToken))
        .send({ notifyNewReviews: true })
        .expect(200);
      // Un enlace en el texto la manda a revisión (antifraude).
      await submit('enlace@cliente.test', 5, 'Mirad mi web www.ejemplo.test para más fotos.');
      expect(await confirm('enlace@cliente.test')).toMatchObject({ status: 'under_review' });
      const review = await reviewOf('enlace@cliente.test');
      const moderate = (action: string, reason?: string) =>
        http()
          .post(`/api/admin/reviews/${review.id}/${action}`)
          .set(auth(adminToken))
          .send(reason ? { reason } : {})
          .expect(200);

      await moderate('publish');
      await eventually(async () => (await notificationsFor('owner@stats.test')).length === 4);
      await moderate('hide', 'Contenido promocional');
      await moderate('restore');
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect((await notificationsFor('owner@stats.test')).length).toBe(4);
    });

    it('las incidencias cuentan en las estadísticas de solicitudes', async () => {
      const review = await reviewOf('dos@cliente.test');
      await http()
        .post(`/api/organizations/me/reviews/${review.id}/resolution`)
        .set(auth(ownerToken))
        .send({ message: 'Sentimos lo ocurrido, ¿podemos ayudarte?' })
        .expect(201);
      const body = await stats();
      expect(body.requests.resolutions).toMatchObject({ open: 1, total: 1, resolutionRate: null });
    });
  });

  describe('centro de notificaciones', () => {
    it('lista las notificaciones del usuario con el contador de no leídas', async () => {
      const list = await http().get(NOTIFICATIONS).set(auth(ownerToken)).expect(200);
      expect(list.body).toMatchObject({ total: 4, unread: 4, page: 1 });
      // Las más recientes primero.
      expect(list.body.items[0].title).toBe('Nueva reseña de 5 estrellas');

      const count = await http().get(`${NOTIFICATIONS}/unread-count`).set(auth(ownerToken));
      expect(count.body).toEqual({ unread: 4 });

      const paged = await http().get(`${NOTIFICATIONS}?pageSize=2&page=2`).set(auth(ownerToken));
      expect(paged.body.items).toHaveLength(2);
    });

    it('marca una como leída y filtra las no leídas', async () => {
      const list = await http().get(NOTIFICATIONS).set(auth(ownerToken)).expect(200);
      const target = (list.body.items as Notification[])[0];
      await http().post(`${NOTIFICATIONS}/${target.id}/read`).set(auth(ownerToken)).expect(200);

      const unread = await http().get(`${NOTIFICATIONS}?unread=true`).set(auth(ownerToken));
      expect(unread.body).toMatchObject({ total: 3, unread: 3 });
      expect((unread.body.items as Notification[]).some((n) => n.id === target.id)).toBe(false);
    });

    it('nadie de otra empresa puede leer ni marcar las notificaciones ajenas', async () => {
      const [mine] = await notificationsFor('owner@stats.test');
      await http().post(`${NOTIFICATIONS}/${mine.id}/read`).set(auth(otherToken)).expect(404);
      const other = await http().get(NOTIFICATIONS).set(auth(otherToken)).expect(200);
      expect(other.body.total).toBe(0);
      await http().get(NOTIFICATIONS).set(auth(adminToken)).expect(403);
    });

    it('marca todas como leídas', async () => {
      const result = await http().post(`${NOTIFICATIONS}/read-all`).set(auth(ownerToken));
      expect(result.status).toBe(200);
      expect(result.body).toEqual({ updated: 3 });
      const count = await http().get(`${NOTIFICATIONS}/unread-count`).set(auth(ownerToken));
      expect(count.body).toEqual({ unread: 0 });
    });
  });

  describe('seguridad de la cuenta', () => {
    const CHANGE = '/api/auth/password/change';
    const NEW_PASSWORD = 'Nueva98765';

    it('exige la contraseña actual correcta y una nueva distinta', async () => {
      await http()
        .post(CHANGE)
        .set(auth(otherToken))
        .send({ currentPassword: 'Incorrecta1', newPassword: NEW_PASSWORD })
        .expect(400);
      await http()
        .post(CHANGE)
        .set(auth(otherToken))
        .send({ currentPassword: PASSWORD, newPassword: PASSWORD })
        .expect(400);
      await http()
        .post(CHANGE)
        .set(auth(otherToken))
        .send({ currentPassword: PASSWORD, newPassword: 'corta' })
        .expect(400);
    });

    it('cambia la contraseña y cierra las demás sesiones, pero no la actual', async () => {
      const second = await login('owner@otra-stats.test');
      const sessions = await http().get('/api/auth/sessions').set(auth(otherToken)).expect(200);
      expect(sessions.body.sessions.length).toBeGreaterThanOrEqual(2);

      const changed = await http()
        .post(CHANGE)
        .set(auth(otherToken))
        .send({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD })
        .expect(200);
      expect(changed.body).toMatchObject({ success: true });
      expect(changed.body.revokedSessions).toBeGreaterThanOrEqual(1);

      await http().get('/api/auth/me').set(auth(otherToken)).expect(200);
      await http().get('/api/auth/me').set(auth(second)).expect(401);
      await http()
        .post('/api/auth/login')
        .send({ email: 'owner@otra-stats.test', password: PASSWORD })
        .expect(401);
      await login('owner@otra-stats.test', NEW_PASSWORD);
    });

    it('cerrar una sesión concreta y todas las sesiones', async () => {
      const extra = await login('owner@otra-stats.test', NEW_PASSWORD);
      const list = await http().get('/api/auth/sessions').set(auth(otherToken)).expect(200);
      const target = (list.body.sessions as { id: string; current: boolean }[]).find(
        (s) => !s.current,
      );
      expect(target).toBeDefined();
      await http().delete(`/api/auth/sessions/${target!.id}`).set(auth(otherToken)).expect(200);
      await http().get('/api/auth/me').set(auth(extra)).expect(401);

      await http().post('/api/auth/logout-all').set(auth(otherToken)).expect(200);
      await http().get('/api/auth/me').set(auth(otherToken)).expect(401);
    });
  });
});
