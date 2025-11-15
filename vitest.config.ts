import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom', // Default environment for UI tests
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    server: { deps: { inline: ['convex-test'] } },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.output/**',
      '**/tests/e2e/**', // Exclude Playwright E2E tests
      '**/tests/unit/events.test.ts', // Exclude until Better-Auth mocking is resolved
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
