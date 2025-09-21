// Global teardown for Jest
// This runs once after all test suites

module.exports = async () => {
  console.log('Cleaning up test environment...')
  
  // Add any global cleanup here
  // For example:
  // - Close database connections
  // - Clean up temporary files
  // - Reset global state
  
  console.log('Test environment cleanup complete')
}
