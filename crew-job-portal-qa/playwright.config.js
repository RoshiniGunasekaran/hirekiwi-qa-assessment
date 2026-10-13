// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const PORT = process.env.PORT || '4173';
const BASE_URL = `http://127.0.0.1:${PORT}`;

module.exports = defineConfig({
  testDir: './tests/playwright/specs',
  globalSetup: './tests/playwright/global-setup.js',
  timeout: 30_000,
  expect: { timeout: 10_000 },

  // Every test uses its own job id, so tests never share data and can run in parallel.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Fewer parallel browsers = fewer launch timeouts on a normal laptop.
  // Raise it with:  set WORKERS=4   (Windows)   or   WORKERS=4 npx playwright test
  workers: Number(process.env.WORKERS) || 2,

  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  // XBR-01: the whole suite runs on all three browser engines.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', timeout: 60_000, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', timeout: 60_000, use: { ...devices['Desktop Safari'] } },
  ],

  webServer: {
    command: 'node mock-app/server.js',
    url: `${BASE_URL}/healthz`,
    reuseExistingServer: !process.env.CI,
    env: { PORT },
  },
});
