import { expect, test } from '@playwright/test';
import { canSeed, promoteToSuperAdmin, promoteToVerifier } from './helpers/db';
import { BACKEND_URL, loginInBrowser, seedOrganization } from './helpers/seed';

test.describe('Certificaciones y solicitudes (super admin)', () => {
  test('valida una certificación y gestiona una solicitud de captación', async ({
    page,
    request,
  }) => {
    test.skip(!canSeed(), 'Define E2E_DATABASE_URL para promocionar al administrador');

    const organization = await seedOrganization(request, `Admin Verificación ${Date.now()}`);
    await promoteToSuperAdmin(organization.email);

    const certification = await request.post(
      `${BACKEND_URL}/api/organizations/me/verification/certifications`,
      {
        headers: { Authorization: `Bearer ${organization.accessToken}` },
        data: {
          name: `ISO E2E ${Date.now()}`,
          issuer: 'Entidad E2E',
          credentialId: 'E2E-123',
        },
      },
    );
    expect(certification.ok(), await certification.text()).toBeTruthy();
    const certificationBody = (await certification.json()) as { id: string; name: string };

    const inquiryName = `Solicitud E2E ${Date.now()}`;
    const inquiry = await request.post(`${BACKEND_URL}/api/public/verification-inquiry`, {
      data: {
        companyName: inquiryName,
        contactName: 'Contacto E2E',
        email: `solicitud-${Date.now()}@fiverten.test`,
        consent: true,
      },
    });
    expect(inquiry.ok(), await inquiry.text()).toBeTruthy();

    await loginInBrowser(page, organization);

    await page.goto('/admin/certificaciones');
    await expect(
      page.getByRole('heading', { name: 'Certificaciones', exact: true }),
    ).toBeVisible();
    await page.getByText(certificationBody.name, { exact: true }).click();
    await page.getByRole('button', { name: 'Validar' }).click();
    await expect(page.getByText('Certificación validada')).toBeVisible();

    await page.goto('/admin/solicitudes');
    await expect(
      page.getByRole('heading', { name: 'Solicitudes de verificación' }),
    ).toBeVisible();
    await page.getByText(inquiryName, { exact: true }).click();
    await page.getByRole('button', { name: 'Marcar contactada' }).click();
    await expect(page.getByText('Solicitud actualizada')).toBeVisible();
  });

  test('el verificador FIVERTEN accede solo al área de revisión', async ({ page, request }) => {
    test.skip(!canSeed(), 'Define E2E_DATABASE_URL para promocionar al verificador');

    const organization = await seedOrganization(request, `Verificador ${Date.now()}`);
    await promoteToVerifier(organization.email);
    await loginInBrowser(page, organization);
    await expect(page).toHaveURL(/\/admin\/verificaciones$/);
    await expect(page.getByRole('heading', { name: 'Verificaciones' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Certificaciones' })).toBeVisible();
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/app$/);
  });
});
