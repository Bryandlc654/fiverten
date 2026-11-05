import { expect, test, type Page } from '@playwright/test';
import { loginInBrowser, makeProfilePublic, seedOrganization } from './helpers/seed';

async function expectNoHorizontalOverflow(page: Page) {
  // Espera a las fuentes de iconos: sus métricas cambian al cargar y pueden
  // provocar un desbordamiento transitorio.
  await page.evaluate(() => document.fonts.ready);
  const { overflow, offenders } = await page.evaluate(() => {
    const viewport = window.innerWidth;
    const offenders = Array.from(document.querySelectorAll<HTMLElement>('body *'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          className: (element.className ?? '').toString().slice(0, 90),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter((item) => item.right > viewport + 1)
      .slice(0, 8);
    return { overflow: document.documentElement.scrollWidth - viewport, offenders };
  });
  expect(
    overflow,
    `la página no debe desplazarse en horizontal: ${JSON.stringify(offenders)}`,
  ).toBeLessThanOrEqual(1);
}

test.describe('Adaptación móvil @mobile', () => {
  test('@mobile el perfil público es usable y no desborda', async ({ page, request }) => {
    const organization = await seedOrganization(request, 'Móvil Reputación SL');
    await makeProfilePublic(request, organization);

    await page.goto(`/empresa/${organization.slug}`);

    await expect(
      page.getByRole('heading', { name: 'Móvil Reputación SL', level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contactar' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Opiniones verificadas' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Datos clave' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('@mobile el formulario de reseña se puede completar', async ({ page, request }) => {
    const organization = await seedOrganization(request, 'Formulario Móvil SL');

    await page.goto(`/review/${organization.slug}`);
    await expect(page.getByText('¿Cómo valorarías tu experiencia?')).toBeVisible();

    await page.getByRole('radio', { name: '5 estrellas' }).click();
    await expect(page.getByRole('radio', { name: '5 estrellas' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await page.getByLabel('Tu nombre').fill('Cliente Móvil');
    await page.getByLabel('Tu correo electrónico').fill('movil@cliente.test');
    await page.getByLabel('Tu reseña').fill('Una experiencia excelente de principio a fin.');
    await expectNoHorizontalOverflow(page);
  });

  test('@mobile el panel usa el menú desplegable', async ({ page, request }) => {
    const organization = await seedOrganization(request, 'Panel Móvil SL');
    await loginInBrowser(page, organization);

    await page.getByRole('button', { name: 'Mostrar u ocultar menú' }).click();
    await expect(page.getByRole('button', { name: 'Opiniones' })).toBeVisible();
    await page.getByRole('button', { name: 'Opiniones' }).click();
    await page.waitForURL('**/app/opiniones');

    await expect(page.getByTestId('review-requests')).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('@mobile el login se adapta al ancho del dispositivo', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Correo corporativo')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Acceder' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
