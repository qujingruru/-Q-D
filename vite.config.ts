import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Vite config; vitest shares it (worker files are covered by `?worker` import in dev/build).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    testTimeout: 30000,
  },
})
