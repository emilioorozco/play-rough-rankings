// Mock for nanostores ES module
export const atom = jest.fn(() => ({
  get: jest.fn(),
  set: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
}))

export const computed = jest.fn(() => ({
  get: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
}))

export const action = jest.fn(() => ({
  get: jest.fn(),
  set: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
}))

export default {
  atom,
  computed,
  action,
}
