import { expect, type APIRequestContext } from '@playwright/test';

export const BACKEND_URL = process.env.E2E_BACKEND_URL ?? 'http://localhost:4000';
export const PASSWORD = 'Password123!';

export interface SeededOrganization {
  email: string;
  password: string;
  accessToken: string;
  slug: string;
  companyName: string;
}

/** Crea una empresa real vía API y devuelve sus credenciales y slug público. */
export async function seedOrganization(
  request: APIRequestContext,
  companyName = 'E2E Reputación SL',
): Promise<SeededOrganization> {
  const email = `e2e-${Date.now()}-${Math.round(Math.random() * 1e6)}@fiverten.test`;
  const response = await request.post(`${BACKEND_URL}/api/auth/register`, {
    data: { email, password: PASSWORD, companyName },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const body = (await response.json()) as {
    accessToken: string;
    organization: { slug: string };
  };
  return {
    email,
    password: PASSWORD,
    accessToken: body.accessToken,
    slug: body.organization.slug,
    companyName,
  };
}

/** Hace público el perfil para poder navegar a /empresa/:slug. */
export async function makeProfilePublic(
  request: APIRequestContext,
  organization: SeededOrganization,
): Promise<void> {
  const response = await request.patch(`${BACKEND_URL}/api/organizations/me`, {
    headers: { Authorization: `Bearer ${organization.accessToken}` },
    data: { isPublic: true },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

/** Inicia sesión en el navegador usando el formulario de la aplicación. */
export async function loginInBrowser(
  page: import('@playwright/test').Page,
  organization: SeededOrganization,
): Promise<void> {
  await page.goto('/login', { waitUntil: 'networkidle' });
  const emailField = page.getByLabel('Correo corporativo');
  const passwordField = page.getByLabel('Contraseña');
  // En WebKit la hidratación puede tardar y los campos controlados se
  // reinician si se rellenan demasiado pronto.
  await expect(emailField).toBeVisible();
  await emailField.fill(organization.email);
  await expect(emailField).toHaveValue(organization.email);
  await passwordField.fill(organization.password);
  await expect(passwordField).toHaveValue(organization.password);
  await page.getByRole('button', { name: 'Acceder' }).click();
  await page.waitForURL('**/dashboard', { waitUntil: 'domcontentloaded' });
}
