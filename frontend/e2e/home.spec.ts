import { expect, test } from '@playwright/test';

test.describe('Página de inicio', () => {
  test('muestra la landing y busca empresas', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Reputación que puedes verificar/ }),
    ).toBeVisible();
    await expect(page.getByAltText('FIVERTEN').first()).toBeVisible();
    await expect(page.getByText('Directorio FIVERTEN')).toBeVisible();

    await page.getByLabel('Buscar empresas').fill('Estudio Norte');
    await page.getByRole('button', { name: /Buscar/ }).click();
    await expect(page).toHaveURL(/\/empresas\?search=Estudio%20Norte/);
  });

  test('abre las preguntas frecuentes y el menú móvil', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '¿La verificación es automática?' }).click();
    await expect(
      page.getByText('No. La empresa presenta la información y el equipo de FIVERTEN'),
    ).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    await expect(page.getByRole('navigation').getByText('Cómo funciona')).toBeVisible();
  });
});
