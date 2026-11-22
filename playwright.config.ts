import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // The public site is shared and slow (a login can take ~10s), so allow more time than the defaults.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: isCI ? 2 : 3,
  // A forgotten test.only fails the CI run instead of silently running one test.
  forbidOnly: isCI,
  // Retry in CI only: locally we want to see the failure, in CI the retry count tells a blip from a bug.
  retries: isCI ? 2 : 0,
  // CI: blob (merged across shards later), JUnit XML for CI tools. Locally: HTML report.
  reporter: isCI
    ? [['list'], ['blob'], ['junit', { outputFile: 'reports/junit.xml' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    // 1. relative page.goto('/auth/login') calls. Override to run against the buggy build.
    baseURL: process.env.BASE_URL || 'https://practicesoftwaretesting.com',
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
