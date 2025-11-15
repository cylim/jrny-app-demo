import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.output/**',
      '**/tests/e2e/**', // Exclude Playwright E2E tests
      '**/tests/contract/**', // Exclude Convex contract tests (require import.meta.glob)
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.output/**',
        '**/convex/_generated/**',
        '**/*.config.*',
        '**/tests/**',
      ],
    },
  },
})
