import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const AUTH = '/api/auth';
const PROFILE = '/api/organizations/me';
const AVAILABILITY = '/api/organizations/me/slug-availability';
const PASSWORD = 'Secret1234';

describe('FIVERTEN URL pública de la empresa (e2e)', () => {
  type HttpAgent = ReturnType<typeof request>;
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => HttpAgent;
  let tokenA: string;
  let slugA: string;
  let slugB: string;

  const register = (email: string, username: string) =>
    http()
      .post(`${AUTH}/register`)
      .send({ email, password: PASSWORD, companyName: 'Slug Demo SL', username })
      .expect(201);

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
      'TRUNCATE TABLE "organizations","users","roles","permissions","role_permissions","organization_memberships","sessions","refresh_tokens","email_verifications","password_reset_tokens","auth_attempts","plans","subscriptions","subscription_events","payments" RESTART IDENTITY CASCADE',
    );

    const first = await register('slug-a@fiverten.test', 'slug-a');
    tokenA = first.body.accessToken as string;
    slugA = first.body.organization.slug as string;

    const second = await register('slug-b@fiverten.test', 'slug-b');
    slugB = second.body.organization.slug as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('genera slugs distintos para empresas con el mismo nombre', () => {
    expect(slugA).toBe('slug-demo-sl');
    expect(slugB).not.toBe(slugA);
    expect(slugB.startsWith('slug-demo-sl')).toBe(true);
  });

  it('informa de que un slug ocupado no está disponible y propone otro', async () => {
    const response = await http()
      .get(`${AVAILABILITY}?slug=${slugB}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(response.body).toMatchObject({ available: false });
    expect(response.body.suggestion).toBe(`${slugB}-2`);
    expect(response.body.suggestion).not.toBe(slugB);

    const free = await http()
      .get(`${AVAILABILITY}?slug=mi-url-libre`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(free.body).toMatchObject({
      slug: 'mi-url-libre',
      available: true,
      suggestion: null,
    });
  });

  it('rechaza guardar una URL pública que ya usa otra empresa', async () => {
    const response = await http()
      .patch(PROFILE)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ slug: slugB })
      .expect(409);
    expect(response.body.message).toContain('URL pública');
  });

  it('permite cambiar la URL pública y la normaliza', async () => {
    const response = await http()
      .patch(PROFILE)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ slug: '  Mi Empresa Nüeva ' })
      .expect(200);
    expect(response.body.slug).toBe('mi-empresa-nueva');
  });

  it('mantiene la URL al cambiar solo el nombre de la empresa', async () => {
    const response = await http()
      .patch(PROFILE)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ tradeName: 'Otro Nombre Comercial' })
      .expect(200);
    expect(response.body.slug).toBe('mi-empresa-nueva');
    expect(response.body.tradeName).toBe('Otro Nombre Comercial');
  });

  it('rechaza una URL pública vacía', async () => {
    await http()
      .patch(PROFILE)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ slug: '   ' })
      .expect(400);
  });
});
