import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals:     true,
    setupFiles:  ['tests/setup.ts'],
    coverage: {
      provider:   'v8',
      include:    ['src/engine/**'],
      // Bootstrap / framework-glue files are not unit-testable in isolation
      exclude:    ['src/engine/GameLoop.ts', 'src/engine/InputManager.ts', 'src/engine/index.ts'],
      reporter:   ['text', 'lcov'],
      thresholds: { lines: 80, functions: 80 },
    },
  },
})
