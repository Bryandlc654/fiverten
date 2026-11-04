import { expect, test } from '@playwright/test';
import { canSeed, seedResolution } from './helpers/db';
import { seedOrganization } from './helpers/seed';

test.describe('Resolución de incidencias', () => {
  test('el cliente conversa y acepta la solución desde su enlace', async ({ page, request }) => {
    test.skip(!canSeed(), 'Define E2E_DATABASE_URL para sembrar incidencias');

    const organization = await seedOrganization(request, 'Resolución E2E');
    const { token } = await seedResolution(organization.slug);

    await page.goto(`/resolucion/${token}`);

    await expect(page.getByText('Incidencia con Resolución E2E')).toBeVisible();
    await expect(
      page.getByText('El pedido llegó incompleto y nadie me respondió.'),
    ).toBeVisible();
    await expect(
      page.getByText('La empresa ha abierto una incidencia para resolver tu problema.'),
    ).toBeVisible();

    await page.getByPlaceholder('Escribe a la empresa').fill('Gracias, espero vuestra respuesta.');
    await page.getByRole('button', { name: 'Enviar mensaje' }).click();
    await expect(page.getByText('Gracias, espero vuestra respuesta.')).toBeVisible();

    await page.getByRole('button', { name: 'Aceptar solución' }).click();
    await expect(page.getByText('Has aceptado la solución.', { exact: false })).toBeVisible();
    await expect(page.getByText('Resuelta', { exact: true })).toBeVisible();
  });

  test('la empresa ve la reseña de baja valoración y puede abrir la incidencia', async ({
    page,
    request,
  }) => {
    test.skip(!canSeed(), 'Define E2E_DATABASE_URL para sembrar incidencias');

    const organization = await seedOrganization(request, 'Empresa Resolución E2E');
    await seedResolution(organization.slug);

    await page.goto('/login');
    await page.getByLabel('Correo corporativo').fill(organization.email);
    await page.getByLabel('Contraseña').fill(organization.password);
    await page.getByRole('button', { name: 'Acceder' }).click();
    await page.waitForURL('**/dashboard');

    await page.goto('/dashboard/reviews?lowRating=true');
    await expect(
      page.getByText('El pedido llegó incompleto y nadie me respondió.'),
    ).toBeVisible();
  });
});
