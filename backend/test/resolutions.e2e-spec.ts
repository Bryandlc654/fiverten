import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const AUTH = '/api/auth';
const PUBLIC = '/api/public';
const TENANT = '/api/organizations/me/reviews';
const RESOLUTIONS = '/api/public/resolutions';
const PASSWORD = 'Secret1234';
const LONG_TEXT = 'Lamentamos lo ocurrido, queremos solucionarlo contigo.';

describe('FIVERTEN Resolución de incidencias (e2e)', () => {
  type HttpAgent = ReturnType<typeof request>;
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => HttpAgent;
  let ownerToken: string;
  let otherToken: string;
  let slug: string;
  let ipCounter = 0;
  // email -> token (de confirmación de reseña y de resolución, el último enviado)
  const confirmTokens = new Map<string, string>();
  const resolutionTokens = new Map<string, string[]>();
  const reviewIds = new Map<string, string>();

  const login = async (email: string) =>
    (await http().post(`${AUTH}/login`).send({ email, password: PASSWORD }).expect(200)).body
      .accessToken as string;

  /** Crea una reseña publicada con la puntuación indicada (vía el flujo público real). */
  const publishReview = async (email: string, rating: number) => {
    ipCounter += 1;
    await http()
      .post(`${PUBLIC}/organizations/${slug}/reviews`)
      .set('X-Forwarded-For', `10.44.0.${ipCounter}`)
      .send({
        name: 'Cliente Resolución',
        email,
        rating,
        body: 'Mi experiencia con el servicio, con algunos problemas.',
        consent: true,
      })
      .expect(201);
    await http()
      .post(`${PUBLIC}/reviews/confirm`)
      .send({ token: confirmTokens.get(email) })
      .expect(200);
    const review = await prisma.review.findFirstOrThrow({ where: { reviewerEmail: email } });
    reviewIds.set(email, review.id);
    return review.id;
  };

  const lastResolutionToken = (email: string) => {
    const tokens = resolutionTokens.get(email) ?? [];
    return tokens[tokens.length - 1];
  };

  const openResolution = (email: string, message = LONG_TEXT) =>
    http()
      .post(`${TENANT}/${reviewIds.get(email)}/resolution`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ message });

  const lookup = (token: string) => http().post(`${RESOLUTIONS}/lookup`).send({ token });

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
    jest.spyOn(mail, 'sendResolutionLink').mockImplementation(async (to: string, token: string) => {
      resolutionTokens.set(to, [...(resolutionTokens.get(to) ?? []), token]);
    });

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "organizations","users","roles","organization_memberships","reviews","review_responses","review_resolutions","resolution_messages","review_reports","moderation_actions","sessions","refresh_tokens","email_verifications","auth_attempts" RESTART IDENTITY CASCADE',
    );

    const registered = await http()
      .post(`${AUTH}/register`)
      .send({
        email: 'owner@resoluciones.test',
        password: PASSWORD,
        companyName: 'Resoluciones S.L.',
      })
      .expect(201);
    slug = registered.body.organization.slug as string;
    ownerToken = await login('owner@resoluciones.test');
    await http()
      .patch('/api/organizations/me')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isPublic: true })
      .expect(200);

    await http()
      .post(`${AUTH}/register`)
      .send({
        email: 'otra@resoluciones.test',
        password: PASSWORD,
        companyName: 'Otra Empresa S.L.',
      })
      .expect(201);
    otherToken = await login('otra@resoluciones.test');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('detección de baja valoración', () => {
    it('no se puede abrir una resolución en una reseña de 3 estrellas o más', async () => {
      await publishReview('buena@cliente.test', 4);
      const response = await openResolution('buena@cliente.test');
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/2 estrellas o menos/);
    });

    it('el listado marca las de baja valoración y permite filtrarlas', async () => {
      await publishReview('mala@cliente.test', 1);
      const list = await http()
        .get(`${TENANT}?lowRating=true`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(list.body.items.map((r: { rating: number }) => r.rating)).toEqual([1]);
      expect(list.body.items[0]).toMatchObject({ lowRating: true, resolution: null });

      const all = await http().get(TENANT).set('Authorization', `Bearer ${ownerToken}`).expect(200);
      const good = all.body.items.find((r: { rating: number }) => r.rating === 4);
      expect(good.lowRating).toBe(false);
    });
  });

  describe('abrir la resolución', () => {
    it('exige un mensaje con contenido', async () => {
      await openResolution('mala@cliente.test', 'corto').expect(400);
    });

    it('la empresa abre la resolución y el cliente recibe un enlace por correo', async () => {
      const response = await openResolution('mala@cliente.test').expect(201);
      expect(response.body).toMatchObject({ status: 'open' });
      expect(lastResolutionToken('mala@cliente.test')).toEqual(expect.any(String));

      const detail = await http()
        .get(`${TENANT}/${reviewIds.get('mala@cliente.test')}/resolution`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(detail.body.resolution).toMatchObject({ status: 'open', outcome: null });
      expect(detail.body.resolution.messages).toEqual([
        expect.objectContaining({ senderType: 'company', body: LONG_TEXT }),
      ]);
    });

    it('no se puede abrir otra mientras haya una activa', async () => {
      const response = await openResolution('mala@cliente.test');
      expect(response.status).toBe(409);
    });
  });

  describe('enlace del cliente (sin cuenta)', () => {
    it('con el token el cliente ve la reseña, el hilo y lo que puede hacer', async () => {
      const response = await lookup(lastResolutionToken('mala@cliente.test')).expect(200);
      expect(response.body).toMatchObject({
        company: 'Resoluciones S.L.',
        review: { rating: 1, reviewerName: 'Cliente Resolución' },
        resolution: { status: 'open' },
        permissions: { canWrite: true, canEditReview: true, canDecide: true },
      });
      // El cliente nunca ve el correo ni la IP del autor.
      expect(JSON.stringify(response.body)).not.toContain('mala@cliente.test');
    });

    it('un token inventado no sirve', async () => {
      await lookup('f'.repeat(64)).expect(400);
    });

    it('cuando la empresa escribe, el enlace anterior deja de valer', async () => {
      const oldToken = lastResolutionToken('mala@cliente.test');
      await http()
        .post(`${TENANT}/${reviewIds.get('mala@cliente.test')}/resolution/messages`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ body: 'Te hemos escrito de nuevo con la solución propuesta.' })
        .expect(200);

      await lookup(oldToken).expect(400);
      const newToken = lastResolutionToken('mala@cliente.test');
      expect(newToken).not.toBe(oldToken);
      await lookup(newToken).expect(200);
    });

    it('el cliente responde: la resolución pasa a en curso', async () => {
      const token = lastResolutionToken('mala@cliente.test');
      await http()
        .post(`${RESOLUTIONS}/messages`)
        .send({ token, body: 'Gracias, estoy esperando el reembolso.' })
        .expect(200);
      const detail = await lookup(token).expect(200);
      expect(detail.body.resolution.status).toBe('in_progress');
      expect(detail.body.messages.map((m: { senderType: string }) => m.senderType)).toEqual([
        'company',
        'company',
        'client',
      ]);
    });

    it('el cliente actualiza su reseña y queda constancia en el hilo', async () => {
      const token = lastResolutionToken('mala@cliente.test');
      await http()
        .post(`${RESOLUTIONS}/review`)
        .send({
          token,
          rating: 3,
          body: 'Tras hablar con la empresa, el problema se ha resuelto en parte.',
        })
        .expect(200);

      const review = await prisma.review.findFirstOrThrow({
        where: { id: reviewIds.get('mala@cliente.test') },
      });
      expect(review.rating).toBe(3);
      expect(review.body).toMatch(/resuelto en parte/);
      expect((review.metadata as { lastEditedAt?: string }).lastEditedAt).toEqual(
        expect.any(String),
      );

      const detail = await lookup(token).expect(200);
      expect(detail.body.messages.at(-1)).toMatchObject({
        senderType: 'system',
        body: 'El cliente ha actualizado su reseña.',
      });
    });

    it('el cliente acepta la solución: queda resuelta y ya no admite cambios', async () => {
      const token = lastResolutionToken('mala@cliente.test');
      const accepted = await http().post(`${RESOLUTIONS}/accept`).send({ token }).expect(200);
      expect(accepted.body).toEqual({ status: 'accepted', outcome: 'resolved' });

      const detail = await lookup(token).expect(200);
      expect(detail.body.permissions).toEqual({
        canWrite: false,
        canEditReview: false,
        canDecide: false,
      });
      await http()
        .post(`${RESOLUTIONS}/messages`)
        .send({ token, body: 'Una cosa más.' })
        .expect(400);
    });
  });

  describe('cierre y rechazo', () => {
    it('la empresa cierra sin acuerdo y se puede abrir una nueva resolución', async () => {
      await publishReview('cerrar@cliente.test', 2);
      await openResolution('cerrar@cliente.test').expect(201);
      const closed = await http()
        .post(`${TENANT}/${reviewIds.get('cerrar@cliente.test')}/resolution/close`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(closed.body).toEqual({ id: expect.any(String), status: 'closed' });

      const detail = await http()
        .get(`${TENANT}/${reviewIds.get('cerrar@cliente.test')}/resolution`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(detail.body.resolution).toMatchObject({ status: 'closed', outcome: 'withdrawn' });

      await openResolution('cerrar@cliente.test').expect(201);
    });

    it('el cliente rechaza la solución: queda sin resolver', async () => {
      await publishReview('rechazo@cliente.test', 1);
      await openResolution('rechazo@cliente.test').expect(201);
      const token = lastResolutionToken('rechazo@cliente.test');
      const rejected = await http()
        .post(`${RESOLUTIONS}/reject`)
        .send({ token, reason: 'no_solution' })
        .expect(200);
      expect(rejected.body).toEqual({ status: 'rejected', outcome: 'unresolved' });
    });
  });

  describe('aislamiento y caducidad', () => {
    it('otra empresa no ve ni escribe en la resolución de esta', async () => {
      const reviewId = reviewIds.get('cerrar@cliente.test');
      await http()
        .get(`${TENANT}/${reviewId}/resolution`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
      await http()
        .post(`${TENANT}/${reviewId}/resolution/messages`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ body: 'Intento ajeno de escribir.' })
        .expect(404);
    });

    it('un enlace caducado no sirve', async () => {
      await publishReview('caducado@cliente.test', 1);
      await openResolution('caducado@cliente.test').expect(201);
      const token = lastResolutionToken('caducado@cliente.test');
      await prisma.reviewResolution.updateMany({
        where: { reviewId: reviewIds.get('caducado@cliente.test') },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await lookup(token).expect(400);
    });
  });
});
