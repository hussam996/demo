import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'src/tests/e2e',
  timeout: 180_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1280, height: 720 },
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : undefined,
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
