import { Prisma, PrismaClient } from '@prisma/client';
import {
  APP_ROLE,
  APP_ROLE_PASSWORD,
  RLS_EXEMPT_TABLES,
  rlsStatements,
} from '../prisma/rls/setup-statements';

const ADMIN_URL = process.env.DATABASE_URL as string;
const APP_URL = process.env.APP_DATABASE_URL as string;

interface AppContext {
  user?: string;
  org?: string;
  platform?: boolean;
}

async function setContext(tx: Prisma.TransactionClient, context: AppContext): Promise<void> {
  await tx.$queryRaw`SELECT
    set_config('app.current_user', ${context.user ?? ''}, true),
    set_config('app.current_org', ${context.org ?? ''}, true),
    set_config('app.is_platform_admin', ${context.platform ? 'true' : 'false'}, true)`;
}

describe('RLS - aislamiento multi-tenant (e2e)', () => {
  const admin = new PrismaClient({ datasources: { db: { url: ADMIN_URL } } });
  const app = new PrismaClient({ datasources: { db: { url: APP_URL } } });

  const suffix = Date.now().toString(36);
  const created = {
    orgs: [] as string[],
    users: [] as string[],
    roles: [] as string[],
    memberships: [] as string[],
    sessions: [] as string[],
    tokens: [] as string[],
    invitations: [] as string[],
  };

  let orgA: { id: string };
  let orgB: { id: string };
  let userA: { id: string };
  let userB: { id: string };

  beforeAll(async () => {
    const role = (await admin.$queryRawUnsafe(
      `SELECT 1 FROM pg_roles WHERE rolname = '${APP_ROLE}'`,
    )) as unknown[];
    if (role.length === 0) {
      await admin.$executeRawUnsafe(
        `CREATE ROLE ${APP_ROLE} LOGIN PASSWORD '${APP_ROLE_PASSWORD}' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`,
      );
    }
    for (const statement of rlsStatements) {
      await admin.$executeRawUnsafe(statement);
    }
    const dbName = (await admin.$queryRawUnsafe('SELECT current_database() AS name')) as {
      name: string;
    }[];
    await admin.$executeRawUnsafe(`GRANT CONNECT ON DATABASE "${dbName[0].name}" TO ${APP_ROLE}`);

    orgA = await admin.organization.create({
      data: { publicId: `RA${suffix}`, tradeName: 'Org A', slug: `org-a-${suffix}`, status: 'active' },
      select: { id: true },
    });
    orgB = await admin.organization.create({
      data: { publicId: `RB${suffix}`, tradeName: 'Org B', slug: `org-b-${suffix}`, status: 'active' },
      select: { id: true },
    });
    created.orgs.push(orgA.id, orgB.id);

    const roleA = await admin.role.create({
      data: { organizationId: orgA.id, name: 'Admin A', slug: `admin-a-${suffix}`, scope: 'organization' },
      select: { id: true },
    });
    const roleB = await admin.role.create({
      data: { organizationId: orgB.id, name: 'Admin B', slug: `admin-b-${suffix}`, scope: 'organization' },
      select: { id: true },
    });
    created.roles.push(roleA.id, roleB.id);

    userA = await admin.user.create({
      data: { email: `user-a-${suffix}@test.local`, username: `user_a_${suffix}`, passwordHash: 'x' },
      select: { id: true },
    });
    userB = await admin.user.create({
      data: { email: `user-b-${suffix}@test.local`, username: `user_b_${suffix}`, passwordHash: 'x' },
      select: { id: true },
    });
    created.users.push(userA.id, userB.id);

    const membershipA = await admin.organizationMembership.create({
      data: { organizationId: orgA.id, userId: userA.id, roleId: roleA.id, isOwner: true },
      select: { id: true },
    });
    const membershipB = await admin.organizationMembership.create({
      data: { organizationId: orgB.id, userId: userB.id, roleId: roleB.id, isOwner: true },
      select: { id: true },
    });
    created.memberships.push(membershipA.id, membershipB.id);

    const sessionA = await admin.session.create({
      data: { userId: userA.id, organizationId: orgA.id, sessionTokenHash: `sess-a-${suffix}`, expiresAt: new Date(Date.now() + 86400000) },
      select: { id: true },
    });
    const sessionB = await admin.session.create({
      data: { userId: userB.id, organizationId: orgB.id, sessionTokenHash: `sess-b-${suffix}`, expiresAt: new Date(Date.now() + 86400000) },
      select: { id: true },
    });
    created.sessions.push(sessionA.id, sessionB.id);

    const tokenA = await admin.refreshToken.create({
      data: { userId: userA.id, sessionId: sessionA.id, tokenHash: `tok-a-${suffix}`, expiresAt: new Date(Date.now() + 86400000) },
      select: { id: true },
    });
    const tokenB = await admin.refreshToken.create({
      data: { userId: userB.id, sessionId: sessionB.id, tokenHash: `tok-b-${suffix}`, expiresAt: new Date(Date.now() + 86400000) },
      select: { id: true },
    });
    created.tokens.push(tokenA.id, tokenB.id);

    const invitationB = await admin.organizationInvitation.create({
      data: {
        organizationId: orgB.id,
        email: `inv-b-${suffix}@test.local`,
        role: 'viewer',
        tokenHash: `inv-b-${suffix}`,
        expiresAt: new Date(Date.now() + 86400000),
      },
      select: { id: true },
    });
    created.invitations.push(invitationB.id);
  });

  afterAll(async () => {
    await admin.organizationInvitation.deleteMany({ where: { id: { in: created.invitations } } });
    await admin.refreshToken.deleteMany({ where: { id: { in: created.tokens } } });
    await admin.session.deleteMany({ where: { id: { in: created.sessions } } });
    await admin.organizationMembership.deleteMany({ where: { id: { in: created.memberships } } });
    await admin.role.deleteMany({ where: { id: { in: created.roles } } });
    await admin.organization.deleteMany({ where: { id: { in: created.orgs } } });
    await admin.user.deleteMany({ where: { id: { in: created.users } } });
    await admin.$disconnect();
    await app.$disconnect();
  });

  it('el rol de aplicacion no es superusuario ni omite RLS', async () => {
    const rows = (await admin.$queryRawUnsafe(
      `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = '${APP_ROLE}'`,
    )) as { rolsuper: boolean; rolbypassrls: boolean }[];
    expect(rows[0].rolsuper).toBe(false);
    expect(rows[0].rolbypassrls).toBe(false);
  });

  it('sin contexto no expone ninguna fila', async () => {
    await expect(app.organization.count()).resolves.toBe(0);
    await expect(app.session.count()).resolves.toBe(0);
    await expect(app.refreshToken.count()).resolves.toBe(0);
    await expect(app.user.count()).resolves.toBe(0);
    await expect(app.organizationInvitation.count()).resolves.toBe(0);
    await expect(app.emailVerification.count()).resolves.toBe(0);
    await expect(app.passwordResetToken.count()).resolves.toBe(0);
    await expect(app.authAttempt.count()).resolves.toBe(0);
  });

  it('todas las tablas del esquema tienen RLS activada', async () => {
    const rows = (await admin.$queryRawUnsafe(
      `SELECT c.relname AS name
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity`,
    )) as { name: string }[];
    const missing = rows.map((row) => row.name).filter((name) => !RLS_EXEMPT_TABLES.includes(name));
    // Si falla: añade la política de la tabla nueva en prisma/rls/setup-statements.ts
    // (tenantTablePolicy / userTablePolicy) y ejecuta npm run db:rls.
    expect(missing).toEqual([]);
  });

  it('un usuario solo ve su propia fila de users', async () => {
    const ids = await app.$transaction(async (tx) => {
      await setContext(tx, { user: userA.id });
      return tx.user.findMany({ select: { id: true } });
    });
    expect(ids.map((row) => row.id)).toEqual([userA.id]);
  });

  it('en el contexto de una organización solo se ven sus miembros', async () => {
    const ids = await app.$transaction(async (tx) => {
      await setContext(tx, { org: orgA.id });
      return tx.user.findMany({ select: { id: true } });
    });
    expect(ids.map((row) => row.id)).toEqual([userA.id]);
  });

  it('un usuario no puede modificar la fila de otro', async () => {
    const result = await app.$transaction(async (tx) => {
      await setContext(tx, { user: userA.id, org: orgA.id });
      return tx.user.updateMany({ where: { id: userB.id }, data: { firstName: 'Hackeado' } });
    });
    expect(result.count).toBe(0);
  });

  it('las invitaciones solo son visibles para su organización', async () => {
    const counts = await app.$transaction(async (tx) => {
      await setContext(tx, { org: orgA.id });
      const fromA = await tx.organizationInvitation.count();
      await setContext(tx, { org: orgB.id });
      const fromB = await tx.organizationInvitation.count();
      return { fromA, fromB };
    });
    expect(counts).toEqual({ fromA: 0, fromB: 1 });
  });

  it('aísla las organizaciones por app.current_org', async () => {
    const result = await app.$transaction(async (tx) => {
      await setContext(tx, { org: orgA.id });
      const visible = await tx.organization.findMany({ select: { id: true } });
      const other = await tx.organization.count({ where: { id: orgB.id } });
      return { visible, other };
    });

    expect(result.visible.map((row) => row.id)).toEqual([orgA.id]);
    expect(result.other).toBe(0);
  });

  it('aísla sesiones y tokens por app.current_user', async () => {
    const result = await app.$transaction(async (tx) => {
      await setContext(tx, { user: userA.id });
      const sessions = await tx.session.findMany({ select: { userId: true } });
      const tokens = await tx.refreshToken.findMany({ select: { userId: true } });
      const orgs = await tx.organization.count();
      return { sessions, tokens, orgs };
    });

    expect(result.sessions.length).toBeGreaterThan(0);
    expect(result.sessions.every((row) => row.userId === userA.id)).toBe(true);
    expect(result.tokens.length).toBeGreaterThan(0);
    expect(result.tokens.every((row) => row.userId === userA.id)).toBe(true);
    expect(result.orgs).toBe(0);
  });

  it('el usuario puede ver su propia membresía pero no la ajena', async () => {
    const result = await app.$transaction(async (tx) => {
      await setContext(tx, { user: userA.id });
      return tx.organizationMembership.findMany({ select: { organizationId: true } });
    });

    expect(result.map((row) => row.organizationId)).toEqual([orgA.id]);
  });

  it('aísla los roles por organización/pertenencia', async () => {
    const result = await app.$transaction(async (tx) => {
      await setContext(tx, { user: userA.id, org: orgA.id });
      return tx.role.findMany({ select: { id: true } });
    });

    const ids = result.map((row) => row.id);
    expect(ids).toContain(created.roles[0]);
    expect(ids).not.toContain(created.roles[1]);
  });

  it('sin contexto no expone roles', async () => {
    await expect(app.role.count()).resolves.toBe(0);
  });

  it('app.is_platform_admin=true permite ver todas las organizaciones', async () => {
    const count = await app.$transaction(async (tx) => {
      await setContext(tx, { platform: true });
      return tx.organization.count();
    });

    expect(count).toBeGreaterThanOrEqual(2);
  });
});
