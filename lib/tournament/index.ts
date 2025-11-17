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
  Pairing,
  MatchResult,
  TournamentRecord,
  RatingChange,
} from './types'

// Export UserRole from authorization-constants (single source of truth)
export type { UserRole } from './authorization-constants'

// Export authorization utilities (server-side)
export {
  canManageTournament,
  canViewTournamentManagement,
  canSubmitMatchResult,
  canDropPlayer,
  isOrganizerOrAdmin,
  isAdmin,
} from './authorization'

// Export shared authorization constants and logic
export {
  checkTournamentManagementPermission,
  isAdminRole,
  isOrganizerRole,
  TOURNAMENT_MANAGEMENT_RULES,
} from './authorization-constants'

// Export business logic classes
export { AuditLogger } from './audit-logger'
export type { AuditTrailFilters } from './audit-logger'

export { PairingGenerator } from './pairing-generator'

export { TournamentProcessor } from './tournament-processor'
export type { StartTournamentResult, AdvanceRoundResult, CompleteTournamentResult } from './tournament-processor'

export { MatchProcessor } from './match-processor'
export type { SubmitMatchResultResponse } from './match-processor'

export { RatingCalculator } from './rating-calculator'

// Export performance optimization utilities
export { CacheManager, cacheManager } from './cache-manager'
export { BatchAuditLogger } from './batch-audit-logger'
export { QueryOptimizer, createQueryOptimizer } from './query-optimizer'
export { PerformanceTestRunner, runPerformanceBenchmark } from './performance-test'
export type { PerformanceTestConfig, PerformanceTestResults } from './performance-test'

// Export optimized service
export { OptimizedTournamentService, createOptimizedTournamentService } from './optimized-tournament-service'
