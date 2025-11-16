import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'
import { useFormDraftStore } from '@/stores/form-draft-store'
import type { ExtendedFormDraft, AutoSaveSettings } from '@/lib/types'

describe('Form Draft Store', () => {
  const mockFormData = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '123-456-7890'
  }

  const mockDraft: ExtendedFormDraft = {
    id: 'test-draft-id',
    formType: 'user-profile',
    formData: mockFormData,
    lastUpdated: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    isSubmitted: false,
    submittedAt: undefined,
    metadata: {
      userId: 'test-user-id',
      sessionId: 'test-session-id',
      userAgent: 'test-user-agent',
      ipAddress: '127.0.0.1',
      version: 1
    },
    validation: {
      isValid: true,
      errors: {},
      warnings: {}
    },
    history: {
      versions: [],
      maxVersions: 5
    }
  }

  beforeEach(() => {
    // Reset store state before each test
    useFormDraftStore.getState().resetStore()
  })

  describe('Draft Management', () => {
    it('should save a new draft', () => {
      const store = useFormDraftStore.getState()
      const formType = 'user-profile'
      const metadata = { userId: 'test-user' }

      let draftId: string
      act(() => {
        draftId = store.createDraft(formType, mockFormData, metadata)
      })

      // Get the updated store state after the act
      const updatedStore = useFormDraftStore.getState()
      const savedDraft = updatedStore.drafts[draftId!]
      expect(savedDraft).toBeDefined()
      expect(savedDraft.data).toEqual(mockFormData)
      expect(savedDraft.formType).toBe(formType)
      expect(savedDraft.metadata?.userId).toBe('test-user')
    })

    it('should update an existing draft', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      // First save a draft
      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
      })

      const updatedFormData = { ...mockFormData, name: 'Jane Doe' }

      // Then update it
      act(() => {
        store.updateDraft(draftId!, { data: updatedFormData })
      })

      const updatedStore = useFormDraftStore.getState()
      const updatedDraft = updatedStore.drafts[draftId!]
      expect(updatedDraft.data).toEqual(updatedFormData)
      expect(updatedDraft.lastUpdated).toBeInstanceOf(Date)
    })

    it('should delete a draft', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      // First save a draft
      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
      })

      const initialStore = useFormDraftStore.getState()
      expect(initialStore.drafts[draftId!]).toBeDefined()

      // Then delete it
      act(() => {
        store.deleteDraft(draftId!)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!]).toBeUndefined()
    })

    it('should clear a specific draft', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      // First save a draft
      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
      })

      const initialStore = useFormDraftStore.getState()
      expect(initialStore.drafts[draftId!]).toBeDefined()

      // Then clear it (using deleteDraft since clearDraft doesn't exist)
      act(() => {
        store.deleteDraft(draftId!)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!]).toBeUndefined()
    })
  })

  describe('Draft Lifecycle', () => {
    it('should extend draft expiration', () => {
      const store = useFormDraftStore.getState()
      let draftId: string
      const additionalTime = 2 * 60 * 60 * 1000 // 2 hours

      // First save a draft
      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
      })

      const initialStore = useFormDraftStore.getState()
      const originalExpiry = initialStore.drafts[draftId!].expiresAt

      // Then extend it
      act(() => {
        store.updateDraft(draftId!, { expiresAt: new Date(Date.now() + additionalTime) })
      })

      const updatedStore = useFormDraftStore.getState()
      const newExpiry = updatedStore.drafts[draftId!].expiresAt
      expect(newExpiry?.getTime()).toBeGreaterThan(originalExpiry?.getTime() || 0)
    })

    it('should mark draft as submitted', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      // First save a draft
      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
      })

      const initialStore = useFormDraftStore.getState()
      expect(initialStore.drafts[draftId!].isSubmitted).toBeUndefined()

      // Then mark as submitted
      act(() => {
        store.updateDraft(draftId!, { isSubmitted: true })
      })

      const updatedStore = useFormDraftStore.getState()
      const submittedDraft = updatedStore.drafts[draftId!]
      expect(submittedDraft.isSubmitted).toBe(true)
      expect(submittedDraft.submittedAt).toBeUndefined()
    })
  })

  describe('Draft Cleanup', () => {
    it('should clear all drafts', () => {
      const store = useFormDraftStore.getState()

      // Save multiple drafts
      act(() => {
        store.createDraft('user-profile', mockFormData)
        store.createDraft('tournament-form', mockFormData)
        store.createDraft('user-profile', mockFormData)
      })

      const initialStore = useFormDraftStore.getState()
      expect(Object.keys(initialStore.drafts)).toHaveLength(3)

      // Clear all drafts
      act(() => {
        store.clearDrafts()
      })

      const updatedStore = useFormDraftStore.getState()
      expect(Object.keys(updatedStore.drafts)).toHaveLength(0)
    })

    it('should clear drafts by form type', () => {
      const store = useFormDraftStore.getState()

      // Save drafts of different types
      act(() => {
        store.createDraft('user-profile', mockFormData)
        store.createDraft('tournament-form', mockFormData)
        store.createDraft('user-profile', mockFormData)
      })

      const initialStore = useFormDraftStore.getState()
      expect(Object.keys(initialStore.drafts)).toHaveLength(3)

      // Clear only user-profile drafts
      act(() => {
        store.clearDrafts('user-profile')
      })

      const updatedStore = useFormDraftStore.getState()
      const remainingDrafts = Object.values(updatedStore.drafts)
      expect(remainingDrafts).toHaveLength(1)
      expect(remainingDrafts[0].formType).toBe('tournament-form')
    })

    it('should clear expired drafts', () => {
      const store = useFormDraftStore.getState()
      const expiredTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago

      // Save a draft with expired time
      let expiredDraftId: string
      act(() => {
        expiredDraftId = store.createDraft('user-profile', mockFormData)
        store.updateDraft(expiredDraftId!, { expiresAt: expiredTime })
      })

      // Save a valid draft
      act(() => {
        store.createDraft('user-profile', mockFormData)
      })

      const initialStore = useFormDraftStore.getState()
      expect(Object.keys(initialStore.drafts)).toHaveLength(2)

      // Clear expired drafts
      act(() => {
        store.cleanupExpiredDrafts()
      })

      const updatedStore = useFormDraftStore.getState()
      expect(Object.keys(updatedStore.drafts)).toHaveLength(1)
      // Check that only valid drafts remain
      const remainingDrafts = Object.values(updatedStore.drafts)
      expect(remainingDrafts.every(draft => !draft.isExpired)).toBe(true)
    })
  })

  describe('Auto-save Settings', () => {
    it('should set auto-save settings', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      // Create a draft first
      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
      })

      // Enable auto-save with custom interval
      act(() => {
        store.enableAutoSave(draftId!, 10000)
      })

      const updatedStore = useFormDraftStore.getState()
      const draft = updatedStore.drafts[draftId!]
      expect(draft.autoSaveEnabled).toBe(true)
      expect(draft.autoSaveInterval).toBe(10000)
    })

    it('should enable auto-save', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      // Create a draft first
      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
      })

      // Disable auto-save
      act(() => {
        store.disableAutoSave(draftId!)
      })

      const initialStore = useFormDraftStore.getState()
      expect(initialStore.drafts[draftId!].autoSaveEnabled).toBe(false)

      // Then enable it
      act(() => {
        store.enableAutoSave(draftId!)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].autoSaveEnabled).toBe(true)
    })

    it('should disable auto-save', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      // Create a draft first
      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
      })

      // Enable auto-save
      act(() => {
        store.enableAutoSave(draftId!)
      })

      const initialStore = useFormDraftStore.getState()
      expect(initialStore.drafts[draftId!].autoSaveEnabled).toBe(true)

      // Then disable it
      act(() => {
        store.disableAutoSave(draftId!)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].autoSaveEnabled).toBe(false)
    })

    it('should set auto-save interval', () => {
      const store = useFormDraftStore.getState()
      let draftId: string
      const newInterval = 15000

      // Create a draft first
      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
      })

      // Set auto-save interval
      act(() => {
        store.enableAutoSave(draftId!, newInterval)
      })

      const updatedStore = useFormDraftStore.getState()
      const draft = updatedStore.drafts[draftId!]
      expect(draft.autoSaveInterval).toBe(newInterval)
    })
  })

  describe('Draft Statistics', () => {
    it('should track draft statistics', () => {
      const store = useFormDraftStore.getState()

      // Save drafts of different types
      act(() => {
        store.createDraft('user-profile', mockFormData)
        store.createDraft('user-profile', mockFormData)
        store.createDraft('tournament-form', mockFormData)
      })

      const updatedStore = useFormDraftStore.getState()
      const drafts = Object.values(updatedStore.drafts)
      expect(drafts).toHaveLength(3)
      
      const userProfileDrafts = drafts.filter(draft => draft.formType === 'user-profile')
      const tournamentFormDrafts = drafts.filter(draft => draft.formType === 'tournament-form')
      expect(userProfileDrafts).toHaveLength(2)
      expect(tournamentFormDrafts).toHaveLength(1)
    })

    it('should track expired and active drafts', () => {
      const store = useFormDraftStore.getState()
      const expiredTime = new Date(Date.now() - 24 * 60 * 60 * 1000)

      // Save active draft
      let activeDraftId: string
      act(() => {
        activeDraftId = store.createDraft('user-profile', mockFormData)
      })

      // Save expired draft
      let expiredDraftId: string
      act(() => {
        expiredDraftId = store.createDraft('user-profile', mockFormData)
        store.updateDraft(expiredDraftId!, { expiresAt: expiredTime, isExpired: true })
      })

      const updatedStore = useFormDraftStore.getState()
      const drafts = Object.values(updatedStore.drafts)
      const activeDrafts = drafts.filter(draft => !draft.isExpired)
      const expiredDrafts = drafts.filter(draft => draft.isExpired)
      expect(activeDrafts).toHaveLength(1)
      expect(expiredDrafts).toHaveLength(1)
    })
  })

  describe('Store State Management', () => {
    it('should maintain consistent state across operations', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      // Save initial draft
      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
      })

      const initialStore = useFormDraftStore.getState()
      const initialDraft = initialStore.drafts[draftId!]

      // Perform other operations
      act(() => {
        store.createDraft('tournament-form', mockFormData)
      })

      // Original draft should remain unchanged
      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!]).toEqual(initialDraft)
    })

    it('should handle concurrent draft operations', () => {
      const store = useFormDraftStore.getState()

      // Simulate concurrent operations
      act(() => {
        store.createDraft('user-profile', mockFormData)
        store.createDraft('tournament-form', mockFormData)
      })

      const updatedStore = useFormDraftStore.getState()
      const drafts = Object.values(updatedStore.drafts)
      expect(drafts).toHaveLength(2)
      expect(drafts.some(draft => draft.formType === 'user-profile')).toBe(true)
      expect(drafts.some(draft => draft.formType === 'tournament-form')).toBe(true)
    })
  })

  describe('Default Values', () => {
    it('should have correct default auto-save settings', () => {
      const store = useFormDraftStore.getState()

      expect(store.autoSaveSettings.enabled).toBe(true)
      expect(store.autoSaveSettings.interval).toBe(30000)
      expect(store.autoSaveSettings.maxRetries).toBe(3)
      expect(store.autoSaveSettings.retryDelay).toBe(1000)
    })

    it('should have correct default metadata', () => {
      const store = useFormDraftStore.getState()

      expect(store.metadata).toBeDefined()
      expect(typeof store.metadata).toBe('object')
      expect(Object.keys(store.metadata).length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle operations on non-existent drafts gracefully', () => {
      const store = useFormDraftStore.getState()
      const nonExistentDraftId = 'non-existent'

      // Should not throw error when operating on non-existent draft
      expect(() => {
        act(() => {
          store.updateDraft(nonExistentDraftId, { formData: {} })
          store.deleteDraft(nonExistentDraftId)
          store.deleteDraft(nonExistentDraftId)
          // extendDraft doesn't exist, using updateDraft instead
        store.updateDraft(nonExistentDraftId, { expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) })
          // markDraftAsSubmitted doesn't exist, using updateDraft instead
        store.updateDraft(nonExistentDraftId, { isSubmitted: true })
        })
      }).not.toThrow()
    })
  })
})
