import { create } from 'zustand'
import { useMemo } from 'react'

// Types for loading and error states
interface LoadingState {
  [key: string]: boolean
}

interface ErrorState {
  [key: string]: Error | string | null
}

interface ProgressState {
  [key: string]: number
}

interface LoadingBarState {
  isVisible: boolean
  progress: number
  message?: string
}

interface LoadingStore {
  // Loading states
  loading: LoadingState
  setLoading: (key: string, isLoading: boolean) => void
  clearLoading: (key: string) => void
  clearAllLoading: () => void
  
  // Error states
  errors: ErrorState
  setError: (key: string, error: Error | string | null) => void
  clearError: (key: string) => void
  clearAllErrors: () => void
  
  // Progress states
  progress: ProgressState
  setProgress: (key: string, progress: number) => void
  clearProgress: (key: string) => void
  clearAllProgress: () => void
  
  // Global loading state
  isGlobalLoading: boolean
  setGlobalLoading: (isLoading: boolean) => void
  
  // Global error state
  globalError: Error | string | null
  setGlobalError: (error: Error | string | null) => void
  clearGlobalError: () => void
  
  // Loading bar state
  loadingBar: LoadingBarState
  showLoadingBar: (initialProgress?: number, message?: string) => void
  hideLoadingBar: () => void
  setLoadingBarProgress: (progress: number, message?: string) => void
  
  // Utility functions
  isLoading: (key: string) => boolean
  getError: (key: string) => Error | string | null
  getProgress: (key: string) => number
  hasError: (key: string) => boolean
  hasAnyError: () => boolean
  isAnyLoading: () => boolean
  
  // Store integration utilities
  clearAll: () => void
  getStoreStatus: () => {
    loading: string[]
    errors: string[]
    progress: string[]
  }
}

export const useLoadingStore = create<LoadingStore>((set, get) => ({
  // Loading states
  loading: {},
  setLoading: (key, isLoading) => set((state) => ({
    loading: {
      ...state.loading,
      [key]: isLoading,
    },
  })),
  clearLoading: (key) => set((state) => {
    const newLoading = { ...state.loading }
    delete newLoading[key]
    return { loading: newLoading }
  }),
  clearAllLoading: () => set({ loading: {} }),
  
  // Error states
  errors: {},
  setError: (key, error) => set((state) => ({
    errors: {
      ...state.errors,
      [key]: error,
    },
  })),
  clearError: (key) => set((state) => {
    const newErrors = { ...state.errors }
    delete newErrors[key]
    return { errors: newErrors }
  }),
  clearAllErrors: () => set({ errors: {} }),
  
  // Progress states
  progress: {},
  setProgress: (key, progress) => set((state) => ({
    progress: {
      ...state.progress,
      [key]: Math.max(0, Math.min(100, progress)), // Clamp between 0-100
    },
  })),
  clearProgress: (key) => set((state) => {
    const newProgress = { ...state.progress }
    delete newProgress[key]
    return { progress: newProgress }
  }),
  clearAllProgress: () => set({ progress: {} }),
  
  // Global loading state
  isGlobalLoading: false,
  setGlobalLoading: (isLoading) => set({ isGlobalLoading: isLoading }),
  
  // Global error state
  globalError: null,
  setGlobalError: (error) => set({ globalError: error }),
  clearGlobalError: () => set({ globalError: null }),
  
  // Loading bar state
  loadingBar: {
    isVisible: false,
    progress: 0,
    message: undefined,
  },
  showLoadingBar: (initialProgress = 0, message) => set({
    loadingBar: {
      isVisible: true,
      progress: initialProgress,
      message,
    },
  }),
  hideLoadingBar: () => set({
    loadingBar: {
      isVisible: false,
      progress: 0,
      message: undefined,
    },
  }),
  setLoadingBarProgress: (progress, message) => set((state) => ({
    loadingBar: {
      ...state.loadingBar,
      progress: Math.max(0, Math.min(100, progress)),
      message: message || state.loadingBar.message,
    },
  })),
  
  // Utility functions
  isLoading: (key) => get().loading[key] || false,
  getError: (key) => get().errors[key] || null,
  getProgress: (key) => get().progress[key] || 0,
  hasError: (key) => !!get().errors[key],
  hasAnyError: () => Object.keys(get().errors).length > 0 || !!get().globalError,
  isAnyLoading: () => Object.values(get().loading).some(Boolean) || get().isGlobalLoading,
  
  // Store integration utilities
  clearAll: () => set({
    loading: {},
    errors: {},
    progress: {},
    globalError: null,
    loadingBar: {
      isVisible: false,
      progress: 0,
      message: undefined,
    },
  }),
  getStoreStatus: () => {
    const state = get()
    return {
      loading: Object.keys(state.loading).filter(key => state.loading[key]),
      errors: Object.keys(state.errors).filter(key => state.errors[key]),
      progress: Object.keys(state.progress).filter(key => state.progress[key] > 0),
    }
  },
}))

// Selector hooks for better performance
export const useLoading = (key: string) => {
  const isLoading = useLoadingStore((state) => state.isLoading(key))
  const setLoading = useLoadingStore((state) => state.setLoading)
  const clearLoading = useLoadingStore((state) => state.clearLoading)
  
  return useMemo(() => ({
    isLoading,
    setLoading: (loading: boolean) => setLoading(key, loading),
    clearLoading: () => clearLoading(key),
  }), [isLoading, setLoading, clearLoading, key])
}

export const useError = (key: string) => {
  const error = useLoadingStore((state) => state.getError(key))
  const setError = useLoadingStore((state) => state.setError)
  const clearError = useLoadingStore((state) => state.clearError)
  
  return useMemo(() => ({
    error,
    setError: (error: Error | string | null) => setError(key, error),
    clearError: () => clearError(key),
    hasError: !!error,
  }), [error, setError, clearError, key])
}

export const useProgress = (key: string) => {
  const progress = useLoadingStore((state) => state.getProgress(key))
  const setProgress = useLoadingStore((state) => state.setProgress)
  const clearProgress = useLoadingStore((state) => state.clearProgress)
  
  return useMemo(() => ({
    progress,
    setProgress: (progress: number) => setProgress(key, progress),
    clearProgress: () => clearProgress(key),
  }), [progress, setProgress, clearProgress, key])
}

export const useGlobalLoading = () => {
  const isGlobalLoading = useLoadingStore((state) => state.isGlobalLoading)
  const setGlobalLoading = useLoadingStore((state) => state.setGlobalLoading)
  
  return useMemo(() => ({
    isGlobalLoading,
    setGlobalLoading,
  }), [isGlobalLoading, setGlobalLoading])
}

export const useGlobalError = () => {
  const globalError = useLoadingStore((state) => state.globalError)
  const setGlobalError = useLoadingStore((state) => state.setGlobalError)
  const clearGlobalError = useLoadingStore((state) => state.clearGlobalError)
  
  return useMemo(() => ({
    globalError,
    setGlobalError,
    clearGlobalError,
    hasGlobalError: !!globalError,
  }), [globalError, setGlobalError, clearGlobalError])
}

export const useLoadingBar = () => {
  const loadingBar = useLoadingStore((state) => state.loadingBar)
  const showLoadingBar = useLoadingStore((state) => state.showLoadingBar)
  const hideLoadingBar = useLoadingStore((state) => state.hideLoadingBar)
  const setLoadingBarProgress = useLoadingStore((state) => state.setLoadingBarProgress)
  
  return useMemo(() => ({
    isVisible: loadingBar.isVisible,
    progress: loadingBar.progress,
    message: loadingBar.message,
    showLoadingBar,
    hideLoadingBar,
    setLoadingBarProgress,
  }), [loadingBar, showLoadingBar, hideLoadingBar, setLoadingBarProgress])
}

// Hook for managing async operations with loading, error, and progress states
export function useAsyncOperation<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  key: string,
  options?: {
    onSuccess?: (result: R) => void
    onError?: (error: Error) => void
    onFinally?: () => void
    onProgress?: (progress: number) => void
    trackProgress?: boolean
  }
) {
  const { isLoading, setLoading, clearLoading } = useLoading(key)
  const { error, setError, clearError } = useError(key)
  const { progress, setProgress, clearProgress } = useProgress(key)
  
  const execute = async (...args: T): Promise<R | null> => {
    setLoading(true)
    clearError()
    if (options?.trackProgress) {
      setProgress(0)
    }
    
    try {
      const result = await operation(...args)
      if (options?.trackProgress) {
        setProgress(100)
      }
      options?.onSuccess?.(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      options?.onError?.(error)
      return null
    } finally {
      setLoading(false)
      if (options?.trackProgress) {
        // Keep progress visible for a moment before clearing
        setTimeout(() => clearProgress(), 500)
      }
      options?.onFinally?.()
    }
  }
  
  const updateProgress = (progress: number) => {
    if (options?.trackProgress) {
      setProgress(progress)
      options?.onProgress?.(progress)
    }
  }
  
  const clear = () => {
    clearLoading()
    clearError()
    clearProgress()
  }
  
  return {
    execute,
    updateProgress,
    isLoading,
    error,
    progress,
    clear,
    clearError,
  }
}
