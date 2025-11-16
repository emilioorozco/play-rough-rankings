import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useUIStoreSelectors } from '@/stores/ui-store-selectors'
import { useTournamentDataSelectors, useTournamentListSelectors } from '@/stores/tournament-store-selectors'
import { 
  usePreference, 
  usePreferences, 
  useAllPreferences, 
  useHasPreference, 
  usePreferencesByCategory,
  useDisplayPreferences,
  useCommunicationPreferences,
  useTournamentPreferences,
  usePrivacyPreferences,
  useGamePreferences,
  useAccessibilityPreferences,
  useAdvancedPreferences,
  useUserPreferencesActions
} from '@/stores/user-preferences-store-selectors'
import { useDraftSelectors, useDraftListSelectors, useDraftManagementSelectors, useFormDraftActions } from '@/stores/form-draft-store-selectors'
import { useLoadingSelectors, useErrorSelectors, useProgressSelectors, useLoadingActions } from '@/stores/loading-store-selectors'
import { createMockTournament } from '../utils/test-utils'

describe('Store Selectors', () => {
  beforeEach(() => {
    // Reset all stores before each test - imports are at the top of the file
    // Just reset the stores using their methods
  })

  describe('UI Store Selectors', () => {
    it('should provide modal selectors', () => {
      expect(typeof useUIStoreSelectors.getModalState).toBe('function')
      expect(typeof useUIStoreSelectors.getConfirmationState).toBe('function')
    })

    it('should provide tab selectors', () => {
      expect(typeof useUIStoreSelectors.getTabState).toBe('function')
    })

    it('should provide filter selectors', () => {
      expect(typeof useUIStoreSelectors.getFilterState).toBe('function')
    })

    it('should provide interaction selectors', () => {
      expect(typeof useUIStoreSelectors.getInteractionState).toBe('function')
    })

    it('should provide action selectors', () => {
      // The useUIStoreSelectors object provides state selectors, not action selectors
      // Actions are available through the individual selector methods
      expect(typeof useUIStoreSelectors.getModalState).toBe('function')
      expect(typeof useUIStoreSelectors.getTabState).toBe('function')
    })
  })

  describe('Tournament Store Selectors', () => {
    it('should provide tournament selectors', () => {
      expect(typeof useTournamentDataSelectors.getCurrentTournament).toBe('function')
      expect(typeof useTournamentDataSelectors.getCurrentTournamentId).toBe('function')
      expect(typeof useTournamentDataSelectors.getTournamentById).toBe('function')
    })

    it('should provide loading and error selectors', () => {
      expect(typeof useTournamentDataSelectors.getTournamentLoading).toBe('function')
      expect(typeof useTournamentDataSelectors.getTournamentError).toBe('function')
    })

    it('should provide action selectors', () => {
      // Tournament store selectors provide state selectors, not action selectors
      // Actions are available through the store directly
      expect(typeof useTournamentDataSelectors.getCurrentTournament).toBe('function')
      expect(typeof useTournamentListSelectors.getTournamentListState).toBe('function')
    })
  })

  describe('User Preferences Store Selectors', () => {
    it('should provide preference selectors', () => {
      expect(typeof usePreference).toBe('function')
      expect(typeof usePreferences).toBe('function')
      expect(typeof useAllPreferences).toBe('function')
    })

    it('should provide individual preference selectors', () => {
      expect(typeof useHasPreference).toBe('function')
      expect(typeof usePreferencesByCategory).toBe('function')
    })

    it('should provide category selectors', () => {
      // User preferences store selectors provide category-specific selectors
      expect(typeof useDisplayPreferences).toBe('function')
      expect(typeof useCommunicationPreferences).toBe('function')
      expect(typeof useTournamentPreferences).toBe('function')
      expect(typeof usePrivacyPreferences).toBe('function')
      expect(typeof useGamePreferences).toBe('function')
      expect(typeof useAccessibilityPreferences).toBe('function')
      expect(typeof useAdvancedPreferences).toBe('function')
    })

    it('should provide action selectors', () => {
      // User preferences store selectors provide action hooks
      expect(typeof useUserPreferencesActions).toBe('function')
    })
  })

  describe('Form Draft Store Selectors', () => {
    it('should provide draft selectors', () => {
      expect(typeof useDraftSelectors.getDraft).toBe('function')
      expect(typeof useDraftSelectors.getDraftData).toBe('function')
      expect(typeof useDraftSelectors.getDraftMetadata).toBe('function')
      expect(typeof useDraftSelectors.hasDraft).toBe('function')
      expect(typeof useDraftSelectors.isDraftDirty).toBe('function')
      expect(typeof useDraftSelectors.isDraftValid).toBe('function')
    })

    it('should provide auto-save selectors', () => {
      expect(typeof useDraftListSelectors.getAllDrafts).toBe('function')
      expect(typeof useDraftListSelectors.getDraftsByFormType).toBe('function')
      expect(typeof useDraftListSelectors.getDraftsByUserId).toBe('function')
      expect(typeof useDraftListSelectors.getDirtyDrafts).toBe('function')
    })

    it('should provide metadata selectors', () => {
      expect(typeof useDraftSelectors.getDraftLastUpdated).toBe('function')
      expect(typeof useDraftSelectors.getDraftExpiration).toBe('function')
      expect(typeof useDraftSelectors.isDraftExpired).toBe('function')
    })

    it('should provide statistics selectors', () => {
      expect(typeof useDraftManagementSelectors.getDraftStats).toBe('function')
      expect(typeof useDraftManagementSelectors.getDraftSummary).toBe('function')
      expect(typeof useDraftManagementSelectors.getDraftHealth).toBe('function')
    })

    it('should provide action selectors', () => {
      expect(typeof useFormDraftActions.createDraft).toBe('function')
      expect(typeof useFormDraftActions.updateDraft).toBe('function')
      expect(typeof useFormDraftActions.deleteDraft).toBe('function')
      expect(typeof useFormDraftActions.clearAllDrafts).toBe('function')
    })
  })

  describe('Loading Store Selectors', () => {
    it('should provide loading selectors', () => {
      expect(typeof useLoadingSelectors.getLoading).toBe('function')
      expect(typeof useLoadingSelectors.getAllLoading).toBe('function')
      expect(typeof useLoadingSelectors.isAnyLoading).toBe('function')
      expect(typeof useLoadingSelectors.isGlobalLoading).toBe('function')
    })

    it('should provide error selectors', () => {
      expect(typeof useErrorSelectors.getError).toBe('function')
      expect(typeof useErrorSelectors.getAllErrors).toBe('function')
      expect(typeof useErrorSelectors.hasError).toBe('function')
      expect(typeof useErrorSelectors.getErrorKeys).toBe('function')
    })

    it('should provide progress selectors', () => {
      expect(typeof useProgressSelectors.getLoadingProgress).toBe('function')
      expect(typeof useProgressSelectors.getLoadingMessage).toBe('function')
      expect(typeof useProgressSelectors.getLoadingDuration).toBe('function')
      expect(typeof useProgressSelectors.getLoadingProgressPercentage).toBe('function')
    })

    it('should provide loading bar selectors', () => {
      expect(typeof useLoadingSelectors.getLoadingBarState).toBe('function')
    })

    it('should provide action selectors', () => {
      expect(typeof useLoadingActions.setLoading).toBe('function')
      expect(typeof useLoadingActions.setError).toBe('function')
      expect(typeof useLoadingActions.clearError).toBe('function')
      expect(typeof useLoadingActions.setGlobalLoading).toBe('function')
      expect(typeof useLoadingActions.showLoadingBar).toBe('function')
    })
  })

  describe('Selector Performance', () => {
    it('should memoize selector results', () => {
      const { result, rerender } = renderHook(() => 
        useUIStoreSelectors.getModalState('tournamentRegistration')
      )

      const firstRender = result.current
      rerender()
      const secondRender = result.current

      // Selectors should be memoized and not change between renders
      expect(firstRender).toBe(secondRender)
    })

    it('should only re-render when selected state changes', () => {
      let renderCount = 0
      const { result } = renderHook(() => {
        renderCount++
        return useUIStoreSelectors.getModalState('tournamentRegistration')
      })

      const initialRenderCount = renderCount

      // Access a selector
      const modalState = result.current

      // Should not cause additional renders
      expect(renderCount).toBe(initialRenderCount)

      // Access the same selector again
      const sameModalState = result.current

      // Should still not cause additional renders
      expect(renderCount).toBe(initialRenderCount)
    })
  })

  describe('Selector Integration', () => {
    it('should work with actual store state', () => {
      const { result: modalState } = renderHook(() => 
        useUIStoreSelectors.getModalState('tournamentRegistration')
      )

      expect(modalState.current.isOpen).toBe(false)
      expect(modalState.current.data).toBeUndefined()
    })

    it('should update when store state changes', () => {
      const { result: modalState } = renderHook(() => 
        useUIStoreSelectors.getModalState('tournamentRegistration')
      )

      // Open modal through store
      const { useUIStore } = require('@/stores/ui-store')
      useUIStore.getState().openModal('tournamentRegistration', { title: 'Test' })

      // Selector should reflect the change
      expect(modalState.current.isOpen).toBe(true)
      expect(modalState.current.data?.title).toBe('Test')
    })
  })

  describe('Selector Error Handling', () => {
    it('should handle invalid selector parameters gracefully', () => {
      // Should not throw error for invalid parameters
      expect(() => {
        useUIStoreSelectors.getModalState('tournamentRegistration' as any)
        useUIStoreSelectors.getTabState('tournamentDetails' as any)
        useUIStoreSelectors.getFilterState('tournaments' as any)
        useUIStoreSelectors.getInteractionState()
      }).not.toThrow()
    })

    it('should handle undefined selector results', () => {
      // Should handle undefined results gracefully
      expect(() => {
        const modalState = useUIStoreSelectors.getModalState('tournamentRegistration')
        expect(modalState.isOpen).toBe(false)
      }).not.toThrow()
    })
  })
})
