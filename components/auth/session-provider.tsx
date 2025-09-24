'use client'

import { createContext, useContext } from 'react'
import { authClient, useSession as useBetterAuthSession } from '@/lib/auth-client'
import type { User as BaseUser } from '@/lib/auth'

// Extend the User type to ensure role is included
type User = BaseUser & { 
  role: string
}

interface SessionContextType {
  user: User | null
  isLoading: boolean
  signIn: typeof authClient.signIn
  signOut: typeof authClient.signOut
  signUp: typeof authClient.signUp
  updateSession: () => Promise<void>
  refetch: () => Promise<void>
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  // Use Better Auth's useSession hook directly
  const sessionResponse = useBetterAuthSession()
  const session = sessionResponse?.data ?? null
  const isPending = sessionResponse?.isPending ?? false
  const refetch = sessionResponse?.refetch ?? (async () => {})
  
  // Transform the session data to match our expected interface
  const user = session?.user ? {
    ...session.user,
    role: (session.user as Record<string, unknown>).role as string || 'player',
  } : null

  // Provide a refetch function that matches the old interface
  const updateSession = async () => {
    await refetch()
  }

  return (
    <SessionContext.Provider
      value={{
        user,
        isLoading: isPending,
        signIn: authClient.signIn,
        signOut: authClient.signOut,
        signUp: authClient.signUp,
        updateSession,
        refetch: updateSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}