import { defineConfig, devices } from '@playwright/test';

const externalBaseURL = process.env.PACKAGE_ECHO_E2E_URL;

export default defineConfig({
  expect: {
    timeout: 5_000,
  },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  outputDir: 'test-results',
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never', outputFolder: 'playwright-report' }]]
    : [['list']],
  retries: process.env.CI ? 2 : 0,
  testDir: 'tests/e2e',
  timeout: 30_000,
  workers: 1,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: externalBaseURL ?? 'http://127.0.0.1:4174',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: externalBaseURL
    ? undefined
    : {
        command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4174',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
        url: 'http://127.0.0.1:4174',
      },
});
