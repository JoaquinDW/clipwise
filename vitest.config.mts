import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, '.') },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
    // Caption goldens rasterise 1080x1920 frames; the default 5s is tight.
    testTimeout: 30_000,
  },
});
