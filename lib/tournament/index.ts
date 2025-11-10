/**
 * Tournament Lifecycle Management - Main Export File
 * 
 * This file exports all types, interfaces, and utilities for the tournament
 * lifecycle management system, providing a clean API for consumers.
 */

// Export all type definitions
export type {
  MatchSubmission,
  MatchDispute,
  TournamentAuditLog,
  ProjectedRating,
  TournamentAction,
  RatingConfidence,
  TournamentStatus,
  MatchStatus,
  TournamentStructure,
  UserRole,
  Pairing,
  MatchResult,
  TournamentRecord,
  RatingChange,
} from './types'

// Export authorization utilities
export {
  canManageTournament,
  canViewTournamentManagement,
  canSubmitMatchResult,
  canDropPlayer,
  isOrganizerOrAdmin,
  isAdmin,
} from './authorization'

// Export business logic classes
export { AuditLogger } from './audit-logger'
export type { AuditTrailFilters } from './audit-logger'

export { PairingGenerator } from './pairing-generator'

export { TournamentProcessor } from './tournament-processor'
export type { StartTournamentResult } from './tournament-processor'
