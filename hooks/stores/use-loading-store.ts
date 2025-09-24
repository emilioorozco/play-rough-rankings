import { useCallback } from 'react'
import { useLoadingStore, useLoading, useError, useProgress, useLoadingBar } from '@/stores/loading-store'
import { useLoadingStoreSelectors } from '@/stores/loading-store-selectors'

// Loading State Hooks
export function useLoadingState(key?: string) {
  const isLoading = key ? useLoadingStore((state) => state.isLoading(key)) : false
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

export function useErrorState(key?: string) {
  const error = key ? useLoadingStore((state) => state.getError(key)) : null
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

// Progress Hooks
export function useProgressState(key?: string) {
  const progress = key ? useLoadingStore((state) => state.getProgress(key)) : 0
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

// Loading Bar Hooks
export function useLoadingBarState() {
  const loadingBar = useLoadingStore((state) => state.loadingBar)
  const showLoadingBar = useLoadingStore((state) => state.showLoadingBar)
  const hideLoadingBar = useLoadingStore((state) => state.hideLoadingBar)
  const setLoadingBarProgress = useLoadingStore((state) => state.setLoadingBarProgress)

  const show = useCallback((initialProgress?: number) => {
    showLoadingBar(initialProgress)
  }, [showLoadingBar])

  const hide = useCallback(() => {
    hideLoadingBar()
  }, [hideLoadingBar])

  const setProgress = useCallback((progress: number) => {
    setLoadingBarProgress(progress)
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

// Async Operation Hooks
export function useAsyncOperation(key: string) {
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
      const result = await operation()
      setLoading(key, false)
      return result
    } catch (error) {
      setLoading(key, false)
      setError(key, error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }, [key, setLoading, clearError, setError])

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
    clear,
  }
}

// Bulk Operations Hooks
export function useLoadingStoreActions() {
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
export function useLoadingStoreState() {
  const loadingStates = useLoadingStore((state) => state.loading)
  const errorStates = useLoadingStore((state) => state.errors)
  const progressStates = useLoadingStore((state) => state.progress)
  const loadingBar = useLoadingStore((state) => state.loadingBar)
  const isGlobalLoading = useLoadingStore((state) => state.isGlobalLoading)
  const globalError = useLoadingStore((state) => state.globalError)

  return {
    loadingStates,
    errorStates,
    progressStates,
    loadingBar,
    isGlobalLoading,
    globalError,
  }
}
