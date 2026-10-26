import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;

/**
 * Browser tests against the real stack (API + Studio + Play). Needs `bun run infra:up` and a
 * migrated database. Locally, already-running dev servers are reused.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'retain-on-failure',
    locale: 'vi-VN',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /player\..*\.spec\.ts/ },
    // Player flows on the engines guests actually use: Safari on a small iPhone, Chrome on a
    // mid-range Android (runbook §3.1; real devices are still required before the pilot).
    { name: 'iphone-se', use: { ...devices['iPhone SE'] }, testMatch: /play-.*\.spec\.ts/ },
    { name: 'galaxy', use: { ...devices['Galaxy S9+'] }, testMatch: /play-.*\.spec\.ts/ },
  ],
  webServer: [
    {
      command: 'bun --env-file=../../.env src/main.ts',
      cwd: '../../apps/api',
      url: 'http://localhost:4000/v1/health',
      reuseExistingServer: !CI,
      timeout: 60_000,
    },
    {
      command: CI ? 'bun run build && bun run start' : 'bun run dev',
      cwd: '../../apps/studio',
      url: 'http://localhost:3001/login',
      reuseExistingServer: !CI,
      timeout: 180_000,
    },
    {
      command: CI ? 'bun run build && bun run start' : 'bun run dev',
      cwd: '../../apps/play',
      url: 'http://localhost:3002',
      reuseExistingServer: !CI,
      timeout: 180_000,
    },
  ],
});
