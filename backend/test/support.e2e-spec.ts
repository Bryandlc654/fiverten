import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';

const AUTH = '/api/auth';
const COMPANY = '/api/organizations/me/tickets';
const SUPPORT = '/api/support';
const PASSWORD = 'Secret1234';

describe('FIVERTEN tickets de soporte (e2e)', () => {
  type HttpAgent = ReturnType<typeof request>;
  let app: INestApplication;
  let prisma: PrismaService;
  let http: () => HttpAgent;
  let ownerToken: string;
  let supportToken: string;
  let supportUserId: string;
  let ticketId: string;

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
    jest.spyOn(mail, 'sendSupportTicketCreated').mockResolvedValue(undefined);
    jest.spyOn(mail, 'sendSupportTicketReply').mockResolvedValue(undefined);

    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "support_tickets","support_ticket_messages","organizations","users","roles","permissions","role_permissions","organization_memberships","organization_invitations","reviews","review_requests","review_responses","sessions","refresh_tokens","email_verifications","password_reset_tokens","auth_attempts","notifications","review_cases","review_case_messages","review_case_files","review_resolutions","resolution_messages","review_reports","moderation_actions","plans","subscriptions","subscription_events","payments","platform_settings","email_templates","sectors","countries","languages","report_reasons" RESTART IDENTITY CASCADE',
    );

    const owner = await http()
      .post(`${AUTH}/register`)
      .send({ email: 'owner-support@fiverten.test', password: PASSWORD, companyName: 'Empresa Soporte' })
      .expect(201);
    ownerToken = owner.body.accessToken as string;

    await http()
      .post(`${AUTH}/register`)
      .send({ email: 'agent-support@fiverten.test', password: PASSWORD, companyName: 'Equipo Soporte' })
      .expect(201);
    const agent = await prisma.user.update({
      where: { email: 'agent-support@fiverten.test' },
      data: { isSupportAgent: true },
      select: { id: true },
    });
    supportUserId = agent.id;
    const login = await http()
      .post(`${AUTH}/login`)
      .send({ email: 'agent-support@fiverten.test', password: PASSWORD })
      .expect(200);
    supportToken = login.body.accessToken as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('la empresa crea un ticket y lo consulta', async () => {
    const created = await http()
      .post(COMPANY)
      .set(auth(ownerToken))
      .send({
        subject: 'No puedo acceder al panel',
        category: 'account',
        priority: 'high',
        message: 'Desde esta mañana el panel me devuelve un error.',
      })
      .expect(201);
    expect(created.body).toMatchObject({ status: 'open', priority: 'high' });
    ticketId = created.body.id as string;

    const list = await http().get(COMPANY).set(auth(ownerToken)).expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.counts.open).toBe(1);

    const detail = await http()
      .get(`${COMPANY}/${ticketId}`)
      .set(auth(ownerToken))
      .expect(200);
    expect(detail.body.messages).toHaveLength(1);
    expect(detail.body.messages[0].body).toContain('error');
  });

  it('un usuario normal no entra al panel de soporte', async () => {
    await http().get(`${SUPPORT}/tickets`).set(auth(ownerToken)).expect(403);
  });

  it('el agente de soporte ve el ticket, responde y lo asigna', async () => {
    const list = await http().get(`${SUPPORT}/tickets`).set(auth(supportToken)).expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.stats.status.open).toBe(1);

    const detail = await http()
      .get(`${SUPPORT}/tickets/${ticketId}`)
      .set(auth(supportToken))
      .expect(200);
    expect(detail.body.organization.tradeName).toBe('Empresa Soporte');

    await http()
      .post(`${SUPPORT}/tickets/${ticketId}/messages`)
      .set(auth(supportToken))
      .send({ body: 'Estamos revisándolo, ¿puedes indicarnos el navegador?' })
      .expect(200);

    const assigned = await http()
      .post(`${SUPPORT}/tickets/${ticketId}/assign-me`)
      .set(auth(supportToken))
      .expect(200);
    expect(assigned.body.assignedTo).toBe(supportUserId);

    const after = await http()
      .get(`${SUPPORT}/tickets/${ticketId}`)
      .set(auth(supportToken))
      .expect(200);
    expect(after.body.status).toBe('pending');
    expect(after.body.messages).toHaveLength(2);
  });

  it('la empresa ve la respuesta y puede contestar', async () => {
    const company = await http()
      .get(`${COMPANY}/${ticketId}`)
      .set(auth(ownerToken))
      .expect(200);
    expect(company.body.messages).toHaveLength(2);
    expect(company.body.messages[1].senderType).toBe('support');

    await http()
      .post(`${COMPANY}/${ticketId}/messages`)
      .set(auth(ownerToken))
      .send({ body: 'Uso Chrome en Windows 11.' })
      .expect(200);

    const support = await http()
      .get(`${SUPPORT}/tickets/${ticketId}`)
      .set(auth(supportToken))
      .expect(200);
    expect(support.body.status).toBe('open');
    expect(support.body.messages).toHaveLength(3);
  });

  it('las notas internas no las ve la empresa', async () => {
    await http()
      .post(`${SUPPORT}/tickets/${ticketId}/messages`)
      .set(auth(supportToken))
      .send({ body: 'Nota interna: revisar logs del tenant.', isInternal: true })
      .expect(200);

    const company = await http()
      .get(`${COMPANY}/${ticketId}`)
      .set(auth(ownerToken))
      .expect(200);
    expect(JSON.stringify(company.body)).not.toContain('Nota interna');

    const support = await http()
      .get(`${SUPPORT}/tickets/${ticketId}`)
      .set(auth(supportToken))
      .expect(200);
    expect(JSON.stringify(support.body)).toContain('Nota interna');
  });

  it('el agente cambia estado y la empresa puede cerrar', async () => {
    await http()
      .patch(`${SUPPORT}/tickets/${ticketId}`)
      .set(auth(supportToken))
      .send({ status: 'resolved', priority: 'urgent' })
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe('resolved');
        expect(response.body.priority).toBe('urgent');
      });

    const closed = await http()
      .post(`${COMPANY}/${ticketId}/close`)
      .set(auth(ownerToken))
      .expect(200);
    expect(closed.body.status).toBe('closed');

    await http()
      .post(`${COMPANY}/${ticketId}/messages`)
      .set(auth(ownerToken))
      .send({ body: 'Un mensaje más' })
      .expect(400);
  });
});
