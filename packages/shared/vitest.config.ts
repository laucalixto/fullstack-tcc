import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      // events.ts e types.ts são declarações puras (constantes + interfaces)
      // sem lógica executável — testados indiretamente pelo uso nos outros pacotes
      exclude: ['src/__tests__/**', 'src/index.ts', 'src/events.ts', 'src/types.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
