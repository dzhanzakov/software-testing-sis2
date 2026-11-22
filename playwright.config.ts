import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

// GitHub Actions runners get a Cloudflare bot-check page from practicesoftwaretesting.com instead of the app,
// so CI tests the local stand-in in app/server.mjs. LOCAL_APP=1 uses it on your machine too; LOCAL_APP=0 makes CI
// hit the public site again.
const useLocalApp = process.env.LOCAL_APP ? process.env.LOCAL_APP !== '0' : isCI;
const LOCAL_PORT = Number(process.env.PORT) || 3000;
const LOCAL_URL = `http://localhost:${LOCAL_PORT}`;
if (useLocalApp) {
  // Read by fixtures/pages.fixture.ts, which creates test users through the API.
  process.env.API_URL ??= `${LOCAL_URL}/api`;
}

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
    baseURL: useLocalApp ? LOCAL_URL : process.env.BASE_URL || 'https://practicesoftwaretesting.com',
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
  // Starts app/server.mjs before the tests and stops it afterwards. Each CI shard gets its own server.
  webServer: useLocalApp
    ? {
        command: 'node app/server.mjs',
        url: LOCAL_URL,
        env: { PORT: String(LOCAL_PORT) },
        reuseExistingServer: !isCI,
        timeout: 30_000,
        stdout: 'pipe',
      }
    : undefined,
});
