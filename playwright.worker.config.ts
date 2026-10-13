import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', testMatch: 'worker-content.spec.ts', workers: 1, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:8787', channel: 'chrome', trace: 'retain-on-failure' },
  webServer: { command: 'npm run preview:worker -- --port 8787', url: 'http://127.0.0.1:8787/election2026/', reuseExistingServer: false },
});
