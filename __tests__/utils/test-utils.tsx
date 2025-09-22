import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TRPCProvider } from '@/lib/trpc/provider'
import { AppProvider } from '@/components/app-provider'

// Mock tRPC provider for testing
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
})

interface AllTheProvidersProps {
  children: React.ReactNode
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  const queryClient = createTestQueryClient()
  
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider>
        <AppProvider>
          {children}
        </AppProvider>
      </TRPCProvider>
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

// Test data factories
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  name: 'Test User',
  role: 'player',
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockTournament = (overrides = {}) => ({
  id: 'test-tournament-id',
  name: 'Test Tournament',
  description: 'A test tournament',
  gameId: 'pokemon-tcg',
  storeId: 'test-store-id',
  status: 'upcoming',
  startDate: new Date(Date.now() + 86400000), // Tomorrow
  endDate: new Date(Date.now() + 86400000 + 3600000), // Tomorrow + 1 hour
  maxPlayers: 32,
  entryFee: 10,
  prizePool: 100,
  organizerId: 'test-user-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockPlayer = (overrides = {}) => ({
  id: 'test-player-id',
  userId: 'test-user-id',
  externalId: 'EXT123',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

// Mock functions
export const mockTRPC = {
  useQuery: () => {},
  useMutation: () => {},
  useUtils: () => ({
    invalidate: () => {},
    refetch: () => {},
  }),
}

// Test environment helpers
export const setupTestEnvironment = () => {
  // Mock environment variables
  process.env.NODE_ENV = 'test'
  process.env.BETTER_AUTH_SECRET = 'test-secret-32-characters-long'
  process.env.BETTER_AUTH_URL = 'http://localhost:3000'
  
  // Mock console methods to reduce noise in tests
  if (typeof jest !== 'undefined') {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  }
}

export const cleanupTestEnvironment = () => {
  if (typeof jest !== 'undefined') {
    jest.restoreAllMocks()
  }
}
