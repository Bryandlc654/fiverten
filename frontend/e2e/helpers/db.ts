import { createHash, randomBytes, randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Siembra de datos para los flujos que necesitan una reseña ya publicada,
 * reportada, una incidencia o un caso de evidencias.
 *
 * Por seguridad solo se conecta si defines E2E_DATABASE_URL (o TEST_DATABASE_URL)
 * o si el backend apunta a una base local. Nunca se escribe en una base remota.
 */

function backendEnv(): Record<string, string> {
  try {
    const content = readFileSync(join(__dirname, '../../../backend/.env'), 'utf8');
    const env: Record<string, string> = {};
    for (const line of content.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
    return env;
  } catch {
    return {};
  }
}

function isLocal(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return false;
  }
}

export function databaseUrl(): string | null {
  const explicit = process.env.E2E_DATABASE_URL ?? process.env.TEST_DATABASE_URL;
  if (explicit) return explicit;
  const fromFile = backendEnv().DATABASE_URL;
  if (fromFile && isLocal(fromFile)) return fromFile;
  return null;
}

export function canSeed(): boolean {
  return databaseUrl() !== null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function db(): any {
  if (client) return client;
  const url = databaseUrl();
  if (!url) {
    throw new Error('Define E2E_DATABASE_URL para sembrar datos en los e2e');
  }
  // El cliente Prisma vive en el backend (la app no lo incluye en producción).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require(join(__dirname, '../../../backend/node_modules/@prisma/client'));
  client = new PrismaClient({ datasources: { db: { url } } });
  return client;
}

export function token(prefix = 'e2e'): { plain: string; hash: string } {
  const plain = `${prefix}-${randomBytes(24).toString('hex')}`;
  return { plain, hash: createHash('sha256').update(plain).digest('hex') };
}

export async function organizationBySlug(slug: string) {
  const organization = await db().organization.findUnique({ where: { slug } });
  if (!organization) throw new Error(`No existe la organización ${slug}`);
  return organization;
}

export async function seedPublishedReview(
  slug: string,
  overrides: Partial<{
    rating: number;
    reviewerName: string;
    reviewerEmail: string;
    title: string;
    body: string;
  }> = {},
) {
  const organization = await organizationBySlug(slug);
  return db().review.create({
    data: {
      organizationId: organization.id,
      reviewerName: overrides.reviewerName ?? 'Cliente E2E',
      reviewerEmail: overrides.reviewerEmail ?? `cliente-${Date.now()}@fiverten.test`,
      rating: overrides.rating ?? 5,
      title: overrides.title ?? 'Experiencia E2E',
      body: overrides.body ?? 'Reseña sembrada para las pruebas de extremo a extremo.',
      consent: true,
      lifecycleStatus: 'published',
      visibility: 'public',
      moderationStatus: 'none',
      verificationStatus: 'verified',
      emailConfirmedAt: new Date(),
      publishedAt: new Date(),
    },
  });
}

export async function ensureReportReasons() {
  await db().reportReason.upsert({
    where: { code: 'spam' },
    update: {},
    create: { code: 'spam', label: 'Spam', isActive: true },
  });
}

export async function seedReportedReview(slug: string, body = 'Comentario reportado por spam') {
  const review = await seedPublishedReview(slug, { rating: 4, body });
  const reason = await db().reportReason.upsert({
    where: { code: 'spam' },
    update: {},
    create: { code: 'spam', label: 'Spam', isActive: true },
  });
  await db().reviewReport.create({
    data: {
      reviewId: review.id,
      reasonId: reason.id,
      comment: 'Reporte creado por el e2e',
      status: 'open',
    },
  });
  return db().review.update({
    where: { id: review.id },
    data: { moderationStatus: 'reported' },
  });
}

export async function seedResolution(slug: string, rating = 2) {
  const organization = await organizationBySlug(slug);
  const review = await seedPublishedReview(slug, {
    rating,
    body: 'El pedido llegó incompleto y nadie me respondió.',
    reviewerName: 'Cliente Resolución',
  });
  const access = token('resolucion');
  const resolution = await db().reviewResolution.create({
    data: {
      reviewId: review.id,
      organizationId: organization.id,
      status: 'open',
      tokenHash: access.hash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  await db().resolutionMessage.create({
    data: {
      resolutionId: resolution.id,
      organizationId: organization.id,
      senderType: 'system',
      body: 'La empresa ha abierto una incidencia para resolver tu problema.',
    },
  });
  return { review, resolution, token: access.plain };
}

export async function seedCase(slug: string, status = 'company_notified') {
  const organization = await organizationBySlug(slug);
  const review = await db().review.create({
    data: {
      organizationId: organization.id,
      reviewerName: 'Cliente Caso',
      reviewerEmail: `caso-${Date.now()}@fiverten.test`,
      rating: 1,
      title: 'No recibí el pedido',
      body: 'Pagué y el pedido nunca llegó. Adjunto pruebas en el caso.',
      consent: true,
      lifecycleStatus: 'submitted',
      visibility: 'private',
      moderationStatus: 'under_review',
      emailConfirmedAt: new Date(),
    },
  });
  const clientAccess = token('caso');
  const reviewCase = await db().reviewCase.create({
    data: {
      reviewId: review.id,
      organizationId: organization.id,
      status,
      clientTokenHash: clientAccess.hash,
      clientTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      companyNotifiedAt: status === 'company_notified' ? new Date() : null,
    },
  });
  await db().reviewCaseMessage.create({
    data: {
      caseId: reviewCase.id,
      organizationId: organization.id,
      senderType: 'system',
      body: 'Caso abierto a partir de una reseña de baja valoración.',
    },
  });
  return { review, reviewCase, token: clientAccess.plain };
}

/** Convierte una cuenta recién registrada en super admin de la plataforma. */
export async function promoteToSuperAdmin(email: string): Promise<void> {
  await db().user.update({ where: { email }, data: { isSuperAdmin: true, isFivertenStaff: true } });
}

/** Da acceso de Verificador FIVERTEN (revisión de evidencias). */
export async function promoteToVerifier(email: string): Promise<void> {
  await db().user.update({
    where: { email },
    data: { isVerifier: true, isFivertenStaff: true },
  });
}

/** Da acceso al panel de soporte (rol de plataforma). */
export async function promoteToSupportAgent(email: string): Promise<void> {
  await db().user.update({ where: { email }, data: { isSupportAgent: true } });
}

/** Deja una empresa pública con verificación aprobada, documentos y un proyecto. */
export async function seedApprovedVerification(
  slug: string,
  projectName = 'Proyecto público E2E',
) {
  const organization = await organizationBySlug(slug);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const request = await db().verificationRequest.create({
    data: {
      organizationId: organization.id,
      status: 'approved',
      scope: 'identity,documentation,projects',
      methodologyVersion: 'v1.0',
      submittedAt: now,
      reviewedAt: now,
      expiresAt,
    },
  });

  async function seedDocument(options: {
    category: string;
    projectId?: string;
    evidenceType?: string;
  }) {
    const documentId = randomUUID();
    const evidenceId = randomUUID();
    const data = Buffer.from('%PDF-1.4 test');
    await db().evidence.create({
      data: {
        id: evidenceId,
        organizationId: organization.id,
        requestId: request.id,
        projectId: options.projectId,
        ownerType: options.projectId ? 'project' : 'organization',
        ownerId: options.projectId ?? organization.id,
        type: options.evidenceType ?? options.category,
        fileRef: `db://verification-documents/${documentId}`,
        sourceRef: `${options.category}.pdf`,
        visibility: 'private',
        status: 'verified',
        hash: createHash('sha256').update(data).digest('hex'),
      },
    });
    await db().verificationDocument.create({
      data: {
        id: documentId,
        organizationId: organization.id,
        requestId: request.id,
        projectId: options.projectId,
        evidenceId,
        category: options.category,
        evidenceType: options.evidenceType,
        filename: `${options.category}.pdf`,
        mimeType: 'application/pdf',
        size: data.length,
        data,
      },
    });
  }

  for (const category of ['identity', 'tax', 'address']) {
    await seedDocument({ category });
  }
  const project = await db().verificationProject.create({
    data: {
      organizationId: organization.id,
      requestId: request.id,
      name: projectName,
      description: 'Evidencia pública de prueba',
      url: 'https://example.com/proyecto',
      publicVisibility: 'public',
      verifiedAt: now,
      clientStatus: 'verified',
      evidenceTypes: ['contract'],
    },
  });
  await seedDocument({ category: 'project', projectId: project.id, evidenceType: 'contract' });
  await db().organization.update({
    where: { id: organization.id },
    data: {
      isPublic: true,
      verificationStatus: 'verified',
      verifiedAt: now,
      verificationExpiresAt: expiresAt,
    },
  });
}

/** Añade una certificación externa ya validada para el perfil público. */
export async function seedCertification(
  slug: string,
  overrides: Partial<{
    name: string;
    issuer: string;
    credentialId: string;
    credentialUrl: string;
    issuedAt: Date;
    expiresAt: Date;
  }> = {},
) {
  const organization = await organizationBySlug(slug);
  return db().certification.create({
    data: {
      organizationId: organization.id,
      name: overrides.name ?? 'ISO 9001',
      issuer: overrides.issuer ?? 'AENOR',
      credentialId: overrides.credentialId ?? 'E2E-ISO-9001',
      credentialUrl: overrides.credentialUrl ?? 'https://example.com/credencial',
      issuedAt: overrides.issuedAt ?? new Date(),
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: 'verified',
      reviewedAt: new Date(),
    },
  });
}

/** Crea un plan visible para las pruebas de cambio de plan. */
export async function createPlan(options: {
  code: string;
  name: string;
  priceMonthly?: number;
  reviewLimit?: number | null;
  userLimit?: number | null;
}) {
  return db().plan.create({
    data: {
      code: options.code,
      name: options.name,
      description: 'Plan de prueba E2E',
      priceMonthly: options.priceMonthly ?? 19,
      priceYearly: (options.priceMonthly ?? 19) * 10,
      reviewLimit: options.reviewLimit ?? 1000,
      userLimit: options.userLimit ?? 10,
      isActive: true,
      isPublic: true,
    },
  });
}

/** Asigna el rol indicado a una membresía (por email de usuario y slug de org). */
export async function setMemberRole(slug: string, email: string, baseRole: string): Promise<void> {
  const organization = await organizationBySlug(slug);
  const user = await db().user.findUnique({ where: { email } });
  if (!user) throw new Error(`No existe el usuario ${email}`);
  const role = await db().role.findFirst({
    where: { organizationId: organization.id, baseRole },
  });
  if (!role) throw new Error(`No existe el rol ${baseRole}`);
  await db().organizationMembership.updateMany({
    where: { organizationId: organization.id, userId: user.id },
    data: { roleId: role.id },
  });
}
