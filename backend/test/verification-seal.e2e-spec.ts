import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { hashToken } from '../src/common/tokens';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const AUTH = '/api/auth';
const VERIFY = '/api/organizations/me/verification';
const ADMIN = '/api/admin/verifications';
const PASSWORD = 'Secret1234';

describe('FIVERTEN verificación y sello (e2e)', () => {
  type HttpAgent = ReturnType<typeof request>;
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => HttpAgent;
  let companyToken: string;
  let adminToken: string;
  let verifierToken: string;
  let publicId: string;
  let slug: string;
  let requestId: string;

  const company = () => ({ Authorization: `Bearer ${companyToken}` });
  const admin = () => ({ Authorization: `Bearer ${adminToken}` });

  const upload = (category: string) =>
    http()
      .post(`${VERIFY}/documents`)
      .set(company())
      .field('category', category)
      .attach('file', Buffer.from(`%PDF-1.4 ${category}`), {
        filename: `${category}.pdf`,
        contentType: 'application/pdf',
      });

  const svgText = (response: request.Response): string =>
    response.text ?? Buffer.from(response.body as Buffer).toString('utf8');

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.listen(0);

    prisma = app.get(PrismaService);
    http = () => request(app.getHttpServer());
    const mail = app.get(MailService);
    jest.spyOn(mail, 'sendEmailVerification').mockResolvedValue(undefined);
    jest.spyOn(mail, 'sendVerificationInquiry').mockResolvedValue(undefined);

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "verification_requests","verification_documents","verification_projects","certifications","verification_inquiries","organizations","users","roles","permissions","role_permissions","organization_memberships","organization_invitations","reviews","review_requests","review_campaigns","review_responses","sessions","refresh_tokens","email_verifications","password_reset_tokens","auth_attempts","notifications","review_cases","review_case_messages","review_case_files","review_resolutions","resolution_messages","review_reports","moderation_actions","plans","subscriptions","subscription_events","payments","platform_settings","email_templates","sectors","countries","languages","report_reasons","support_tickets","support_ticket_messages","media_files" RESTART IDENTITY CASCADE',
    );

    const registered = await http()
      .post(`${AUTH}/register`)
      .send({ email: 'seal@fiverten.test', password: PASSWORD, companyName: 'Sello SL' })
      .expect(201);
    companyToken = registered.body.accessToken as string;
    publicId = registered.body.organization.publicId as string;
    slug = registered.body.organization.slug as string;

    await http()
      .patch('/api/organizations/me')
      .set(company())
      .send({ isPublic: true })
      .expect(200);

    await http()
      .post(`${AUTH}/register`)
      .send({ email: 'seal-admin@fiverten.test', password: PASSWORD, companyName: 'Admin Seal' })
      .expect(201);
    await prisma.user.update({
      where: { email: 'seal-admin@fiverten.test' },
      data: { isSuperAdmin: true, isFivertenStaff: true },
    });
    const login = await http()
      .post(`${AUTH}/login`)
      .send({ email: 'seal-admin@fiverten.test', password: PASSWORD })
      .expect(200);
    adminToken = login.body.accessToken as string;

    await http()
      .post(`${AUTH}/register`)
      .send({ email: 'seal-verifier@fiverten.test', password: PASSWORD, companyName: 'Verificador Seal' })
      .expect(201);
    await prisma.user.update({
      where: { email: 'seal-verifier@fiverten.test' },
      data: { isVerifier: true, isFivertenStaff: true },
    });
    const verifierLogin = await http()
      .post(`${AUTH}/login`)
      .send({ email: 'seal-verifier@fiverten.test', password: PASSWORD })
      .expect(200);
    verifierToken = verifierLogin.body.accessToken as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('exige documentos y proyectos antes de enviar', async () => {
    const status = await http().get(VERIFY).set(company()).expect(200);
    expect(status.body.status).toBe('not_verified');
    expect(status.body.canSubmit).toBe(true);

    await http().post(`${VERIFY}/submit`).set(company()).expect(400);
  });

  it('permite subir documentación, proyectos y enviar la solicitud', async () => {
    await upload('identity').expect(201);
    await upload('tax').expect(201);
    await upload('address').expect(201);

    const project = await http()
      .post(`${VERIFY}/projects`)
      .set(company())
      .send({
        name: 'Proyecto de prueba',
        description: 'Evidencia del servicio prestado',
        url: 'https://example.com/proyecto',
        projectType: 'reforma_integral',
        city: 'Madrid',
        year: 2024,
        status: 'completed',
      })
      .expect(201);

    await http()
      .post(`${VERIFY}/projects/${project.body.id}/documents`)
      .set(company())
      .field('evidenceType', 'contract')
      .attach('file', Buffer.from('%PDF-1.4 evidencia'), {
        filename: 'evidencia.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const submitted = await http().post(`${VERIFY}/submit`).set(company()).expect(200);
    requestId = submitted.body.id as string;
    expect(submitted.body.status).toBe('submitted');
    expect(submitted.body.events[0]).toMatchObject({
      action: 'submitted',
      newStatus: 'pending',
      dataOrigin: 'company_submitted',
    });

    const status = await http().get(VERIFY).set(company()).expect(200);
    expect(status.body.status).toBe('pending');
    expect(status.body.canSubmit).toBe(false);
  });

  it('el super admin revisa, aprueba y genera el sello', async () => {
    const list = await http().get(ADMIN).set(admin()).expect(200);
    expect(list.body.total).toBe(1);

    const detail = await http()
      .get(`${ADMIN}/${requestId}`)
      .set(admin())
      .expect(200);
    expect(detail.body.documents).toHaveLength(4);
    expect(detail.body.projects).toHaveLength(1);
    expect(detail.body.projects[0].documents).toHaveLength(1);
    expect(detail.body.projects[0].documents[0].filename).toBe('evidencia.pdf');

    const approved = await http()
      .post(`${ADMIN}/${requestId}/approve`)
      .set(admin())
      .send({ expiresInDays: 365, note: 'Documentación correcta' })
      .expect(200);
    expect(approved.body.status).toBe('approved');
    expect(approved.body.events[0]).toMatchObject({
      action: 'approved',
      previousStatus: 'pending',
      newStatus: 'verified',
      dataOrigin: 'fiverten_verified',
    });

    const verifierList = await http()
      .get(ADMIN)
      .set({ Authorization: `Bearer ${verifierToken}` })
      .expect(200);
    expect(verifierList.body.total).toBeGreaterThanOrEqual(0);
    await http()
      .get('/api/admin/stats')
      .set({ Authorization: `Bearer ${verifierToken}` })
      .expect(403);

    const status = await http().get(VERIFY).set(company()).expect(200);
    expect(status.body.status).toBe('verified');

    const publicData = await http()
      .get(`/api/public/organizations/${slug}/verification`)
      .expect(200);
    expect(publicData.body.status).toBe('verified');
    expect(publicData.body.categories).toHaveLength(3);
    expect(publicData.body.projects[0]).toMatchObject({
      name: 'Proyecto de prueba',
      projectType: 'reforma_integral',
      city: 'Madrid',
      year: 2024,
      status: 'completed',
      clientStatus: 'identified',
      evidenceCount: 1,
      evidenceTypes: ['contract'],
    });
    // Nunca se exponen nombres de documentos privados.
    expect(JSON.stringify(publicData.body)).not.toContain('identity.pdf');

    const directory = await http()
      .get('/api/public/organizations?verified=true')
      .expect(200);
    expect(directory.body.facets.metrics.verifiedCompanies).toBeGreaterThanOrEqual(1);
    expect(directory.body.items[0]).toMatchObject({
      slug,
      verified: true,
      publicId,
      projectsCount: 1,
      documentsCount: 4,
      rating: { total: 0 },
    });

    const svg = await http().get(`/api/seal/${publicId}.svg`).expect(200);
    expect(svg.headers['content-type']).toContain('image/svg+xml');
    expect(svgText(svg)).toContain('Empresa verificada');
    expect(svgText(svg)).toContain('Sello SL');

    const png = await http().get(`/api/seal/${publicId}.png`).expect(200);
    expect(png.headers['content-type']).toContain('image/png');
    expect(png.body.length).toBeGreaterThan(100);
  });

  it('valida certificaciones externas y las publica solo tras aprobarlas', async () => {
    const created = await http()
      .post(`${VERIFY}/certifications`)
      .set(company())
      .send({
        name: 'ISO 9001',
        issuer: 'AENOR',
        credentialId: 'ISO-123',
        credentialUrl: 'https://example.com/credencial',
        issuedAt: '2025-01-01',
        expiresAt: '2027-01-01',
      })
      .expect(201);
    expect(created.body.status).toBe('pending');

    const pending = await http()
      .get(`${ADMIN}/certifications?status=pending`)
      .set(admin())
      .expect(200);
    expect(pending.body.total).toBe(1);

    await http()
      .post(`${ADMIN}/certifications/${created.body.id}/approve`)
      .set(admin())
      .send({ note: 'Credencial comprobada' })
      .expect(200);

    const publicData = await http()
      .get(`/api/public/organizations/${slug}/verification`)
      .expect(200);
    expect(publicData.body.certifications).toHaveLength(1);
    expect(publicData.body.certifications[0]).toMatchObject({
      name: 'ISO 9001',
      issuer: 'AENOR',
      credentialId: 'ISO-123',
    });

    await http()
      .delete(`${VERIFY}/certifications/${created.body.id}`)
      .set(company())
      .expect(400);
  });

  it('vincula opiniones confirmadas a proyectos comprobados', async () => {
    const org = await prisma.organization.findFirstOrThrow({ where: { slug } });
    const project = await prisma.verificationProject.findFirstOrThrow({
      where: { organizationId: org.id },
    });
    await prisma.reviewRequest.create({
      data: {
        organizationId: org.id,
        tokenHash: hashToken('review-request-token'),
        reviewerName: 'Cliente Verificado',
        reviewerEmail: 'cliente-verificado@test.local',
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    await http()
      .post(`/api/public/organizations/${slug}/reviews`)
      .send({
        name: 'Cliente Verificado',
        email: 'cliente-verificado@test.local',
        rating: 5,
        body: 'Experiencia excelente con el proyecto.',
        consent: true,
        projectId: project.id,
        requestToken: 'review-request-token',
      })
      .expect(201);

    const review = await prisma.review.findFirstOrThrow({
      where: { organizationId: org.id, reviewerEmail: 'cliente-verificado@test.local' },
    });
    expect(review.projectId).toBe(project.id);
    expect(review.verificationStatus).toBe('confirmed');

    await prisma.review.update({
      where: { id: review.id },
      data: { emailConfirmedAt: new Date() },
    });
    await http()
      .post(`/api/admin/review-verifications/${review.id}`)
      .set({ Authorization: `Bearer ${verifierToken}` })
      .send({ status: 'verified', methodology: 'Revisión documental y de proyecto' })
      .expect(200);
    const verifiedReview = await prisma.review.findUniqueOrThrow({ where: { id: review.id } });
    expect(verifiedReview.verificationStatus).toBe('verified');

    const form = await http()
      .get(`/api/public/organizations/${slug}/review-form`)
      .expect(200);
    expect(form.body.projects).toEqual([{ id: project.id, name: 'Proyecto de prueba' }]);
  });

  it('no marca como verificada una reseña con otro correo', async () => {
    const org = await prisma.organization.findFirstOrThrow({ where: { slug } });
    await prisma.reviewRequest.create({
      data: {
        organizationId: org.id,
        tokenHash: hashToken('review-request-otro-correo'),
        reviewerName: 'Cliente Original',
        reviewerEmail: 'original@test.local',
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    await http()
      .post(`/api/public/organizations/${slug}/reviews`)
      .send({
        name: 'Otro Cliente',
        email: 'otro@test.local',
        rating: 5,
        body: 'Intento de usar un enlace ajeno.',
        consent: true,
        requestToken: 'review-request-otro-correo',
      })
      .expect(400);
  });

  it('rechaza vincular una opinión a un proyecto ajeno', async () => {
    await http()
      .post(`/api/public/organizations/${slug}/reviews`)
      .send({
        name: 'Cliente Proyecto',
        email: 'cliente-proyecto@test.local',
        rating: 4,
        body: 'Experiencia con un proyecto no válido.',
        consent: true,
        projectId: '00000000-0000-4000-8000-000000000000',
      })
      .expect(400);
  });

  it('acepta solicitudes de captación desde la web pública y las guarda', async () => {
    const response = await http()
      .post('/api/public/verification-inquiry')
      .send({
        companyName: 'Contacto SL',
        taxId: 'B12345678',
        sector: 'Servicios profesionales',
        contactName: 'Ana',
        email: 'ana@contacto.test',
        website: 'https://contacto.test',
        country: 'España',
        consent: true,
      })
      .expect(200);
    expect(response.body).toEqual({ received: true });

    const list = await http()
      .get(`${ADMIN}/inquiries?status=new`)
      .set(admin())
      .expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0]).toMatchObject({
      companyName: 'Contacto SL',
      taxId: 'B12345678',
      sector: 'Servicios profesionales',
      website: 'https://contacto.test',
      country: 'España',
      email: 'ana@contacto.test',
    });

    const updated = await http()
      .post(`${ADMIN}/inquiries/${list.body.items[0].id}`)
      .set(admin())
      .send({ status: 'contacted', notes: 'Llamada realizada' })
      .expect(200);
    expect(updated.body.status).toBe('contacted');
  });

  it('el sello refleja la revocación automáticamente', async () => {
    await http()
      .post(`${ADMIN}/${requestId}/revoke`)
      .set(admin())
      .send({ reason: 'Documentación invalidada' })
      .expect(200);

    const status = await http().get(VERIFY).set(company()).expect(200);
    expect(status.body.status).toBe('expired');

    const publicData = await http()
      .get(`/api/public/organizations/${slug}/verification`)
      .expect(200);
    expect(publicData.body.categories).toEqual([]);
    expect(publicData.body.projects).toEqual([]);
    expect(publicData.body.certifications).toEqual([]);

    const svg = await http().get(`/api/seal/${publicId}.svg`).expect(200);
    expect(svgText(svg)).toContain('Verificación caducada');
  });

  it('caduca automáticamente al pasar la fecha de validez', async () => {
    const org = await prisma.organization.findFirstOrThrow({ where: { publicId } });
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        verificationStatus: 'verified',
        verifiedAt: new Date(),
        verificationExpiresAt: new Date(Date.now() - 1000),
      },
    });

    const status = await http().get(VERIFY).set(company()).expect(200);
    expect(status.body.status).toBe('expired');
    const svg = await http().get(`/api/seal/${publicId}.svg`).expect(200);
    expect(svgText(svg)).toContain('Verificación caducada');
  });
});
