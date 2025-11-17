/**
 * Simplified integration tests for useZustandForm hook
 * Focuses on core functionality that can be tested reliably
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSimpleZustandForm } from '@/hooks/use-form-zustand'
import { useFormDraftStore } from '@/stores/form-draft-store'
import { z } from 'zod'

describe('useZustandForm Hook - Core Functionality', () => {
  beforeEach(() => {
    useFormDraftStore.getState().resetStore()
    localStorage.clear()
  })

  const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  })

  it('should initialize with default values', async () => {
    const { result } = renderHook(() =>
      useSimpleZustandForm({
        initialData: { email: 'test@example.com', password: 'password123' },
        validationSchema: loginSchema,
        onSubmit: vi.fn(),
        validationTiming: 'blur',
      })
    )

    // Wait for hook to initialize (draft creation happens in useEffect)
    await waitFor(() => {
      expect(result.current.data).toBeDefined()
    }, { timeout: 1000 })

    expect(result.current.data.email).toBe('test@example.com')
    expect(result.current.data.password).toBe('password123')
  })

  it('should validate data correctly', async () => {
    const { result } = renderHook(() =>
      useSimpleZustandForm({
        initialData: { email: 'valid@example.com', password: 'password123' },
        validationSchema: loginSchema,
        onSubmit: vi.fn(),
        validationTiming: 'blur',
      })
    )

    await waitFor(() => {
      expect(result.current.isValid).toBe(true)
    }, { timeout: 1000 })
  })

  it('should detect invalid data', async () => {
    const { result } = renderHook(() =>
      useSimpleZustandForm({
        initialData: { email: 'invalid', password: 'short' },
        validationSchema: loginSchema,
        onSubmit: vi.fn(),
        validationTiming: 'blur',
      })
    )

    await waitFor(() => {
      expect(result.current.isValid).toBe(false)
    }, { timeout: 1000 })
  })

  it('should have blur validation timing set', async () => {
    const { result } = renderHook(() =>
      useSimpleZustandForm({
        initialData: { email: '', password: '' },
        validationSchema: loginSchema,
        onSubmit: vi.fn(),
        validationTiming: 'blur',
      })
    )

    await waitFor(() => {
      expect(result.current.validationTiming).toBe('blur')
    }, { timeout: 1000 })
  })

  it('should provide form actions', async () => {
    const { result } = renderHook(() =>
      useSimpleZustandForm({
        initialData: { email: '', password: '' },
        validationSchema: loginSchema,
        onSubmit: vi.fn(),
        validationTiming: 'blur',
      })
    )

    await waitFor(() => {
      expect(result.current.setField).toBeDefined()
      expect(result.current.handleBlur).toBeDefined()
      expect(result.current.submit).toBeDefined()
      expect(result.current.reset).toBeDefined()
    }, { timeout: 1000 })
  })

  it('should work in production-like scenario', async () => {
    // This simulates how the hook is actually used in components
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    
    const { result } = renderHook(() =>
      useSimpleZustandForm({
        initialData: { email: 'test@example.com', password: 'password123' },
        validationSchema: loginSchema,
        onSubmit,
        validationTiming: 'blur',
        validationDebounce: 300,
      })
    )

    // Wait for initialization
    await waitFor(() => {
      expect(result.current.data).toBeDefined()
      expect(result.current.isValid).toBe(true)
    }, { timeout: 1000 })

    // Hook should be fully functional
    expect(result.current.data.email).toBe('test@example.com')
    expect(result.current.isValid).toBe(true)
    expect(result.current.isSubmitting).toBe(false)
    expect(typeof result.current.setField).toBe('function')
    expect(typeof result.current.handleBlur).toBe('function')
    expect(typeof result.current.submit).toBe('function')
  })
})
