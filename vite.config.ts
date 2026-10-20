import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Relative base so the same build works locally and under a GitHub Pages subpath.
  base: './',
  test: {
    include: ['src/**/*.test.ts'],
  },
})
