import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { hashPassword } from '../src/common/passwords';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const PUBLIC = '/api/public';
const ADMIN = '/api/admin/cases';
const COMPANY = '/api/organizations/me/cases';
const CLIENT = '/api/public/cases';
const PASSWORD = 'Secret1234';

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('contenido de prueba'),
]);
const PDF = Buffer.from('%PDF-1.4\n% factura de prueba\n');

/** Lee la respuesta como binario (supertest no lo hace para imágenes/PDF). */
const binary = (res: request.Response, done: (err: Error | null, body: Buffer) => void) => {
  const stream = res as unknown as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];
  stream.on('data', (chunk: Buffer) => chunks.push(chunk));
  stream.on('end', () => done(null, Buffer.concat(chunks)));
};

describe('FIVERTEN Caso de evidencias de reseñas de baja valoración (e2e)', () => {
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
  // Último enlace enviado a cada cliente (cada correo lleva uno nuevo).
  const clientTokens = new Map<string, string>();
  let adminAlert: jest.SpyInstance;
  let companyNotice: jest.SpyInstance;

  const login = async (email: string) =>
    (await http().post('/api/auth/login').send({ email, password: PASSWORD }).expect(200)).body
      .accessToken as string;

  /** Espera a que un correo no bloqueante se haya enviado. */
  const eventually = async (check: () => boolean) => {
    for (let i = 0; i < 40 && !check(); i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    expect(check()).toBe(true);
  };

  /** Envía y confirma una reseña; devuelve la respuesta de la confirmación. */
  const createReview = async (email: string, rating: number) => {
    ipCounter += 1;
    await http()
      .post(`${PUBLIC}/organizations/${slug}/reviews`)
      .set('X-Forwarded-For', `10.77.0.${ipCounter}`)
      .send({
        name: 'Cliente Caso',
        email,
        rating,
        body: 'El pedido llegó roto y nadie me respondió.',
        consent: true,
      })
      .expect(201);
    const confirmed = await http()
      .post(`${PUBLIC}/reviews/confirm`)
      .send({ token: confirmTokens.get(email) })
      .expect(200);
    return confirmed.body as { status: string; evidenceRequired: boolean };
  };

  const caseOf = async (email: string) =>
    prisma.reviewCase.findFirstOrThrow({
      where: { review: { reviewerEmail: email } },
      include: { review: true },
    });

  const asAdmin = (path: string, body: Record<string, unknown> = {}) =>
    http().post(`${ADMIN}/${path}`).set('Authorization', `Bearer ${adminToken}`).send(body);

  const publicIds = async () => {
    const list = await http().get(`${PUBLIC}/organizations/${slug}/reviews`).expect(200);
    return (list.body.items as { id: string }[]).map((item) => item.id);
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
    adminAlert = jest.spyOn(mail, 'sendCaseAdminAlert').mockResolvedValue(undefined);
    companyNotice = jest.spyOn(mail, 'sendCaseCompanyNotice').mockResolvedValue(undefined);

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "organizations","users","roles","organization_memberships","reviews","review_cases","moderation_actions","sessions","refresh_tokens","email_verifications","auth_attempts" RESTART IDENTITY CASCADE',
    );

    const registered = await http()
      .post('/api/auth/register')
      .send({ email: 'owner@caso.test', password: PASSWORD, companyName: 'Tienda Caso S.L.' })
      .expect(201);
    slug = registered.body.organization.slug as string;
    ownerToken = await login('owner@caso.test');
    await http()
      .patch('/api/organizations/me')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ isPublic: true })
      .expect(200);

    await http()
      .post('/api/auth/register')
      .send({ email: 'owner@otra.test', password: PASSWORD, companyName: 'Otra Empresa S.L.' })
      .expect(201);
    otherToken = await login('owner@otra.test');

    await prisma.user.create({
      data: {
        email: 'root@caso.test',
        username: 'root-caso',
        passwordHash: await hashPassword(PASSWORD),
        isSuperAdmin: true,
      },
    });
    adminToken = await login('root@caso.test');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('apertura del caso', () => {
    it('una reseña de 1 o 2 estrellas no se publica: abre un caso y avisa al admin', async () => {
      const confirmed = await createReview('uno@cliente.test', 1);
      expect(confirmed).toMatchObject({ status: 'under_review', evidenceRequired: true });

      const found = await caseOf('uno@cliente.test');
      expect(found.status).toBe('awaiting_admin');
      expect(await publicIds()).not.toContain(found.reviewId);
      await eventually(() =>
        adminAlert.mock.calls.some(
          ([to, title]) => to === 'root@caso.test' && title === 'Nueva reseña de baja valoración',
        ),
      );
    });

    it('una reseña de 4 estrellas se publica directamente, sin caso', async () => {
      const confirmed = await createReview('cuatro@cliente.test', 4);
      expect(confirmed).toMatchObject({ status: 'published', evidenceRequired: false });
      expect(
        await prisma.reviewCase.count({ where: { review: { reviewerEmail: 'cuatro@cliente.test' } } }),
      ).toBe(0);
    });

    it('la moderación genérica no puede decidir una reseña con caso abierto', async () => {
      const found = await caseOf('uno@cliente.test');
      await http()
        .post(`/api/admin/reviews/${found.reviewId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('la empresa no ve el caso hasta que el admin la notifique', async () => {
      const found = await caseOf('uno@cliente.test');
      const list = await http().get(COMPANY).set('Authorization', `Bearer ${ownerToken}`).expect(200);
      expect(list.body.items).toEqual([]);
      await http()
        .get(`${COMPANY}/${found.id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('solo el super admin accede a los casos', async () => {
      await http().get(ADMIN).set('Authorization', `Bearer ${ownerToken}`).expect(403);
      const list = await http().get(ADMIN).set('Authorization', `Bearer ${adminToken}`).expect(200);
      expect(list.body.total).toBe(1);
      expect(list.body.queue).toEqual({ needsAdmin: 1, active: 1 });
    });
  });

  describe('evidencias del cliente', () => {
    let caseId: string;
    let fileId: string;

    beforeAll(async () => {
      caseId = (await caseOf('uno@cliente.test')).id;
    });

    it('el admin pide evidencias y el cliente recibe un enlace', async () => {
      const response = await asAdmin(`${caseId}/request-evidence`, {
        message: 'Envíanos fotos del pedido roto y la factura, por favor.',
      }).expect(200);
      expect(response.body.status).toBe('evidence_requested');
      expect(clientTokens.get('uno@cliente.test')).toBeDefined();
    });

    it('con el enlace el cliente ve el caso y el mensaje del admin', async () => {
      const response = await http()
        .post(`${CLIENT}/lookup`)
        .send({ token: clientTokens.get('uno@cliente.test') })
        .expect(200);
      expect(response.body).toMatchObject({
        company: 'Tienda Caso S.L.',
        status: 'evidence_requested',
        permissions: { canWrite: true, canAgree: false },
      });
      expect(response.body.messages.map((m: { senderType: string }) => m.senderType)).toEqual([
        'system',
        'admin',
      ]);
    });

    it('rechaza archivos cuyo contenido no es una imagen o un PDF', async () => {
      await http()
        .post(`${CLIENT}/messages`)
        .field('token', clientTokens.get('uno@cliente.test')!)
        .field('body', 'Adjunto la foto')
        .attach('files', Buffer.from('esto no es una imagen'), {
          filename: 'foto.png',
          contentType: 'image/png',
        })
        .expect(400);
    });

    it('el cliente aporta sus evidencias: el caso pasa a revisión del admin', async () => {
      await http()
        .post(`${CLIENT}/messages`)
        .field('token', clientTokens.get('uno@cliente.test')!)
        .field('body', 'Aquí está la foto del paquete roto.')
        .attach('files', PNG, { filename: 'paquete.png', contentType: 'image/png' })
        .expect(200);

      const found = await caseOf('uno@cliente.test');
      expect(found.status).toBe('evidence_submitted');
      await eventually(() =>
        adminAlert.mock.calls.some(([, title]) => title === 'El cliente ha aportado evidencias'),
      );

      const detail = await http()
        .get(`${ADMIN}/${caseId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const evidence = detail.body.messages.find((m: { senderType: string }) => m.senderType === 'client');
      expect(evidence.files).toEqual([
        expect.objectContaining({ filename: 'paquete.png', mimeType: 'image/png', size: PNG.length }),
      ]);
      fileId = evidence.files[0].id as string;
    });

    it('el cliente y el admin pueden descargar la evidencia', async () => {
      const asClient = await http()
        .post(`${CLIENT}/files/${fileId}`)
        .send({ token: clientTokens.get('uno@cliente.test') })
        .buffer(true)
        .parse(binary)
        .expect(200);
      expect(asClient.headers['content-type']).toBe('image/png');
      expect(asClient.headers['content-disposition']).toContain('attachment');
      expect(asClient.body).toEqual(PNG);

      await http()
        .get(`${ADMIN}/${caseId}/files/${fileId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .buffer(true)
        .parse(binary)
        .expect(200);
    });
  });

  describe('la empresa se defiende', () => {
    let caseId: string;

    beforeAll(async () => {
      caseId = (await caseOf('uno@cliente.test')).id;
    });

    it('el admin valida las evidencias y notifica a la empresa', async () => {
      const response = await asAdmin(`${caseId}/validate`, {
        message: 'Las evidencias del cliente son válidas. Danos tu versión.',
      }).expect(200);
      expect(response.body.status).toBe('company_notified');
      await eventually(() =>
        companyNotice.mock.calls.some(
          ([to, title]) =>
            to === 'owner@caso.test' && title === 'Una reseña sobre tu empresa necesita tu respuesta',
        ),
      );
    });

    it('la empresa ve las evidencias del cliente, pero no su conversación previa con el admin', async () => {
      const list = await http().get(COMPANY).set('Authorization', `Bearer ${ownerToken}`).expect(200);
      expect(list.body.items).toHaveLength(1);

      const detail = await http()
        .get(`${COMPANY}/${caseId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      const bodies = detail.body.messages.map((m: { body: string }) => m.body);
      expect(bodies).toContain('Aquí está la foto del paquete roto.');
      expect(bodies).toContain('Las evidencias del cliente son válidas. Danos tu versión.');
      expect(bodies).not.toContain('Envíanos fotos del pedido roto y la factura, por favor.');
      expect(JSON.stringify(detail.body)).not.toContain('uno@cliente.test');
      expect(detail.body.permissions).toEqual({ canWrite: true, canAgree: true });

      const fileId = detail.body.messages.find((m: { senderType: string }) => m.senderType === 'client')
        .files[0].id as string;
      await http()
        .get(`${COMPANY}/${caseId}/files/${fileId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .buffer(true)
        .parse(binary)
        .expect(200);
    });

    it('otra empresa no puede ver el caso', async () => {
      await http()
        .get(`${COMPANY}/${caseId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });

    it('la empresa aporta sus evidencias y el enlace anterior del cliente deja de valer', async () => {
      const previous = clientTokens.get('uno@cliente.test');
      await http()
        .post(`${COMPANY}/${caseId}/messages`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('body', 'Enviamos el pedido en perfecto estado; adjuntamos el albarán firmado.')
        .attach('files', PDF, { filename: 'albaran.pdf', contentType: 'application/pdf' })
        .expect(200);

      expect((await caseOf('uno@cliente.test')).status).toBe('company_responded');
      await eventually(() =>
        adminAlert.mock.calls.some(([, title]) => title === 'La empresa ha respondido a un caso'),
      );
      expect(clientTokens.get('uno@cliente.test')).not.toBe(previous);
      await http().post(`${CLIENT}/lookup`).send({ token: previous }).expect(400);
    });
  });

  describe('decisión', () => {
    it('retirar por acuerdo exige que cliente y empresa lo hayan aceptado', async () => {
      const found = await caseOf('uno@cliente.test');
      await asAdmin(`${found.id}/withdraw`).expect(400);

      await http()
        .post(`${CLIENT}/agree`)
        .send({ token: clientTokens.get('uno@cliente.test') })
        .expect(200);
      await asAdmin(`${found.id}/withdraw`).expect(400);

      await http()
        .post(`${COMPANY}/${found.id}/agree`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      await eventually(() =>
        adminAlert.mock.calls.some(([, title]) => title === 'Acuerdo en un caso de reseña'),
      );
    });

    it('con el acuerdo de las tres partes la reseña se retira', async () => {
      const found = await caseOf('uno@cliente.test');
      const response = await asAdmin(`${found.id}/withdraw`, { reason: 'Reembolso acordado' }).expect(
        200,
      );
      expect(response.body).toMatchObject({ status: 'closed', outcome: 'withdrawn' });

      const review = await prisma.review.findUniqueOrThrow({ where: { id: found.reviewId } });
      expect(review.moderationStatus).toBe('rejected');
      expect(await publicIds()).not.toContain(found.reviewId);

      const asClient = await http()
        .post(`${CLIENT}/lookup`)
        .send({ token: clientTokens.get('uno@cliente.test') })
        .expect(200);
      expect(asClient.body).toMatchObject({
        status: 'closed',
        outcome: 'withdrawn',
        permissions: { canWrite: false, canAgree: false },
      });
      await http()
        .post(`${CLIENT}/messages`)
        .field('token', clientTokens.get('uno@cliente.test')!)
        .field('body', 'Un mensaje más')
        .expect(400);
    });

    it('sin acuerdo, el admin publica la reseña', async () => {
      await createReview('dos@cliente.test', 2);
      const { id } = await caseOf('dos@cliente.test');
      await asAdmin(`${id}/request-evidence`, { message: 'Necesitamos pruebas de lo que cuentas.' }).expect(
        200,
      );
      await http()
        .post(`${CLIENT}/messages`)
        .send({ token: clientTokens.get('dos@cliente.test'), body: 'Tengo el chat con la tienda.' })
        .expect(200);
      // Publicar solo se puede una vez que la empresa ha tenido ocasión de defenderse.
      await asAdmin(`${id}/publish`).expect(400);
      await asAdmin(`${id}/validate`, { message: 'Evidencias válidas, esperamos tu versión.' }).expect(
        200,
      );

      const response = await asAdmin(`${id}/publish`, { reason: 'Sin acuerdo' }).expect(200);
      expect(response.body).toMatchObject({ status: 'closed', outcome: 'published' });
      const found = await caseOf('dos@cliente.test');
      expect(await publicIds()).toContain(found.reviewId);
    });

    it('si no hay evidencias válidas, el admin rechaza la reseña', async () => {
      await createReview('tres@cliente.test', 1);
      const { id, reviewId } = await caseOf('tres@cliente.test');
      await asAdmin(`${id}/request-evidence`, { message: 'Necesitamos pruebas de lo que cuentas.' }).expect(
        200,
      );
      await asAdmin(`${id}/reject`, {}).expect(400);

      const response = await asAdmin(`${id}/reject`, {
        reason: 'No ha aportado ninguna evidencia',
      }).expect(200);
      expect(response.body).toMatchObject({ status: 'closed', outcome: 'rejected' });
      const review = await prisma.review.findUniqueOrThrow({ where: { id: reviewId } });
      expect(review.moderationStatus).toBe('rejected');
      // La empresa nunca fue notificada: no ve el caso.
      await http()
        .get(`${COMPANY}/${id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('el listado del admin separa casos activos y cerrados', async () => {
      const active = await http()
        .get(`${ADMIN}?scope=active`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const closed = await http()
        .get(`${ADMIN}?scope=closed`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(active.body.total).toBe(0);
      expect(closed.body.total).toBe(3);
      expect(closed.body.queue).toEqual({ needsAdmin: 0, active: 0 });
    });
  });
});
