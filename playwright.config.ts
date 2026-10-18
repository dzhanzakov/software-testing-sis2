import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // The public site is shared and slow (a login can take ~10s), so allow more time than the defaults.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: process.env.CI ? 1 : 3,
  forbidOnly: !!process.env.CI,
  // Retry in CI only: locally we want to see the failure, in CI the retry count tells a blip from a bug.
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // 1. relative page.goto('/auth/login') calls. Override to run against the buggy build.
    baseURL: process.env.BASE_URL ?? 'https://practicesoftwaretesting.com',
    // 2. getByTestId() reads the data-test attribute used by this application.
    testIdAttribute: 'data-test',
    // 3. a recording of every test that fails and is retried.
    trace: 'on-first-retry',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
