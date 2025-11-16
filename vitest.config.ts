import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: 'jsdom',
    
    // Setup files
    setupFiles: ['./vitest.setup.ts'],
    
    // Global test APIs (Jest-compatible)
    globals: true,
    
    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      BETTER_AUTH_SECRET: 'test-secret-32-characters-long',
      BETTER_AUTH_URL: 'http://localhost:3000',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    },
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'app/**/*.{js,jsx,ts,tsx}',
        'components/**/*.{js,jsx,ts,tsx}',
        'lib/**/*.{js,jsx,ts,tsx}',
        'hooks/**/*.{js,jsx,ts,tsx}',
        'stores/**/*.{js,jsx,ts,tsx}',
      ],
      exclude: [
        '**/*.d.ts',
        '**/node_modules/**',
        '**/.next/**',
        '**/coverage/**',
        '**/*.config.js',
        '**/*.config.ts',
        '**/migrations/**',
        '**/scripts/**',
      ],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
    
    // Test file patterns
    include: [
      '__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}',
      '**/*.{test,spec}.{js,jsx,ts,tsx}',
    ],
    
    // Ignore patterns
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/coverage/**',
      '**/dist/**',
      '__tests__/utils/**',
    ],
    
    // Test timeout
    testTimeout: 10000,
    
    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    
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
