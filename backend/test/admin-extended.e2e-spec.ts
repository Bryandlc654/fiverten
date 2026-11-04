import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const AUTH = '/api/auth';
const ADMIN = '/api/admin';
const PUBLIC = '/api/public';
const PASSWORD = 'Secret1234';

describe('FIVERTEN ficha de empresa del super admin (e2e)', () => {
  type HttpAgent = ReturnType<typeof request>;
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => HttpAgent;
  let adminToken: string;
  let ownerToken: string;
  let orgId: string;
  let slug: string;
  let invitationToken: string;
  let membershipId: string;

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
    jest
      .spyOn(mail, 'sendOrganizationInvitation')
      .mockImplementation(async (_to, token) => {
        invitationToken = token;
      });
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "plans","subscriptions","subscription_events","payments","platform_settings","email_templates","sectors","countries","languages","report_reasons","organizations","users","roles","permissions","role_permissions","organization_memberships","organization_invitations","reviews","review_requests","review_responses","sessions","refresh_tokens","email_verifications","password_reset_tokens","auth_attempts","notifications","review_cases","review_case_messages","review_case_files","review_resolutions","resolution_messages","review_reports","moderation_actions" RESTART IDENTITY CASCADE',
    );

    await http()
      .post(`${AUTH}/register`)
      .send({ email: 'super@fiverten.test', password: PASSWORD, companyName: 'Super Admin' })
      .expect(201);
    await prisma.user.update({
      where: { email: 'super@fiverten.test' },
      data: { isSuperAdmin: true, isFivertenStaff: true },
    });
    const adminLogin = await http()
      .post(`${AUTH}/login`)
      .send({ email: 'super@fiverten.test', password: PASSWORD })
      .expect(200);
    adminToken = adminLogin.body.accessToken as string;

    const owner = await http()
      .post(`${AUTH}/register`)
      .send({ email: 'owner-ext@fiverten.test', password: PASSWORD, companyName: 'Empresa Extendida' })
      .expect(201);
    orgId = owner.body.organization.id as string;
    slug = owner.body.organization.slug as string;
    ownerToken = owner.body.accessToken as string;

    await http()
      .patch('/api/organizations/me')
      .set(auth(ownerToken))
      .send({ isPublic: true })
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  it('muestra estadísticas y reseñas de una empresa', async () => {
    await http()
      .post(`${PUBLIC}/organizations/${slug}/reviews`)
      .send({
        name: 'Cliente Extendido',
        email: 'cliente-ext@fiverten.test',
        rating: 5,
        body: 'Una experiencia excelente de principio a fin.',
        consent: true,
      })
      .expect(201);

    const stats = await http()
      .get(`${ADMIN}/organizations/${orgId}/stats`)
      .set(auth(adminToken))
      .expect(200);
    expect(stats.body.rating.total).toBe(0);

    const reviews = await http()
      .get(`${ADMIN}/organizations/${orgId}/reviews`)
      .set(auth(adminToken))
      .expect(200);
    expect(reviews.body.total).toBe(1);
    expect(reviews.body.items[0].reviewerName).toBe('Cliente Extendido');
  });

  it('invita, cambia el rol y elimina miembros desde la ficha', async () => {
    await http()
      .post(`${ADMIN}/organizations/${orgId}/invitations`)
      .set(auth(adminToken))
      .send({ email: 'miembro-ext@fiverten.test', role: 'manager', firstName: 'Miembro' })
      .expect(201);
    expect(invitationToken).toBeTruthy();

    await http()
      .post('/api/invitations/accept')
      .send({ token: invitationToken, password: PASSWORD, firstName: 'Miembro' })
      .expect(200);

    const detail = await http()
      .get(`${ADMIN}/organizations/${orgId}`)
      .set(auth(adminToken))
      .expect(200);
    const member = detail.body.members.find(
      (item: { email: string }) => item.email === 'miembro-ext@fiverten.test',
    );
    expect(member).toBeTruthy();
    membershipId = member.membershipId;

    const updated = await http()
      .patch(`${ADMIN}/organizations/${orgId}/members/${membershipId}`)
      .set(auth(adminToken))
      .send({ role: 'editor' })
      .expect(200);
    expect(updated.body.role).toBe('editor');

    await http()
      .delete(`${ADMIN}/organizations/${orgId}/members/${membershipId}`)
      .set(auth(adminToken))
      .expect(200);
  });
});
