import { useMemo, useCallback, useRef } from 'react'
import { useLoadingStore } from './loading-store'

// Loading state hooks
export const useLoading = (key: string) => {
  return useLoadingStore((state) => state.loading[key] || false)
}

export const useAllLoading = () => {
  return useLoadingStore((state) => state.loading)
}

export const useIsAnyLoading = () => {
  return useLoadingStore((state) => 
    Object.values(state.loading).some(Boolean) || state.isGlobalLoading
  )
}

export const useLoadingCount = () => {
  return useLoadingStore((state) => 
    Object.values(state.loading).filter(Boolean).length + (state.isGlobalLoading ? 1 : 0)
  )
}

export const useLoadingKeys = () => {
  return useLoadingStore(
    useCallback((state) => 
      Object.entries(state.loading)
        .filter(([, isLoading]) => isLoading)
        .map(([key]) => key)
    , [])
  )
}

export const useIsGlobalLoading = () => {
  return useLoadingStore((state) => state.isGlobalLoading)
}

export const useLoadingBarState = () => {
  return useLoadingStore(
    useCallback((state) => ({
      isActive: state.loadingBar.isVisible,
      progress: state.loadingBar.progress,
      message: state.loadingBar.message,
    }), [])
  )
}

// Error state hooks
export const useError = (key: string) => {
  return useLoadingStore((state) => state.errors[key] || null)
}

export const useAllErrors = () => {
  return useLoadingStore((state) => state.errors)
}

export const useHasAnyErrors = () => {
  return useLoadingStore((state) => 
    Object.keys(state.errors).length > 0 || !!state.globalError
  )
}

export const useErrorCount = () => {
  return useLoadingStore((state) => 
    Object.keys(state.errors).length + (state.globalError ? 1 : 0)
  )
}

export const useErrorKeys = () => {
  return useLoadingStore(
    useCallback((state) => 
      Object.keys(state.errors).filter(key => state.errors[key])
    , [])
  )
}

export const useGlobalError = () => {
  return useLoadingStore((state) => state.globalError)
}

export const useHasError = (key: string) => {
  return useLoadingStore((state) => !!state.errors[key])
}

export const useErrorSummary = () => {
  return useLoadingStore(
    useCallback((state) => ({
      totalErrors: Object.keys(state.errors).length + (state.globalError ? 1 : 0),
      hasGlobalError: !!state.globalError,
      errorKeys: Object.keys(state.errors).filter(key => state.errors[key]),
      globalError: state.globalError,
    }), [])
  )
}

// Progress hooks
export const useLoadingProgress = () => {
  return useLoadingStore((state) => state.loadingBar.progress)
}

export const useLoadingMessage = () => {
  return useLoadingStore((state) => state.loadingBar.message)
}

export const useIsLoadingInProgress = () => {
  return useLoadingStore((state) => state.loadingBar.isVisible)
}

export const useLoadingProgressPercentage = () => {
  return useLoadingStore(
    useCallback((state) => {
      return Math.max(0, Math.min(100, Math.round(state.loadingBar.progress)))
    }, [])
  )
}

// Action hooks - stable reference to prevent infinite loops
export const useLoadingActions = () => {
  const actionsRef = useRef<ReturnType<typeof useLoadingStore.getState> | null>(null)
  
  if (!actionsRef.current) {
    const state = useLoadingStore.getState()
    actionsRef.current = {
      setLoading: state.setLoading,
      setError: state.setError,
      clearError: state.clearError,
      clearAllErrors: state.clearAllErrors,
      setGlobalLoading: state.setGlobalLoading,
      setGlobalError: state.setGlobalError,
      clearGlobalError: state.clearGlobalError,
      showLoadingBar: state.showLoadingBar,
      hideLoadingBar: state.hideLoadingBar,
      setLoadingBarProgress: state.setLoadingBarProgress,
    }
  }
  
  return actionsRef.current
}

// Combined hooks for common use cases
export const useLoadingState = (key: string) => {
  const isLoading = useLoading(key)
  const error = useError(key)
  const actions = useLoadingActions()

  return useMemo(() => ({
    isLoading,
    error,
    setLoading: (loading: boolean) => actions.setLoading(key, loading),
    setError: (error: string | null) => actions.setError(key, error),
    clearError: () => actions.clearError(key),
  }), [isLoading, error, actions, key])
}

export const useGlobalLoadingState = () => {
  const isGlobalLoading = useIsGlobalLoading()
  const globalError = useGlobalError()
  const loadingBar = useLoadingBarState()
  const actions = useLoadingActions()

  return useMemo(() => ({
    isGlobalLoading,
    globalError,
    loadingBar,
    setGlobalLoading: actions.setGlobalLoading,
    setGlobalError: actions.setGlobalError,
    clearGlobalError: actions.clearGlobalError,
    showLoadingBar: actions.showLoadingBar,
    hideLoadingBar: actions.hideLoadingBar,
    setLoadingProgress: actions.setLoadingBarProgress,
  }), [isGlobalLoading, globalError, loadingBar, actions])
}

export const useErrorState = () => {
  const errors = useAllErrors()
  const errorCount = useErrorCount()
  const hasAnyErrors = useHasAnyErrors()
  const globalError = useGlobalError()
  const actions = useLoadingActions()

  return useMemo(() => ({
    errors,
    errorCount,
    hasAnyErrors,
    globalError,
    clearError: actions.clearError,
    clearAllErrors: actions.clearAllErrors,
    clearGlobalError: actions.clearGlobalError,
  }), [errors, errorCount, hasAnyErrors, globalError, actions])
}

// Performance optimized hooks for rendering
export const useLoadingIndicatorData = () => {
  return useLoadingStore(
    useCallback((state) => ({
      isVisible: state.loadingBar.isVisible,
      progress: state.loadingBar.progress,
      message: state.loadingBar.message,
      hasAnyLoading: Object.values(state.loading).some(Boolean) || state.isGlobalLoading,
    }), [])
  )
}

export const useLoadingBarRenderData = () => {
  return useLoadingStore(
    useCallback((state) => ({
      isVisible: state.loadingBar.isVisible,
      progress: Math.max(0, Math.min(100, Math.round(state.loadingBar.progress))),
      message: state.loadingBar.message,
    }), [])
  )
}

export const useErrorDisplayData = () => {
  return useLoadingStore(
    useCallback((state) => ({
      globalError: state.globalError,
      hasGlobalError: !!state.globalError,
      errorCount: Object.keys(state.errors).length + (state.globalError ? 1 : 0),
    }), [])
  )
}

export const useLoadingStatusData = () => {
  return useLoadingStore(
    useCallback((state) => {
      const loadingKeys = Object.entries(state.loading)
        .filter(([, isLoading]) => isLoading)
        .map(([key]) => key)
      const errorKeys = Object.keys(state.errors).filter(key => state.errors[key])
      
      return {
        activeLoadingCount: loadingKeys.length + (state.isGlobalLoading ? 1 : 0),
        activeErrorCount: errorKeys.length + (state.globalError ? 1 : 0),
        isGlobalLoading: state.isGlobalLoading,
        hasGlobalError: !!state.globalError,
        loadingKeys,
        errorKeys,
      }
    }, [])
  )
}

export const useErrorSummaryData = () => {
  return useLoadingStore(
    useCallback((state) => ({
      totalErrors: Object.keys(state.errors).length + (state.globalError ? 1 : 0),
      specificErrors: Object.keys(state.errors).length,
      hasGlobalError: !!state.globalError,
      hasAnyErrors: Object.keys(state.errors).length > 0 || !!state.globalError,
    }), [])
  )
}
