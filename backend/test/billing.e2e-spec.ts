import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const AUTH = '/api/auth';
const ADMIN = '/api/admin';
const TENANT = '/api/organizations/me';
const PUBLIC = '/api/public';
const PASSWORD = 'Secret1234';

describe('FIVERTEN membresías, suscripciones y pagos (e2e)', () => {
  type HttpAgent = ReturnType<typeof request>;
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => HttpAgent;
  let adminToken: string;
  let ownerToken: string;
  let orgId: string;
  let slug: string;
  let freePlan: { id: string };
  let starterPlan: { id: string };
  let tinyPlan: { id: string };
  let subscriptionId: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0);

    prisma = app.get(PrismaService);
    http = () => request(app.getHttpServer());
    const mail = app.get(MailService);
    jest.spyOn(mail, 'sendEmailVerification').mockResolvedValue(undefined);
    jest.spyOn(mail, 'sendOrganizationInvitation').mockResolvedValue(undefined);

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "plans","subscriptions","subscription_events","payments","platform_settings","email_templates","sectors","countries","languages","organizations","users","roles","permissions","role_permissions","organization_memberships","organization_invitations","reviews","review_requests","review_responses","sessions","refresh_tokens","email_verifications","password_reset_tokens","auth_attempts","notifications","review_cases","review_case_messages","review_case_files","review_resolutions","resolution_messages","review_reports","moderation_actions" RESTART IDENTITY CASCADE',
    );

    await http()
      .post(`${AUTH}/register`)
      .send({
        email: 'billing-admin@fiverten.test',
        password: PASSWORD,
        companyName: 'Admin Billing',
      })
      .expect(201);
    await prisma.user.update({
      where: { email: 'billing-admin@fiverten.test' },
      data: { isSuperAdmin: true, isFivertenStaff: true },
    });
    const adminLogin = await http()
      .post(`${AUTH}/login`)
      .send({ email: 'billing-admin@fiverten.test', password: PASSWORD })
      .expect(200);
    adminToken = adminLogin.body.accessToken as string;

    const ownerReg = await http()
      .post(`${AUTH}/register`)
      .send({ email: 'billing-owner@fiverten.test', password: PASSWORD, companyName: 'Billing SL' })
      .expect(201);
    orgId = ownerReg.body.organization.id as string;
    slug = ownerReg.body.organization.slug as string;
    ownerToken = ownerReg.body.accessToken as string;

    const free = await http()
      .post(`${ADMIN}/plans`)
      .set(auth(adminToken))
      .send({ code: 'free', name: 'Free', priceMonthly: 0, reviewLimit: 50, userLimit: 1 })
      .expect(201);
    freePlan = free.body;

    const starter = await http()
      .post(`${ADMIN}/plans`)
      .set(auth(adminToken))
      .send({ code: 'starter', name: 'Starter', priceMonthly: 29, reviewLimit: 500, userLimit: 5 })
      .expect(201);
    starterPlan = starter.body;

    const tiny = await http()
      .post(`${ADMIN}/plans`)
      .set(auth(adminToken))
      .send({ code: 'tiny', name: 'Tiny', priceMonthly: 5, reviewLimit: 1, userLimit: 3 })
      .expect(201);
    tinyPlan = tiny.body;
  });

  afterAll(async () => {
    await app.close();
  });

  it('crea y lista planes', async () => {
    const plans = await http().get(`${ADMIN}/plans`).set(auth(adminToken)).expect(200);
    expect(plans.body.plans).toHaveLength(3);
    const updated = await http()
      .patch(`${ADMIN}/plans/${starterPlan.id}`)
      .set(auth(adminToken))
      .send({ priceMonthly: 39 })
      .expect(200);
    expect(updated.body.priceMonthly).toBe(39);
  });

  it('asigna una suscripción y calcula métricas', async () => {
    const created = await http()
      .put(`${ADMIN}/organizations/${orgId}/subscription`)
      .set(auth(adminToken))
      .send({ planId: freePlan.id, status: 'active' })
      .expect(200);
    expect(created.body).toMatchObject({ status: 'active', plan: { code: 'free' } });
    subscriptionId = created.body.id as string;

    const stats = await http().get(`${ADMIN}/billing/stats`).set(auth(adminToken)).expect(200);
    expect(stats.body.subscriptions).toMatchObject({ total: 1, active: 1 });

    const company = await http().get(`${TENANT}/subscription`).set(auth(ownerToken)).expect(200);
    expect(company.body.plan).toMatchObject({ code: 'free' });
    expect(company.body.usage.users).toBe(1);
  });

  it('respeta el límite de usuarios del plan', async () => {
    await http()
      .post(`${TENANT}/invitations`)
      .set(auth(ownerToken))
      .send({ email: 'nuevo@billing.test', role: 'viewer' })
      .expect(400);

    await http()
      .put(`${ADMIN}/organizations/${orgId}/subscription`)
      .set(auth(adminToken))
      .send({ planId: starterPlan.id, status: 'active' })
      .expect(200)
      .expect((response) => {
        expect(response.body.plan.code).toBe('starter');
      });

    await http()
      .post(`${TENANT}/invitations`)
      .set(auth(ownerToken))
      .send({ email: 'nuevo@billing.test', role: 'viewer' })
      .expect(201);
  });

  it('respeta el límite de reseñas del periodo', async () => {
    await http()
      .put(`${ADMIN}/organizations/${orgId}/subscription`)
      .set(auth(adminToken))
      .send({ planId: tinyPlan.id, status: 'active' })
      .expect(200);

    const review = (email: string) => ({
      name: 'Cliente Límite',
      email,
      rating: 5,
      body: 'Una experiencia correcta para probar el límite del plan.',
      consent: true,
    });

    await http()
      .post(`${PUBLIC}/organizations/${slug}/reviews`)
      .send(review('limite1@cliente.test'))
      .expect(201);

    const blocked = await http()
      .post(`${PUBLIC}/organizations/${slug}/reviews`)
      .send(review('limite2@cliente.test'))
      .expect(403);
    expect(blocked.body.message).toContain('límite');
  });

  it('sigue aplicando el límite de reseñas cuando el periodo de la suscripción ha vencido', async () => {
    // Los planes gratuitos no renuevan el periodo automáticamente: el límite
    // debe seguir contando con una ventana móvil en vez de dejar de aplicarse.
    await prisma.subscription.update({
      where: { organizationId: orgId },
      data: {
        currentPeriodStart: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    });

    const blocked = await http()
      .post(`${PUBLIC}/organizations/${slug}/reviews`)
      .send({
        name: 'Cliente Límite',
        email: 'limite3@cliente.test',
        rating: 5,
        body: 'Una experiencia correcta para probar el límite del plan.',
        consent: true,
      })
      .expect(403);
    expect(blocked.body.message).toContain('límite');
  });

  it('registra pagos y permite consultarlos desde la empresa', async () => {
    const payment = await http()
      .post(`${ADMIN}/payments`)
      .set(auth(adminToken))
      .send({ organizationId: orgId, amount: 29, status: 'paid', method: 'transfer' })
      .expect(201);
    expect(payment.body.amount).toBe(29);

    await http()
      .patch(`${ADMIN}/payments/${payment.body.id}`)
      .set(auth(adminToken))
      .send({ status: 'refunded' })
      .expect(200);

    const companyPayments = await http()
      .get(`${TENANT}/payments`)
      .set(auth(ownerToken))
      .expect(200);
    expect(companyPayments.body.total).toBe(1);
    expect(companyPayments.body.items[0].status).toBe('refunded');

    const stats = await http().get(`${ADMIN}/billing/stats`).set(auth(adminToken)).expect(200);
    expect(stats.body.revenue.total).toBe(0);
  });

  it('cancela la suscripción', async () => {
    const cancelled = await http()
      .post(`${ADMIN}/subscriptions/${subscriptionId}/cancel`)
      .set(auth(adminToken))
      .send({ immediate: true })
      .expect(201);
    expect(cancelled.body.status).toBe('cancelled');
  });
});
