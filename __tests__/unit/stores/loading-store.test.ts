import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { 
  useLoadingStore, 
  useLoading, 
  useError, 
  useProgress,
  useGlobalLoading,
  useGlobalError,
  useLoadingBar,
  useAsyncOperation
} from '@/stores/loading-store'

describe('Loading Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useLoadingStore.getState().clearAll()
  })

  describe('Loading State Management', () => {
    it('should set loading state for a key', () => {
      const store = useLoadingStore.getState()
      const key = 'test-loading'

      act(() => {
        store.setLoading(key, true)
      })

      const updatedStore = useLoadingStore.getState()
      expect(updatedStore.isLoading(key)).toBe(true)
      expect(updatedStore.loading[key]).toBe(true)
    })

    it('should clear loading state for a key', () => {
      const store = useLoadingStore.getState()
      const key = 'test-loading'

      // First set loading
      act(() => {
        store.setLoading(key, true)
      })

      expect(store.isLoading(key)).toBe(true)

      // Then clear it
      act(() => {
        store.clearLoading(key)
      })

      expect(store.isLoading(key)).toBe(false)
      expect(store.loading[key]).toBeUndefined()
    })

    it('should clear all loading states', () => {
      const store = useLoadingStore.getState()

      // Set multiple loading states
      act(() => {
        store.setLoading('loading-1', true)
        store.setLoading('loading-2', true)
        store.setLoading('loading-3', true)
      })

      expect(store.isLoading('loading-1')).toBe(true)
      expect(store.isLoading('loading-2')).toBe(true)
      expect(store.isLoading('loading-3')).toBe(true)

      // Clear all
      act(() => {
        store.clearAllLoading()
      })

      expect(store.isLoading('loading-1')).toBe(false)
      expect(store.isLoading('loading-2')).toBe(false)
      expect(store.isLoading('loading-3')).toBe(false)
    })
  })

  describe('Error State Management', () => {
    it('should set error state for a key', () => {
      const store = useLoadingStore.getState()
      const key = 'test-error'
      const error = new Error('Test error')

      act(() => {
        store.setError(key, error)
      })

      const updatedStore = useLoadingStore.getState()
      expect(updatedStore.getError(key)).toBe(error)
      expect(updatedStore.hasError(key)).toBe(true)
      expect(updatedStore.errors[key]).toBe(error)
    })

    it('should set string error', () => {
      const store = useLoadingStore.getState()
      const key = 'test-error'
      const errorMessage = 'Test error message'

      act(() => {
        store.setError(key, errorMessage)
      })

      expect(store.getError(key)).toBe(errorMessage)
      expect(store.hasError(key)).toBe(true)
    })

    it('should clear error state for a key', () => {
      const store = useLoadingStore.getState()
      const key = 'test-error'
      const error = new Error('Test error')

      // First set error
      act(() => {
        store.setError(key, error)
      })

      expect(store.hasError(key)).toBe(true)

      // Then clear it
      act(() => {
        store.clearError(key)
      })

      expect(store.hasError(key)).toBe(false)
      expect(store.errors[key]).toBeUndefined()
    })

    it('should clear all error states', () => {
      const store = useLoadingStore.getState()

      // Set multiple errors
      act(() => {
        store.setError('error-1', 'Error 1')
        store.setError('error-2', 'Error 2')
        store.setError('error-3', 'Error 3')
      })

      expect(store.hasError('error-1')).toBe(true)
      expect(store.hasError('error-2')).toBe(true)
      expect(store.hasError('error-3')).toBe(true)

      // Clear all
      act(() => {
        store.clearAllErrors()
      })

      expect(store.hasError('error-1')).toBe(false)
      expect(store.hasError('error-2')).toBe(false)
      expect(store.hasError('error-3')).toBe(false)
    })
  })

  describe('Progress State Management', () => {
    it('should set progress for a key', () => {
      const store = useLoadingStore.getState()
      const key = 'test-progress'
      const progress = 50

      act(() => {
        store.setProgress(key, progress)
      })

      const updatedStore = useLoadingStore.getState()
      expect(updatedStore.getProgress(key)).toBe(progress)
      expect(updatedStore.progress[key]).toBe(progress)
    })

    it('should clamp progress between 0 and 100', () => {
      const store = useLoadingStore.getState()
      const key = 'test-progress'

      // Test negative progress
      act(() => {
        store.setProgress(key, -10)
      })

      expect(store.getProgress(key)).toBe(0)

      // Test progress over 100
      act(() => {
        store.setProgress(key, 150)
      })

      expect(store.getProgress(key)).toBe(100)
    })

    it('should clear progress for a key', () => {
      const store = useLoadingStore.getState()
      const key = 'test-progress'

      // First set progress
      act(() => {
        store.setProgress(key, 50)
      })

      expect(store.getProgress(key)).toBe(50)

      // Then clear it
      act(() => {
        store.clearProgress(key)
      })

      expect(store.getProgress(key)).toBe(0)
      expect(store.progress[key]).toBeUndefined()
    })

    it('should clear all progress states', () => {
      const store = useLoadingStore.getState()

      // Set multiple progress states
      act(() => {
        store.setProgress('progress-1', 25)
        store.setProgress('progress-2', 50)
        store.setProgress('progress-3', 75)
      })

      expect(store.getProgress('progress-1')).toBe(25)
      expect(store.getProgress('progress-2')).toBe(50)
      expect(store.getProgress('progress-3')).toBe(75)

      // Clear all
      act(() => {
        store.clearAllProgress()
      })

      expect(store.getProgress('progress-1')).toBe(0)
      expect(store.getProgress('progress-2')).toBe(0)
      expect(store.getProgress('progress-3')).toBe(0)
    })
  })

  describe('Global Loading State', () => {
    it('should set global loading state', () => {
      const store = useLoadingStore.getState()

      act(() => {
        store.setGlobalLoading(true)
      })

      let updatedStore = useLoadingStore.getState()
      expect(updatedStore.isGlobalLoading).toBe(true)

      act(() => {
        store.setGlobalLoading(false)
      })

      updatedStore = useLoadingStore.getState()
      expect(updatedStore.isGlobalLoading).toBe(false)
    })
  })

  describe('Global Error State', () => {
    it('should set global error state', () => {
      const store = useLoadingStore.getState()
      const error = new Error('Global error')

      act(() => {
        store.setGlobalError(error)
      })

      let updatedStore = useLoadingStore.getState()
      expect(updatedStore.globalError).toBe(error)

      act(() => {
        store.clearGlobalError()
      })

      updatedStore = useLoadingStore.getState()
      expect(updatedStore.globalError).toBeNull()
    })

    it('should set string global error', () => {
      const store = useLoadingStore.getState()
      const errorMessage = 'Global error message'

      act(() => {
        store.setGlobalError(errorMessage)
      })

      const updatedStore = useLoadingStore.getState()
      expect(updatedStore.globalError).toBe(errorMessage)
    })
  })

  describe('Loading Bar Management', () => {
    it('should show loading bar', () => {
      const store = useLoadingStore.getState()
      const initialProgress = 25
      const message = 'Loading...'

      act(() => {
        store.showLoadingBar(initialProgress, message)
      })

      const updatedStore = useLoadingStore.getState()
      expect(updatedStore.loadingBar.isVisible).toBe(true)
      expect(updatedStore.loadingBar.progress).toBe(initialProgress)
      expect(updatedStore.loadingBar.message).toBe(message)
    })

    it('should show loading bar with default values', () => {
      const store = useLoadingStore.getState()

      act(() => {
        store.showLoadingBar()
      })

      const updatedStore = useLoadingStore.getState()
      expect(updatedStore.loadingBar.isVisible).toBe(true)
      expect(updatedStore.loadingBar.progress).toBe(0)
      expect(updatedStore.loadingBar.message).toBeUndefined()
    })

    it('should hide loading bar', () => {
      const store = useLoadingStore.getState()

      // First show loading bar
      act(() => {
        store.showLoadingBar(50, 'Loading...')
      })

      let updatedStore = useLoadingStore.getState()
      expect(updatedStore.loadingBar.isVisible).toBe(true)

      // Then hide it
      act(() => {
        store.hideLoadingBar()
      })

      updatedStore = useLoadingStore.getState()
      expect(updatedStore.loadingBar.isVisible).toBe(false)
      expect(store.loadingBar.progress).toBe(0)
      expect(store.loadingBar.message).toBeUndefined()
    })

    it('should set loading bar progress', () => {
      const store = useLoadingStore.getState()
      const progress = 75
      const message = 'Almost done...'

      // First show loading bar
      act(() => {
        store.showLoadingBar(25, 'Starting...')
      })

      // Then update progress
      act(() => {
        store.setLoadingBarProgress(progress, message)
      })

      const updatedStore = useLoadingStore.getState()
      expect(updatedStore.loadingBar.progress).toBe(progress)
      expect(updatedStore.loadingBar.message).toBe(message)
    })

    it('should update loading bar progress without changing message', () => {
      const store = useLoadingStore.getState()
      const progress = 90

      // First show loading bar with message
      act(() => {
        store.showLoadingBar(25, 'Loading...')
      })

      // Then update progress without new message
      act(() => {
        store.setLoadingBarProgress(progress)
      })

      const updatedStore = useLoadingStore.getState()
      expect(updatedStore.loadingBar.progress).toBe(progress)
      expect(updatedStore.loadingBar.message).toBe('Loading...')
    })
  })

  describe('State Queries', () => {
    it('should check if any loading is active', () => {
      const store = useLoadingStore.getState()

      // Initially no loading
      expect(store.isAnyLoading()).toBe(false)

      // Set some loading states
      act(() => {
        store.setLoading('loading-1', true)
        store.setLoading('loading-2', false)
        store.setGlobalLoading(false)
      })

      expect(store.isAnyLoading()).toBe(true)

      // Clear all loading
      act(() => {
        store.clearAllLoading()
      })

      expect(store.isAnyLoading()).toBe(false)
    })

    it('should check if any errors exist', () => {
      const store = useLoadingStore.getState()

      // Initially no errors
      expect(store.hasAnyError()).toBe(false)

      // Set some errors
      act(() => {
        store.setError('error-1', 'Error 1')
        store.setGlobalError('Global error')
      })

      expect(store.hasAnyError()).toBe(true)

      // Clear all errors
      act(() => {
        store.clearAllErrors()
        store.clearGlobalError()
      })

      expect(store.hasAnyError()).toBe(false)
    })

    it('should get store status', () => {
      const store = useLoadingStore.getState()

      // Set various states
      act(() => {
        store.setLoading('loading-1', true)
        store.setLoading('loading-2', true)
        store.setError('error-1', 'Error 1')
        store.setProgress('progress-1', 50)
        store.setProgress('progress-2', 75)
      })

      const status = store.getStoreStatus()

      expect(status.loading).toContain('loading-1')
      expect(status.loading).toContain('loading-2')
      expect(status.errors).toContain('error-1')
      expect(status.progress).toContain('progress-1')
      expect(status.progress).toContain('progress-2')
    })
  })

  describe('Complete State Management', () => {
    it('should clear all states', () => {
      const store = useLoadingStore.getState()

      // Set all types of states
      act(() => {
        store.setLoading('loading-1', true)
        store.setError('error-1', 'Error 1')
        store.setProgress('progress-1', 50)
        store.setGlobalLoading(true)
        store.setGlobalError('Global error')
        store.showLoadingBar(25, 'Loading...')
      })

      // Verify states are set
      let updatedStore = useLoadingStore.getState()
      expect(updatedStore.isLoading('loading-1')).toBe(true)
      expect(updatedStore.hasError('error-1')).toBe(true)
      expect(updatedStore.getProgress('progress-1')).toBe(50)
      expect(updatedStore.isGlobalLoading).toBe(true)
      expect(updatedStore.globalError).toBe('Global error')
      expect(updatedStore.loadingBar.isVisible).toBe(true)

      // Clear all
      act(() => {
        store.clearAll()
      })

      // Verify all states are cleared
      expect(store.isLoading('loading-1')).toBe(false)
      expect(store.hasError('error-1')).toBe(false)
      expect(store.getProgress('progress-1')).toBe(0)
      expect(store.isGlobalLoading).toBe(false)
      expect(store.globalError).toBeNull()
      expect(store.loadingBar.isVisible).toBe(false)
      expect(store.loadingBar.progress).toBe(0)
      expect(store.loadingBar.message).toBeUndefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle operations on non-existent keys gracefully', () => {
      const store = useLoadingStore.getState()
      const nonExistentKey = 'non-existent'

      // Should not throw errors for non-existent keys
      expect(() => {
        expect(store.isLoading(nonExistentKey)).toBe(false)
        expect(store.getError(nonExistentKey)).toBeNull()
        expect(store.getProgress(nonExistentKey)).toBe(0)
        expect(store.hasError(nonExistentKey)).toBe(false)
      }).not.toThrow()
    })

    it('should handle null and undefined values', () => {
      const store = useLoadingStore.getState()
      const key = 'test-key'

      // Should handle null error
      act(() => {
        store.setError(key, null)
      })

      expect(store.getError(key)).toBeNull()
      expect(store.hasError(key)).toBe(false)

      // Should handle undefined error
      act(() => {
        store.setError(key, undefined)
      })

      expect(store.getError(key)).toBeNull()
      expect(store.hasError(key)).toBe(false)
    })

    it('should handle loading bar progress clamping', () => {
      const store = useLoadingStore.getState()

      act(() => {
        store.showLoadingBar(50)
      })

      // Test negative progress
      act(() => {
        store.setLoadingBarProgress(-10)
      })

      let updatedStore = useLoadingStore.getState()
      expect(updatedStore.loadingBar.progress).toBe(0)

      // Test progress over 100
      act(() => {
        store.setLoadingBarProgress(150)
      })

      updatedStore = useLoadingStore.getState()
      expect(updatedStore.loadingBar.progress).toBe(100)
    })

    it('should detect global loading in isAnyLoading', () => {
      const store = useLoadingStore.getState()

      act(() => {
        store.setGlobalLoading(true)
      })

      expect(store.isAnyLoading()).toBe(true)

      act(() => {
        store.setGlobalLoading(false)
      })

      expect(store.isAnyLoading()).toBe(false)
    })

    it('should detect global error in hasAnyError', () => {
      const store = useLoadingStore.getState()

      act(() => {
        store.setGlobalError('Global error')
      })

      expect(store.hasAnyError()).toBe(true)

      act(() => {
        store.clearGlobalError()
      })

      expect(store.hasAnyError()).toBe(false)
    })
  })

  describe('Selector Hooks', () => {
    describe('useLoading hook', () => {
      it('should provide loading state and actions', () => {
        const key = 'test-loading'
        const { result } = renderHook(() => useLoading(key))

        expect(result.current.isLoading).toBe(false)

        act(() => {
          result.current.setLoading(true)
        })

        expect(result.current.isLoading).toBe(true)

        act(() => {
          result.current.clearLoading()
        })

        expect(result.current.isLoading).toBe(false)
      })

      it('should memoize return value', () => {
        const key = 'test-loading'
        const { result, rerender } = renderHook(() => useLoading(key))

        const firstResult = result.current

        rerender()

        // Should return same reference when state hasn't changed
        expect(result.current).toBe(firstResult)
      })
    })

    describe('useError hook', () => {
      it('should provide error state and actions', () => {
        const key = 'test-error'
        const { result } = renderHook(() => useError(key))

        expect(result.current.error).toBeNull()
        expect(result.current.hasError).toBe(false)

        const testError = new Error('Test error')

        act(() => {
          result.current.setError(testError)
        })

        expect(result.current.error).toBe(testError)
        expect(result.current.hasError).toBe(true)

        act(() => {
          result.current.clearError()
        })

        expect(result.current.error).toBeNull()
        expect(result.current.hasError).toBe(false)
      })

      it('should handle string errors', () => {
        const key = 'test-error'
        const { result } = renderHook(() => useError(key))

        act(() => {
          result.current.setError('String error')
        })

        expect(result.current.error).toBe('String error')
        expect(result.current.hasError).toBe(true)
      })
    })

    describe('useProgress hook', () => {
      it('should provide progress state and actions', () => {
        const key = 'test-progress'
        const { result } = renderHook(() => useProgress(key))

        expect(result.current.progress).toBe(0)

        act(() => {
          result.current.setProgress(50)
        })

        expect(result.current.progress).toBe(50)

        act(() => {
          result.current.clearProgress()
        })

        expect(result.current.progress).toBe(0)
      })
    })

    describe('useGlobalLoading hook', () => {
      it('should provide global loading state and actions', () => {
        const { result } = renderHook(() => useGlobalLoading())

        expect(result.current.isGlobalLoading).toBe(false)

        act(() => {
          result.current.setGlobalLoading(true)
        })

        expect(result.current.isGlobalLoading).toBe(true)

        act(() => {
          result.current.setGlobalLoading(false)
        })

        expect(result.current.isGlobalLoading).toBe(false)
      })
    })

    describe('useGlobalError hook', () => {
      it('should provide global error state and actions', () => {
        const { result } = renderHook(() => useGlobalError())

        expect(result.current.globalError).toBeNull()
        expect(result.current.hasGlobalError).toBe(false)

        const testError = new Error('Global error')

        act(() => {
          result.current.setGlobalError(testError)
        })

        expect(result.current.globalError).toBe(testError)
        expect(result.current.hasGlobalError).toBe(true)

        act(() => {
          result.current.clearGlobalError()
        })

        expect(result.current.globalError).toBeNull()
        expect(result.current.hasGlobalError).toBe(false)
      })

      it('should handle string global errors', () => {
        const { result } = renderHook(() => useGlobalError())

        act(() => {
          result.current.setGlobalError('String global error')
        })

        expect(result.current.globalError).toBe('String global error')
        expect(result.current.hasGlobalError).toBe(true)
      })
    })

    describe('useLoadingBar hook', () => {
      it('should provide loading bar state and actions', () => {
        const { result } = renderHook(() => useLoadingBar())

        expect(result.current.isVisible).toBe(false)
        expect(result.current.progress).toBe(0)
        expect(result.current.message).toBeUndefined()

        act(() => {
          result.current.showLoadingBar(25, 'Loading...')
        })

        expect(result.current.isVisible).toBe(true)
        expect(result.current.progress).toBe(25)
        expect(result.current.message).toBe('Loading...')

        act(() => {
          result.current.setLoadingBarProgress(75, 'Almost done...')
        })

        expect(result.current.progress).toBe(75)
        expect(result.current.message).toBe('Almost done...')

        act(() => {
          result.current.hideLoadingBar()
        })

        expect(result.current.isVisible).toBe(false)
        expect(result.current.progress).toBe(0)
        expect(result.current.message).toBeUndefined()
      })
    })
  })

  describe('useAsyncOperation hook', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.restoreAllMocks()
      vi.useRealTimers()
    })

    it('should handle successful async operations', async () => {
      const key = 'test-async'
      const mockOperation = vi.fn().mockResolvedValue('success')
      
      const { result } = renderHook(() => useAsyncOperation(mockOperation, key))

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()

      let executeResult: string | null = null
      await act(async () => {
        executeResult = await result.current.execute()
      })

      expect(executeResult).toBe('success')
      expect(mockOperation).toHaveBeenCalled()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should handle failed async operations', async () => {
      const key = 'test-async-error'
      const testError = new Error('Operation failed')
      const mockOperation = vi.fn().mockRejectedValue(testError)
      
      const { result } = renderHook(() => useAsyncOperation(mockOperation, key))

      await act(async () => {
        const executeResult = await result.current.execute()
        expect(executeResult).toBeNull()
      })

      expect(result.current.error).toBe(testError)
      expect(result.current.isLoading).toBe(false)
    })

    it('should handle non-Error exceptions', async () => {
      const key = 'test-async-string-error'
      const mockOperation = vi.fn().mockRejectedValue('String error')
      
      const { result } = renderHook(() => useAsyncOperation(mockOperation, key))

      await act(async () => {
        await result.current.execute()
      })

      expect(result.current.error).toBeInstanceOf(Error)
      expect((result.current.error as Error).message).toBe('String error')
    })

    it('should track progress when enabled', async () => {
      const key = 'test-async-progress'
      const mockOperation = vi.fn().mockResolvedValue('success')
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, key, { trackProgress: true })
      )

      expect(result.current.progress).toBe(0)

      await act(async () => {
        await result.current.execute()
      })

      expect(result.current.progress).toBe(100)

      // Fast-forward timers to clear progress
      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(result.current.progress).toBe(0)
    })

    it('should call onSuccess callback', async () => {
      const key = 'test-async-success'
      const mockOperation = vi.fn().mockResolvedValue('success')
      const onSuccess = vi.fn()
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, key, { onSuccess })
      )

      await act(async () => {
        await result.current.execute()
      })

      expect(onSuccess).toHaveBeenCalledWith('success')
    })

    it('should call onError callback', async () => {
      const key = 'test-async-error-callback'
      const testError = new Error('Operation failed')
      const mockOperation = vi.fn().mockRejectedValue(testError)
      const onError = vi.fn()
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, key, { onError })
      )

      await act(async () => {
        await result.current.execute()
      })

      expect(onError).toHaveBeenCalledWith(testError)
    })

    it('should call onFinally callback', async () => {
      const key = 'test-async-finally'
      const mockOperation = vi.fn().mockResolvedValue('success')
      const onFinally = vi.fn()
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, key, { onFinally })
      )

      await act(async () => {
        await result.current.execute()
      })

      expect(onFinally).toHaveBeenCalled()
    })

    it('should call onFinally even on error', async () => {
      const key = 'test-async-finally-error'
      const mockOperation = vi.fn().mockRejectedValue(new Error('Failed'))
      const onFinally = vi.fn()
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, key, { onFinally })
      )

      await act(async () => {
        await result.current.execute()
      })

      expect(onFinally).toHaveBeenCalled()
    })

    it('should update progress manually', async () => {
      const key = 'test-async-manual-progress'
      const mockOperation = vi.fn().mockResolvedValue('success')
      const onProgress = vi.fn()
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, key, { trackProgress: true, onProgress })
      )

      act(() => {
        result.current.updateProgress(50)
      })

      expect(result.current.progress).toBe(50)
      expect(onProgress).toHaveBeenCalledWith(50)
    })

    it('should not update progress when trackProgress is false', () => {
      const key = 'test-async-no-progress'
      const mockOperation = vi.fn().mockResolvedValue('success')
      const onProgress = vi.fn()
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, key, { trackProgress: false, onProgress })
      )

      act(() => {
        result.current.updateProgress(50)
      })

      expect(result.current.progress).toBe(0)
      expect(onProgress).not.toHaveBeenCalled()
    })

    it('should clear all states', () => {
      const key = 'test-async-clear'
      const mockOperation = vi.fn().mockResolvedValue('success')
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, key, { trackProgress: true })
      )

      // Set some states
      act(() => {
        useLoadingStore.getState().setLoading(key, true)
        useLoadingStore.getState().setError(key, 'Error')
        useLoadingStore.getState().setProgress(key, 50)
      })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.error).toBe('Error')
      expect(result.current.progress).toBe(50)

      act(() => {
        result.current.clear()
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.progress).toBe(0)
    })

    it('should clear error independently', () => {
      const key = 'test-async-clear-error'
      const mockOperation = vi.fn().mockResolvedValue('success')
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, key)
      )

      // Set error
      act(() => {
        useLoadingStore.getState().setError(key, 'Error')
      })

      expect(result.current.error).toBe('Error')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })

    it('should pass arguments to operation', async () => {
      const key = 'test-async-args'
      const mockOperation = vi.fn().mockResolvedValue('success')
      
      const { result } = renderHook(() => 
        useAsyncOperation(mockOperation, key)
      )

      await act(async () => {
        await result.current.execute('arg1', 'arg2', 123)
      })

      expect(mockOperation).toHaveBeenCalledWith('arg1', 'arg2', 123)
    })
  })
})
