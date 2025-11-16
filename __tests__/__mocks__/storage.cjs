// Mock for localStorage and sessionStorage
// Using CommonJS for compatibility with Jest VM modules
const { jest } = require('@jest/globals')

const createMockLocalStorage = () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
})

const createMockSessionStorage = () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
})

// Default mock instances
const mockLocalStorage = createMockLocalStorage()
const mockSessionStorage = createMockSessionStorage()

// Helper to setup storage mocks on window object
const setupStorageMocks = () => {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  })

  Object.defineProperty(window, 'sessionStorage', {
    value: mockSessionStorage,
    writable: true,
  })
}

module.exports = {
  createMockLocalStorage,
  createMockSessionStorage,
  mockLocalStorage,
  mockSessionStorage,
  setupStorageMocks,
}

