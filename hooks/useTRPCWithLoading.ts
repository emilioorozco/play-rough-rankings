import React, { useCallback, useMemo } from 'react'
import { useLoadingStore } from '@/stores/loading-store'
import { 
  type TRPCClientError
} from '@trpc/react-query'
import type { AppRouter } from '@/lib/trpc/server'

// Generic types for TRPC hooks
type AnyTRPCQuery = () => any
type AnyTRPCMutation = () => any

// Options for TRPC query with loading
export interface TRPCQueryWithLoadingOptions {
  enabled?: boolean
  onError?: (error: TRPCClientError<AppRouter>) => void
  onSuccess?: (data: any) => void
}

// Options for TRPC mutation with loading  
export interface TRPCMutationWithLoadingOptions {
  onError?: (error: TRPCClientError<AppRouter>) => void
  onSuccess?: (data: any) => void
}

/**
 * Wraps a TRPC query with loading state management
 * Integrates with the UI store to track loading states globally
 */
export function useTRPCQueryWithLoading(
  loadingKey: string,
  queryHook: AnyTRPCQuery,
  options: TRPCQueryWithLoadingOptions = {}
) {
  const setLoading = useLoadingStore((state) => state.setLoading)
  const clearLoading = useLoadingStore((state) => state.clearLoading)

  const query = queryHook()

  // Update global loading state when query loading state changes
  React.useEffect(() => {
    if (query.isLoading) {
      setLoading(loadingKey, true)
    } else {
      clearLoading(loadingKey)
    }
  }, [query.isLoading, loadingKey, setLoading, clearLoading])

  // Handle success/error callbacks
  React.useEffect(() => {
    if (query.isSuccess && query.data && options.onSuccess) {
      options.onSuccess(query.data)
    }
  }, [query.isSuccess, query.data, options])

  React.useEffect(() => {
    if (query.isError && query.error && options.onError) {
      options.onError(query.error)
    }
  }, [query.isError, query.error, options])

  // Cleanup loading state on unmount
  React.useEffect(() => {
    return () => {
      clearLoading(loadingKey)
    }
  }, [loadingKey, clearLoading])

  return useMemo(() => ({
    ...query,
    isLoading: query.isLoading,
    error: query.error,
    data: query.data,
  }), [query])
}

/**
 * Wraps a TRPC mutation with loading state management
 * Integrates with the UI store to track loading states globally
 */
export function useTRPCMutationWithLoading(
  loadingKey: string,
  mutationHook: AnyTRPCMutation,
  options: TRPCMutationWithLoadingOptions = {}
) {
  const setLoading = useLoadingStore((state) => state.setLoading)
  const clearLoading = useLoadingStore((state) => state.clearLoading)

  const mutation = mutationHook()

  // Update global loading state when mutation loading state changes
  React.useEffect(() => {
    if (mutation.isLoading) {
      setLoading(loadingKey, true)
    } else {
      clearLoading(loadingKey)
    }
  }, [mutation.isLoading, loadingKey, setLoading, clearLoading])

  // Handle success/error callbacks
  React.useEffect(() => {
    if (mutation.isSuccess && mutation.data && options.onSuccess) {
      options.onSuccess(mutation.data)
    }
  }, [mutation.isSuccess, mutation.data, options])

  React.useEffect(() => {
    if (mutation.isError && mutation.error && options.onError) {
      options.onError(mutation.error)
    }
  }, [mutation.isError, mutation.error, options])

  // Cleanup loading state on unmount
  React.useEffect(() => {
    return () => {
      clearLoading(loadingKey)
    }
  }, [loadingKey, clearLoading])

  // Enhanced mutateAsync that manages loading state
  const mutateAsync = useCallback(async (variables: any) => {
    try {
      setLoading(loadingKey, true)
      const result = await mutation.mutateAsync(variables)
      clearLoading(loadingKey)
      return result
    } catch (error) {
      clearLoading(loadingKey)
      throw error
    }
  }, [mutation, loadingKey, setLoading, clearLoading])

  // Enhanced mutate that manages loading state  
  const mutate = useCallback((variables: any, options?: any) => {
    setLoading(loadingKey, true)
    
    const originalOnSuccess = options?.onSuccess
    const originalOnError = options?.onError
    const originalOnSettled = options?.onSettled

    return mutation.mutate(variables, {
      ...options,
      onSuccess: (data: any, variables: any, context: any) => {
        clearLoading(loadingKey)
        originalOnSuccess?.(data, variables, context)
      },
      onError: (error: any, variables: any, context: any) => {
        clearLoading(loadingKey)
        originalOnError?.(error, variables, context)
      },
      onSettled: (data: any, error: any, variables: any, context: any) => {
        clearLoading(loadingKey)
        originalOnSettled?.(data, error, variables, context)
      }
    })
  }, [mutation, loadingKey, setLoading, clearLoading])

  return useMemo(() => ({
    ...mutation,
    mutate,
    mutateAsync,
    isLoading: mutation.isLoading,
    error: mutation.error,
    data: mutation.data,
  }), [mutation, mutate, mutateAsync])
}