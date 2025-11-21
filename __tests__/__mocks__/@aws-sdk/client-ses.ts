/**
 * Mock for AWS SDK SES Client
 * 
 * Provides mock implementations of SESClient and SendEmailCommand
 * for unit testing email functionality.
 */

import { vi } from 'vitest'

// Mock send function that can be controlled in tests
// This is shared across all instances
const mockSendFn = vi.fn()

// Track SendEmailCommand instances for test inspection
const commandInstances: Array<{ input: any }> = []

/**
 * Mock SESClient class
 * Each instance shares the same mockSendFn
 */
export class SESClient {
  send = mockSendFn

  constructor(_config?: any) {
    // Constructor accepts config but doesn't use it in mock
  }
}

/**
 * Mock SendEmailCommand class
 * Stores the input parameters for inspection in tests
 */
export class SendEmailCommand {
  input: any

  constructor(input: any) {
    this.input = input
    // Track instance for test inspection
    commandInstances.push(this)
  }
}

// Export mock send function for test access
export const mockSend = mockSendFn

// Export function to get command instances for testing
export const getCommandInstances = (): Array<{ input: any }> => commandInstances

// Export function to clear command instances
export const clearCommandInstances = (): void => {
  commandInstances.length = 0
}

