import { useLoadingStore } from './loading-store'
import { useTournamentStore } from './tournament-store'
import { useUserPreferencesStore } from './user-preferences-store'
import { useFormDraftStore } from './form-draft-store'
import { useUIStore } from './ui-store'

// Integration utilities for connecting loading store with other stores

// Tournament Store Integration
export const useTournamentLoadingIntegration = () => {
  const setLoading = useLoadingStore((state) => state.setLoading)
  const setError = useLoadingStore((state) => state.setError)
  const setProgress = useLoadingStore((state) => state.setProgress)
  const clearLoading = useLoadingStore((state) => state.clearLoading)
  const clearError = useLoadingStore((state) => state.clearError)
  const clearProgress = useLoadingStore((state) => state.clearProgress)

  // Some stores may not implement these fetch methods; fall back to no-ops
  const fetchTournament = useTournamentStore((state) => (state as any).fetchTournament ?? (async (_tournamentId: string) => null))
  const fetchTournaments = useTournamentStore((state) => (state as any).fetchTournaments ?? (async (_params?: any) => null))
  const fetchRegistrationStatus = useTournamentStore((state) => (state as any).fetchRegistrationStatus ?? (async (_tournamentId: string) => null))

  const enhancedFetchTournament = async (tournamentId: string) => {
    const key = `tournament-${tournamentId}`
    setLoading(key, true)
    setProgress(key, 0)
    clearError(key)

    try {
      setProgress(key, 25)
      const result = await fetchTournament(tournamentId)
      setProgress(key, 100)
      return result
    } catch (error) {
      setError(key, error instanceof Error ? error : new Error(String(error)))
      throw error
    } finally {
      setLoading(key, false)
      setTimeout(() => clearProgress(key), 500)
    }
  }

  const enhancedFetchTournaments = async (params?: any) => {
    const key = 'tournament-list'
    setLoading(key, true)
    setProgress(key, 0)
    clearError(key)

    try {
      setProgress(key, 25)
      const result = await fetchTournaments(params)
      setProgress(key, 100)
      return result
    } catch (error) {
      setError(key, error instanceof Error ? error : new Error(String(error)))
      throw error
    } finally {
      setLoading(key, false)
      setTimeout(() => clearProgress(key), 500)
    }
  }

  const enhancedFetchRegistrationStatus = async (tournamentId: string) => {
    const key = `registration-${tournamentId}`
    setLoading(key, true)
    clearError(key)

    try {
      const result = await fetchRegistrationStatus(tournamentId)
      return result
    } catch (error) {
      setError(key, error instanceof Error ? error : new Error(String(error)))
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  return {
    fetchTournament: enhancedFetchTournament,
    fetchTournaments: enhancedFetchTournaments,
    fetchRegistrationStatus: enhancedFetchRegistrationStatus,
  }
}

// User Preferences Store Integration
export const useUserPreferencesLoadingIntegration = () => {
  const setLoading = useLoadingStore((state) => state.setLoading)
  const setError = useLoadingStore((state) => state.setError)
  const clearLoading = useLoadingStore((state) => state.clearLoading)
  const clearError = useLoadingStore((state) => state.clearError)

  const setPreferences = useUserPreferencesStore((state) => state.setPreferences)
  const updatePreferences = useUserPreferencesStore((state) => state.updatePreferences)
  const resetPreferences = useUserPreferencesStore((state) => state.resetPreferences)

  const enhancedSetPreferences = async (preferences: any) => {
    const key = 'user-preferences-set'
    setLoading(key, true)
    clearError(key)

    try {
      setPreferences(preferences)
    } catch (error) {
      setError(key, error instanceof Error ? error : new Error(String(error)))
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  const enhancedUpdatePreferences = async (updates: any) => {
    const key = 'user-preferences-update'
    setLoading(key, true)
    clearError(key)

    try {
      updatePreferences(updates)
    } catch (error) {
      setError(key, error instanceof Error ? error : new Error(String(error)))
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  const enhancedResetPreferences = async (_category?: string) => {
    const key = 'user-preferences-reset'
    setLoading(key, true)
    clearError(key)

    try {
      resetPreferences()
    } catch (error) {
      setError(key, error instanceof Error ? error : new Error(String(error)))
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  return {
    setPreferences: enhancedSetPreferences,
    updatePreferences: enhancedUpdatePreferences,
    resetPreferences: enhancedResetPreferences,
  }
}

// Form Draft Store Integration
export const useFormDraftLoadingIntegration = () => {
  const setLoading = useLoadingStore((state) => state.setLoading)
  const setError = useLoadingStore((state) => state.setError)
  const setProgress = useLoadingStore((state) => state.setProgress)
  const clearLoading = useLoadingStore((state) => state.clearLoading)
  const clearError = useLoadingStore((state) => state.clearError)
  const clearProgress = useLoadingStore((state) => state.clearProgress)

  const saveDraft = useFormDraftStore((state) => state.saveDraft)
  const updateDraft = useFormDraftStore((state) => state.updateDraft)
  const deleteDraft = useFormDraftStore((state) => state.deleteDraft)
  const clearDrafts = useFormDraftStore((state) => state.clearDrafts)

  const enhancedSaveDraft = async (draftId: string, formData: any, _formType: string, _metadata?: any) => {
    const key = `draft-save-${draftId}`
    setLoading(key, true)
    setProgress(key, 0)
    clearError(key)

    try {
      setProgress(key, 50)
      // The form draft store's API expects (formId, data)
      saveDraft(draftId, formData)
      setProgress(key, 100)
    } catch (error) {
      setError(key, error instanceof Error ? error : new Error(String(error)))
      throw error
    } finally {
      setLoading(key, false)
      setTimeout(() => clearProgress(key), 500)
    }
  }

  const enhancedUpdateDraft = async (draftId: string, updates: any) => {
    const key = `draft-update-${draftId}`
    setLoading(key, true)
    clearError(key)

    try {
      updateDraft(draftId, updates)
    } catch (error) {
      setError(key, error instanceof Error ? error : new Error(String(error)))
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  const enhancedDeleteDraft = async (draftId: string) => {
    const key = `draft-delete-${draftId}`
    setLoading(key, true)
    clearError(key)

    try {
      deleteDraft(draftId)
    } catch (error) {
      setError(key, error instanceof Error ? error : new Error(String(error)))
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  const enhancedClearDrafts = async (formType?: string) => {
    const key = 'draft-clear'
    setLoading(key, true)
    clearError(key)

    try {
      clearDrafts(formType)
    } catch (error) {
      setError(key, error instanceof Error ? error : new Error(String(error)))
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  return {
    saveDraft: enhancedSaveDraft,
    updateDraft: enhancedUpdateDraft,
    deleteDraft: enhancedDeleteDraft,
    clearDrafts: enhancedClearDrafts,
  }
}

// UI Store Integration
export const useUILoadingIntegration = () => {
  const setLoading = useLoadingStore((state) => state.setLoading)
  const setError = useLoadingStore((state) => state.setError)
  const clearLoading = useLoadingStore((state) => state.clearLoading)
  const clearError = useLoadingStore((state) => state.clearError)

  const openModal = useUIStore((state) => state.openModal)
  const closeModal = useUIStore((state) => state.closeModal)
  const openConfirmation = useUIStore((state) => state.openConfirmation)

  const enhancedOpenModal = async (
    modalName: 'tournamentRegistration' | 'tournamentManagement' | 'tournamentCreate' | 'userPreferences' | 'login' | 'confirmation' | 'storeCreate',
    config?: any
  ) => {
    const key = `modal-${modalName}`
    setLoading(key, true)
    clearError(key)

    try {
      openModal(modalName, config)
    } catch (error) {
      setError(key, error instanceof Error ? error : new Error(String(error)))
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  const enhancedCloseModal = async (
    modalName: 'tournamentRegistration' | 'tournamentManagement' | 'tournamentCreate' | 'userPreferences' | 'login' | 'confirmation' | 'storeCreate'
  ) => {
    const key = `modal-${modalName}`
    setLoading(key, true)
    clearError(key)

    try {
      closeModal(modalName)
    } catch (error) {
      setError(key, error instanceof Error ? error : new Error(String(error)))
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  const enhancedOpenConfirmation = async (config: any) => {
    const key = 'confirmation-modal'
    setLoading(key, true)
    clearError(key)

    try {
      openConfirmation(config)
    } catch (error) {
      setError(key, error instanceof Error ? error : new Error(String(error)))
      throw error
    } finally {
      setLoading(key, false)
    }
  }

  return {
    openModal: enhancedOpenModal,
    closeModal: enhancedCloseModal,
    openConfirmation: enhancedOpenConfirmation,
  }
}

// Global Loading Integration
export const useGlobalLoadingIntegration = () => {
  const setGlobalLoading = useLoadingStore((state) => state.setGlobalLoading)
  const setGlobalError = useLoadingStore((state) => state.setGlobalError)
  const clearGlobalError = useLoadingStore((state) => state.clearGlobalError)
  const showLoadingBar = useLoadingStore((state) => state.showLoadingBar)
  const hideLoadingBar = useLoadingStore((state) => state.hideLoadingBar)
  const setLoadingBarProgress = useLoadingStore((state) => state.setLoadingBarProgress)

  const clearAll = useLoadingStore((state) => state.clearAll)
  const getStoreStatus = useLoadingStore((state) => state.getStoreStatus)

  return {
    setGlobalLoading,
    setGlobalError,
    clearGlobalError,
    showLoadingBar,
    hideLoadingBar,
    setLoadingBarProgress,
    clearAll,
    getStoreStatus,
  }
}

// Combined Integration Hook
export const useStoreLoadingIntegration = () => {
  const tournament = useTournamentLoadingIntegration()
  const userPreferences = useUserPreferencesLoadingIntegration()
  const formDraft = useFormDraftLoadingIntegration()
  const ui = useUILoadingIntegration()
  const global = useGlobalLoadingIntegration()

  return {
    tournament,
    userPreferences,
    formDraft,
    ui,
    global,
  }
}
