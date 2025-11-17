/**
 * Tournament Lifecycle Management - Core Type Definitions
 * 
 * This file contains all TypeScript interfaces and types for the tournament
 * lifecycle management system, including match submissions, disputes, audit logs,
 * and projected ratings.
 */

/**
 * Match submission data structure for player-submitted results
 */
export interface MatchSubmission {
  /** Unique identifier for the match */
  matchId: string
  /** ID of the player submitting the result */
  submittedBy: string
  /** ID of the winning player (null for draws) */
  winnerId: string | null
  /** Number of games won by player 1 */
  player1Score: number
  /** Number of games won by player 2 */
  player2Score: number
  /** Timestamp when the submission was made */
  timestamp: Date
  /** Whether the submission has been confirmed by the opponent */
  confirmed: boolean
}

/**
 * Match dispute data structure when players disagree on results
 */
export interface MatchDispute {
  /** Unique identifier for the match in dispute */
  matchId: string
  /** Player 1's submission of the match result */
  player1Submission: MatchSubmission
  /** Player 2's submission of the match result */
  player2Submission: MatchSubmission
  /** ID of the organizer who resolved the dispute (if resolved) */
  resolvedBy?: string
  /** Final resolution of the dispute */
  resolution?: MatchSubmission
  /** Timestamp when the dispute was resolved */
  resolvedAt?: Date
}

/**
 * Tournament action types for audit logging
 */
export type TournamentAction =
  | 'START'
  | 'ADVANCE_ROUND'
  | 'SUBMIT_MATCH'
  | 'OVERRIDE_MATCH'
  | 'PAUSE'
  | 'RESUME'
  | 'CANCEL'
  | 'COMPLETE'
  | 'PLAYER_DROP'
  | 'ASSIGN_BYE'
  | 'CREATE_MANUAL_PAIRING'
  | 'UPDATE_MANUAL_PAIRING'
  | 'DELETE_MANUAL_PAIRING'
  | 'RESOLVE_DISPUTE'

/**
 * Audit log entry for tournament actions
 */
export interface TournamentAuditLog {
  /** Unique identifier for the audit log entry */
  id: string
  /** ID of the tournament this action belongs to */
  tournamentId: string
  /** Type of action performed */
  action: TournamentAction
  /** ID of the user who performed the action */
  performedBy: string
  /** Timestamp when the action was performed */
  timestamp: Date
  /** Additional details about the action */
  details: {
    /** Round number (if applicable) */
    round?: number
    /** Match ID (if applicable) */
    matchId?: string
    /** Player ID (if applicable) */
    playerId?: string
    /** Previous value before the action (for updates) */
    previousValue?: any
    /** New value after the action (for updates) */
    newValue?: any
    /** Reason for the action (for overrides, cancellations, etc.) */
    reason?: string
    /** Additional metadata */
    [key: string]: any
  }
}

/**
 * Confidence level for projected rating calculations
 */
export type RatingConfidence = 'LOW' | 'MEDIUM' | 'HIGH'

/**
 * Projected rating change for a player during an active tournament
 */
export interface ProjectedRating {
  /** ID of the player */
  playerId: string
  /** ID of the game */
  gameId: string
  /** Player's current rating before the tournament */
  currentRating: number
  /** Projected rating after tournament completion */
  projectedRating: number
  /** Expected rating change (positive or negative) */
  ratingChange: number
  /** Number of matches considered in the projection */
  matchesConsidered: number
  /** Confidence level based on matches played */
  confidence: RatingConfidence
}

/**
 * Tournament status values
 */
export type TournamentStatus = 'UPCOMING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'

/**
 * Match status values
 */
export type MatchStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED'

/**
 * Tournament structure types
 */
export type TournamentStructure = 'SWISS' | 'ELIMINATION'

/**
 * User role types for authorization
 * 
 * NOTE: This type is now defined in authorization-constants.ts as the single source of truth.
 * Import from there or from the main tournament index.
 */
export type { UserRole } from './authorization-constants'

/**
 * Pairing data structure for match creation
 */
export interface Pairing {
  /** ID of the first player */
  player1Id: string
  /** ID of the second player */
  player2Id: string
  /** Table number assignment (optional) */
  table?: number
  /** Whether this is a bye match (Swiss only) */
  isBye?: boolean
}

/**
 * Match result data structure
 */
export interface MatchResult {
  /** ID of the winning player (null for draws) */
  winnerId: string | null
  /** Number of games won by player 1 */
  player1Score: number
  /** Number of games won by player 2 */
  player2Score: number
}

/**
 * Tournament entry record structure
 */
export interface TournamentRecord {
  /** Number of match wins */
  wins: number
  /** Number of match losses */
  losses: number
  /** Number of match draws */
  draws: number
}

/**
 * Rating change result after tournament completion
 */
export interface RatingChange {
  /** ID of the player */
  playerId: string
  /** ID of the game */
  gameId: string
  /** Rating before the tournament */
  oldRating: number
  /** Rating after the tournament */
  newRating: number
  /** Rating change amount */
  ratingChange: number
}
