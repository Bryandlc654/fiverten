import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { hashPassword } from '../src/common/passwords';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const ADMIN_EMAIL = 'root@fiverten.test';
const PASSWORD = 'Secret1234';

describe('FIVERTEN Panel de administración (e2e)', () => {
  type HttpAgent = ReturnType<typeof request>;
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => HttpAgent;
  let adminToken: string;
  const inviteTokens = new Map<string, string>();

  const login = async (email: string, password = PASSWORD): Promise<string> => {
    const response = await http().post('/api/auth/login').send({ email, password }).expect(200);
    return response.body.accessToken as string;
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
      .spyOn(mail, 'sendOrganizationInvitation')
      .mockImplementation(async (to: string, token: string) => {
        inviteTokens.set(to, token);
      });

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "organizations","users","roles","permissions","role_permissions","organization_memberships","organization_invitations","sessions","refresh_tokens","email_verifications","password_reset_tokens","auth_attempts" RESTART IDENTITY CASCADE',
    );
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        username: 'root',
        passwordHash: await hashPassword(PASSWORD),
        isSuperAdmin: true,
        isActive: true,
      },
    });
    adminToken = await login(ADMIN_EMAIL);
  });

  afterAll(async () => {
    await app.close();
  });

  it('el super admin (sin organización) accede a las estadísticas', async () => {
    const response = await http()
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(response.body.users.admins).toBe(1);
  });

  it('ya no acepta fijar la contraseña del propietario', async () => {
    await http()
      .post('/api/admin/organizations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tradeName: 'Con clave', ownerEmail: 'x@clave.test', ownerPassword: 'Secret1234' })
      .expect(400);
  });

  it('crear una empresa con propietario envía una invitación en lugar de crear la cuenta', async () => {
    const ownerEmail = 'duena@panaderia.test';
    const created = await http()
      .post('/api/admin/organizations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tradeName: 'Panadería', ownerEmail })
      .expect(201);
    expect(created.body.ownerInvitationSent).toBe(true);
    expect(await prisma.user.findUnique({ where: { email: ownerEmail } })).toBeNull();

    const detail = await http()
      .get(`/api/admin/organizations/${created.body.id as string}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(detail.body.members).toHaveLength(0);
    expect(detail.body.invitations).toEqual([
      expect.objectContaining({ email: ownerEmail, role: 'owner' }),
    ]);

    await http()
      .post('/api/invitations/accept')
      .send({ token: inviteTokens.get(ownerEmail), password: PASSWORD })
      .expect(200);

    const ownerToken = await login(ownerEmail);
    const me = await http()
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(me.body.organization.tradeName).toBe('Panadería');
    expect(me.body.isOwner).toBe(true);
  });

  it('un usuario de empresa no accede al panel de administración', async () => {
    const ownerToken = await login('duena@panaderia.test');
    await http()
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(403);
  });
});
