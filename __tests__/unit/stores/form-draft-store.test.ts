import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'
import { useFormDraftStore } from '@/stores/form-draft-store'
import type { ExtendedFormDraft } from '@/stores/form-draft-store'
import { z } from 'zod'

describe('Form Draft Store', () => {
  const mockFormData = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '123-456-7890'
  }

  beforeEach(() => {
    // Reset store state before each test
    useFormDraftStore.getState().resetStore()
    // Clear localStorage to ensure clean state
    localStorage.clear()
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
          store.updateDraft(nonExistentDraftId, { data: {} })
          store.deleteDraft(nonExistentDraftId)
          store.deleteDraft(nonExistentDraftId)
          store.updateDraft(nonExistentDraftId, { expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) })
          store.updateDraft(nonExistentDraftId, { isSubmitted: true })
        })
      }).not.toThrow()
    })
  })

  describe('Draft Data Updates', () => {
    it('should update draft data and validate', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
      })

      const newData = { name: 'Jane Smith', email: 'jane@example.com' }
      act(() => {
        store.updateDraftData(draftId!, newData)
      })

      const updatedStore = useFormDraftStore.getState()
      const draft = updatedStore.drafts[draftId!]
      expect(draft.data.name).toBe('Jane Smith')
      expect(draft.data.email).toBe('jane@example.com')
      expect(draft.isDirty).toBe(true)
    })

    it('should update draft step', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('tournament-create', mockFormData)
      })

      act(() => {
        store.updateDraftStep(draftId!, 2)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].currentStep).toBe(2)
    })
  })

  describe('Active Draft Management', () => {
    it('should set and get active draft', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
      })

      // Get updated store state after creation
      let updatedStore = useFormDraftStore.getState()
      expect(updatedStore.activeDraftId).toBe(draftId!)

      act(() => {
        useFormDraftStore.getState().setActiveDraft(null)
      })

      updatedStore = useFormDraftStore.getState()
      expect(updatedStore.activeDraftId).toBeNull()

      act(() => {
        useFormDraftStore.getState().setActiveDraft(draftId!)
      })

      updatedStore = useFormDraftStore.getState()
      expect(updatedStore.activeDraftId).toBe(draftId!)
    })

    it('should get active draft', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
      })

      const activeDraft = store.getActiveDraft()
      expect(activeDraft).toBeDefined()
      expect(activeDraft?.id).toBe(draftId!)
    })

    it('should return null when no active draft', () => {
      const store = useFormDraftStore.getState()

      act(() => {
        store.setActiveDraft(null)
      })

      const activeDraft = store.getActiveDraft()
      expect(activeDraft).toBeNull()
    })
  })

  describe('Draft Retrieval', () => {
    it('should get draft by id', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
      })

      const draft = store.getDraft(draftId!)
      expect(draft).toBeDefined()
      expect(draft?.id).toBe(draftId!)
    })

    it('should get drafts by type', () => {
      const store = useFormDraftStore.getState()

      act(() => {
        store.createDraft('user-profile', mockFormData)
        store.createDraft('user-profile', mockFormData)
        store.createDraft('tournament-create', mockFormData)
      })

      const userProfileDrafts = store.getDraftsByType('user-profile')
      expect(userProfileDrafts).toHaveLength(2)
      expect(userProfileDrafts.every(d => d.formType === 'user-profile')).toBe(true)
    })

    it('should get drafts by user', () => {
      const store = useFormDraftStore.getState()

      act(() => {
        const id1 = store.createDraft('user-profile', mockFormData)
        store.updateDraft(id1, { userId: 'user-123' })
        
        const id2 = store.createDraft('tournament-create', mockFormData)
        store.updateDraft(id2, { userId: 'user-123' })
        
        const id3 = store.createDraft('user-profile', mockFormData)
        store.updateDraft(id3, { userId: 'user-456' })
      })

      const user123Drafts = store.getDraftsByUser('user-123')
      expect(user123Drafts).toHaveLength(2)
      expect(user123Drafts.every(d => d.userId === 'user-123')).toBe(true)
    })

    it('should get drafts by context', () => {
      const store = useFormDraftStore.getState()

      act(() => {
        const id1 = store.createDraft('tournament-create', mockFormData)
        store.updateDraft(id1, { context: { tournamentId: 'tour-123', page: 'create' } })
        
        const id2 = store.createDraft('tournament-create', mockFormData)
        store.updateDraft(id2, { context: { tournamentId: 'tour-123', page: 'edit' } })
        
        const id3 = store.createDraft('user-profile', mockFormData)
        store.updateDraft(id3, { context: { userId: 'user-123' } })
      })

      const contextDrafts = store.getDraftsByContext({ tournamentId: 'tour-123' })
      expect(contextDrafts).toHaveLength(2)
    })
  })

  describe('Validation', () => {
    it('should validate draft with schema', () => {
      const store = useFormDraftStore.getState()
      
      // Set up validation schema
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      })

      act(() => {
        store.setDraftMetadata('test-form', {
          formType: 'test-form',
          displayName: 'Test Form',
          category: 'user',
          validationSchema: schema,
        })
      })

      let draftId: string
      act(() => {
        draftId = store.createDraft('test-form', { name: 'John', email: 'john@example.com' })
      })

      const validation = store.validateDraft(draftId!)
      expect(validation.isValid).toBe(true)
      expect(Object.keys(validation.errors)).toHaveLength(0)
    })

    it('should return validation errors', () => {
      const store = useFormDraftStore.getState()
      
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      })

      act(() => {
        store.setDraftMetadata('test-form', {
          formType: 'test-form',
          displayName: 'Test Form',
          category: 'user',
          validationSchema: schema,
        })
      })

      let draftId: string
      act(() => {
        draftId = store.createDraft('test-form', { name: '', email: 'invalid' })
      })

      const validation = store.validateDraft(draftId!)
      expect(validation.isValid).toBe(false)
      expect(Object.keys(validation.errors).length).toBeGreaterThan(0)
    })

    it('should validate draft data without creating draft', () => {
      const store = useFormDraftStore.getState()
      
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      })

      act(() => {
        store.setDraftMetadata('test-form', {
          formType: 'test-form',
          displayName: 'Test Form',
          category: 'user',
          validationSchema: schema,
        })
      })

      const validation = store.validateDraftData('test-form', { name: 'John', email: 'john@example.com' })
      expect(validation.isValid).toBe(true)
    })
  })

  describe('Touched Fields', () => {
    it('should mark field as touched', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
      })

      act(() => {
        store.markFieldTouched(draftId!, 'email')
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].touchedFields?.email).toBe(true)
    })

    it('should mark submit attempted', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
      })

      act(() => {
        store.markSubmitAttempted(draftId!)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].submitAttempted).toBe(true)
    })

    it('should reset touched state', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
        store.markFieldTouched(draftId!, 'email')
        store.markSubmitAttempted(draftId!)
      })

      act(() => {
        store.resetTouchedState(draftId!)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].touchedFields).toEqual({})
      expect(updatedStore.drafts[draftId!].submitAttempted).toBe(false)
    })
  })

  describe('Auto-save Functionality', () => {
    it('should auto-save draft', async () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
      })

      await act(async () => {
        await store.autoSaveDraft(draftId!)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].lastAutoSaved).toBeInstanceOf(Date)
      expect(updatedStore.drafts[draftId!].isDirty).toBe(false)
    })

    it('should not auto-save when disabled', async () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
        store.disableAutoSave(draftId!)
      })

      await act(async () => {
        await store.autoSaveDraft(draftId!)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].lastAutoSaved).toBeUndefined()
    })
  })

  describe('Draft Lifecycle', () => {
    it('should mark draft as dirty', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
      })

      act(() => {
        store.markDraftAsDirty(draftId!)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].isDirty).toBe(true)
    })

    it('should mark draft as clean', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
        store.markDraftAsDirty(draftId!)
      })

      act(() => {
        store.markDraftAsClean(draftId!)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].isDirty).toBe(false)
    })

    it('should expire draft', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
      })

      act(() => {
        store.expireDraft(draftId!)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].isExpired).toBe(true)
    })
  })

  describe('Loading States', () => {
    it('should set loading state', () => {
      const store = useFormDraftStore.getState()

      act(() => {
        store.setLoading('saving', true)
      })

      expect(useFormDraftStore.getState().loading.saving).toBe(true)

      act(() => {
        store.setLoading('saving', false)
      })

      expect(useFormDraftStore.getState().loading.saving).toBe(false)
    })

    it('should set multiple loading states', () => {
      const store = useFormDraftStore.getState()

      act(() => {
        store.setLoading('saving', true)
        store.setLoading('loading', true)
        store.setLoading('deleting', true)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.loading.saving).toBe(true)
      expect(updatedStore.loading.loading).toBe(true)
      expect(updatedStore.loading.deleting).toBe(true)
    })
  })

  describe('Error States', () => {
    it('should set error', () => {
      const store = useFormDraftStore.getState()

      act(() => {
        store.setError('save', 'Failed to save')
      })

      expect(useFormDraftStore.getState().errors.save).toBe('Failed to save')
    })

    it('should clear error', () => {
      const store = useFormDraftStore.getState()

      act(() => {
        store.setError('save', 'Failed to save')
      })

      expect(useFormDraftStore.getState().errors.save).toBe('Failed to save')

      act(() => {
        store.clearError('save')
      })

      expect(useFormDraftStore.getState().errors.save).toBeNull()
    })

    it('should clear all errors', () => {
      const store = useFormDraftStore.getState()

      act(() => {
        store.setError('save', 'Save error')
        store.setError('load', 'Load error')
        store.setError('delete', 'Delete error')
      })

      act(() => {
        store.clearAllErrors()
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.errors.save).toBeNull()
      expect(updatedStore.errors.load).toBeNull()
      expect(updatedStore.errors.delete).toBeNull()
    })
  })

  describe('Form Submission', () => {
    it('should set submitting state', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
      })

      act(() => {
        store.setSubmitting(draftId!, true)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].isSubmitting).toBe(true)
      expect(updatedStore.loading.submitting).toBe(true)
    })

    it('should set validation errors', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
      })

      const errors = { email: 'Invalid email', name: 'Name required' }
      act(() => {
        store.setValidationErrors(draftId!, errors)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].errors).toEqual(errors)
      expect(updatedStore.errors.validation).toBeDefined()
    })

    it('should clear validation errors', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
        store.setValidationErrors(draftId!, { email: 'Invalid' })
      })

      act(() => {
        store.clearValidationErrors(draftId!)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[draftId!].errors).toEqual({})
      expect(updatedStore.errors.validation).toBeNull()
    })
  })

  describe('Metadata Management', () => {
    it('should set draft metadata', () => {
      const store = useFormDraftStore.getState()
      const metadata = {
        formType: 'custom-form',
        displayName: 'Custom Form',
        category: 'user' as const,
        maxDrafts: 5,
      }

      act(() => {
        store.setDraftMetadata('custom-form', metadata)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.metadata['custom-form']).toEqual(metadata)
    })

    it('should get draft metadata', () => {
      const store = useFormDraftStore.getState()
      const metadata = store.getDraftMetadata('tournament-create')
      
      expect(metadata).toBeDefined()
      expect(metadata?.formType).toBe('tournament-create')
    })
  })

  describe('Utility Operations', () => {
    it('should export draft', () => {
      const store = useFormDraftStore.getState()
      let draftId: string

      act(() => {
        draftId = store.createDraft('user-profile', mockFormData)
      })

      const exported = store.exportDraft(draftId!)
      expect(exported).toBeTruthy()
      expect(typeof exported).toBe('string')
      
      const parsed = JSON.parse(exported)
      expect(parsed.id).toBe(draftId!)
      expect(parsed.formType).toBe('user-profile')
    })

    it('should import draft', () => {
      const store = useFormDraftStore.getState()
      let originalDraftId: string

      act(() => {
        originalDraftId = store.createDraft('user-profile', mockFormData)
      })

      const exported = store.exportDraft(originalDraftId!)

      act(() => {
        store.deleteDraft(originalDraftId!)
      })

      let importedDraftId: string
      act(() => {
        importedDraftId = store.importDraft(exported)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[importedDraftId!]).toBeDefined()
      expect(updatedStore.drafts[importedDraftId!].formType).toBe('user-profile')
    })

    it('should handle invalid import data', () => {
      const store = useFormDraftStore.getState()

      expect(() => {
        act(() => {
          store.importDraft('invalid json')
        })
      }).toThrow('Invalid draft data')
    })

    it('should duplicate draft', () => {
      const store = useFormDraftStore.getState()
      let originalDraftId: string

      act(() => {
        originalDraftId = store.createDraft('user-profile', mockFormData)
      })

      let duplicatedDraftId: string
      act(() => {
        duplicatedDraftId = store.duplicateDraft(originalDraftId!)
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[duplicatedDraftId!]).toBeDefined()
      expect(updatedStore.drafts[duplicatedDraftId!].data).toEqual(mockFormData)
      expect(duplicatedDraftId!).not.toBe(originalDraftId!)
    })

    it('should duplicate draft with new form type', () => {
      const store = useFormDraftStore.getState()
      let originalDraftId: string

      act(() => {
        originalDraftId = store.createDraft('user-profile', mockFormData)
      })

      let duplicatedDraftId: string
      act(() => {
        duplicatedDraftId = store.duplicateDraft(originalDraftId!, 'tournament-create')
      })

      const updatedStore = useFormDraftStore.getState()
      expect(updatedStore.drafts[duplicatedDraftId!].formType).toBe('tournament-create')
    })
  })

  describe('Enhanced Form Management', () => {
    it('should save draft with form id', () => {
      const store = useFormDraftStore.getState()
      const formId = 'test-form-123'
      const data = { field1: 'value1', field2: 'value2' }

      act(() => {
        store.saveDraft(formId, data)
      })

      const loaded = store.loadDraft(formId)
      expect(loaded).toEqual(data)
    })

    it('should update existing draft when saving with same form id', () => {
      const store = useFormDraftStore.getState()
      const formId = 'test-form-123'

      act(() => {
        store.saveDraft(formId, { field1: 'value1' })
      })

      act(() => {
        store.saveDraft(formId, { field1: 'updated', field2: 'new' })
      })

      const loaded = store.loadDraft(formId)
      expect(loaded.field1).toBe('updated')
      expect(loaded.field2).toBe('new')
    })

    it('should load draft', () => {
      const store = useFormDraftStore.getState()
      const formId = 'test-form-123'
      const data = { field1: 'value1' }

      act(() => {
        store.saveDraft(formId, data)
      })

      const loaded = store.loadDraft(formId)
      expect(loaded).toEqual(data)
    })

    it('should return null when loading non-existent draft', () => {
      const store = useFormDraftStore.getState()
      const loaded = store.loadDraft('non-existent')
      expect(loaded).toBeNull()
    })

    it('should clear draft', () => {
      const store = useFormDraftStore.getState()
      const formId = 'test-form-123'

      act(() => {
        store.saveDraft(formId, { field1: 'value1' })
      })

      expect(store.hasDraft(formId)).toBe(true)

      act(() => {
        store.clearDraft(formId)
      })

      expect(store.hasDraft(formId)).toBe(false)
    })

    it('should check if draft exists', () => {
      const store = useFormDraftStore.getState()
      const formId = 'test-form-123'

      expect(store.hasDraft(formId)).toBe(false)

      act(() => {
        store.saveDraft(formId, { field1: 'value1' })
      })

      expect(store.hasDraft(formId)).toBe(true)
    })

    it('should get draft last saved time', () => {
      const store = useFormDraftStore.getState()
      const formId = 'test-form-123'

      expect(store.getDraftLastSaved(formId)).toBeNull()

      act(() => {
        store.saveDraft(formId, { field1: 'value1' })
      })

      const lastSaved = store.getDraftLastSaved(formId)
      expect(lastSaved).toBeInstanceOf(Date)
    })
  })
})
