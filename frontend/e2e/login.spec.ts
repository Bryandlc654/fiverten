import { expect, test } from '@playwright/test';

const BACKEND_URL = process.env.E2E_BACKEND_URL ?? 'http://localhost:4000';

async function seedUser(request: import('@playwright/test').APIRequestContext) {
  const email = `e2e-${Date.now()}-${Math.round(Math.random() * 1e6)}@fiverten.test`;
  const password = 'Password123!';
  const response = await request.post(`${BACKEND_URL}/api/auth/register`, {
    data: { email, password, companyName: 'E2E Corp', firstName: 'Ada', lastName: 'Lovelace' },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return { email, password };
}

test.describe('Página de inicio de sesión', () => {
  test('muestra el diseño corporativo completo', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByAltText('FIVERTEN')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar con Google' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Microsoft/ })).toHaveCount(0);
    await expect(page.getByText('o correo corporativo')).toBeVisible();
    await expect(page.getByLabel('Correo corporativo')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Acceder' })).toBeVisible();
    await expect(page.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toBeVisible();
    await expect(page.getByText('© 2025 FIVERTEN. Todos los derechos reservados.')).toBeVisible();
  });

  test('los botones SSO avisan que están próximamente', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Iniciar con Google' }).click();
    await expect(page.getByTestId('auth-notice')).toContainText('próximamente');
  });

  test('permite alternar la visibilidad de la contraseña', async ({ page }) => {
    await page.goto('/login');
    const password = page.getByLabel('Contraseña');
    await password.fill('secreto123');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByTitle('Mostrar u ocultar contraseña').click();
    await expect(password).toHaveAttribute('type', 'text');
  });

  test('muestra un error con credenciales inválidas', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo corporativo').fill(`nadie-${Date.now()}@fiverten.test`);
    await page.getByLabel('Contraseña').fill('PasswordIncorrecta1!');
    await page.getByRole('button', { name: 'Acceder' }).click();

    await expect(page.getByTestId('auth-feedback-error')).toBeVisible();
    await expect(page.getByTestId('auth-error')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('inicia sesión con credenciales válidas y entra al panel', async ({ page, request }) => {
    const { email, password } = await seedUser(request);

    await page.goto('/login');
    await page.getByLabel('Correo corporativo').fill(email);
    await page.getByLabel('Contraseña').fill(password);
    await page.getByRole('button', { name: 'Acceder' }).click();

    await expect(page.getByTestId('auth-success')).toBeVisible();
    await page.waitForURL('**/dashboard');
    await expect(page.getByRole('heading', { name: 'E2E Corp' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Resumen' })).toBeVisible();
    await expect(page.getByText('Ada Lovelace')).toBeVisible();
  });

  test('permite cerrar sesión desde el menú de usuario', async ({ page, request }) => {
    const { email, password } = await seedUser(request);

    await page.goto('/login');
    await page.getByLabel('Correo corporativo').fill(email);
    await page.getByLabel('Contraseña').fill(password);
    await page.getByRole('button', { name: 'Acceder' }).click();
    await page.waitForURL('**/dashboard');

    await page.getByRole('button', { name: 'Menú de usuario' }).click();
    await page.getByRole('menuitem', { name: 'Cerrar sesión' }).click();

    await page.waitForURL('**/login');
    await expect(page.getByLabel('Correo corporativo')).toBeVisible();
  });
});
