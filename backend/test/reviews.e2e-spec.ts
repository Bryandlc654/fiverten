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
const PASSWORD = 'Secret1234';

describe('FIVERTEN Perfil público y reseñas (e2e)', () => {
  type HttpAgent = ReturnType<typeof request>;
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => HttpAgent;
  let ownerToken: string;
  let slug: string;
  const confirmTokens = new Map<string, string>();

  const review = (overrides: Record<string, unknown> = {}) => ({
    name: 'Marta González',
    email: 'marta@cliente.test',
    rating: 5,
    title: 'Muy recomendable',
    body: 'Atención excelente y trabajo impecable.',
    consent: true,
    ...overrides,
  });

  const submit = (body: Record<string, unknown>, ip = '10.0.0.1') =>
    http()
      .post(`${PUBLIC}/organizations/${slug}/reviews`)
      .set('X-Forwarded-For', ip)
      .send(body);

  const confirm = (email: string) =>
    http().post(`${PUBLIC}/reviews/confirm`).send({ token: confirmTokens.get(email) });

  const makePublic = () =>
    http()
      .patch('/api/organizations/me')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isPublic: true })
      .expect(200);

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
      'TRUNCATE TABLE "organizations","users","roles","permissions","role_permissions","organization_memberships","organization_invitations","reviews","review_responses","sessions","refresh_tokens","email_verifications","password_reset_tokens","auth_attempts" RESTART IDENTITY CASCADE',
    );

    const registered = await http()
      .post(`${AUTH}/register`)
      .send({ email: 'owner@clinica.test', password: PASSWORD, companyName: 'Clínica ABC' })
      .expect(201);
    slug = registered.body.organization.slug as string;
    const login = await http()
      .post(`${AUTH}/login`)
      .send({ email: 'owner@clinica.test', password: PASSWORD })
      .expect(200);
    ownerToken = login.body.accessToken as string;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('perfil público', () => {
    it('no existe mientras la empresa no lo publica', async () => {
      await http().get(`${PUBLIC}/organizations/${slug}`).expect(404);
    });

    it('el formulario de reseña funciona aunque el perfil no sea público', async () => {
      const form = await http().get(`${PUBLIC}/organizations/${slug}/review-form`).expect(200);
      expect(form.body).toMatchObject({ tradeName: 'Clínica ABC', isPublic: false });
    });

    it('al activarlo muestra la empresa sin reseñas', async () => {
      await makePublic();
      const profile = await http().get(`${PUBLIC}/organizations/${slug}`).expect(200);
      expect(profile.body).toMatchObject({
        tradeName: 'Clínica ABC',
        rating: { average: null, total: 0 },
      });
      // Contacto oculto mientras allowContact sea false.
      expect(profile.body.email).toBeNull();
    });

    it('una empresa inexistente devuelve 404', async () => {
      await http().get(`${PUBLIC}/organizations/no-existe`).expect(404);
    });
  });

  describe('envío y confirmación de reseñas', () => {
    it('valida el formulario (consentimiento y puntuación obligatorios)', async () => {
      await submit(review({ consent: false })).expect(400);
      await submit(review({ rating: 6 })).expect(400);
      await submit(review({ body: 'corto' })).expect(400);
    });

    it('una reseña nueva queda pendiente hasta confirmar el email', async () => {
      const response = await submit(review()).expect(201);
      expect(response.body).toEqual({ status: 'pending_confirmation' });

      const list = await http().get(`${PUBLIC}/organizations/${slug}/reviews`).expect(200);
      expect(list.body.total).toBe(0);

      const tenant = await http()
        .get(TENANT)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(tenant.body.items[0]).toMatchObject({ status: 'pending', rating: 5 });
      expect(tenant.body.items[0].reviewerEmail).toBeUndefined();
    });

    it('al confirmar se publica y cuenta en la puntuación', async () => {
      const confirmed = await confirm('marta@cliente.test').expect(200);
      expect(confirmed.body).toMatchObject({ status: 'published', organization: { slug } });

      const profile = await http().get(`${PUBLIC}/organizations/${slug}`).expect(200);
      expect(profile.body.rating).toMatchObject({ average: 5, total: 1 });
      expect(profile.body.rating.distribution['5']).toBe(1);

      const list = await http().get(`${PUBLIC}/organizations/${slug}/reviews`).expect(200);
      expect(list.body.items[0]).toMatchObject({ reviewerName: 'Marta G.', rating: 5 });
      // El perfil público nunca expone el email ni la IP del autor.
      expect(JSON.stringify(list.body)).not.toContain('marta@cliente.test');
      expect(JSON.stringify(list.body)).not.toContain('10.0.0.1');
    });

    it('el enlace de confirmación es de un solo uso', async () => {
      await confirm('marta@cliente.test').expect(400);
    });

    it('rechaza una segunda reseña del mismo email en poco tiempo', async () => {
      await submit(review()).expect(409);
    });

    it('descarta en silencio los envíos de bots (honeypot)', async () => {
      await submit(review({ email: 'bot@spam.test', website: 'http://spam.test' })).expect(201);
      expect(await prisma.review.count({ where: { reviewerEmail: 'bot@spam.test' } })).toBe(0);
    });

    it('una reseña con enlaces queda en revisión en lugar de publicarse', async () => {
      await submit(
        review({ email: 'links@cliente.test', body: 'Visitad www.mi-tienda-barata.test ya mismo' }),
        '10.0.0.2',
      ).expect(201);
      const confirmed = await confirm('links@cliente.test').expect(200);
      expect(confirmed.body.status).toBe('under_review');

      const list = await http().get(`${PUBLIC}/organizations/${slug}/reviews`).expect(200);
      expect(list.body.total).toBe(1);
    });

    it('demasiadas reseñas desde la misma IP quedan en revisión', async () => {
      for (const n of [1, 2, 3]) {
        await submit(review({ email: `ip${n}@cliente.test`, rating: 4 }), '10.0.0.9').expect(201);
      }
      await submit(review({ email: 'ip4@cliente.test', rating: 1 }), '10.0.0.9').expect(201);
      const confirmed = await confirm('ip4@cliente.test').expect(200);
      expect(confirmed.body.status).toBe('under_review');
    });
  });

  describe('filtros del perfil público', () => {
    beforeAll(async () => {
      // ip1 comparte IP con otras tres reseñas: también queda en revisión.
      const ip1 = await confirm('ip1@cliente.test').expect(200);
      expect(ip1.body.status).toBe('under_review');
      await submit(review({ email: 'mala@cliente.test', name: 'Luis', rating: 2 }), '10.0.1.1');
      await confirm('mala@cliente.test').expect(200);
    });

    it('filtra por estrellas', async () => {
      const list = await http()
        .get(`${PUBLIC}/organizations/${slug}/reviews?rating=2`)
        .expect(200);
      expect(list.body.items.map((r: { rating: number }) => r.rating)).toEqual([2]);
      expect(list.body.items[0].reviewerName).toBe('Luis');
    });

    it('ordena por más recientes y más antiguas', async () => {
      const recent = await http().get(`${PUBLIC}/organizations/${slug}/reviews`).expect(200);
      const oldest = await http()
        .get(`${PUBLIC}/organizations/${slug}/reviews?sort=oldest`)
        .expect(200);
      expect(recent.body.items[0].rating).toBe(2);
      expect(oldest.body.items[0].rating).toBe(5);
    });

    it('rechaza filtros no válidos', async () => {
      await http().get(`${PUBLIC}/organizations/${slug}/reviews?rating=9`).expect(400);
      await http().get(`${PUBLIC}/organizations/${slug}/reviews?sort=otro`).expect(400);
    });
  });

  describe('respuestas de la empresa', () => {
    let reviewId: string;

    beforeAll(async () => {
      const tenant = await http()
        .get(`${TENANT}?status=published&rating=2`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      reviewId = tenant.body.items[0].id as string;
      // Publicadas: Marta (5) y Luis (2).
      expect(tenant.body.summary).toMatchObject({ published: 2, negative: 1, unanswered: 2 });
    });

    it('la empresa responde y la respuesta sale en el perfil público', async () => {
      await http()
        .put(`${TENANT}/${reviewId}/response`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ body: 'Lamentamos lo ocurrido, te escribimos para solucionarlo.' })
        .expect(200);

      const list = await http()
        .get(`${PUBLIC}/organizations/${slug}/reviews?rating=2`)
        .expect(200);
      expect(list.body.items[0].response.body).toContain('Lamentamos');
    });

    it('puede editar y retirar su respuesta', async () => {
      const edited = await http()
        .put(`${TENANT}/${reviewId}/response`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ body: 'Ya lo hemos resuelto, gracias por tu paciencia.' })
        .expect(200);
      expect(edited.body.response.editedAt).not.toBeNull();

      await http()
        .delete(`${TENANT}/${reviewId}/response`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      const list = await http()
        .get(`${PUBLIC}/organizations/${slug}/reviews?rating=2`)
        .expect(200);
      expect(list.body.items[0].response).toBeNull();
    });

    it('no se puede responder a una reseña sin confirmar', async () => {
      await submit(review({ email: 'sinconfirmar@cliente.test' }), '10.0.2.1').expect(201);
      const pending = await prisma.review.findFirst({
        where: { reviewerEmail: 'sinconfirmar@cliente.test' },
      });
      await http()
        .put(`${TENANT}/${pending!.id}/response`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ body: 'Respuesta' })
        .expect(400);
    });

    it('una empresa no ve ni responde reseñas de otra', async () => {
      await http()
        .post(`${AUTH}/register`)
        .send({ email: 'otra@empresa.test', password: PASSWORD, companyName: 'Otra S.L.' })
        .expect(201);
      const login = await http()
        .post(`${AUTH}/login`)
        .send({ email: 'otra@empresa.test', password: PASSWORD })
        .expect(200);
      const otherToken = login.body.accessToken as string;

      const list = await http()
        .get(TENANT)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);
      expect(list.body.total).toBe(0);
      await http()
        .put(`${TENANT}/${reviewId}/response`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ body: 'Intento ajeno' })
        .expect(404);
    });
  });
});
