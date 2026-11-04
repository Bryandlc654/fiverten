import { expect, test } from '@playwright/test';
import { canSeed, promoteToSupportAgent } from './helpers/db';
import { BACKEND_URL, loginInBrowser, seedOrganization } from './helpers/seed';

test.describe('Soporte por tickets', () => {
  test('la empresa crea un ticket y soporte responde', async ({ page, request }) => {
    test.skip(!canSeed(), 'Define E2E_DATABASE_URL para sembrar datos');

    const company = await seedOrganization(request, 'Empresa Ticket E2E');
    const subject = `Incidencia E2E ${Date.now()}`;
    const created = await request.post(`${BACKEND_URL}/api/organizations/me/tickets`, {
      headers: { Authorization: `Bearer ${company.accessToken}` },
      data: {
        subject,
        message: 'Necesitamos ayuda con la configuración de nuestra cuenta.',
        category: 'account',
        priority: 'high',
      },
    });
    expect(created.ok(), await created.text()).toBeTruthy();
    const ticket = (await created.json()) as { id: string };

    const agent = await seedOrganization(request, 'Agente Soporte E2E');
    await promoteToSupportAgent(agent.email);
    await loginInBrowser(page, agent);

    await page.waitForURL('**/admin/soporte');
    await expect(page.getByRole('heading', { name: 'Soporte' })).toBeVisible();
    await expect(page.getByText(subject)).toBeVisible();

    await page.getByText(subject).click();
    await expect(page.getByRole('heading', { name: subject })).toBeVisible();

    await page
      .getByPlaceholder('Respuesta para la empresa…')
      .fill('Hola, estamos revisando vuestra configuración.');
    await page.getByRole('button', { name: 'Responder' }).click();
    await expect(page.getByText('Respuesta enviada')).toBeVisible();
    await expect(page.getByText('Hola, estamos revisando vuestra configuración.')).toBeVisible();

    const detail = await request.get(
      `${BACKEND_URL}/api/organizations/me/tickets/${ticket.id}`,
      { headers: { Authorization: `Bearer ${company.accessToken}` } },
    );
    const body = (await detail.json()) as {
      messages: { senderType: string; body: string }[];
    };
    expect(body.messages.some((message) => message.senderType === 'support')).toBe(true);
  });

  test('la empresa crea un ticket desde el panel', async ({ page, request }) => {
    const company = await seedOrganization(request, 'Empresa Ticket UI E2E');
    await loginInBrowser(page, company);

    await page.goto('/dashboard/soporte');
    await expect(page.getByRole('heading', { name: 'Soporte' })).toBeVisible();
    await page.getByRole('button', { name: 'Nuevo ticket' }).click();

    const subject = `Ticket UI ${Date.now()}`;
    const dialog = page.getByRole('dialog', { name: 'Nuevo ticket de soporte' });
    await dialog.getByLabel('Asunto').fill(subject);
    await dialog.getByLabel('Categoría').selectOption('technical');
    await dialog.getByLabel('Prioridad').selectOption('urgent');
    await dialog
      .getByLabel('¿En qué podemos ayudarte?')
      .fill('El widget no se muestra en nuestra web.');
    await dialog.getByRole('button', { name: 'Crear ticket' }).click();

    await expect(page.getByText('Ticket creado', { exact: false })).toBeVisible();
    await expect(page.getByRole('heading', { name: subject })).toBeVisible();
  });
});
