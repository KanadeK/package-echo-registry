import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      exclude: ['src/**/*.d.ts'],
      include: ['src/core/**/*.ts'],
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    reporters: ['default'],
  },
});
