import { defineConfig } from '@playwright/test';

const production = process.env.PLAYWRIGHT_TARGET === 'production';
const baseURL = production ? 'http://127.0.0.1:4173' : 'http://127.0.0.1:5173';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL, channel: 'chrome', trace: 'retain-on-failure' },
  webServer: { command: production ? 'npm run preview' : 'npm run dev -- --port 5173 --strictPort', url: baseURL, reuseExistingServer: !process.env.CI },
});
