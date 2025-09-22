import { create } from 'zustand'
import { useSession } from '@/components/auth/session-provider'

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

// Hook for permission-based rendering
export function usePermissions() {
  const { user } = useSession()
  const { hasRole, hasAnyRole } = useAuthStore()
  
  return {
    // Tournament permissions
    canCreateTournament: hasRole(user?.role, 'organizer'),
    canManageTournament: (organizerId?: string) => 
      hasRole(user?.role, 'admin') || (user?.id === organizerId),
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
