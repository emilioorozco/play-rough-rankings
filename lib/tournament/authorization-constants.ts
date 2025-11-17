/**
 * Tournament Authorization Constants
 * 
 * Shared authorization rules and constants used by both client-side and server-side
 * authorization implementations. This ensures consistency across the application.
 * 
 * @module authorization-constants
 */

/**
 * User role type definition
 * Represents the three role levels in the application hierarchy
 */
export type UserRole = 'player' | 'organizer' | 'admin'

/**
 * Authorization rule: Who can manage tournaments
 * 
 * A user can manage a tournament if they meet ANY of these conditions:
 * 1. User has 'admin' role (can manage any tournament)
 * 2. User is the tournament organizer (organizerId matches userId)
 * 
 * This rule is used by both:
 * - Server-side: lib/tournament/authorization.ts (for tRPC procedures)
 * - Client-side: stores/auth-store.ts (for React component rendering)
 * 
 * @constant
 */
export const TOURNAMENT_MANAGEMENT_RULES = {
  /**
   * Roles that can manage any tournament regardless of ownership
   */
  ADMIN_ROLES: ['admin'] as const,
  
  /**
   * Roles that can manage tournaments they organize
   */
  ORGANIZER_ROLES: ['organizer', 'admin'] as const,
  
  /**
   * Roles that can create tournaments
   */
  CREATOR_ROLES: ['organizer', 'admin'] as const,
} as const

/**
 * Check if a role has admin privileges
 * 
 * @param role - User role to check
 * @returns true if role is admin
 */
export function isAdminRole(role: string | undefined): boolean {
  return role === 'admin'
}

/**
 * Check if a role can organize tournaments
 * 
 * @param role - User role to check
 * @returns true if role is organizer or admin
 */
export function isOrganizerRole(role: string | undefined): boolean {
  return role === 'organizer' || role === 'admin'
}

/**
 * Core authorization logic for tournament management
 * 
 * This function encapsulates the shared business logic for determining
 * if a user can manage a tournament. It is used by both client and server
 * implementations to ensure consistency.
 * 
 * @param userId - ID of the user attempting to manage the tournament
 * @param userRole - Role of the user (player, organizer, admin)
 * @param organizerId - ID of the tournament organizer
 * @returns true if the user can manage the tournament
 * 
 * @example
 * ```typescript
 * // Server-side usage
 * const canManage = checkTournamentManagementPermission(
 *   ctx.user.id,
 *   ctx.user.role,
 *   tournament.organizerId
 * )
 * 
 * // Client-side usage
 * const canManage = checkTournamentManagementPermission(
 *   user?.id,
 *   user?.role,
 *   tournament.organizer?.id
 * )
 * ```
 */
export function checkTournamentManagementPermission(
  userId: string | undefined,
  userRole: string | undefined,
  organizerId: string | undefined
): boolean {
  // Handle null/undefined cases
  if (!userId || !userRole || !organizerId) {
    return false
  }
  
  // Rule 1: Admins can manage any tournament
  if (isAdminRole(userRole)) {
    return true
  }
  
  // Rule 2: Tournament organizer can manage their own tournament
  if (organizerId === userId) {
    return true
  }
  
  // All other cases: no permission
  return false
}
