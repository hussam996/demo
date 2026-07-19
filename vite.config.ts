import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4096,
  },
  server: {
    host: true,
  },
  test: {
    include: ['src/tests/**/*.test.ts'],
    exclude: ['src/tests/e2e/**'],
    environment: 'node',
  },
});
