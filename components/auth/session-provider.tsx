'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import type { User as BaseUser } from '@/lib/auth'

// Extend the User type to ensure role is included
type User = BaseUser & { role: string }

interface SessionContextType {
  user: User | null
  isLoading: boolean
  signIn: typeof authClient.signIn
  signOut: typeof authClient.signOut
  signUp: typeof authClient.signUp
  updateSession: () => Promise<void>
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const updateSession = async () => {
    try {
      const session = await authClient.getSession()
      const baseUser = session?.data?.user
      if (baseUser) {
        // Ensure user has role property, default to 'player' if missing
        const user: User = {
          ...baseUser,
          role: (baseUser as Record<string, unknown>).role as string || 'player'
        }
        setUser(user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Failed to update session:', error)
      setUser(null)
    }
  }

  useEffect(() => {
    // Get initial session
    updateSession().finally(() => setIsLoading(false))

    // Listen for auth state changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'better-auth.session-token') {
        updateSession()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const handleSignOut = async () => {
    try {
      const result = await authClient.signOut()
      setUser(null)
      return result
    } catch (error) {
      console.error('Sign out failed:', error)
      throw error
    }
  }

  return (
    <SessionContext.Provider
      value={{
        user,
        isLoading,
        signIn: authClient.signIn,
        signOut: handleSignOut as typeof authClient.signOut,
        signUp: authClient.signUp,
        updateSession,
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