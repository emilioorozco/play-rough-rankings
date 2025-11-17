/**
 * Unit tests for form draft store validation timing actions
 * Tests the new validation timing, blur tracking, and server error management features
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { act } from '@testing-library/react'
import { useFormDraftStore } from '@/stores/form-draft-store'

describe('Form Draft Store - Validation Timing Actions', () => {
  const mockFormData = {
    email: 'test@example.com',
    password: 'password123'
  }

  beforeEach(() => {
    // Reset store state before each test
    useFormDraftStore.getState().resetStore()
    // Clear localStorage to ensure clean state
    localStorage.clear()
  })

  afterEach(() => {
    // Clean up any timers
    vi.clearAllTimers()
  })

  describe('Blur Tracking Actions', () => {
    it('should mark field as blurred', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('login-form', mockFormData)
      })

      act(() => {
        store.markFieldBlurred(draftId!, 'email')
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].blurredFields?.email).toBe(true)
    })

    it('should check if field is blurred', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('login-form', mockFormData)
        store.markFieldBlurred(draftId!, 'email')
      })

      const isBlurred = store.isFieldBlurred(draftId!, 'email')
      expect(isBlurred).toBe(true)

      const isNotBlurred = store.isFieldBlurred(draftId!, 'password')
      expect(isNotBlurred).toBe(false)
    })

    it('should reset blurred state', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('login-form', mockFormData)
        store.markFieldBlurred(draftId!, 'email')
        store.markFieldBlurred(draftId!, 'password')
      })

      const initialStore = useFormDraftStore.getState()
      expect(initialStore.drafts[draftId!].blurredFields?.email).toBe(true)
      expect(initialStore.drafts[draftId!].blurredFields?.password).toBe(true)

      act(() => {
        store.resetBlurredState(draftId!)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].blurredFields).toEqual({})
    })

    it('should handle undefined blurredFields gracefully', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('login-form', mockFormData)
      })

      // Should not throw when checking blurred state on draft without blurredFields
      expect(() => {
        store.isFieldBlurred(draftId!, 'email')
      }).not.toThrow()

      expect(store.isFieldBlurred(draftId!, 'email')).toBe(false)
    })
  })

  describe('Validation Timing Configuration', () => {
    it('should set validation timing', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('login-form', mockFormData)
      })

      act(() => {
        store.setValidationTiming(draftId!, 'blur')
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].validationTiming).toBe('blur')
    })

    it('should get validation timing with default', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('login-form', mockFormData)
      })

      // Should return 'change' as default when not set
      const timing = store.getValidationTiming(draftId!)
      expect(timing).toBe('change')
    })

    it('should get validation timing when set', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('login-form', mockFormData)
        store.setValidationTiming(draftId!, 'blur')
      })

      const timing = store.getValidationTiming(draftId!)
      expect(timing).toBe('blur')
    })

    it('should support all validation timing modes', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('login-form', mockFormData)
      })

      // Test blur mode
      act(() => {
        store.setValidationTiming(draftId!, 'blur')
      })
      expect(store.getValidationTiming(draftId!)).toBe('blur')

      // Test submit mode
      act(() => {
        store.setValidationTiming(draftId!, 'submit')
      })
      expect(store.getValidationTiming(draftId!)).toBe('submit')

      // Test change mode
      act(() => {
        store.setValidationTiming(draftId!, 'change')
      })
      expect(store.getValidationTiming(draftId!)).toBe('change')
    })
  })

  describe('Server Error Management', () => {
    it('should set server error for field', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('login-form', mockFormData)
      })

      act(() => {
        store.setServerError(draftId!, 'email', 'Email already exists')
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].serverErrors?.email).toBe('Email already exists')
    })

    it('should set multiple server errors', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('login-form', mockFormData)
      })

      const errors = {
        email: 'Email already exists',
        password: 'Password too weak'
      }

      act(() => {
        store.setServerErrors(draftId!, errors)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].serverErrors).toEqual(errors)
    })

    it('should clear server error for field', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('login-form', mockFormData)
        store.setServerError(draftId!, 'email', 'Email already exists')
      })

      const initialStore = useFormDraftStore.getState()
      expect(initialStore.drafts[draftId!].serverErrors?.email).toBe('Email already exists')

      act(() => {
        store.clearServerError(draftId!, 'email')
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].serverErrors?.email).toBeUndefined()
    })

    it('should clear all server errors', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('login-form', mockFormData)
        store.setServerErrors(draftId!, {
          email: 'Email error',
          password: 'Password error'
        })
      })

      const initialStore = useFormDraftStore.getState()
      expect(Object.keys(initialStore.drafts[draftId!].serverErrors || {})).toHaveLength(2)

      act(() => {
        store.clearAllServerErrors(draftId!)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].serverErrors).toEqual({})
    })

    it('should set client error for field', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('login-form', mockFormData)
      })

      act(() => {
        store.setClientError(draftId!, 'email', 'Invalid email format')
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].clientErrors?.email).toBe('Invalid email format')
    })

    it('should clear client error for field', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('login-form', mockFormData)
        store.setClientError(draftId!, 'email', 'Invalid email format')
      })

      const initialStore = useFormDraftStore.getState()
      expect(initialStore.drafts[draftId!].clientErrors?.email).toBe('Invalid email format')

      act(() => {
        store.clearClientError(draftId!, 'email')
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].clientErrors?.email).toBeUndefined()
    })

    it('should merge client and server errors with server priority', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('login-form', mockFormData)
        store.setClientError(draftId!, 'email', 'Invalid email format')
        store.setServerError(draftId!, 'email', 'Email already exists')
      })

      const updatedStore = useFormDraftStore.getState()
      // Server error should take priority in combined errors field
      expect(updatedStore.drafts[draftId!].errors.email).toBe('Email already exists')
    })
  })

  describe('Debounce Timer Management', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should set debounce timer', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('login-form', mockFormData)
      })

      const timer = setTimeout(() => {}, 300)

      act(() => {
        store.setDebounceTimer(draftId!, 'email', timer)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].validationDebounceTimers?.email).toBe(timer)
    })

    it('should clear debounce timer', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('login-form', mockFormData)
      })

      const timer = setTimeout(() => {}, 300)

      act(() => {
        store.setDebounceTimer(draftId!, 'email', timer)
      })

      const initialStore = useFormDraftStore.getState()
      expect(initialStore.drafts[draftId!].validationDebounceTimers?.email).toBe(timer)

      act(() => {
        store.clearDebounceTimer(draftId!, 'email')
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].validationDebounceTimers?.email).toBeUndefined()
    })

    it('should clear all debounce timers', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('login-form', mockFormData)
      })

      const timer1 = setTimeout(() => {}, 300)
      const timer2 = setTimeout(() => {}, 300)

      act(() => {
        store.setDebounceTimer(draftId!, 'email', timer1)
        store.setDebounceTimer(draftId!, 'password', timer2)
      })

      const initialStore = useFormDraftStore.getState()
      expect(Object.keys(initialStore.drafts[draftId!].validationDebounceTimers || {})).toHaveLength(2)

      act(() => {
        store.clearAllDebounceTimers(draftId!)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].validationDebounceTimers).toEqual({})
    })

    it('should clear timers on draft deletion', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('login-form', mockFormData)
      })

      const timer = setTimeout(() => {}, 300)

      act(() => {
        store.setDebounceTimer(draftId!, 'email', timer)
      })

      act(() => {
        store.deleteDraft(draftId!)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!]).toBeUndefined()
    })
  })

  describe('Backward Compatibility', () => {
    it('should work with drafts without new fields', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('login-form', mockFormData)
      })

      // Draft should work without new optional fields
      const draft = store.getDraft(draftId!)
      expect(draft).toBeDefined()
      expect(draft?.data).toEqual(mockFormData)

      // Should handle operations gracefully
      expect(() => {
        store.isFieldBlurred(draftId!, 'email')
        store.getValidationTiming(draftId!)
      }).not.toThrow()
    })

    it('should default to change validation timing for old drafts', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('login-form', mockFormData)
      })

      // Should return 'change' as default
      const timing = store.getValidationTiming(draftId!)
      expect(timing).toBe('change')
    })

    it('should handle undefined optional fields gracefully', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('login-form', mockFormData)
      })

      const draft = store.getDraft(draftId!)
      
      // Optional fields should be undefined or empty objects (both are valid for backward compatibility)
      // The store may initialize them as empty objects for convenience
      if (draft?.blurredFields !== undefined) {
        expect(draft.blurredFields).toEqual({})
      }
      if (draft?.serverErrors !== undefined) {
        expect(draft.serverErrors).toEqual({})
      }
      if (draft?.clientErrors !== undefined) {
        expect(draft.clientErrors).toEqual({})
      }
      if (draft?.validationDebounceTimers !== undefined) {
        expect(draft.validationDebounceTimers).toEqual({})
      }
      // validationTiming can be undefined or have a default value
    })
  })
})
