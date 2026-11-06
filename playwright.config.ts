import { defineConfig, devices } from '@playwright/test';

const UI_BASE_URL = process.env.UI_BASE_URL ?? 'https://qa.awarasleep.com';
const API_BASE_URL = process.env.API_BASE_URL ?? 'https://api.qa-env.residenthome.com';
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }], ['allure-playwright', { detail: false }]],
  use: {
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'ui',
      testMatch: 'ui/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        // Must come after the device spread, which sets its own User-Agent.
        userAgent: 'E2EUI-Tests',
        baseURL: UI_BASE_URL,
      },
    },
    {
      name: 'api',
      testMatch: 'api/**/*.spec.ts',
      use: { baseURL: API_BASE_URL },
    },
  ],
});
