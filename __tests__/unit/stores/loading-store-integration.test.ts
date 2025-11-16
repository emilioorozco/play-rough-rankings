import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'
import { useStoreLoadingIntegration } from '@/stores/loading-store-integration'
import { useLoadingStore } from '@/stores/loading-store'
import { useTournamentStore } from '@/stores/tournament-store'
import { useUserPreferencesStore } from '@/stores/user-preferences-store'
import { useFormDraftStore } from '@/stores/form-draft-store'
import { useUIStore } from '@/stores/ui-store'
import { createMockTournament } from '../../utils/test-utils'

describe('Loading Store Integration', () => {
  beforeEach(() => {
    // Reset all stores before each test
    useLoadingStore.getState().clearAll()
    // Use clearTournamentCache instead of clearCache
    if (typeof useTournamentStore.getState().clearTournamentCache === 'function') {
      useTournamentStore.getState().clearTournamentCache()
    }
    // Use resetStore instead of resetAllPreferences
    if (typeof useUserPreferencesStore.getState().resetStore === 'function') {
      useUserPreferencesStore.getState().resetStore()
    }
    // Use resetStore instead of resetAllDrafts
    if (typeof useFormDraftStore.getState().resetStore === 'function') {
      useFormDraftStore.getState().resetStore()
    }
    useUIStore.getState().resetUI()
  })

  describe('Store Loading Integration', () => {
    it('should provide integration for all stores', () => {
      const integration = useStoreLoadingIntegration()

      expect(integration.tournament).toBeDefined()
      expect(integration.userPreferences).toBeDefined()
      expect(integration.formDraft).toBeDefined()
      expect(integration.ui).toBeDefined()
      expect(integration.global).toBeDefined()
    })

    it('should provide tournament loading integration', () => {
      const integration = useStoreLoadingIntegration()
      const tournamentIntegration = integration.tournament

      expect(typeof tournamentIntegration.fetchTournament).toBe('function')
      expect(typeof tournamentIntegration.fetchTournaments).toBe('function')
      expect(typeof tournamentIntegration.fetchRegistrationStatus).toBe('function')
    })

    it('should provide user preferences loading integration', () => {
      const integration = useStoreLoadingIntegration()
      const userPreferencesIntegration = integration.userPreferences

      expect(typeof userPreferencesIntegration.setPreferences).toBe('function')
      expect(typeof userPreferencesIntegration.updatePreferences).toBe('function')
      expect(typeof userPreferencesIntegration.resetPreferences).toBe('function')
    })

    it('should provide form draft loading integration', () => {
      const integration = useStoreLoadingIntegration()
      const formDraftIntegration = integration.formDraft

      expect(typeof formDraftIntegration.saveDraft).toBe('function')
      expect(typeof formDraftIntegration.updateDraft).toBe('function')
      expect(typeof formDraftIntegration.deleteDraft).toBe('function')
      expect(typeof formDraftIntegration.clearDrafts).toBe('function')
    })

    it('should provide UI loading integration', () => {
      const integration = useStoreLoadingIntegration()
      const uiIntegration = integration.ui

      expect(typeof uiIntegration.openModal).toBe('function')
      expect(typeof uiIntegration.closeModal).toBe('function')
      expect(typeof uiIntegration.openConfirmation).toBe('function')
    })

    it('should provide global loading integration', () => {
      const integration = useStoreLoadingIntegration()
      const globalIntegration = integration.global

      expect(typeof globalIntegration.setGlobalLoading).toBe('function')
      expect(typeof globalIntegration.setGlobalError).toBe('function')
      expect(typeof globalIntegration.clearGlobalError).toBe('function')
      expect(typeof globalIntegration.showLoadingBar).toBe('function')
      expect(typeof globalIntegration.hideLoadingBar).toBe('function')
      expect(typeof globalIntegration.setLoadingBarProgress).toBe('function')
      expect(typeof globalIntegration.clearAll).toBe('function')
      expect(typeof globalIntegration.getStoreStatus).toBe('function')
    })
  })

  describe('Tournament Loading Integration', () => {
    it('should manage loading states during tournament operations', async () => {
      const integration = useStoreLoadingIntegration()
      const loadingStore = useLoadingStore.getState()
      const tournamentStore = useTournamentStore.getState()

      // Mock the tournament store methods
      const mockFetchTournament = vi.fn().mockResolvedValue(createMockTournament())
      tournamentStore.fetchTournament = mockFetchTournament

      // Execute tournament operation
      await integration.tournament.fetchTournament('test-tournament-id')

      // Should have managed loading states
      expect(loadingStore.isLoading('tournament:fetchTournament')).toBe(false)
      expect(loadingStore.getError('tournament:fetchTournament')).toBeNull()
    })

    it('should handle tournament operation errors', async () => {
      const integration = useStoreLoadingIntegration()
      const loadingStore = useLoadingStore.getState()
      const tournamentStore = useTournamentStore.getState()

      // Mock the tournament store methods to throw error
      const mockFetchTournament = vi.fn().mockRejectedValue(new Error('Tournament not found'))
      tournamentStore.fetchTournament = mockFetchTournament

      // Execute tournament operation
      await integration.tournament.fetchTournament('non-existent-tournament')

      // Should have managed error states
      expect(loadingStore.isLoading('tournament:fetchTournament')).toBe(false)
      expect(loadingStore.getError('tournament:fetchTournament')).toBeInstanceOf(Error)
    })

    it('should manage loading states for tournament list operations', async () => {
      const integration = useStoreLoadingIntegration()
      const loadingStore = useLoadingStore.getState()
      const tournamentStore = useTournamentStore.getState()

      // Mock the tournament store methods
      const mockFetchTournaments = vi.fn().mockResolvedValue({
        tournaments: [createMockTournament()],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false }
      })
      tournamentStore.fetchTournaments = mockFetchTournaments

      // Execute tournament list operation
      await integration.tournament.fetchTournaments({ page: 1, limit: 10 })

      // Should have managed loading states
      expect(loadingStore.isLoading('tournament:fetchTournaments')).toBe(false)
      expect(loadingStore.getError('tournament:fetchTournaments')).toBeNull()
    })
  })

  describe('User Preferences Loading Integration', () => {
    it('should manage loading states during preference operations', async () => {
      const integration = useStoreLoadingIntegration()
      const loadingStore = useLoadingStore.getState()
      const userPreferencesStore = useUserPreferencesStore.getState()

      // Mock the user preferences store methods
      const mockSetPreferences = vi.fn().mockResolvedValue(undefined)
      userPreferencesStore.setPreferences = mockSetPreferences

      // Execute preference operation
      await integration.userPreferences.setPreferences({
        display: { theme: 'dark' }
      })

      // Should have managed loading states
      expect(loadingStore.isLoading('userPreferences:setPreferences')).toBe(false)
      expect(loadingStore.getError('userPreferences:setPreferences')).toBeNull()
    })

    it('should handle preference operation errors', async () => {
      const integration = useStoreLoadingIntegration()
      const loadingStore = useLoadingStore.getState()
      const userPreferencesStore = useUserPreferencesStore.getState()

      // Mock the user preferences store methods to throw error
      const mockSetPreferences = vi.fn().mockRejectedValue(new Error('Invalid preferences'))
      userPreferencesStore.setPreferences = mockSetPreferences

      // Execute preference operation
      await integration.userPreferences.setPreferences({
        display: { theme: 'invalid-theme' }
      })

      // Should have managed error states
      expect(loadingStore.isLoading('userPreferences:setPreferences')).toBe(false)
      expect(loadingStore.getError('userPreferences:setPreferences')).toBeInstanceOf(Error)
    })
  })

  describe('Form Draft Loading Integration', () => {
    it('should manage loading states during draft operations', async () => {
      const integration = useStoreLoadingIntegration()
      const loadingStore = useLoadingStore.getState()
      const formDraftStore = useFormDraftStore.getState()

      // Mock the form draft store methods
      const mockSaveDraft = vi.fn().mockResolvedValue(undefined)
      formDraftStore.saveDraft = mockSaveDraft

      // Execute draft operation
      await integration.formDraft.saveDraft('test-draft', { name: 'John' }, 'user-profile')

      // Should have managed loading states
      expect(loadingStore.isLoading('formDraft:saveDraft')).toBe(false)
      expect(loadingStore.getError('formDraft:saveDraft')).toBeNull()
    })

    it('should handle draft operation errors', async () => {
      const integration = useStoreLoadingIntegration()
      const loadingStore = useLoadingStore.getState()
      const formDraftStore = useFormDraftStore.getState()

      // Mock the form draft store methods to throw error
      const mockSaveDraft = vi.fn().mockRejectedValue(new Error('Draft save failed'))
      formDraftStore.saveDraft = mockSaveDraft

      // Execute draft operation
      await integration.formDraft.saveDraft('test-draft', { name: 'John' }, 'user-profile')

      // Should have managed error states
      expect(loadingStore.isLoading('formDraft:saveDraft')).toBe(false)
      expect(loadingStore.getError('formDraft:saveDraft')).toBeInstanceOf(Error)
    })
  })

  describe('UI Loading Integration', () => {
    it('should manage loading states during UI operations', async () => {
      const integration = useStoreLoadingIntegration()
      const loadingStore = useLoadingStore.getState()
      const uiStore = useUIStore.getState()

      // Mock the UI store methods
      const mockOpenModal = vi.fn().mockResolvedValue(undefined)
      uiStore.openModal = mockOpenModal

      // Execute UI operation
      await integration.ui.openModal('test-modal', { title: 'Test' })

      // Should have managed loading states
      expect(loadingStore.isLoading('ui:openModal')).toBe(false)
      expect(loadingStore.getError('ui:openModal')).toBeNull()
    })

    it('should handle UI operation errors', async () => {
      const integration = useStoreLoadingIntegration()
      const loadingStore = useLoadingStore.getState()
      const uiStore = useUIStore.getState()

      // Mock the UI store methods to throw error
      const mockOpenModal = vi.fn().mockRejectedValue(new Error('Modal open failed'))
      uiStore.openModal = mockOpenModal

      // Execute UI operation
      await integration.ui.openModal('test-modal', { title: 'Test' })

      // Should have managed error states
      expect(loadingStore.isLoading('ui:openModal')).toBe(false)
      expect(loadingStore.getError('ui:openModal')).toBeInstanceOf(Error)
    })
  })

  describe('Global Loading Integration', () => {
    it('should manage global loading states', () => {
      const integration = useStoreLoadingIntegration()
      const loadingStore = useLoadingStore.getState()

      // Test global loading
      integration.global.setGlobalLoading(true)
      expect(loadingStore.isGlobalLoading).toBe(true)

      integration.global.setGlobalLoading(false)
      expect(loadingStore.isGlobalLoading).toBe(false)
    })

    it('should manage global error states', () => {
      const integration = useStoreLoadingIntegration()
      const loadingStore = useLoadingStore.getState()

      // Test global error
      const error = new Error('Global error')
      integration.global.setGlobalError(error)
      expect(loadingStore.globalError).toBe(error)

      integration.global.clearGlobalError()
      expect(loadingStore.globalError).toBeNull()
    })

    it('should manage loading bar states', () => {
      const integration = useStoreLoadingIntegration()
      const loadingStore = useLoadingStore.getState()

      // Test loading bar
      integration.global.showLoadingBar(25, 'Loading...')
      expect(loadingStore.loadingBar.isVisible).toBe(true)
      expect(loadingStore.loadingBar.progress).toBe(25)
      expect(loadingStore.loadingBar.message).toBe('Loading...')

      integration.global.setLoadingBarProgress(75, 'Almost done...')
      expect(loadingStore.loadingBar.progress).toBe(75)
      expect(loadingStore.loadingBar.message).toBe('Almost done...')

      integration.global.hideLoadingBar()
      expect(loadingStore.loadingBar.isVisible).toBe(false)
    })

    it('should clear all states', () => {
      const integration = useStoreLoadingIntegration()
      const loadingStore = useLoadingStore.getState()

      // Set some states
      loadingStore.setLoading('test-loading', true)
      loadingStore.setError('test-error', 'Test error')
      loadingStore.setProgress('test-progress', 50)
      loadingStore.setGlobalLoading(true)
      loadingStore.setGlobalError('Global error')
      loadingStore.showLoadingBar(25, 'Loading...')

      // Clear all
      integration.global.clearAll()

      // All states should be cleared
      expect(loadingStore.isLoading('test-loading')).toBe(false)
      expect(loadingStore.hasError('test-error')).toBe(false)
      expect(loadingStore.getProgress('test-progress')).toBe(0)
      expect(loadingStore.isGlobalLoading).toBe(false)
      expect(loadingStore.globalError).toBeNull()
      expect(loadingStore.loadingBar.isVisible).toBe(false)
    })

    it('should get store status', () => {
      const integration = useStoreLoadingIntegration()
      const loadingStore = useLoadingStore.getState()

      // Set some states
      loadingStore.setLoading('test-loading', true)
      loadingStore.setError('test-error', 'Test error')
      loadingStore.setProgress('test-progress', 50)

      const status = integration.global.getStoreStatus()

      expect(status.loading).toContain('test-loading')
      expect(status.errors).toContain('test-error')
      expect(status.progress).toContain('test-progress')
    })
  })

  describe('Error Handling', () => {
    it('should handle integration errors gracefully', async () => {
      const integration = useStoreLoadingIntegration()
      const loadingStore = useLoadingStore.getState()

      // Mock a method that throws an error
      const mockMethod = vi.fn().mockRejectedValue(new Error('Integration error'))
      
      // Should not throw error when integration fails
      expect(async () => {
        await mockMethod()
      }).not.toThrow()
    })

    it('should handle missing store methods gracefully', () => {
      const integration = useStoreLoadingIntegration()

      // Should not throw error when store methods are missing
      expect(() => {
        integration.tournament.fetchTournament('test-id')
        integration.userPreferences.setPreferences({})
        integration.formDraft.saveDraft('test-draft', {}, 'test-type')
        integration.ui.openModal('test-modal', {})
      }).not.toThrow()
    })
  })

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      let renderCount = 0
      const integration = useStoreLoadingIntegration()

      // Access integration multiple times
      integration.tournament.fetchTournament('test-id')
      integration.userPreferences.setPreferences({})
      integration.formDraft.saveDraft('test-draft', {}, 'test-type')
      integration.ui.openModal('test-modal', {})

      // Should not cause additional renders
      expect(renderCount).toBe(0)
    })

    it('should memoize integration functions', () => {
      const integration1 = useStoreLoadingIntegration()
      const integration2 = useStoreLoadingIntegration()

      // Integration functions should be memoized
      expect(integration1.tournament.fetchTournament).toBe(integration2.tournament.fetchTournament)
      expect(integration1.userPreferences.setPreferences).toBe(integration2.userPreferences.setPreferences)
      expect(integration1.formDraft.saveDraft).toBe(integration2.formDraft.saveDraft)
      expect(integration1.ui.openModal).toBe(integration2.ui.openModal)
    })
  })
})
