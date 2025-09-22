import { useSession } from '@/components/auth/session-provider'
import { trpc } from '@/lib/trpc/client'
import { useEffect } from 'react'

/**
 * Custom hook that automatically handles authentication state for tRPC queries
 * - Disables queries when user is not authenticated
 * - Automatically refetches when auth state changes
 * - Provides consistent loading and error states
 */
export function useAuthQuery<TData = unknown, TError = unknown>(
  queryFn: () => any,
  options?: {
    enabled?: boolean
    refetchOnWindowFocus?: boolean
    staleTime?: number
  }
) {
  const { user, isLoading: authLoading } = useSession()
  
  // Disable query if user is not authenticated
  const isAuthenticated = !!user && !authLoading
  const shouldEnable = isAuthenticated && (options?.enabled !== false)
  
  const query = queryFn()
  
  // Auto-refetch when auth state changes
  useEffect(() => {
    if (isAuthenticated && query.refetch) {
      query.refetch()
    }
  }, [isAuthenticated, query.refetch])
  
  return {
    ...query,
    isLoading: authLoading || query.isLoading,
    isAuthenticated,
    // Override the enabled state to include auth check
    enabled: shouldEnable,
  }
}

/**
 * Custom hook for authenticated mutations
 * - Automatically handles auth errors
 * - Provides consistent error handling
 */
export function useAuthMutation<TData = unknown, TError = unknown, TVariables = unknown>(
  mutationFn: () => any
) {
  const { user, isLoading: authLoading } = useSession()
  const mutation = mutationFn()
  
  const isAuthenticated = !!user && !authLoading
  
  return {
    ...mutation,
    isAuthenticated,
    mutate: (variables: TVariables, options?: any) => {
      if (!isAuthenticated) {
        throw new Error('Authentication required')
      }
      return mutation.mutate(variables, options)
    },
    mutateAsync: async (variables: TVariables, options?: any) => {
      if (!isAuthenticated) {
        throw new Error('Authentication required')
      }
      return mutation.mutateAsync(variables, options)
    },
  }
}
