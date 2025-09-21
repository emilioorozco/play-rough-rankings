// Global setup for Jest
// This runs once before all test suites

const { execSync } = require('child_process')

module.exports = async () => {
  console.log('Setting up test environment...')
  
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_leaderboard'
  
  try {
    // Generate Prisma client for tests
    console.log('Generating Prisma client for tests...')
    execSync('npx prisma generate', { stdio: 'inherit' })
    
    // Optional: Set up test database
    // Note: In CI/CD, you might want to create a fresh test database
    console.log('Test environment setup complete')
  } catch (error) {
    console.warn('Warning: Could not complete test setup:', error.message)
  }
}
