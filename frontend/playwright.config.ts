import { defineConfig, devices } from '@playwright/test';

const FRONTEND_URL = process.env.E2E_FRONTEND_URL ?? 'http://localhost:3000';
const BACKEND_URL = process.env.E2E_BACKEND_URL ?? 'http://localhost:4000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /mobile\.spec\.ts/,
    },
    // Pruebas de adaptación móvil: se ejecutan solo los casos etiquetados
    // con @mobile en dos viewports reales (Android y iPhone).
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      grep: /@mobile/,
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
      grep: /@mobile/,
    },
  ],
  webServer: [
    {
      command: 'npm run start',
      cwd: '../backend',
      url: `${BACKEND_URL}/api/auth/me`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      command: 'npm run dev',
      cwd: '.',
      url: `${FRONTEND_URL}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
