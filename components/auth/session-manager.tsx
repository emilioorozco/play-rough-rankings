'use client'

import { useEffect } from 'react'
import { useSession } from './session-provider'
import { useRouter, usePathname } from 'next/navigation'

export function SessionManager() {
  const { user, isLoading } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Redirect authenticated users away from login page
    if (!isLoading && user && pathname === '/login') {
      router.push('/dashboard')
    }
  }, [user, isLoading, pathname, router])

  // This component doesn't render anything, it just manages session state
  return null
}

// Hook for checking if user has required role
export function useRequiredRole(requiredRole: 'player' | 'organizer' | 'admin') {
  const { user } = useSession()
  
  const roleHierarchy = {
    player: 0,
    organizer: 1,
    admin: 2,
  }

  const userRoleLevel = roleHierarchy[user?.role as keyof typeof roleHierarchy] ?? -1
  const requiredRoleLevel = roleHierarchy[requiredRole]

  return {
    hasRole: userRoleLevel >= requiredRoleLevel,
    userRole: user?.role,
    requiredRole,
  }
}

// Hook for role-based conditional rendering
export function useRoleAccess() {
  const { user } = useSession()
  
  return {
    isPlayer: user?.role === 'player',
    isOrganizer: user?.role === 'organizer' || user?.role === 'admin',
    isAdmin: user?.role === 'admin',
    hasRole: (role: string) => user?.role === role,
    hasAnyRole: (roles: string[]) => roles.includes(user?.role || ''),
  }
}