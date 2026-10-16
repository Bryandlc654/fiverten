import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const AUTH = '/api/auth';
const MEMBERS = '/api/organizations/me/members';
const INVITATIONS = '/api/organizations/me/invitations';
const PUBLIC_INVITATIONS = '/api/invitations';
const OWNER_EMAIL = 'owner@jerarquia.test';
const PASSWORD = 'Secret1234';

interface MemberView {
  membershipId: string;
  email: string;
  role: string;
}

describe('FIVERTEN Miembros e invitaciones (e2e)', () => {
  type HttpAgent = ReturnType<typeof request>;
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => HttpAgent;
  let ownerToken: string;
  let ownerMembershipId: string;
  const inviteTokens = new Map<string, string>();

  const login = async (email: string, password = PASSWORD): Promise<string> => {
    const response = await http().post(`${AUTH}/login`).send({ email, password }).expect(200);
    return response.body.accessToken as string;
  };

  const invite = (token: string, body: Record<string, unknown>) =>
    http().post(INVITATIONS).set('Authorization', `Bearer ${token}`).send(body);

  const acceptNew = (email: string, extra: Record<string, unknown> = {}) =>
    http()
      .post(`${PUBLIC_INVITATIONS}/accept`)
      .send({ token: inviteTokens.get(email), password: PASSWORD, ...extra });

  /** Invita y acepta creando una cuenta nueva; devuelve el access token del nuevo miembro. */
  const inviteAndJoin = async (token: string, email: string, role: string): Promise<string> => {
    await invite(token, { email, role }).expect(201);
    await acceptNew(email).expect(200);
    return login(email);
  };

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
    jest
      .spyOn(mail, 'sendOrganizationInvitation')
      .mockImplementation(async (to: string, token: string) => {
        inviteTokens.set(to, token);
      });

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "organizations","users","roles","permissions","role_permissions","organization_memberships","organization_invitations","sessions","refresh_tokens","email_verifications","password_reset_tokens","auth_attempts" RESTART IDENTITY CASCADE',
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

  describe('flujo de invitación', () => {
    it('el alta directa de miembros ya no existe', async () => {
      await http()
        .post(MEMBERS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'directo@jerarquia.test', password: PASSWORD })
        .expect(404);
    });

    it('invitar no crea usuario ni membresía hasta que el invitado acepta', async () => {
      const email = 'responsable@jerarquia.test';
      const response = await invite(ownerToken, { email, role: 'manager' }).expect(201);
      expect(response.body).toMatchObject({ email, role: 'manager' });
      expect(inviteTokens.get(email)).toEqual(expect.any(String));

      expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
      expect((await listMembers(ownerToken)).some((m) => m.email === email)).toBe(false);

      const pending = await http()
        .get(INVITATIONS)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(pending.body.invitations.map((i: { email: string }) => i.email)).toContain(email);
    });

    it('el invitado ve la invitación y la acepta eligiendo su contraseña', async () => {
      const email = 'responsable@jerarquia.test';
      const preview = await http()
        .post(`${PUBLIC_INVITATIONS}/preview`)
        .send({ token: inviteTokens.get(email) })
        .expect(200);
      expect(preview.body).toMatchObject({
        email,
        role: 'manager',
        hasAccount: false,
        organization: { tradeName: 'Jerarquía S.L.' },
      });

      await acceptNew(email, { firstName: 'Rosa' }).expect(200);
      const members = await listMembers(ownerToken);
      expect(members.find((m) => m.email === email)?.role).toBe('manager');

      const user = await prisma.user.findUnique({ where: { email } });
      expect(user?.emailVerifiedAt).not.toBeNull();
    });

    it('el enlace es de un solo uso', async () => {
      await acceptNew('responsable@jerarquia.test').expect(400);
    });

    it('una invitación cancelada deja de funcionar', async () => {
      const email = 'cancelada@jerarquia.test';
      const created = await invite(ownerToken, { email, role: 'viewer' }).expect(201);
      await http()
        .delete(`${INVITATIONS}/${created.body.id as string}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      await acceptNew(email).expect(400);
    });

    it('un token inventado no sirve', async () => {
      await http()
        .post(`${PUBLIC_INVITATIONS}/preview`)
        .send({ token: 'f'.repeat(64) })
        .expect(400);
    });
  });

  describe('usuarios que ya tienen cuenta', () => {
    const OTHER_EMAIL = 'ajeno@otra.test';
    let otherToken: string;

    beforeAll(async () => {
      await http()
        .post(`${AUTH}/register`)
        .send({ email: OTHER_EMAIL, password: PASSWORD, companyName: 'Otra S.L.' })
        .expect(201);
      otherToken = await login(OTHER_EMAIL);
      await invite(ownerToken, { email: OTHER_EMAIL, role: 'editor' }).expect(201);
    });

    it('no se les añade sin su consentimiento', async () => {
      const members = await listMembers(ownerToken);
      expect(members.some((m) => m.email === OTHER_EMAIL)).toBe(false);
    });

    it('no se puede aceptar creando otra cuenta ni fijarles una contraseña', async () => {
      await acceptNew(OTHER_EMAIL, { password: 'Hackeada123' }).expect(409);
      await login(OTHER_EMAIL); // su contraseña sigue siendo la suya
    });

    it('otro usuario no puede aceptar una invitación que no es suya', async () => {
      await http()
        .post(`${PUBLIC_INVITATIONS}/accept-existing`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ token: inviteTokens.get(OTHER_EMAIL) })
        .expect(403);
    });

    it('el destinatario la acepta con su sesión', async () => {
      const response = await http()
        .post(`${PUBLIC_INVITATIONS}/accept-existing`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ token: inviteTokens.get(OTHER_EMAIL) })
        .expect(200);
      expect(response.body.role).toBe('editor');
      const members = await listMembers(ownerToken);
      expect(members.find((m) => m.email === OTHER_EMAIL)?.role).toBe('editor');
    });
  });

  describe('como responsable (manager)', () => {
    let managerToken: string;

    beforeAll(async () => {
      managerToken = await login('responsable@jerarquia.test');
      await inviteAndJoin(ownerToken, 'pares@jerarquia.test', 'admin');
    });

    it('puede invitar a un editor (rango inferior)', async () => {
      await invite(managerToken, { email: 'editor@jerarquia.test', role: 'editor' }).expect(201);
    });

    it('NO puede invitar a otro propietario (escalada bloqueada)', async () => {
      await invite(managerToken, { email: 'nuevo-owner@jerarquia.test', role: 'owner' }).expect(
        403,
      );
    });

    it('NO puede invitar a un administrador', async () => {
      await invite(managerToken, { email: 'nuevo-admin@jerarquia.test', role: 'admin' }).expect(
        403,
      );
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

  describe('el rol se lee de la base de datos, no del token', () => {
    it('al degradar a alguien pierde los permisos con el mismo access token', async () => {
      const token = await inviteAndJoin(ownerToken, 'degradado@jerarquia.test', 'manager');
      await invite(token, { email: 'antes@jerarquia.test', role: 'viewer' }).expect(201);

      const members = await listMembers(ownerToken);
      const target = members.find((m) => m.email === 'degradado@jerarquia.test')!;
      await http()
        .patch(`${MEMBERS}/${target.membershipId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'viewer' })
        .expect(200);

      await invite(token, { email: 'despues@jerarquia.test', role: 'viewer' }).expect(403);
    });

    it('al expulsar a alguien pierde el acceso a la empresa con el mismo access token', async () => {
      const token = await inviteAndJoin(ownerToken, 'expulsado@jerarquia.test', 'viewer');
      await http().get('/api/organizations/me').set('Authorization', `Bearer ${token}`).expect(200);

      const members = await listMembers(ownerToken);
      const target = members.find((m) => m.email === 'expulsado@jerarquia.test')!;
      await http()
        .delete(`${MEMBERS}/${target.membershipId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      await http().get('/api/organizations/me').set('Authorization', `Bearer ${token}`).expect(403);
      await http().get(MEMBERS).set('Authorization', `Bearer ${token}`).expect(403);
    });
  });
});
