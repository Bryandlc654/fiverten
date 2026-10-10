import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const AUTH = '/api/auth';
const MEMBERS = '/api/organizations/me/members';
const OWNER_EMAIL = 'owner@jerarquia.test';
const PASSWORD = 'Secret1234';

interface MemberView {
  membershipId: string;
  email: string;
  role: string;
}

describe('FIVERTEN Jerarquía de miembros (e2e)', () => {
  type HttpAgent = ReturnType<typeof request>;
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => HttpAgent;
  let ownerToken: string;
  let ownerMembershipId: string;

  const login = async (email: string, password = PASSWORD): Promise<string> => {
    const response = await http().post(`${AUTH}/login`).send({ email, password }).expect(200);
    return response.body.accessToken as string;
  };

  const addMember = (token: string, body: Record<string, unknown>) =>
    http().post(MEMBERS).set('Authorization', `Bearer ${token}`).send(body);

  const listMembers = async (token: string): Promise<MemberView[]> => {
    const response = await http()
      .get(MEMBERS)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return response.body.members as MemberView[];
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
    jest.spyOn(mail, 'sendPasswordReset').mockResolvedValue(undefined);

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "organizations","users","roles","permissions","role_permissions","organization_memberships","sessions","refresh_tokens","email_verifications","password_reset_tokens","auth_attempts" RESTART IDENTITY CASCADE',
    );

    await http()
      .post(`${AUTH}/register`)
      .send({ email: OWNER_EMAIL, password: PASSWORD, companyName: 'Jerarquía S.L.' })
      .expect(201);

    ownerToken = await login(OWNER_EMAIL);
    const owner = await listMembers(ownerToken);
    ownerMembershipId = owner.find((member) => member.email === OWNER_EMAIL)!.membershipId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('el propietario puede añadir un responsable (manager)', async () => {
    const response = await addMember(ownerToken, {
      email: 'responsable@jerarquia.test',
      password: PASSWORD,
      role: 'manager',
    }).expect(201);
    expect(response.body.role).toBe('manager');
  });

  it('el propietario puede añadir un administrador', async () => {
    const response = await addMember(ownerToken, {
      email: 'pares@jerarquia.test',
      password: PASSWORD,
      role: 'admin',
    }).expect(201);
    expect(response.body.role).toBe('admin');
  });

  describe('como responsable (manager)', () => {
    let managerToken: string;

    beforeAll(async () => {
      managerToken = await login('responsable@jerarquia.test');
    });

    it('puede añadir un editor (rango inferior)', async () => {
      const response = await addMember(managerToken, {
        email: 'editor@jerarquia.test',
        password: PASSWORD,
        role: 'editor',
      }).expect(201);
      expect(response.body.role).toBe('editor');
    });

    it('NO puede crear otro propietario (escalada bloqueada)', async () => {
      await addMember(managerToken, {
        email: 'nuevo-owner@jerarquia.test',
        password: PASSWORD,
        role: 'owner',
      }).expect(403);
    });

    it('NO puede crear un administrador', async () => {
      await addMember(managerToken, {
        email: 'nuevo-admin@jerarquia.test',
        password: PASSWORD,
        role: 'admin',
      }).expect(403);
    });

    it('NO puede ascenderse a sí mismo ni a un par a propietario', async () => {
      const members = await listMembers(managerToken);
      const admin = members.find((member) => member.email === 'pares@jerarquia.test')!;
      await http()
        .patch(`${MEMBERS}/${admin.membershipId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ role: 'owner' })
        .expect(403);
    });

    it('NO puede desactivar al propietario', async () => {
      await http()
        .patch(`${MEMBERS}/${ownerMembershipId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ isActive: false })
        .expect(403);
    });

    it('NO puede eliminar al propietario', async () => {
      await http()
        .delete(`${MEMBERS}/${ownerMembershipId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });
  });

  it('el propietario sí puede degradar a un administrador', async () => {
    const members = await listMembers(ownerToken);
    const admin = members.find((member) => member.email === 'pares@jerarquia.test')!;
    const response = await http()
      .patch(`${MEMBERS}/${admin.membershipId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ role: 'viewer' })
      .expect(200);
    expect(response.body.role).toBe('viewer');
  });
});
