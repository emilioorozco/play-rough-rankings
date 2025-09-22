// Mock for better-auth ES module
export const createAuth = jest.fn(() => ({
  api: {
    signIn: jest.fn(),
    signOut: jest.fn(),
    signUp: jest.fn(),
    getSession: jest.fn(),
  },
  handlers: {
    GET: jest.fn(),
    POST: jest.fn(),
  },
}))

export const createAuthClient = jest.fn(() => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  signUp: jest.fn(),
  getSession: jest.fn(),
  useSession: jest.fn(() => ({
    data: null,
    isPending: false,
    error: null,
  })),
}))

export default {
  createAuth,
  createAuthClient,
}
