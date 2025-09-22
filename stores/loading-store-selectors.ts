import { useMemo, useCallback } from 'react'
import { useLoadingStore } from './loading-store'
import type { LoadingStore } from './loading-store'

// Loading state selectors
export const useLoadingSelectors = {
  // Get specific loading state
  getLoading: (key: string) => {
    return useLoadingStore((state) => state.loading[key] || false)
  },

  // Get all loading states
  getAllLoading: () => {
    return useLoadingStore((state) => state.loading)
  },

  // Check if any loading is active
  isAnyLoading: () => {
    return useLoadingStore((state) => 
      Object.values(state.loading).some(Boolean) || state.isGlobalLoading
    )
  },

  // Get loading count
  getLoadingCount: () => {
    return useLoadingStore((state) => 
      Object.values(state.loading).filter(Boolean).length + (state.isGlobalLoading ? 1 : 0)
    )
  },

  // Get loading keys - memoized to prevent infinite loops
  getLoadingKeys: () => {
    return useLoadingStore(
      useCallback((state) => 
        Object.entries(state.loading)
          .filter(([_, isLoading]) => isLoading)
          .map(([key, _]) => key)
      , [])
    )
  },

  // Check if global loading is active
  isGlobalLoading: () => {
    return useLoadingStore((state) => state.isGlobalLoading)
  },

  // Get loading bar state - memoized to prevent infinite loops
  getLoadingBarState: () => {
    return useLoadingStore(
      useCallback((state) => ({
        isActive: state.isGlobalLoading,
        progress: state.loadingProgress,
        message: state.loadingMessage,
      }), [])
    )
  },
}

// Error state selectors
export const useErrorSelectors = {
  // Get specific error
  getError: (key: string) => {
    return useLoadingStore((state) => state.errors[key] || null)
  },

  // Get all errors
  getAllErrors: () => {
    return useLoadingStore((state) => state.errors)
  },

  // Check if any errors exist
  hasAnyErrors: () => {
    return useLoadingStore((state) => 
      Object.keys(state.errors).length > 0 || !!state.globalError
    )
  },

  // Get error count
  getErrorCount: () => {
    return useLoadingStore((state) => 
      Object.keys(state.errors).length + (state.globalError ? 1 : 0)
    )
  },

  // Get error keys - memoized to prevent infinite loops
  getErrorKeys: () => {
    return useLoadingStore(
      useCallback((state) => 
        Object.keys(state.errors).filter(key => state.errors[key])
      , [])
    )
  },

  // Get global error
  getGlobalError: () => {
    return useLoadingStore((state) => state.globalError)
  },

  // Check if specific error exists
  hasError: (key: string) => {
    return useLoadingStore((state) => !!state.errors[key])
  },

  // Get error summary - memoized to prevent infinite loops
  getErrorSummary: () => {
    return useLoadingStore(
      useCallback((state) => ({
        totalErrors: Object.keys(state.errors).length + (state.globalError ? 1 : 0),
        hasGlobalError: !!state.globalError,
        errorKeys: Object.keys(state.errors).filter(key => state.errors[key]),
        globalError: state.globalError,
      }), [])
    )
  },
}

// Progress selectors
export const useProgressSelectors = {
  // Get loading progress
  getLoadingProgress: () => {
    return useLoadingStore((state) => state.loadingProgress)
  },

  // Get loading message
  getLoadingMessage: () => {
    return useLoadingStore((state) => state.loadingMessage)
  },

  // Get loading duration
  getLoadingDuration: () => {
    return useLoadingStore((state) => state.loadingDuration)
  },

  // Get loading start time
  getLoadingStartTime: () => {
    return useLoadingStore((state) => state.loadingStartTime)
  },

  // Check if loading is in progress
  isLoadingInProgress: () => {
    return useLoadingStore((state) => state.isGlobalLoading && state.loadingStartTime !== null)
  },

  // Get loading progress percentage - memoized to prevent infinite loops
  getLoadingProgressPercentage: () => {
    return useLoadingStore(
      useCallback((state) => {
        if (!state.isGlobalLoading || !state.loadingStartTime || !state.loadingDuration) {
          return 0
        }
        
        const elapsed = Date.now() - state.loadingStartTime
        const progress = Math.min((elapsed / state.loadingDuration) * 100, 100)
        return Math.round(progress)
      }, [])
    )
  },
}

// Action selectors
export const useLoadingActions = {
  // Set loading state
  setLoading: () => useLoadingStore((state) => state.setLoading),

  // Set error state
  setError: () => useLoadingStore((state) => state.setError),

  // Clear error
  clearError: () => useLoadingStore((state) => state.clearError),

  // Clear all errors
  clearAllErrors: () => useLoadingStore((state) => state.clearAllErrors),

  // Set global loading
  setGlobalLoading: () => useLoadingStore((state) => state.setGlobalLoading),

  // Set global error
  setGlobalError: () => useLoadingStore((state) => state.setGlobalError),

  // Clear global error
  clearGlobalError: () => useLoadingStore((state) => state.clearGlobalError),

  // Show loading bar
  showLoadingBar: () => useLoadingStore((state) => state.showLoadingBar),

  // Hide loading bar
  hideLoadingBar: () => useLoadingStore((state) => state.hideLoadingBar),

  // Set loading progress
  setLoadingProgress: () => useLoadingStore((state) => state.setLoadingProgress),

  // Set loading message
  setLoadingMessage: () => useLoadingStore((state) => state.setLoadingMessage),
}

// Combined selectors for common use cases
export const useLoadingStoreSelectors = {
  // Get complete loading state for a specific key
  getLoadingState: (key: string) => {
    const isLoading = useLoadingSelectors.getLoading(key)
    const error = useErrorSelectors.getError(key)
    const setLoading = useLoadingActions.setLoading()
    const setError = useLoadingActions.setError()
    const clearError = useLoadingActions.clearError()

    return useMemo(() => ({
      isLoading,
      error,
      setLoading: (loading: boolean) => setLoading(key, loading),
      setError: (error: string | null) => setError(key, error),
      clearError: () => clearError(key),
    }), [isLoading, error, setLoading, setError, clearError, key])
  },

  // Get complete global loading state
  getGlobalLoadingState: () => {
    const isGlobalLoading = useLoadingSelectors.isGlobalLoading()
    const globalError = useErrorSelectors.getGlobalError()
    const progress = useProgressSelectors.getLoadingProgress()
    const message = useProgressSelectors.getLoadingMessage()
    const duration = useProgressSelectors.getLoadingDuration()
    const startTime = useProgressSelectors.getLoadingStartTime()
    const progressPercentage = useProgressSelectors.getLoadingProgressPercentage()
    
    const setGlobalLoading = useLoadingActions.setGlobalLoading()
    const setGlobalError = useLoadingActions.setGlobalError()
    const clearGlobalError = useLoadingActions.clearGlobalError()
    const showLoadingBar = useLoadingActions.showLoadingBar()
    const hideLoadingBar = useLoadingActions.hideLoadingBar()
    const setLoadingProgress = useLoadingActions.setLoadingProgress()
    const setLoadingMessage = useLoadingActions.setLoadingMessage()

    return useMemo(() => ({
      isGlobalLoading,
      globalError,
      progress,
      message,
      duration,
      startTime,
      progressPercentage,
      setGlobalLoading,
      setGlobalError,
      clearGlobalError,
      showLoadingBar,
      hideLoadingBar,
      setLoadingProgress,
      setLoadingMessage,
    }), [
      isGlobalLoading, globalError, progress, message, duration, startTime, progressPercentage,
      setGlobalLoading, setGlobalError, clearGlobalError, showLoadingBar, hideLoadingBar,
      setLoadingProgress, setLoadingMessage
    ])
  },

  // Get complete error state
  getErrorState: () => {
    const errors = useErrorSelectors.getAllErrors()
    const globalError = useErrorSelectors.getGlobalError()
    const hasAnyErrors = useErrorSelectors.hasAnyErrors()
    const errorCount = useErrorSelectors.getErrorCount()
    const errorKeys = useErrorSelectors.getErrorKeys()
    
    const setError = useLoadingActions.setError()
    const clearError = useLoadingActions.clearError()
    const clearAllErrors = useLoadingActions.clearAllErrors()
    const setGlobalError = useLoadingActions.setGlobalError()
    const clearGlobalError = useLoadingActions.clearGlobalError()

    return useMemo(() => ({
      errors,
      globalError,
      hasAnyErrors,
      errorCount,
      errorKeys,
      setError: (key: string, error: string | null) => setError(key, error),
      clearError: (key: string) => clearError(key),
      clearAllErrors,
      setGlobalError,
      clearGlobalError,
    }), [
      errors, globalError, hasAnyErrors, errorCount, errorKeys,
      setError, clearError, clearAllErrors, setGlobalError, clearGlobalError
    ])
  },

  // Get complete loading bar state
  getLoadingBarState: () => {
    const isActive = useLoadingSelectors.isGlobalLoading()
    const progress = useProgressSelectors.getLoadingProgress()
    const message = useProgressSelectors.getLoadingMessage()
    const duration = useProgressSelectors.getLoadingDuration()
    const startTime = useProgressSelectors.getLoadingStartTime()
    const progressPercentage = useProgressSelectors.getLoadingProgressPercentage()
    
    const showLoadingBar = useLoadingActions.showLoadingBar()
    const hideLoadingBar = useLoadingActions.hideLoadingBar()
    const setLoadingProgress = useLoadingActions.setLoadingProgress()
    const setLoadingMessage = useLoadingActions.setLoadingMessage()

    return useMemo(() => ({
      isActive,
      progress,
      message,
      duration,
      startTime,
      progressPercentage,
      showLoadingBar,
      hideLoadingBar,
      setLoadingProgress,
      setLoadingMessage,
    }), [
      isActive, progress, message, duration, startTime, progressPercentage,
      showLoadingBar, hideLoadingBar, setLoadingProgress, setLoadingMessage
    ])
  },
}

// Performance-optimized selectors for specific use cases
export const useOptimizedLoadingSelectors = {
  // Get only the data needed for loading indicator rendering - memoized to prevent infinite loops
  getLoadingIndicatorData: (key: string) => {
    return useLoadingStore(
      useCallback((state) => ({
        isLoading: state.loading[key] || false,
        error: state.errors[key] || null,
      }), [key])
    )
  },

  // Get only the data needed for global loading bar rendering - memoized to prevent infinite loops
  getLoadingBarRenderData: () => {
    return useLoadingStore(
      useCallback((state) => ({
        isActive: state.isGlobalLoading,
        progress: state.loadingProgress,
        message: state.loadingMessage,
        progressPercentage: state.isGlobalLoading && state.loadingStartTime && state.loadingDuration
          ? Math.min(Math.round(((Date.now() - state.loadingStartTime) / state.loadingDuration) * 100), 100)
          : 0,
      }), [])
    )
  },

  // Get only the data needed for error display rendering - memoized to prevent infinite loops
  getErrorDisplayData: (key: string) => {
    return useLoadingStore(
      useCallback((state) => ({
        error: state.errors[key] || null,
        globalError: state.globalError,
        hasError: !!state.errors[key] || !!state.globalError,
      }), [key])
    )
  },

  // Get only the data needed for loading status rendering - memoized to prevent infinite loops
  getLoadingStatusData: () => {
    return useLoadingStore(
      useCallback((state) => {
        const loadingKeys = Object.entries(state.loading)
          .filter(([_, isLoading]) => isLoading)
          .map(([key, _]) => key)
        
        return {
          isAnyLoading: loadingKeys.length > 0 || state.isGlobalLoading,
          loadingCount: loadingKeys.length + (state.isGlobalLoading ? 1 : 0),
          loadingKeys,
          isGlobalLoading: state.isGlobalLoading,
        }
      }, [])
    )
  },

  // Get only the data needed for error summary rendering - memoized to prevent infinite loops
  getErrorSummaryData: () => {
    return useLoadingStore(
      useCallback((state) => {
        const errorKeys = Object.keys(state.errors).filter(key => state.errors[key])
        
        return {
          hasAnyErrors: errorKeys.length > 0 || !!state.globalError,
          errorCount: errorKeys.length + (state.globalError ? 1 : 0),
          errorKeys,
          hasGlobalError: !!state.globalError,
          globalError: state.globalError,
        }
      }, [])
    )
  },
}
