/**
 * Shared Prisma mock helper using jest-mock-extended
 * 
 * This provides a properly typed mock Prisma client that can be used
 * across all test files, reducing boilerplate and improving type safety.
 */

import type { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

/**
 * Create a deep mock of PrismaClient with all methods properly typed
 */
export const createMockPrisma = () => mockDeep<PrismaClient>()

/**
 * Type for the mocked Prisma client
 */
export type MockPrisma = DeepMockProxy<PrismaClient>

/**
 * Global mock Prisma instance (can be reset between tests)
 * Use this if you need a shared instance across tests
 */
export const mockPrisma = mockDeep<PrismaClient>()

/**
 * Reset all mocks on the global mockPrisma instance
 * Call this in beforeEach if using the global instance
 */
export const resetMockPrisma = () => {
  mockReset(mockPrisma)
}

