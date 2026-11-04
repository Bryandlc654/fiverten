import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
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
  let publicId: string;
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

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "verification_requests","verification_documents","verification_projects","organizations","users","roles","permissions","role_permissions","organization_memberships","organization_invitations","reviews","review_requests","review_campaigns","review_responses","sessions","refresh_tokens","email_verifications","password_reset_tokens","auth_attempts","notifications","review_cases","review_case_messages","review_case_files","review_resolutions","resolution_messages","review_reports","moderation_actions","plans","subscriptions","subscription_events","payments","platform_settings","email_templates","sectors","countries","languages","report_reasons","support_tickets","support_ticket_messages","media_files" RESTART IDENTITY CASCADE',
    );

    const registered = await http()
      .post(`${AUTH}/register`)
      .send({ email: 'seal@fiverten.test', password: PASSWORD, companyName: 'Sello SL' })
      .expect(201);
    companyToken = registered.body.accessToken as string;
    publicId = registered.body.organization.publicId as string;

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
      })
      .expect(201);

    await http()
      .post(`${VERIFY}/projects/${project.body.id}/documents`)
      .set(company())
      .attach('file', Buffer.from('%PDF-1.4 evidencia'), {
        filename: 'evidencia.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const submitted = await http().post(`${VERIFY}/submit`).set(company()).expect(200);
    requestId = submitted.body.id as string;
    expect(submitted.body.status).toBe('submitted');

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

    const status = await http().get(VERIFY).set(company()).expect(200);
    expect(status.body.status).toBe('verified');

    const svg = await http().get(`/api/seal/${publicId}.svg`).expect(200);
    expect(svg.headers['content-type']).toContain('image/svg+xml');
    expect(svgText(svg)).toContain('Empresa verificada');
    expect(svgText(svg)).toContain('Sello SL');

    const png = await http().get(`/api/seal/${publicId}.png`).expect(200);
    expect(png.headers['content-type']).toContain('image/png');
    expect(png.body.length).toBeGreaterThan(100);
  });

  it('el sello refleja la revocación automáticamente', async () => {
    await http()
      .post(`${ADMIN}/${requestId}/revoke`)
      .set(admin())
      .send({ reason: 'Documentación invalidada' })
      .expect(200);

    const status = await http().get(VERIFY).set(company()).expect(200);
    expect(status.body.status).toBe('expired');

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
