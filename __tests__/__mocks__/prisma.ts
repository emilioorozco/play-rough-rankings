import { vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'

/**
 * Shared Prisma mock helper for Vitest
 * 
 * This provides a properly typed mock Prisma client that can be used
 * across all test files, reducing boilerplate and improving type safety.
 */

/**
 * Create a deep mock of PrismaClient with all methods properly typed
 * Uses Vitest's vi.fn() for all mock functions
 */
export const createMockPrisma = (): MockPrisma => {
  const createModelMock = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  })

  return {
    user: createModelMock(),
    account: createModelMock(),
    session: createModelMock(),
    verification: createModelMock(),
    userPreferences: createModelMock(),
    player: createModelMock(),
    playerGameStats: createModelMock(),
    game: createModelMock(),
    deck: createModelMock(),
    tournament: createModelMock(),
    tournamentEntry: createModelMock(),
    match: createModelMock(),
    store: createModelMock(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $executeRaw: vi.fn(),
    $executeRawUnsafe: vi.fn(),
    $queryRaw: vi.fn(),
    $queryRawUnsafe: vi.fn(),
    $transaction: vi.fn(),
  } as unknown as MockPrisma
}

/**
 * Type for the mocked Prisma client
 */
export type MockPrisma = {
  [K in keyof PrismaClient]: PrismaClient[K] extends (...args: any[]) => any
    ? ReturnType<typeof vi.fn>
    : PrismaClient[K] extends object
    ? {
        [M in keyof PrismaClient[K]]: ReturnType<typeof vi.fn>
      }
    : PrismaClient[K]
}

/**
 * Global mock Prisma instance (can be reset between tests)
 * Use this if you need a shared instance across tests
 */
export const mockPrisma = createMockPrisma()

/**
 * Reset all mocks on the global mockPrisma instance
 * Call this in beforeEach if using the global instance
 */
export const resetMockPrisma = () => {
  // Reset all model mocks
  const models = [
    'user',
    'account',
    'session',
    'verification',
    'userPreferences',
    'player',
    'playerGameStats',
    'game',
    'deck',
    'tournament',
    'tournamentEntry',
    'match',
    'store',
  ] as const

  models.forEach((model) => {
    const modelMock = mockPrisma[model] as any
    if (modelMock) {
      Object.keys(modelMock).forEach((method) => {
        if (typeof modelMock[method]?.mockReset === 'function') {
          modelMock[method].mockReset()
        }
      })
    }
  })

  // Reset utility methods
  const utilityMethods = [
    '$connect',
    '$disconnect',
    '$executeRaw',
    '$executeRawUnsafe',
    '$queryRaw',
    '$queryRawUnsafe',
    '$transaction',
  ] as const

  utilityMethods.forEach((method) => {
    const methodMock = mockPrisma[method] as any
    if (typeof methodMock?.mockReset === 'function') {
      methodMock.mockReset()
    }
  })
}
