import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Vitest configuration for integration tests
 * 
 * Integration tests require sequential execution (one file at a time) to prevent
 * database cleanup interference between test files. Each test file cleans up
 * in beforeEach, so files must run sequentially to avoid deleting each other's data.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: 'jsdom',
    
    // Setup files
    setupFiles: [
      './vitest.setup.ts',
      './__tests__/integration/messaging/setup.ts',
    ],
    
    // Global test APIs (Jest-compatible)
    globals: true,
    
    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      BETTER_AUTH_SECRET: 'test-secret-32-characters-long',
      BETTER_AUTH_URL: 'http://localhost:3000',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    },
    
    // Test file patterns - only integration tests
    include: [
      '__tests__/integration/**/*.{test,spec}.{js,jsx,ts,tsx}',
    ],
    
    // Ignore patterns
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/coverage/**',
      '**/dist/**',
      '__tests__/utils/**',
      '__tests__/unit/**', // Exclude unit tests
    ],
    
    // Test timeout (increased for integration tests with database operations)
    testTimeout: 30000,
    
    // Sequential execution for integration tests
    // CRITICAL: Integration tests must run one file at a time because:
    // 1. Each test file cleans up ALL data in beforeEach (clearTestData)
    // 2. If files run concurrently, cleanup from one file deletes data from another
    // 3. This causes "data created but not found" failures
    pool: 'forks',
    // @ts-expect-error - poolOptions exists in Vitest but types may be incomplete
    poolOptions: {
      forks: {
        // Run tests sequentially (1 at a time)
        maxForks: 1,
      },
    },
    // Disable file-level parallelism - ensures test files run one at a time
    // This prevents beforeEach cleanup from interfering with other test files
    // @ts-expect-error - fileParallelism exists in Vitest but types may be incomplete
    fileParallelism: false,
    
    // Retry flaky tests in CI
    retry: process.env.CI ? 2 : 0,
    
    // Fail fast in CI
    bail: process.env.CI ? 1 : 0,
    
    // Performance reporting
    slowTestThreshold: 1000, // 1 second
  },
  
  // Module resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})

