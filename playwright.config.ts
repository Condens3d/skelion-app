import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:8080',
  },
  webServer: {
    command: 'node server/src/index.js',
    port: 8080,
    reuseExistingServer: true,
    env: {
      NODE_ENV: 'development',
      PORT: '8080',
      DATABASE_PATH: './server/data/e2e.db',
      DIST_PATH: './dist',
    },
  },
});
