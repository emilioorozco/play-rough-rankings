import { useSession } from '@/components/auth/session-provider'
import { trpc } from '@/lib/trpc/client'
import { useLoading, useError } from '@/stores/loading-store'
import { useEffect } from 'react'

/**
 * Enhanced tRPC query hook with integrated loading and error state management
 */
export function useTRPCQueryWithLoading<TData = unknown, TError = unknown>(
  queryKey: string,
  queryFn: () => any,
  options?: {
    enabled?: boolean
    refetchOnWindowFocus?: boolean
    staleTime?: number
    onSuccess?: (data: TData) => void
    onError?: (error: TError) => void
  }
) {
  const { user, isLoading: authLoading } = useSession()
  const { isLoading: storeLoading, setLoading } = useLoading(queryKey)
  const { error: storeError, setError, clearError } = useError(queryKey)
  
  // Disable query if user is not authenticated
  const isAuthenticated = !!user && !authLoading
  const shouldEnable = isAuthenticated && (options?.enabled !== false)
  
  const query = queryFn()
  
  // Sync loading state with store
  useEffect(() => {
    if (query.isLoading !== storeLoading) {
      setLoading(query.isLoading)
    }
  }, [query.isLoading, storeLoading]) // Removed setLoading to prevent infinite loops
  
  // Sync error state with store
  useEffect(() => {
    if (query.error && !storeError) {
      setError(query.error)
    } else if (!query.error && storeError) {
      clearError()
    }
  }, [query.error, storeError]) // Removed function references to prevent infinite loops
  
  // Handle success callback
  useEffect(() => {
    if (query.data && options?.onSuccess) {
      options.onSuccess(query.data)
    }
  }, [query.data, options?.onSuccess])
  
  // Handle error callback
  useEffect(() => {
    if (query.error && options?.onError) {
      options.onError(query.error)
    }
  }, [query.error, options?.onError])
  
  return {
    ...query,
    isLoading: authLoading || query.isLoading,
    isAuthenticated,
    enabled: shouldEnable,
    // Override refetch to clear errors
    refetch: () => {
      clearError()
      return query.refetch()
    },
  }
}

/**
 * Enhanced tRPC mutation hook with integrated loading and error state management
 */
export function useTRPCMutationWithLoading<TData = unknown, TError = unknown, TVariables = unknown>(
  mutationKey: string,
  mutationFn: () => any,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void
    onError?: (error: TError, variables: TVariables) => void
    onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables) => void
  }
) {
  const { user, isLoading: authLoading } = useSession()
  const { isLoading: storeLoading, setLoading } = useLoading(mutationKey)
  const { error: storeError, setError, clearError } = useError(mutationKey)
  
  const isAuthenticated = !!user && !authLoading
  const mutation = mutationFn()
  
  // Sync loading state with store
  useEffect(() => {
    if (mutation.isLoading !== storeLoading) {
      setLoading(mutation.isLoading)
    }
  }, [mutation.isLoading, storeLoading, setLoading])
  
  // Sync error state with store
  useEffect(() => {
    if (mutation.error && !storeError) {
      setError(mutation.error)
    } else if (!mutation.error && storeError) {
      clearError()
    }
  }, [mutation.error, storeError, setError, clearError])
  
  const enhancedMutation = {
    ...mutation,
    isAuthenticated,
    mutate: (variables: TVariables, mutationOptions?: any) => {
      if (!isAuthenticated) {
        setError('Authentication required')
        return
      }
      
      clearError()
      return mutation.mutate(variables, {
        ...mutationOptions,
        onSuccess: (data: TData, variables: TVariables, context: any) => {
          options?.onSuccess?.(data, variables)
          mutationOptions?.onSuccess?.(data, variables, context)
        },
        onError: (error: TError, variables: TVariables, context: any) => {
          options?.onError?.(error, variables)
          mutationOptions?.onError?.(error, variables, context)
        },
        onSettled: (data: TData | undefined, error: TError | null, variables: TVariables, context: any) => {
          options?.onSettled?.(data, error, variables)
          mutationOptions?.onSettled?.(data, error, variables, context)
        },
      })
    },
    mutateAsync: async (variables: TVariables, mutationOptions?: any) => {
      if (!isAuthenticated) {
        const error = new Error('Authentication required')
        setError(error)
        throw error
      }
      
      clearError()
      return mutation.mutateAsync(variables, {
        ...mutationOptions,
        onSuccess: (data: TData, variables: TVariables, context: any) => {
          options?.onSuccess?.(data, variables)
          mutationOptions?.onSuccess?.(data, variables, context)
        },
        onError: (error: TError, variables: TVariables, context: any) => {
          options?.onError?.(error, variables)
          mutationOptions?.onError?.(error, variables, context)
        },
        onSettled: (data: TData | undefined, error: TError | null, variables: TVariables, context: any) => {
          options?.onSettled?.(data, error, variables)
          mutationOptions?.onSettled?.(data, error, variables, context)
        },
      })
    },
  }
  
  return enhancedMutation
}

/**
 * Hook for managing multiple related queries with shared loading/error states
 */
export function useTRPCQueriesWithLoading<T extends Record<string, () => any>>(
  queries: T,
  options?: {
    enabled?: boolean
    onAllSuccess?: (results: { [K in keyof T]: any }) => void
    onAnyError?: (errors: { [K in keyof T]?: any }) => void
  }
) {
  const { user, isLoading: authLoading } = useSession()
  const isAuthenticated = !!user && !authLoading
  const shouldEnable = isAuthenticated && (options?.enabled !== false)
  
  const results = {} as { [K in keyof T]: ReturnType<T[K]> }
  let allLoading = false
  let anyError: any = null
  let allData: any = {}
  
  // Execute all queries
  for (const [key, queryFn] of Object.entries(queries)) {
    const query = queryFn()
    results[key as keyof T] = query
    
    if (query.isLoading) {
      allLoading = true
    }
    
    if (query.error) {
      anyError = query.error
    }
    
    if (query.data) {
      allData[key] = query.data
    }
  }
  
  // Handle callbacks
  useEffect(() => {
    if (!allLoading && !anyError && Object.keys(allData).length === Object.keys(queries).length) {
      options?.onAllSuccess?.(allData)
    }
  }, [allLoading, anyError, allData, options?.onAllSuccess])
  
  useEffect(() => {
    if (anyError) {
      const errors = {} as { [K in keyof T]?: any }
      for (const [key, query] of Object.entries(results)) {
        if (query.error) {
          errors[key as keyof T] = query.error
        }
      }
      options?.onAnyError?.(errors)
    }
  }, [anyError, results, options?.onAnyError])
  
  return {
    ...results,
    isLoading: allLoading,
    isAuthenticated,
    enabled: shouldEnable,
    hasError: !!anyError,
    error: anyError,
    // Refetch all queries
    refetchAll: () => {
      return Promise.all(Object.values(results).map(query => query.refetch()))
    },
  }
}
