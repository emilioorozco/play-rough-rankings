/**
 * Transaction Helper for Integration Tests
 * 
 * Provides database isolation for integration tests using cleanup + sequential execution.
 * 
 * Strategy:
 * 1. Clean up test data in beforeEach (ensures clean state)
 * 2. Run tests sequentially (prevents interference between tests)
 * 3. Each test uses unique data via generateUniqueEmail()
 * 
 * This approach provides good isolation without requiring code refactoring.
 * True transaction-based isolation would require refactoring code to use
 * dependency injection for the Prisma client.
 * 
 * Usage:
 * ```typescript
 * import { setupTestIsolation } from './transaction-helper';
 * 
 * describe('My Tests', () => {
 *   setupTestIsolation();
 *   
 *   it('should do something', async () => {
 *     // Test code - runs with clean database state
 *   });
 * });
 * ```
 */

import { prisma } from '@/lib/prisma';
import { beforeEach } from 'vitest';

/**
 * Set up test isolation for a test suite
 * 
 * This sets up beforeEach hook that cleans up test data before each test.
 * Combined with sequential test execution, this provides good isolation.
 * 
 * Cleans up all messaging-related test data:
 * - messageDeliveryLog
 * - messageComplaint  
 * - messageBounce
 * - messageSuppressionList
 */
export function setupTestIsolation(): void {
  beforeEach(async () => {
    // Clean up messaging test data before each test
    // This ensures a clean state for each test
    // Order matters due to foreign key constraints
    await prisma.messageDeliveryLog.deleteMany({});
    await prisma.messageComplaint.deleteMany({});
    await prisma.messageBounce.deleteMany({});
    await prisma.messageSuppressionList.deleteMany({});
  });
}

