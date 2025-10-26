import { useCallback } from 'react'
import { useLoadingStore } from '@/stores/loading-store'
import { useStoreLoadingIntegration } from '@/stores/loading-store-integration'

// Enhanced Loading State Hooks with Integration
export function useLoadingEnhanced(key?: string) {
  const isLoading = useLoadingStore((state) => key ? state.isLoading(key) : false)
  const setLoading = useLoadingStore((state) => state.setLoading)
  const clearLoading = useLoadingStore((state) => state.clearLoading)

  const set = useCallback((loading: boolean) => {
    if (key) {
      setLoading(key, loading)
    }
  }, [key, setLoading])

  const clear = useCallback(() => {
    if (key) {
      clearLoading(key)
    }
  }, [key, clearLoading])

  return {
    isLoading,
    set,
    clear,
  }
}

export function useErrorEnhanced(key?: string) {
  const error = useLoadingStore((state) => key ? state.getError(key) : null)
  const setError = useLoadingStore((state) => state.setError)
  const clearError = useLoadingStore((state) => state.clearError)

  const set = useCallback((error: any) => {
    if (key) {
      setError(key, error)
    }
  }, [key, setError])

  const clear = useCallback(() => {
    if (key) {
      clearError(key)
    }
  }, [key, clearError])

  return {
    error,
    set,
    clear,
  }
}

export function useProgressEnhanced(key?: string) {
  const progress = useLoadingStore((state) => key ? state.getProgress(key) : 0)
  const setProgress = useLoadingStore((state) => state.setProgress)
  const clearProgress = useLoadingStore((state) => state.clearProgress)

  const set = useCallback((progress: number) => {
    if (key) {
      setProgress(key, progress)
    }
  }, [key, setProgress])

  const clear = useCallback(() => {
    if (key) {
      clearProgress(key)
    }
  }, [key, clearProgress])

  return {
    progress,
    set,
    clear,
  }
}

export function useLoadingBarEnhanced() {
  const loadingBar = useLoadingStore((state) => state.loadingBar)
  const showLoadingBar = useLoadingStore((state) => state.showLoadingBar)
  const hideLoadingBar = useLoadingStore((state) => state.hideLoadingBar)
  const setLoadingBarProgress = useLoadingStore((state) => state.setLoadingBarProgress)

  const show = useCallback((initialProgress?: number, message?: string) => {
    showLoadingBar(initialProgress, message)
  }, [showLoadingBar])

  const hide = useCallback(() => {
    hideLoadingBar()
  }, [hideLoadingBar])

  const setProgress = useCallback((progress: number, message?: string) => {
    setLoadingBarProgress(progress, message)
  }, [setLoadingBarProgress])

  return {
    isVisible: loadingBar.isVisible,
    progress: loadingBar.progress,
    message: loadingBar.message,
    show,
    hide,
    setProgress,
  }
}

export function useAsyncOperationEnhanced(key: string) {
  const isLoading = useLoadingStore((state) => state.isLoading(key))
  const error = useLoadingStore((state) => state.getError(key))
  const progress = useLoadingStore((state) => state.getProgress(key))
  const setLoading = useLoadingStore((state) => state.setLoading)
  const setError = useLoadingStore((state) => state.setError)
  const setProgress = useLoadingStore((state) => state.setProgress)
  const clearLoading = useLoadingStore((state) => state.clearLoading)
  const clearError = useLoadingStore((state) => state.clearError)
  const clearProgress = useLoadingStore((state) => state.clearProgress)

  const execute = useCallback(async (operation: () => Promise<any>) => {
    try {
      setLoading(key, true)
      clearError(key)
      setProgress(key, 0)
      
      const result = await operation()
      setProgress(key, 100)
      return result
    } catch (error) {
      setError(key, error instanceof Error ? error : new Error(String(error)))
      throw error
    } finally {
      setLoading(key, false)
      setTimeout(() => clearProgress(key), 500)
    }
  }, [key, setLoading, clearError, setProgress, setError, clearProgress])

  const updateProgress = useCallback((progress: number) => {
    setProgress(key, progress)
  }, [key, setProgress])

  const clear = useCallback(() => {
    clearLoading(key)
    clearError(key)
    clearProgress(key)
  }, [key, clearLoading, clearError, clearProgress])

  return {
    isLoading,
    error,
    progress,
    execute,
    updateProgress,
    clear,
  }
}

// Store Integration Hooks
export function useTournamentLoadingIntegration() {
  const integration = useStoreLoadingIntegration()
  return integration.tournament
}

export function useUserPreferencesLoadingIntegration() {
  const integration = useStoreLoadingIntegration()
  return integration.userPreferences
}

export function useFormDraftLoadingIntegration() {
  const integration = useStoreLoadingIntegration()
  return integration.formDraft
}

export function useUILoadingIntegration() {
  const integration = useStoreLoadingIntegration()
  return integration.ui
}

export function useGlobalLoadingIntegration() {
  const integration = useStoreLoadingIntegration()
  return integration.global
}

// Bulk Operations Hooks
export function useLoadingStoreActionsEnhanced() {
  const setLoading = useLoadingStore((state) => state.setLoading)
  const setError = useLoadingStore((state) => state.setError)
  const setProgress = useLoadingStore((state) => state.setProgress)
  const clearLoading = useLoadingStore((state) => state.clearLoading)
  const clearError = useLoadingStore((state) => state.clearError)
  const clearProgress = useLoadingStore((state) => state.clearProgress)
  const clearAll = useLoadingStore((state) => state.clearAll)
  const showLoadingBar = useLoadingStore((state) => state.showLoadingBar)
  const hideLoadingBar = useLoadingStore((state) => state.hideLoadingBar)
  const setLoadingBarProgress = useLoadingStore((state) => state.setLoadingBarProgress)

  return {
    setLoading,
    setError,
    setProgress,
    clearLoading,
    clearError,
    clearProgress,
    clearAll,
    showLoadingBar,
    hideLoadingBar,
    setLoadingBarProgress,
  }
}

// State Getters Hooks
export function useLoadingStoreStateEnhanced() {
  const loadingStates = useLoadingStore((state) => state.loading)
  const errorStates = useLoadingStore((state) => state.errors)
  const progressStates = useLoadingStore((state) => state.progress)
  const loadingBar = useLoadingStore((state) => state.loadingBar)

  return {
    loadingStates,
    errorStates,
    progressStates,
    loadingBar,
  }
}
