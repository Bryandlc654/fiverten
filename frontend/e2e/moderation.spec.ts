import { expect, test } from '@playwright/test';
import {
  canSeed,
  ensureReportReasons,
  promoteToSuperAdmin,
  seedPublishedReview,
  seedReportedReview,
} from './helpers/db';
import { loginInBrowser, seedOrganization } from './helpers/seed';

test.describe('Moderación', () => {
  test('el super admin oculta una reseña reportada con motivo', async ({ page, request }) => {
    test.skip(!canSeed(), 'Define E2E_DATABASE_URL para sembrar reseñas reportadas');

    const organization = await seedOrganization(request, 'Moderación E2E');
    const body = `Comentario reportado por spam desde el e2e ${Date.now()}`;
    await seedReportedReview(organization.slug, body);
    await promoteToSuperAdmin(organization.email);

    await loginInBrowser(page, organization);
    await page.goto('/admin/reviews');
    await page.getByRole('button', { name: 'Reportadas' }).click();

    const item = page.locator('article').filter({ hasText: body });
    await expect(item).toBeVisible();
    await expect(item.getByText('1 reporte abierto')).toBeVisible();

    await item.getByRole('button', { name: 'Ocultar' }).click();
    const dialog = page.getByRole('dialog', { name: 'Ocultar reseña' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Motivo').fill('Contenido publicitario no relacionado.');
    await dialog.getByRole('button', { name: 'Ocultar' }).click();

    await expect(dialog).toBeHidden();
    await page.getByRole('button', { name: 'Ocultas' }).click();
    await expect(page.getByText(body)).toBeVisible();
  });

  test('la empresa puede reportar una reseña publicada', async ({ page, request }) => {
    test.skip(!canSeed(), 'Define E2E_DATABASE_URL para sembrar reseñas');

    const organization = await seedOrganization(request, 'Reporte Empresa E2E');
    await ensureReportReasons();
    const body = `Comentario que la empresa va a reportar ${Date.now()}.`;
    await seedPublishedReview(organization.slug, { rating: 3, body });

    await loginInBrowser(page, organization);
    await page.goto('/dashboard/reviews');

    await expect(page.getByText(body)).toBeVisible();
    await page.getByRole('button', { name: /Reportar/ }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Reportar reseña' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Motivo').selectOption('spam');
    await dialog.getByRole('button', { name: 'Enviar reporte' }).click();

    await expect(dialog).toBeHidden();
    await expect(
      page.locator('span').filter({ hasText: /^Reportada$/ }).first(),
    ).toBeVisible();
  });
});
