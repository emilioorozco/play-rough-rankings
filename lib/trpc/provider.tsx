'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { useState, useEffect } from 'react'
import { trpc } from './client'
import { useSession } from '@/components/auth/session-provider'

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useSession()
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Disable automatic refetching on window focus for better UX
        refetchOnWindowFocus: false,
        // Cache queries for 5 minutes by default
        staleTime: 5 * 60 * 1000,
        // Retry failed requests up to 3 times
        retry: (failureCount, error: any) => {
          // Don't retry auth errors
          if (error?.data?.code === 'UNAUTHORIZED' || error?.data?.code === 'FORBIDDEN') {
            return false
          }
          return failureCount < 3
        },
      },
      mutations: {
        // Retry mutations once on network errors
        retry: (failureCount, error: any) => {
          if (error?.data?.code === 'UNAUTHORIZED' || error?.data?.code === 'FORBIDDEN') {
            return false
          }
          return failureCount < 1
        },
      },
    },
  }))
  
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          // Add auth headers automatically
          headers: async () => {
            // Headers are handled by Better Auth automatically
            return {}
          },
        }),
      ],
    })
  )

  // Invalidate all queries when auth state changes
  useEffect(() => {
    if (!authLoading) {
      // Only invalidate queries when user actually changes (login/logout)
      // Not on every auth state update
      queryClient.invalidateQueries()
    }
  }, [user?.id, authLoading, queryClient]) // Only depend on user.id, not the entire user object

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  )
}