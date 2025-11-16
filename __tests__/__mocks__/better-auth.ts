import { vi } from 'vitest'

/**
 * Mock for better-auth ES module
 * Provides mock implementations for Better Auth authentication system
 */

export const createAuth = vi.fn(() => ({
  api: {
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    getSession: vi.fn(),
  },
  handlers: {
    GET: vi.fn(),
    POST: vi.fn(),
  },
}))

export const createAuthClient = vi.fn(() => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
  getSession: vi.fn(),
  useSession: vi.fn(() => ({
    data: null,
    isPending: false,
    error: null,
  })),
}))

export default {
  createAuth,
  createAuthClient,
}
