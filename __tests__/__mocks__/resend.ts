/**
 * Mock for Resend Email Client
 * 
 * Provides mock implementations of Resend client
 * for unit testing email functionality.
 */

import { vi } from 'vitest'

// Mock emails.send function that can be controlled in tests
const mockEmailsSendFn = vi.fn()

/**
 * Mock Resend class
 * Each instance shares the same mockEmailsSendFn
 */
export class Resend {
  emails = {
    send: mockEmailsSendFn,
  }

  constructor(_apiKey?: string) {
    // Constructor accepts API key but doesn't use it in mock
  }
}

// Export mock send function for test access
export const mockEmailsSend = mockEmailsSendFn

// Export function to clear mock
export const clearMockEmailsSend = (): void => {
  mockEmailsSendFn.mockClear()
}

