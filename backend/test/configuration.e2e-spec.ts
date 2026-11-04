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

describe('FIVERTEN configuración de plataforma (e2e)', () => {
  type HttpAgent = ReturnType<typeof request>;
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => HttpAgent;
  let adminToken: string;

  const auth = () => ({ Authorization: `Bearer ${adminToken}` });

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
      'TRUNCATE TABLE "platform_settings","email_templates","sectors","countries","languages","report_reasons","plans","subscriptions","subscription_events","payments","organizations","users","roles","permissions","role_permissions","organization_memberships","organization_invitations","reviews","review_requests","review_responses","sessions","refresh_tokens","email_verifications","password_reset_tokens","auth_attempts","notifications","review_reports","moderation_actions" RESTART IDENTITY CASCADE',
    );

    await http()
      .post(`${AUTH}/register`)
      .send({ email: 'config-admin@fiverten.test', password: PASSWORD, companyName: 'Config Admin' })
      .expect(201);
    await prisma.user.update({
      where: { email: 'config-admin@fiverten.test' },
      data: { isSuperAdmin: true, isFivertenStaff: true },
    });
    const login = await http()
      .post(`${AUTH}/login`)
      .send({ email: 'config-admin@fiverten.test', password: PASSWORD })
      .expect(200);
    adminToken = login.body.accessToken as string;
  });

  afterAll(async () => {
    // Restaura los valores por defecto para no condicionar otras suites.
    await http()
      .patch(`${ADMIN}/settings`)
      .set(auth())
      .send({
        settings: {
          'reviews.low_rating_max': 2,
          'general.site_name': 'FIVERTEN',
          'general.registrations_enabled': true,
        },
      });
    await app.close();
  });

  it('lee y actualiza la configuración general y de reseñas', async () => {
    const initial = await http().get(`${ADMIN}/settings`).set(auth()).expect(200);
    expect(initial.body.some((item: { key: string }) => item.key === 'reviews.low_rating_max')).toBe(
      true,
    );

    await http()
      .patch(`${ADMIN}/settings`)
      .set(auth())
      .send({ settings: { 'reviews.low_rating_max': 3, 'general.site_name': 'Mi Reputación' } })
      .expect(200);

    const config = await http().get(`${PUBLIC}/config`).expect(200);
    expect(config.body).toMatchObject({ lowRatingMax: 3, siteName: 'Mi Reputación' });
  });

  it('bloquea el registro cuando se desactiva', async () => {
    await http()
      .patch(`${ADMIN}/settings`)
      .set(auth())
      .send({ settings: { 'general.registrations_enabled': false } })
      .expect(200);

    await http()
      .post(`${AUTH}/register`)
      .send({ email: 'nuevo@config.test', password: PASSWORD, companyName: 'No Permitida' })
      .expect(403);

    await http()
      .patch(`${ADMIN}/settings`)
      .set(auth())
      .send({ settings: { 'general.registrations_enabled': true } })
      .expect(200);
  });

  it('gestiona categorías, países e idiomas', async () => {
    const sector = await http()
      .post(`${ADMIN}/sectors`)
      .set(auth())
      .send({ name: 'Tecnología' })
      .expect(201);
    await http()
      .patch(`${ADMIN}/sectors/${sector.body.id}`)
      .set(auth())
      .send({ name: 'Tecnología y software' })
      .expect(200);

    const country = await http()
      .post(`${ADMIN}/countries`)
      .set(auth())
      .send({ iso2: 'ES', name: 'España' })
      .expect(201);
    await http()
      .patch(`${ADMIN}/countries/${country.body.id}`)
      .set(auth())
      .send({ name: 'Reino de España' })
      .expect(200);

    const language = await http()
      .post(`${ADMIN}/languages`)
      .set(auth())
      .send({ code: 'es', name: 'Español' })
      .expect(201);
    await http()
      .patch(`${ADMIN}/languages/${language.body.code}`)
      .set(auth())
      .send({ name: 'Castellano' })
      .expect(200);

    const catalogs = await http().get(`${PUBLIC}/catalogs`).expect(200);
    expect(catalogs.body.sectors[0].name).toBe('Tecnología y software');
    expect(catalogs.body.countries[0].name).toBe('Reino de España');
    expect(catalogs.body.languages[0].name).toBe('Castellano');

    await http().delete(`${ADMIN}/sectors/${sector.body.id}`).set(auth()).expect(200);
    await http().delete(`${ADMIN}/countries/${country.body.id}`).set(auth()).expect(200);
    await http().delete(`${ADMIN}/languages/${language.body.code}`).set(auth()).expect(200);
  });

  it('gestiona plantillas de email', async () => {
    const template = await http()
      .post(`${ADMIN}/email-templates`)
      .set(auth())
      .send({
        code: 'review_confirmation',
        subject: 'Confirma tu reseña de {{organization}}',
        title: 'Confirma tu reseña',
        intro: 'Gracias por escribir sobre {{organization}}.',
        action: 'Confirmar',
        isActive: true,
      });
    expect([200, 201]).toContain(template.status);

    const list = await http().get(`${ADMIN}/email-templates`).set(auth()).expect(200);
    expect(list.body[0]).toMatchObject({ code: 'review_confirmation' });

    await http()
      .patch(`${ADMIN}/email-templates/review_confirmation`)
      .set(auth())
      .send({
        subject: 'Confirma tu reseña',
        title: 'Confirma tu reseña',
        intro: 'Pulsa el botón para publicarla.',
        action: 'Confirmar',
        isActive: false,
      })
      .expect(200);

    await http().delete(`${ADMIN}/email-templates/review_confirmation`).set(auth()).expect(200);
  });

  it('gestiona los motivos de reporte', async () => {
    const reason = await http()
      .post(`${ADMIN}/report-reasons`)
      .set(auth())
      .send({ code: 'spam', label: 'Spam', isActive: true })
      .expect(201);

    await http()
      .patch(`${ADMIN}/report-reasons/${reason.body.id}`)
      .set(auth())
      .send({ label: 'Spam o publicidad' })
      .expect(200);

    const publicReasons = await http().get(`${PUBLIC}/report-reasons`).expect(200);
    expect(publicReasons.body.reasons[0]).toMatchObject({ code: 'spam' });

    await http().delete(`${ADMIN}/report-reasons/${reason.body.id}`).set(auth()).expect(200);
  });
});
