import { vi } from 'vitest'

/**
 * Mock for nanostores ES module
 * Provides mock implementations for Nanostores state management
 */

export const atom = vi.fn(() => ({
  get: vi.fn(),
  set: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
}))

export const computed = vi.fn(() => ({
  get: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
}))

export const action = vi.fn(() => ({
  get: vi.fn(),
  set: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
}))

export default {
  atom,
  computed,
  action,
}
