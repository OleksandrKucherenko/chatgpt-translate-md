import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const fromRoot = (path: string): string => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@this/arguments': fromRoot('./packages/arguments/index.ts'),
      '@this/configuration': fromRoot('./packages/configuration/index.ts'),
      '@this/gc': fromRoot('./packages/gc/index.ts'),
      '@this/telemetry': fromRoot('./packages/telemetry/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['clis/**/*.test.ts', 'packages/**/*.test.ts', 'services/**/*.test.ts', 'websites/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['json', 'lcov', 'text', 'clover', 'html'],
      exclude: ['**/*.test.ts', '**/node_modules/**', '**/dist/**', '**/build/**'],
    },
  },
})
