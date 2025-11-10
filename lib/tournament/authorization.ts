/**
 * Tournament Lifecycle Management - Authorization Utilities
 * 
 * This file contains authorization helper functions for tournament management
 * operations, ensuring proper access control based on user roles and ownership.
 */

import type { UserRole } from './types'

/**
 * Tournament data structure for authorization checks
 */
interface TournamentAuthData {
  /** ID of the tournament organizer */
  organizerId: string
  /** Current status of the tournament */
  status?: string
}

/**
 * Check if a user can manage a tournament
 * 
 * A user can manage a tournament if they are:
 * - An admin (can manage any tournament)
 * - The tournament organizer (can manage their own tournaments)
 * 
 * @param userId - ID of the user attempting to manage the tournament
 * @param userRole - Role of the user (player, organizer, admin)
 * @param tournament - Tournament data containing organizer information
 * @returns true if the user can manage the tournament, false otherwise
 * 
 * @example
 * ```typescript
 * const canManage = canManageTournament(
 *   userId,
 *   'organizer',
 *   { organizerId: 'org-123', status: 'ACTIVE' }
 * )
 * if (!canManage) {
 *   throw new TRPCError({ code: 'FORBIDDEN' })
 * }
 * ```
 */
export function canManageTournament(
  userId: string,
  userRole: UserRole,
  tournament: TournamentAuthData
): boolean {
  // Admins can manage any tournament
  if (userRole === 'admin') {
    return true
  }

  // Tournament organizer can manage their own tournament
  if (tournament.organizerId === userId) {
    return true
  }

  // All other cases: no permission
  return false
}

/**
 * Check if a user can view tournament management features
 * 
 * This is a more permissive check than canManageTournament, allowing
 * organizers to view management interfaces even if they don't own the tournament.
 * 
 * @param userId - ID of the user attempting to view management features
 * @param userRole - Role of the user (player, organizer, admin)
 * @param tournament - Tournament data containing organizer information
 * @returns true if the user can view management features, false otherwise
 */
export function canViewTournamentManagement(
  userId: string,
  userRole: UserRole,
  tournament: TournamentAuthData
): boolean {
  // Admins can view any tournament management
  if (userRole === 'admin') {
    return true
  }

  // Organizers can view management features (but may not be able to modify)
  if (userRole === 'organizer') {
    return true
  }

  // Players cannot view management features
  return false
}

/**
 * Check if a user can submit match results as a player
 * 
 * @param userId - ID of the user attempting to submit results
 * @param player1Id - ID of player 1 in the match
 * @param player2Id - ID of player 2 in the match
 * @returns true if the user is one of the players in the match
 */
export function canSubmitMatchResult(
  userId: string,
  player1Id: string,
  player2Id: string
): boolean {
  return userId === player1Id || userId === player2Id
}

/**
 * Check if a user can drop from a tournament
 * 
 * A user can drop if they are:
 * - The player themselves
 * - The tournament organizer
 * - An admin
 * 
 * @param userId - ID of the user attempting to drop a player
 * @param userRole - Role of the user
 * @param playerId - ID of the player being dropped
 * @param tournament - Tournament data containing organizer information
 * @returns true if the user can drop the player
 */
export function canDropPlayer(
  userId: string,
  userRole: UserRole,
  playerId: string,
  tournament: TournamentAuthData
): boolean {
  // Admins can drop any player
  if (userRole === 'admin') {
    return true
  }

  // Tournament organizer can drop any player from their tournament
  if (tournament.organizerId === userId) {
    return true
  }

  // Players can drop themselves
  if (userId === playerId) {
    return true
  }

  return false
}

/**
 * Check if a user has organizer or admin privileges
 * 
 * @param userRole - Role of the user
 * @returns true if the user is an organizer or admin
 */
export function isOrganizerOrAdmin(userRole: UserRole): boolean {
  return userRole === 'organizer' || userRole === 'admin'
}

/**
 * Check if a user is an admin
 * 
 * @param userRole - Role of the user
 * @returns true if the user is an admin
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === 'admin'
}
