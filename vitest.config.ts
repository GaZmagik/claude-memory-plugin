import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.spec.ts'],
    exclude: ['node_modules', 'lib', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['skills/memory/src/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/*.test.ts', '**/types/**'],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'skills/memory/src/core'),
      '@types': resolve(__dirname, 'skills/memory/src/types'),
      '@graph': resolve(__dirname, 'skills/memory/src/graph'),
      '@search': resolve(__dirname, 'skills/memory/src/search'),
      '@quality': resolve(__dirname, 'skills/memory/src/quality'),
      '@scope': resolve(__dirname, 'skills/memory/src/scope'),
    },
  },
});
