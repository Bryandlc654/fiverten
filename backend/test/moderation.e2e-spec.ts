import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { hashPassword } from '../src/common/passwords';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const PUBLIC = '/api/public';
const ADMIN = '/api/admin/reviews';
const TENANT = '/api/organizations/me/reviews';
const PASSWORD = 'Secret1234';

describe('FIVERTEN Estados y moderación de reseñas (e2e)', () => {
  type HttpAgent = ReturnType<typeof request>;
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => HttpAgent;
  let ownerToken: string;
  let adminToken: string;
  let slug: string;
  const confirmTokens = new Map<string, string>();
  const ids = new Map<string, string>();

  const login = async (email: string) => {
    const response = await http()
      .post('/api/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return response.body.accessToken as string;
  };

  /** Envía y confirma una reseña; devuelve el estado tras confirmar. */
  const createReview = async (email: string, extra: Record<string, unknown> = {}) => {
    await http()
      .post(`${PUBLIC}/organizations/${slug}/reviews`)
      .set('X-Forwarded-For', `10.9.${ids.size}.1`)
      .send({
        name: 'Cliente Prueba',
        email,
        rating: 4,
        body: 'Buen servicio en general, volvería.',
        consent: true,
        ...extra,
      })
      .expect(201);
    const confirmed = await http()
      .post(`${PUBLIC}/reviews/confirm`)
      .send({ token: confirmTokens.get(email) })
      .expect(200);
    const review = await prisma.review.findFirstOrThrow({ where: { reviewerEmail: email } });
    ids.set(email, review.id);
    return confirmed.body.status as string;
  };

  const act = (email: string, action: string, reason?: string) =>
    http()
      .post(`${ADMIN}/${ids.get(email)}/${action}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(reason ? { reason } : {});

  const publicIds = async () => {
    const list = await http().get(`${PUBLIC}/organizations/${slug}/reviews`).expect(200);
    return (list.body.items as { id: string }[]).map((item) => item.id);
  };

  const tenantStatus = async (email: string) => {
    const list = await http()
      .get(`${TENANT}?pageSize=100`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    return (list.body.items as { id: string; status: string }[]).find(
      (item) => item.id === ids.get(email),
    )?.status;
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

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "organizations","users","roles","organization_memberships","reviews","review_responses","review_reports","moderation_actions","sessions","refresh_tokens","email_verifications","auth_attempts" RESTART IDENTITY CASCADE',
    );

    const registered = await http()
      .post('/api/auth/register')
      .send({ email: 'owner@mod.test', password: PASSWORD, companyName: 'Moderada S.L.' })
      .expect(201);
    slug = registered.body.organization.slug as string;
    ownerToken = await login('owner@mod.test');
    await http()
      .patch('/api/organizations/me')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isPublic: true })
      .expect(200);

    await prisma.user.create({
      data: {
        email: 'root@mod.test',
        username: 'root-mod',
        passwordHash: await hashPassword(PASSWORD),
        isSuperAdmin: true,
      },
    });
    adminToken = await login('root@mod.test');

    expect(await createReview('buena@cliente.test')).toBe('published');
    expect(await createReview('otra@cliente.test')).toBe('published');
    expect(
      await createReview('enlace@cliente.test', { body: 'Comprad en https://spam.test barato' }),
    ).toBe('under_review');
  });

  afterAll(async () => {
    await app.close();
  });

  it('expone los motivos de reporte del alcance', async () => {
    const response = await http().get(`${PUBLIC}/report-reasons`).expect(200);
    expect(response.body.reasons).toHaveLength(8);
    expect(response.body.reasons[0]).toEqual({ code: 'spam', label: 'Spam' });
  });

  describe('reportes', () => {
    it('un visitante reporta: queda "reportada" pero sigue visible hasta que se modere', async () => {
      const reviewId = ids.get('buena@cliente.test');
      await http()
        .post(`${PUBLIC}/reviews/${reviewId}/report`)
        .send({ reason: 'offensive', comment: 'Lenguaje inapropiado' })
        .expect(200);
      // Repetir desde la misma IP no acumula reportes.
      await http().post(`${PUBLIC}/reviews/${reviewId}/report`).send({ reason: 'spam' }).expect(200);

      expect(await prisma.reviewReport.count({ where: { reviewId } })).toBe(1);
      expect(await publicIds()).toContain(reviewId);
      expect(await tenantStatus('buena@cliente.test')).toBe('reported');
    });

    it('rechaza motivos inexistentes', async () => {
      await http()
        .post(`${PUBLIC}/reviews/${ids.get('otra@cliente.test')}/report`)
        .send({ reason: 'no_existe' })
        .expect(400);
    });

    it('no se pueden reportar reseñas que no son públicas', async () => {
      await http()
        .post(`${PUBLIC}/reviews/${ids.get('enlace@cliente.test')}/report`)
        .send({ reason: 'spam' })
        .expect(404);
    });

    it('la empresa reporta una reseña propia, pero no puede ocultarla', async () => {
      await http()
        .post(`${TENANT}/${ids.get('otra@cliente.test')}/report`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ reason: 'not_real_experience' })
        .expect(200);
      expect(await tenantStatus('otra@cliente.test')).toBe('reported');
      await http()
        .post(`${ADMIN}/${ids.get('otra@cliente.test')}/hide`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ reason: 'No me gusta' })
        .expect(403);
    });
  });

  describe('cola de moderación', () => {
    it('solo el super admin accede', async () => {
      await http().get(ADMIN).set('Authorization', `Bearer ${ownerToken}`).expect(403);
    });

    it('muestra la cola con reportes, señales antifraude e historial', async () => {
      const response = await http()
        .get(`${ADMIN}?status=under_review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(response.body.queue).toEqual({ underReview: 1, reported: 2 });
      const item = response.body.items[0];
      expect(item).toMatchObject({
        reviewerEmail: 'enlace@cliente.test',
        status: 'under_review',
        antifraud: ['contains_link'],
        organization: { slug },
      });
      expect(item.history[0]).toMatchObject({ action: 'flag', toStatus: 'under_review' });

      const reported = await http()
        .get(`${ADMIN}?status=reported`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const buena = reported.body.items.find(
        (r: { id: string }) => r.id === ids.get('buena@cliente.test'),
      );
      expect(buena.reports[0]).toMatchObject({ reason: 'Contenido ofensivo', byOrganization: false });
    });
  });

  describe('transiciones', () => {
    it('publicar una reseña en revisión la hace visible', async () => {
      await act('enlace@cliente.test', 'publish').expect(200);
      expect(await publicIds()).toContain(ids.get('enlace@cliente.test'));
    });

    it('rechaza transiciones que no existen', async () => {
      await act('enlace@cliente.test', 'publish').expect(400);
      await act('enlace@cliente.test', 'unflag').expect(400);
      await act('enlace@cliente.test', 'borrar').expect(400);
    });

    it('ocultar exige motivo, retira la reseña y acepta los reportes', async () => {
      await act('buena@cliente.test', 'hide').expect(400);
      await act('buena@cliente.test', 'hide', 'Lenguaje ofensivo').expect(200);

      expect(await publicIds()).not.toContain(ids.get('buena@cliente.test'));
      expect(await tenantStatus('buena@cliente.test')).toBe('hidden');
      const reports = await prisma.reviewReport.findMany({
        where: { reviewId: ids.get('buena@cliente.test') },
      });
      expect(reports.every((report) => report.status === 'accepted')).toBe(true);
      // Ya no se puede reportar una reseña oculta.
      await http()
        .post(`${PUBLIC}/reviews/${ids.get('buena@cliente.test')}/report`)
        .set('X-Forwarded-For', '10.200.0.1')
        .send({ reason: 'spam' })
        .expect(404);
    });

    it('restaurar vuelve a publicarla conservando la fecha original', async () => {
      const before = await prisma.review.findUniqueOrThrow({
        where: { id: ids.get('buena@cliente.test') },
      });
      await act('buena@cliente.test', 'restore').expect(200);
      const after = await prisma.review.findUniqueOrThrow({
        where: { id: ids.get('buena@cliente.test') },
      });
      expect(await publicIds()).toContain(ids.get('buena@cliente.test'));
      expect(after.publishedAt?.getTime()).toBe(before.publishedAt?.getTime());
    });

    it('descartar los reportes deja la reseña publicada', async () => {
      await act('otra@cliente.test', 'unflag').expect(200);
      expect(await tenantStatus('otra@cliente.test')).toBe('published');
      const reports = await prisma.reviewReport.findMany({
        where: { reviewId: ids.get('otra@cliente.test') },
      });
      expect(reports.every((report) => report.status === 'rejected')).toBe(true);
    });

    it('rechazar una reseña en revisión la archiva; se puede restaurar', async () => {
      expect(await createReview('rechazo@cliente.test', { body: 'Mirad www.otra-web.test' })).toBe(
        'under_review',
      );
      await act('rechazo@cliente.test', 'reject', 'Publicidad encubierta').expect(200);
      expect(await tenantStatus('rechazo@cliente.test')).toBe('rejected');
      expect(await publicIds()).not.toContain(ids.get('rechazo@cliente.test'));

      await act('rechazo@cliente.test', 'restore').expect(200);
      expect(await publicIds()).toContain(ids.get('rechazo@cliente.test'));
    });

    it('cada cambio queda en el historial con su motivo', async () => {
      const actions = await prisma.moderationAction.findMany({
        where: { reviewId: ids.get('buena@cliente.test') },
        orderBy: { createdAt: 'asc' },
      });
      expect(actions.map((a) => `${a.action}:${a.toStatus}`)).toEqual([
        'publish:published',
        'flag:reported',
        'hide:hidden',
        'restore:published',
      ]);
      expect(actions[2].reason).toBe('Lenguaje ofensivo');
      expect(actions[2].moderatorId).not.toBeNull();
    });
  });
});
