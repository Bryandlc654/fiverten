import { expect, test } from '@playwright/test';
import { canSeed, seedPublishedReview } from './helpers/db';
import { BACKEND_URL, makeProfilePublic, seedOrganization } from './helpers/seed';

test.describe('Reseñas', () => {
  test('el perfil público muestra las reseñas publicadas', async ({ page, request }) => {
    test.skip(!canSeed(), 'Define E2E_DATABASE_URL para sembrar reseñas');

    const organization = await seedOrganization(request, 'Perfil Público E2E');
    await makeProfilePublic(request, organization);
    await seedPublishedReview(organization.slug, {
      rating: 5,
      body: 'Producto impecable y entrega rapidísima.',
    });

    await page.goto(`/empresa/${organization.slug}`);

    await expect(page.getByRole('heading', { name: 'Perfil Público E2E' })).toBeVisible();
    await expect(page.getByText('Producto impecable y entrega rapidísima.')).toBeVisible();
    await expect(page.getByText('1 reseña').first()).toBeVisible();
    await expect(page.getByRole('group', { name: 'Filtrar por estrellas' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Información' })).toBeVisible();
  });

  test('un cliente puede enviar una reseña desde el formulario público', async ({
    page,
    request,
  }) => {
    const organization = await seedOrganization(request, 'Formulario E2E');

    await page.goto(`/review/${organization.slug}`);
    await page.getByRole('radio', { name: '5 estrellas' }).click();
    await page.getByLabel('Tu nombre').fill('Ana Cliente');
    await page.getByLabel('Tu correo electrónico').fill(`ana-${Date.now()}@cliente.test`);
    await page
      .getByLabel('Tu reseña')
      .fill('Me atendieron muy bien y resolvieron todas mis dudas.');
    await page.getByRole('checkbox').check();

    await page.getByRole('button', { name: /Publicar reseña|Enviar reseña/ }).click();

    await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toBeVisible();
    await expect(page.getByText(/se publicará cuando confirmes tu correo/)).toBeVisible();
  });

  test('el enlace personalizado rellena los datos y se puede completar', async ({
    page,
    request,
  }) => {
    const organization = await seedOrganization(request, 'Enlace Personalizado E2E');
    await makeProfilePublic(request, organization);

    const email = `lucia-${Date.now()}@cliente.test`;
    const created = await request.post(`${BACKEND_URL}/api/organizations/me/review-requests`, {
      headers: { Authorization: `Bearer ${organization.accessToken}` },
      data: { name: 'Lucía Invitada', email },
    });
    expect(created.ok(), await created.text()).toBeTruthy();
    const body = (await created.json()) as { url: string };
    const rt = new URL(body.url).searchParams.get('rt');
    expect(rt).toBeTruthy();

    await page.goto(`/review/${organization.slug}?rt=${rt}`);
    await expect(page.getByTestId('review-request-banner')).toBeVisible();
    await expect(page.getByLabel('Tu nombre')).toHaveValue('Lucía Invitada');
    await expect(page.getByLabel('Tu correo electrónico')).toHaveValue(email);

    // La apertura queda registrada para el seguimiento de la empresa.
    const tracked = await request.get(`${BACKEND_URL}/api/organizations/me/review-requests`, {
      headers: { Authorization: `Bearer ${organization.accessToken}` },
    });
    const trackedBody = (await tracked.json()) as {
      items: { reviewerEmail: string; status: string }[];
    };
    const requestRow = trackedBody.items.find((item) => item.reviewerEmail === email);
    expect(requestRow?.status).toBe('opened');

    await page.getByRole('radio', { name: '4 estrellas' }).click();
    await page
      .getByLabel('Tu reseña')
      .fill('La experiencia fue buena y el equipo respondió rápido.');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: /Publicar reseña|Enviar reseña/ }).click();

    await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toBeVisible();
  });
});
