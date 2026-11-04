import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { hashPassword } from '../src/common/passwords';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const AUTH = '/api/auth';
const TENANT = '/api/organizations/me';
const PASSWORD = 'Secret1234';

describe('FIVERTEN cambio de plan autoservicio (e2e)', () => {
  type HttpAgent = ReturnType<typeof request>;
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => HttpAgent;
  let ownerToken: string;
  let orgId: string;
  let proPlanId: string;

  const auth = () => ({ Authorization: `Bearer ${ownerToken}` });

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
      'TRUNCATE TABLE "organizations","users","roles","permissions","role_permissions","organization_memberships","organization_invitations","reviews","review_requests","review_campaigns","review_responses","sessions","refresh_tokens","email_verifications","password_reset_tokens","auth_attempts","notifications","review_cases","review_case_messages","review_case_files","review_resolutions","resolution_messages","review_reports","moderation_actions","plans","subscriptions","subscription_events","payments","platform_settings","email_templates","sectors","countries","languages","report_reasons","support_tickets","support_ticket_messages","media_files" RESTART IDENTITY CASCADE',
    );

    const free = await prisma.plan.create({
      data: {
        code: 'free',
        name: 'Free Test',
        priceMonthly: 0,
        priceYearly: 0,
        userLimit: 10,
        reviewLimit: 100,
      },
    });
    expect(free.code).toBe('free');

    const pro = await prisma.plan.create({
      data: {
        code: 'pro-test',
        name: 'Pro Test',
        priceMonthly: 25,
        priceYearly: 250,
        userLimit: 1,
        reviewLimit: 100,
      },
    });
    proPlanId = pro.id;

    const registered = await http()
      .post(`${AUTH}/register`)
      .send({ email: 'plan@fiverten.test', password: PASSWORD, companyName: 'Plan SL' })
      .expect(201);
    orgId = registered.body.organization.id as string;
    ownerToken = registered.body.accessToken as string;

    // El registro crea la suscripción Free si el plan free existe.
    // El plan Free de prueba tiene límite 10, así que se permite una invitación.
    await http()
      .post(`${TENANT}/invitations`)
      .set(auth())
      .send({ email: 'pendiente@plan.test', role: 'viewer' })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('bloquea el cambio si el nuevo plan no cubre los usuarios actuales', async () => {
    const response = await http()
      .post(`${TENANT}/subscription/change`)
      .set(auth())
      .send({ planId: proPlanId })
      .expect(400);
    expect(response.body.message).toContain('usuarios');
  });

  it('permite cambiar de plan tras ajustar el uso', async () => {
    const invitations = await http()
      .get(`${TENANT}/invitations`)
      .set(auth())
      .expect(200);
    const invitationId = invitations.body.invitations[0].id as string;
    await http()
      .delete(`${TENANT}/invitations/${invitationId}`)
      .set(auth())
      .expect(200);

    const changed = await http()
      .post(`${TENANT}/subscription/change`)
      .set(auth())
      .send({ planId: proPlanId })
      .expect(200);
    expect(changed.body.plan).toMatchObject({ code: 'pro-test' });
    expect(changed.body.status).toBe('active');

    const current = await http().get(`${TENANT}/subscription`).set(auth()).expect(200);
    expect(current.body.plan.code).toBe('pro-test');

    const events = await prisma.subscriptionEvent.findMany({
      where: { organizationId: orgId, type: 'plan_changed' },
    });
    expect(events.length).toBeGreaterThan(0);
  });

  it('solo el propietario o un administrador pueden cambiar el plan', async () => {
    const organization = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    const editorRole = await prisma.role.findFirstOrThrow({
      where: { organizationId: orgId, baseRole: 'editor' },
    });
    const editor = await prisma.user.create({
      data: {
        email: 'editor-plan@fiverten.test',
        username: 'editor-plan',
        passwordHash: await hashPassword(PASSWORD),
        defaultOrganizationId: organization.id,
        isActive: true,
      },
    });
    await prisma.organizationMembership.create({
      data: {
        organizationId: orgId,
        userId: editor.id,
        roleId: editorRole.id,
        isActive: true,
      },
    });
    const login = await http()
      .post(`${AUTH}/login`)
      .send({ email: 'editor-plan@fiverten.test', password: PASSWORD })
      .expect(200);

    await http()
      .post(`${TENANT}/subscription/change`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ planId: proPlanId })
      .expect(403);
  });
});
