import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const AUTH = '/api/auth';
const ORG = '/api/organizations/me';
const VERIFY = '/api/organizations/me/verification';
const ADMIN = '/api/admin/verifications';
const PASSWORD = 'Secret1234';

describe('FIVERTEN modelo completo (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let companyToken: string;
  let adminToken: string;
  let publicId: string;
  let projectId: string;

  const company = () => ({ Authorization: `Bearer ${companyToken}` });
  const admin = () => ({ Authorization: `Bearer ${adminToken}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0);

    prisma = app.get(PrismaService);
    jest.spyOn(app.get(MailService), 'sendEmailVerification').mockResolvedValue(undefined);

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "organization_locations","client_relations","public_badges","evidence","analytics_events","verification_requests","verification_documents","verification_projects","certifications","verification_inquiries","organizations","users","roles","permissions","role_permissions","organization_memberships","organization_invitations","reviews","review_requests","review_campaigns","review_revisions","review_responses","sessions","refresh_tokens","email_verifications","password_reset_tokens","auth_attempts","notifications","review_cases","review_case_messages","review_case_files","review_resolutions","resolution_messages","review_reports","moderation_actions","plans","subscriptions","subscription_events","payments","platform_settings","email_templates","sectors","countries","languages","report_reasons","support_tickets","support_ticket_messages","media_files" RESTART IDENTITY CASCADE',
    );

    const registered = await request(app.getHttpServer())
      .post(`${AUTH}/register`)
      .send({
        email: 'modelo@fiverten.test',
        password: PASSWORD,
        companyName: 'Modelo Completo SL',
      })
      .expect(201);
    companyToken = registered.body.accessToken as string;
    publicId = registered.body.organization.publicId as string;

    await request(app.getHttpServer())
      .post(`${AUTH}/register`)
      .send({
        email: 'modelo-admin@fiverten.test',
        password: PASSWORD,
        companyName: 'Admin Modelo',
      })
      .expect(201);
    await prisma.user.update({
      where: { email: 'modelo-admin@fiverten.test' },
      data: { isSuperAdmin: true, isFivertenStaff: true },
    });
    const login = await request(app.getHttpServer())
      .post(`${AUTH}/login`)
      .send({ email: 'modelo-admin@fiverten.test', password: PASSWORD })
      .expect(200);
    adminToken = login.body.accessToken as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('gestiona ubicaciones de la organización', async () => {
    const created = await request(app.getHttpServer())
      .post(`${ORG}/locations`)
      .set(company())
      .send({
        label: 'Oficina central',
        addressLine: 'Calle Mayor 1',
        city: 'Madrid',
        region: 'Madrid',
        postalCode: '28001',
        country: 'España',
        isPublic: true,
      })
      .expect(201);
    expect(created.body.isPrimary).toBe(true);
    expect(created.body.isPublic).toBe(true);

    const second = await request(app.getHttpServer())
      .post(`${ORG}/locations`)
      .set(company())
      .send({ label: 'Delegación', city: 'Barcelona', isPrimary: true })
      .expect(201);
    expect(second.body.isPrimary).toBe(true);

    const detail = await request(app.getHttpServer()).get(ORG).set(company()).expect(200);
    expect(detail.body.locations).toHaveLength(2);
    expect(
      detail.body.locations.filter((item: { isPrimary: boolean }) => item.isPrimary),
    ).toHaveLength(1);
    expect(
      detail.body.locations.filter((item: { isPublic: boolean }) => item.isPublic),
    ).toHaveLength(1);

    await request(app.getHttpServer())
      .delete(`${ORG}/locations/${created.body.id}`)
      .set(company())
      .expect(200);
  });

  it('crea evidencia, documento con versión y metadatos, y proyecto verificable', async () => {
    for (const category of ['identity', 'tax', 'address']) {
      await request(app.getHttpServer())
        .post(`${VERIFY}/documents`)
        .set(company())
        .field('category', category)
        .field('issuer', 'Organismo emisor')
        .field('documentNumber', `DOC-${category}`)
        .field('issueDate', '2025-01-01')
        .field('expiryDate', '2030-01-01')
        .attach('file', Buffer.from(`%PDF-1.4 ${category}`), {
          filename: `${category}.pdf`,
          contentType: 'application/pdf',
        })
        .expect(201);
    }

    const project = await request(app.getHttpServer())
      .post(`${VERIFY}/projects`)
      .set(company())
      .send({
        name: 'Proyecto modelo',
        projectType: 'reforma_integral',
        city: 'Madrid',
        location: 'Calle Mayor 1, Madrid',
        startDate: '2025-02-01',
        endDate: '2025-06-30',
        publicVisibility: 'public',
      })
      .expect(201);
    projectId = project.body.id as string;

    await request(app.getHttpServer())
      .post(`${VERIFY}/projects/${projectId}/documents`)
      .set(company())
      .field('evidenceType', 'contract')
      .attach('file', Buffer.from('%PDF-1.4 contract'), {
        filename: 'contrato.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const status = await request(app.getHttpServer()).get(VERIFY).set(company()).expect(200);
    const document = status.body.request.documents[0];
    expect(document).toMatchObject({
      category: 'identity',
      issuer: 'Organismo emisor',
      documentNumber: 'DOC-identity',
      version: 1,
    });
    expect(document.evidence.status).toBe('submitted');
    expect(document.evidence.hash).toHaveLength(64);
    expect(document.evidence.fileRef).toContain('verification-documents');
    expect(status.body.request.projects[0]).toMatchObject({
      location: 'Calle Mayor 1, Madrid',
      publicVisibility: 'public',
    });
    expect(status.body.request.projects[0].documents[0].evidence.status).toBe('submitted');
  });

  it('crea y gestiona relaciones con clientes', async () => {
    const created = await request(app.getHttpServer())
      .post(`${ORG}/client-relations`)
      .set(company())
      .send({
        projectId,
        contactName: 'Cliente Modelo',
        contactEmail: 'cliente-modelo@test.local',
        consent: true,
        verificationLevel: 'identified',
      })
      .expect(201);
    expect(created.body).toMatchObject({
      projectName: 'Proyecto modelo',
      status: 'active',
      consent: true,
      verificationLevel: 'identified',
    });

    const updated = await request(app.getHttpServer())
      .patch(`${ORG}/client-relations/${created.body.id}`)
      .set(company())
      .send({ status: 'completed', verificationLevel: 'verified' })
      .expect(200);
    expect(updated.body).toMatchObject({
      status: 'completed',
      verificationLevel: 'verified',
    });

    const list = await request(app.getHttpServer())
      .get(`${ORG}/client-relations?projectId=${projectId}`)
      .set(company())
      .expect(200);
    expect(list.body.items).toHaveLength(1);
  });

  it('aprueba, genera badge con token independiente y actualiza evidencias', async () => {
    const submitted = await request(app.getHttpServer())
      .post(`${VERIFY}/submit`)
      .set(company())
      .expect(200);
    const requestId = submitted.body.id as string;

    await request(app.getHttpServer())
      .post(`${ADMIN}/${requestId}/approve`)
      .set(admin())
      .send({
        expiresInDays: 365,
        scope: 'identity,documentation,projects',
        methodologyVersion: 'v2.0',
        note: 'Modelo completo validado',
      })
      .expect(200);

    const status = await request(app.getHttpServer()).get(VERIFY).set(company()).expect(200);
    expect(status.body.badge).toMatchObject({ state: 'active' });
    expect(status.body.badge.embedToken).toBeTruthy();
    expect(status.body.badge.embedToken).not.toBe(publicId);
    expect(status.body.request).toMatchObject({
      scope: 'identity,documentation,projects',
      methodologyVersion: 'v2.0',
    });
    expect(
      status.body.request.documents.every(
        (doc: { evidence: { status: string } }) => doc.evidence.status === 'verified',
      ),
    ).toBe(true);
    expect(status.body.request.projects[0].evidenceTypes).toEqual(['contract']);
    expect(status.body.request.projects[0].verificationReviewerId).toBeTruthy();

    await request(app.getHttpServer())
      .get(`/api/seal/${status.body.badge.embedToken}.svg`)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/widget/${status.body.badge.embedToken}.js`)
      .expect(200);
  });

  it('revoca el badge y las evidencias', async () => {
    const status = await request(app.getHttpServer()).get(VERIFY).set(company()).expect(200);
    const requestId = status.body.request.id as string;
    const badgeToken = status.body.badge.embedToken as string;

    await request(app.getHttpServer())
      .post(`${ADMIN}/${requestId}/revoke`)
      .set(admin())
      .send({ reason: 'Revocación de prueba' })
      .expect(200);

    const revoked = await request(app.getHttpServer()).get(VERIFY).set(company()).expect(200);
    expect(revoked.body.badge).toMatchObject({ state: 'revoked' });
    expect(revoked.body.request.documents[0].evidence.status).toBe('expired');

    await request(app.getHttpServer()).get(`/api/seal/${badgeToken}.svg`).expect(404);
  });

  it('mantiene los datos de clientes aislados por organización', async () => {
    const other = await request(app.getHttpServer())
      .post(`${AUTH}/register`)
      .send({ email: 'modelo-otra@fiverten.test', password: PASSWORD, companyName: 'Otra Modelo' })
      .expect(201);
    const otherToken = other.body.accessToken as string;

    const list = await request(app.getHttpServer())
      .get(`${ORG}/client-relations`)
      .set({ Authorization: `Bearer ${otherToken}` })
      .expect(200);
    expect(list.body.items).toEqual([]);
  });
});
