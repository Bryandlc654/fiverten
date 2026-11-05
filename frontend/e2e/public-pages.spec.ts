import { expect, test } from '@playwright/test';
import {
  canSeed,
  seedApprovedVerification,
  seedCertification,
} from './helpers/db';
import { makeProfilePublic, seedOrganization } from './helpers/seed';

test.describe('Web pública', () => {
  test('directorio, documentación, proyectos, opiniones y certificaciones', async ({
    page,
    request,
  }) => {
    test.skip(!canSeed(), 'Define E2E_DATABASE_URL para sembrar la verificación');

    const organization = await seedOrganization(request, 'Página Pública E2E');
    await makeProfilePublic(request, organization);
    await seedApprovedVerification(organization.slug, 'Proyecto público E2E');
    await seedCertification(organization.slug);

    await page.goto(`/empresas?search=${encodeURIComponent('Página Pública E2E')}`);
    await expect(page.getByRole('heading', { name: 'Empresas verificadas' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Cómo funciona' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Directorio', exact: true })).toHaveCount(0);
    const card = page.getByRole('article').filter({ hasText: 'Página Pública E2E' }).first();
    await expect(card).toBeVisible();
    await expect(card.getByRole('link', { name: /Ver perfil/ })).toBeVisible();

    await page.goto(`/empresa/${organization.slug}`);
    await expect(page.getByRole('link', { name: 'Cómo funciona' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Directorio', exact: true })).toHaveCount(0);

    await page.goto(`/empresa/${organization.slug}/documentacion`);
    await expect(page.getByRole('heading', { name: 'Categorías comprobadas' })).toBeVisible();
    await expect(page.getByText('Identidad del representante')).toBeVisible();
    await expect(page.getByText('Documentación fiscal').last()).toBeVisible();

    await page.goto(`/empresa/${organization.slug}/proyectos`);
    await expect(page.getByText('Proyecto público E2E')).toBeVisible();
    await expect(page.getByText(/1 evidencia/)).toBeVisible();
    await expect(page.getByText(/PDF validado/)).toBeVisible();

    await page.goto(`/empresa/${organization.slug}/opiniones`);
    await expect(page.getByRole('heading', { name: 'Página Pública E2E', level: 1 })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Experiencias reales. Proyectos comprobados.' }),
    ).toBeVisible();

    await page.goto(`/empresa/${organization.slug}/certificaciones`);
    await expect(page.getByText('Sello FIVERTEN')).toBeVisible();
    await expect(page.getByText('Credenciales FIVERTEN')).toBeVisible();
    await expect(page.getByText('Certificaciones externas')).toBeVisible();
    await expect(page.getByText('ISO 9001')).toBeVisible();
    await expect(page.getByText('AENOR')).toBeVisible();
  });

  test('páginas institucionales y de captación', async ({ page }) => {
    await page.goto('/como-funciona');
    await expect(page.getByRole('heading', { name: 'Cómo funciona FIVERTEN' })).toBeVisible();

    await page.goto('/trust-center');
    await expect(page.getByRole('heading', { name: 'Trust Center' })).toBeVisible();

    await page.goto('/metodologia');
    await expect(
      page.getByRole('heading', { name: 'Criterios y políticas de verificación' }),
    ).toBeVisible();

    await page.goto('/soluciones');
    await expect(
      page.getByRole('heading', { name: /Reputación verificable para cada tipo de negocio/ }),
    ).toBeVisible();

    await page.goto('/recursos');
    await expect(page.getByRole('heading', { name: 'Guías y contenidos' })).toBeVisible();
    await page.getByRole('link', { name: /Guía para conseguir tus primeras reseñas/ }).click();
    await expect(
      page.getByRole('heading', { name: 'Guía para conseguir tus primeras reseñas' }),
    ).toBeVisible();
    await expect(page.getByText('Pide opiniones después de un buen servicio')).toBeVisible();

    await page.goto('/verificar-empresa');
    await expect(
      page.getByRole('heading', { name: 'Obtén el sello de empresa verificada' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Formulario de solicitud' })).toBeVisible();
  });
});
