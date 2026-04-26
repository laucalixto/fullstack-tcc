import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/ws/socket.ts',
        // Wiring/routing — smoke-testado em AppRouter.test.tsx; callbacks cobertos por E2E
        'src/AppRouter.tsx',
        // Requer WebGL/contexto de renderização — coberto pelo E2E Playwright
        'src/three/scene.ts',
        'src/three/scene/**',
        'src/three/camera.ts',
        // Dev-only /preview com lil-gui + WebGL — não unitarizável em jsdom
        'src/three/BoardPreview.tsx',
        'src/__tests__/**',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
