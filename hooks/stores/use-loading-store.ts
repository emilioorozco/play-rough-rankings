import { useCallback } from 'react'
import { useLoadingStore } from '@/stores/loading-store'
import { useLoadingStoreSelectors } from '@/stores/loading-store-selectors'

// Loading State Hooks
export function useLoading(key?: string) {
  const isLoading = useLoadingStoreSelectors.useIsLoading(key)
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

export function useError(key?: string) {
  const error = useLoadingStoreSelectors.useError(key)
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
export function useProgress(key?: string) {
  const progress = useLoadingStoreSelectors.useProgress(key)
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
export function useLoadingBar() {
  const isVisible = useLoadingStoreSelectors.useLoadingBarIsVisible()
  const progress = useLoadingStoreSelectors.useLoadingBarProgress()
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
    isVisible,
    progress,
    show,
    hide,
    setProgress,
  }
}

// Async Operation Hooks
export function useAsyncOperation(key: string) {
  const isLoading = useLoadingStoreSelectors.useIsLoading(key)
  const error = useLoadingStoreSelectors.useError(key)
  const progress = useLoadingStoreSelectors.useProgress(key)
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
      setError(key, error)
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
  const loadingStates = useLoadingStoreSelectors.useAllLoadingStates()
  const errorStates = useLoadingStoreSelectors.useAllErrorStates()
  const progressStates = useLoadingStoreSelectors.useAllProgressStates()
  const loadingBar = useLoadingStoreSelectors.useLoadingBarState()

  return {
    loadingStates,
    errorStates,
    progressStates,
    loadingBar,
  }
}
