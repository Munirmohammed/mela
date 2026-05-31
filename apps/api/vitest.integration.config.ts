import { defineConfig } from 'vitest/config'

// Integration tests run against a real Postgres. Provide TEST_DATABASE_URL in CI
// (and locally when you have a disposable DB); otherwise the suites skip.
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? ''

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.itest.ts'],
    fileParallelism: false, // one shared DB — run serially
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: 'test-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
    },
  },
})
