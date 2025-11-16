// Vitest setup file - replaces jest.setup.js
// Configure testing framework before each test

import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with Testing Library matchers
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  useParams: () => ({}),
}))

// Mock Next.js image component
vi.mock('next/image', () => ({
  default: (props: any) => {
    const { default: React } = require('react')
    // eslint-disable-next-line @next/next/no-img-element
    return React.createElement('img', props)
  },
}))

// Mock environment variables
// Note: In Vitest, environment variables should be set in vitest.config.ts or .env.test
// These are fallback values if not already set
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'test'
if (!process.env.BETTER_AUTH_SECRET) process.env.BETTER_AUTH_SECRET = 'test-secret-32-characters-long'
if (!process.env.BETTER_AUTH_URL) process.env.BETTER_AUTH_URL = 'http://localhost:3000'
if (!process.env.NEXT_PUBLIC_APP_URL) process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

// Global browser API mocks
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Polyfills for browser APIs not available in Node.js
if (!global.Request) {
  global.Request = class Request {
    url: string
    method: string
    headers: Map<string, string>
    body: any

    constructor(url: string, options: any = {}) {
      this.url = url
      this.method = options.method || 'GET'
      this.headers = new Map(Object.entries(options.headers || {}))
      this.body = options.body
    }
  } as any
}

if (!global.Response) {
  global.Response = class Response {
    body: any
    status: number
    statusText: string
    headers: Map<string, string>

    constructor(body: any, options: any = {}) {
      this.body = body
      this.status = options.status || 200
      this.statusText = options.statusText || 'OK'
      this.headers = new Map(Object.entries(options.headers || {}))
    }

    async json() {
      return JSON.parse(this.body)
    }

    async text() {
      return this.body
    }
  } as any
}

if (!global.fetch) {
  global.fetch = vi.fn(() =>
    Promise.resolve(new global.Response('{}', { status: 200 }))
  ) as any
}

// Suppress console warnings in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
