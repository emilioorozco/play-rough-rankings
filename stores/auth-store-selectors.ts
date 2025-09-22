import { useAuthStore } from './auth-store'
import { useSession } from '@/components/auth/session-provider'

// Selector for role checking
export const useAuthRoleSelectors = () => {
  const { hasRole, hasAnyRole, getUserRoleLevel, getRequiredRoleLevel } = useAuthStore()
  const { user } = useSession()
  
  return {
    hasRole: (requiredRole: 'player' | 'organizer' | 'admin') => 
      hasRole(user?.role, requiredRole),
    hasAnyRole: (roles: ('player' | 'organizer' | 'admin')[]) => 
      hasAnyRole(user?.role, roles),
    getUserRoleLevel: () => getUserRoleLevel(user?.role),
    getRequiredRoleLevel: (requiredRole: 'player' | 'organizer' | 'admin') => 
      getRequiredRoleLevel(requiredRole),
    userRole: user?.role,
  }
}

// Selector for permission checking
export const useAuthPermissionSelectors = () => {
  const { user } = useSession()
  const { hasRole } = useAuthStore()
  
  return {
    // Tournament permissions
    canCreateTournament: hasRole(user?.role, 'organizer'),
    canManageTournament: (organizerId?: string) => 
      hasRole(user?.role, 'admin') || (user?.id === organizerId),
    canViewTournament: true,
    
    // User management permissions
    canManageUsers: hasRole(user?.role, 'admin'),
    canViewUserProfiles: true,
    
    // Store management permissions
    canManageStores: hasRole(user?.role, 'admin'),
    canCreateStores: hasRole(user?.role, 'admin'),
    
    // Leaderboard permissions
    canViewLeaderboards: true,
    canManageLeaderboards: hasRole(user?.role, 'admin'),
    
    // General permissions
    isAuthenticated: !!user,
    isGuest: !user,
  }
}

// Selector for role-based UI state
export const useAuthUISelectors = () => {
  const { user } = useSession()
  const { hasRole } = useAuthStore()
  
  return {
    isPlayer: user?.role === 'player',
    isOrganizer: hasRole(user?.role, 'organizer'),
    isAdmin: hasRole(user?.role, 'admin'),
    userRole: user?.role,
    userId: user?.id,
    userEmail: user?.email,
    userName: user?.name,
  }
}
