import { create } from 'zustand'
import { useSession } from '@/components/auth/session-provider'
import { checkTournamentManagementPermission } from '@/lib/tournament/authorization-constants'

// Types for role hierarchy
type UserRole = 'player' | 'organizer' | 'admin'

interface RoleHierarchy {
  player: number
  organizer: number
  admin: number
}

interface AuthState {
  // Role hierarchy for permission checking
  roleHierarchy: RoleHierarchy
  
  // Actions for role checking
  hasRole: (userRole: string | undefined, requiredRole: UserRole) => boolean
  hasAnyRole: (userRole: string | undefined, roles: UserRole[]) => boolean
  getUserRoleLevel: (userRole: string | undefined) => number
  getRequiredRoleLevel: (requiredRole: UserRole) => number
}

// Create the auth store
export const useAuthStore = create<AuthState>((set, get) => ({
  // Role hierarchy - higher numbers have more permissions
  roleHierarchy: {
    player: 0,
    organizer: 1,
    admin: 2,
  },

  // Check if user has required role or higher
  hasRole: (userRole, requiredRole) => {
    const { getUserRoleLevel, getRequiredRoleLevel } = get()
    const userRoleLevel = getUserRoleLevel(userRole)
    const requiredRoleLevel = getRequiredRoleLevel(requiredRole)
    return userRoleLevel >= requiredRoleLevel
  },

  // Check if user has any of the specified roles
  hasAnyRole: (userRole, roles) => {
    const { hasRole } = get()
    return roles.some(role => hasRole(userRole, role))
  },

  // Get numeric level for user role
  getUserRoleLevel: (userRole) => {
    const { roleHierarchy } = get()
    return roleHierarchy[userRole as keyof RoleHierarchy] ?? -1
  },

  // Get numeric level for required role
  getRequiredRoleLevel: (requiredRole) => {
    const { roleHierarchy } = get()
    return roleHierarchy[requiredRole]
  },
}))

// Hook for checking if user has required role
export function useRequiredRole(requiredRole: UserRole) {
  const { user } = useSession()
  const { hasRole, getUserRoleLevel, getRequiredRoleLevel } = useAuthStore()
  
  const userRoleLevel = getUserRoleLevel(user?.role)
  const requiredRoleLevel = getRequiredRoleLevel(requiredRole)

  return {
    hasRole: hasRole(user?.role, requiredRole),
    userRole: user?.role,
    requiredRole,
    userRoleLevel,
    requiredRoleLevel,
  }
}

// Hook for role-based conditional rendering
export function useRoleAccess() {
  const { user } = useSession()
  const { hasRole, hasAnyRole } = useAuthStore()
  
  return {
    isPlayer: user?.role === 'player',
    isOrganizer: hasRole(user?.role, 'organizer'),
    isAdmin: hasRole(user?.role, 'admin'),
    hasRole: (role: UserRole) => hasRole(user?.role, role),
    hasAnyRole: (roles: UserRole[]) => hasAnyRole(user?.role, roles),
    userRole: user?.role,
  }
}

/**
 * Hook for permission-based rendering (CLIENT-SIDE)
 * 
 * This hook provides permission checks for React components.
 * It uses the shared authorization logic from `authorization-constants.ts`
 * to ensure consistency with server-side authorization.
 * 
 * **When to use this:**
 * - In React components for conditional rendering
 * - In client-side navigation guards
 * - In UI state management
 * 
 * **When NOT to use this:**
 * - In tRPC procedures (use `canManageTournament()` from `lib/tournament/authorization.ts`)
 * - In server-side API routes
 * - For actual authorization enforcement (always validate on server)
 * 
 * @example
 * ```typescript
 * function TournamentPage({ tournament }) {
 *   const { canManageTournament } = usePermissions()
 *   
 *   const canManage = canManageTournament(tournament.organizer?.id)
 *   
 *   return (
 *     <div>
 *       {canManage && <ManagementPanel />}
 *     </div>
 *   )
 * }
 * ```
 */
export function usePermissions() {
  const { user } = useSession()
  const { hasRole, hasAnyRole } = useAuthStore()
  
  return {
    // Tournament permissions
    canCreateTournament: hasRole(user?.role, 'organizer'),
    /**
     * Check if current user can manage a tournament (CLIENT-SIDE)
     * 
     * Uses shared authorization logic to match server-side behavior.
     * This is for UI rendering only - server always validates permissions.
     * 
     * @param organizerId - ID of the tournament organizer
     * @returns true if user can manage the tournament
     */
    canManageTournament: (organizerId?: string) => 
      checkTournamentManagementPermission(user?.id, user?.role, organizerId),
    canViewTournament: true, // Everyone can view tournaments
    
    // User management permissions
    canManageUsers: hasRole(user?.role, 'admin'),
    canViewUserProfiles: true, // Everyone can view profiles
    
    // Store management permissions
    canManageStores: hasRole(user?.role, 'admin'),
    canCreateStores: hasRole(user?.role, 'admin'),
    
    // Leaderboard permissions
    canViewLeaderboards: true, // Everyone can view leaderboards
    canManageLeaderboards: hasRole(user?.role, 'admin'),
    
    // General permissions
    isAuthenticated: !!user,
    isGuest: !user,
  }
}
