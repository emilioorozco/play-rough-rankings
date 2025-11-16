import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { 
  useModal,
  useModalState,
  useTabState,
  useFilterState,
  useInteractionState,
  useUIActions
} from '@/stores/ui-store-selectors'
import { 
  useCurrentTournament,
  useTournaments,
  useTournamentActions
} from '@/stores/tournament-store-selectors'
import { 
  useAllPreferences,
  useDisplayPreferences,
  useCommunicationPreferences,
  useTournamentPreferences,
  usePrivacyPreferences,
  useGamePreferences,
  useAccessibilityPreferences,
  useAdvancedPreferences
} from '@/stores/user-preferences-store-selectors'
import { 
  useDraft,
  useDraftData,
  useAllDrafts,
  useDraftStats,
  useFormDraftActions
} from '@/stores/form-draft-store-selectors'
import { 
  useLoading,
  useAllLoading,
  useError,
  useLoadingBarState,
  useLoadingActions
} from '@/stores/loading-store-selectors'
import { useUIStore } from '@/stores/ui-store'
import { useTournamentStore } from '@/stores/tournament-store'
import { useLoadingStore } from '@/stores/loading-store'
import { useFormDraftStore } from '@/stores/form-draft-store'

describe('Store Selectors', () => {
  beforeEach(() => {
    // Reset all stores before each test
    useUIStore.getState().resetUI?.()
    useTournamentStore.getState().resetTournamentStore?.()
    useLoadingStore.getState().clearAllErrors?.()
    useFormDraftStore.getState().clearDrafts?.()
  })

  describe('UI Store Selectors', () => {
    it('should provide modal selectors', () => {
      expect(typeof useModal).toBe('function')
      expect(typeof useModalState).toBe('function')
    })

    it('should provide tab selectors', () => {
      expect(typeof useTabState).toBe('function')
    })

    it('should provide filter selectors', () => {
      expect(typeof useFilterState).toBe('function')
    })

    it('should provide interaction selectors', () => {
      expect(typeof useInteractionState).toBe('function')
    })

    it('should provide action selectors', () => {
      expect(typeof useUIActions).toBe('function')
    })
  })

  describe('Tournament Store Selectors', () => {
    it('should provide tournament selectors', () => {
      expect(typeof useCurrentTournament).toBe('function')
      expect(typeof useTournaments).toBe('function')
    })

    it('should provide action selectors', () => {
      expect(typeof useTournamentActions).toBe('function')
    })
  })

  describe('User Preferences Store Selectors', () => {
    it('should provide preference selectors', () => {
      expect(typeof useAllPreferences).toBe('function')
    })

    it('should provide category selectors', () => {
      expect(typeof useDisplayPreferences).toBe('function')
      expect(typeof useCommunicationPreferences).toBe('function')
      expect(typeof useTournamentPreferences).toBe('function')
      expect(typeof usePrivacyPreferences).toBe('function')
      expect(typeof useGamePreferences).toBe('function')
      expect(typeof useAccessibilityPreferences).toBe('function')
      expect(typeof useAdvancedPreferences).toBe('function')
    })
  })

  describe('Form Draft Store Selectors', () => {
    it('should provide draft selectors', () => {
      expect(typeof useDraft).toBe('function')
      expect(typeof useDraftData).toBe('function')
    })

    it('should provide list selectors', () => {
      expect(typeof useAllDrafts).toBe('function')
    })

    it('should provide statistics selectors', () => {
      expect(typeof useDraftStats).toBe('function')
    })

    it('should provide action selectors', () => {
      const { result } = renderHook(() => useFormDraftActions())
      expect(typeof result.current.createDraft).toBe('function')
      expect(typeof result.current.updateDraft).toBe('function')
      expect(typeof result.current.deleteDraft).toBe('function')
    })
  })

  describe('Loading Store Selectors', () => {
    it('should provide loading selectors', () => {
      expect(typeof useLoading).toBe('function')
      expect(typeof useAllLoading).toBe('function')
    })

    it('should provide error selectors', () => {
      expect(typeof useError).toBe('function')
    })

    it('should provide loading bar selectors', () => {
      expect(typeof useLoadingBarState).toBe('function')
    })

    it('should provide action selectors', () => {
      const { result } = renderHook(() => useLoadingActions())
      expect(typeof result.current.setLoading).toBe('function')
      expect(typeof result.current.setError).toBe('function')
      expect(typeof result.current.clearError).toBe('function')
    })
  })

  describe('Selector Performance', () => {
    it('should memoize selector results', () => {
      const { result, rerender } = renderHook(() => 
        useModalState('tournamentRegistration')
      )

      const firstRender = result.current
      rerender()
      const secondRender = result.current

      // Selectors should return stable references when state hasn't changed
      expect(firstRender.isOpen).toBe(secondRender.isOpen)
    })

    it('should only re-render when selected state changes', () => {
      let renderCount = 0
      const { result } = renderHook(() => {
        renderCount++
        return useModalState('tournamentRegistration')
      })

      const initialRenderCount = renderCount

      // Access the result
      expect(result.current.isOpen).toBe(false)

      // Should not cause additional renders just by accessing
      expect(renderCount).toBe(initialRenderCount)
    })
  })

  describe('Selector Integration', () => {
    it('should work with actual store state', () => {
      const { result } = renderHook(() => 
        useModalState('tournamentRegistration')
      )

      expect(result.current.isOpen).toBe(false)
      expect(result.current.data).toBeUndefined()
    })

    it('should update when store state changes', () => {
      const { result } = renderHook(() => 
        useModalState('tournamentRegistration')
      )

      // Open modal through store
      act(() => {
        useUIStore.getState().openModal('tournamentRegistration', { title: 'Test' })
      })

      // Selector should reflect the change
      expect(result.current.isOpen).toBe(true)
      expect(result.current.data?.title).toBe('Test')
    })
  })

  describe('Selector Error Handling', () => {
    it('should handle selector calls gracefully', () => {
      // Should not throw error for valid parameters
      expect(() => {
        renderHook(() => useModalState('tournamentRegistration'))
        renderHook(() => useTabState('tournamentDetails'))
        renderHook(() => useFilterState('tournaments'))
        renderHook(() => useInteractionState())
      }).not.toThrow()
    })

    it('should handle undefined selector results', () => {
      // Should handle undefined results gracefully
      const { result } = renderHook(() => useModalState('tournamentRegistration'))
      expect(result.current.isOpen).toBe(false)
    })
  })
})
