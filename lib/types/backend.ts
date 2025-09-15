import type { PrismaClient } from '@prisma/client'
import type { DefaultArgs } from '@prisma/client/runtime/library'

// ============================================================================
// PRISMA TRANSACTION TYPES
// ============================================================================

/**
 * Prisma transaction type for database operations within transactions
 * This replaces the `any` type used in match-processor.ts
 */
export type PrismaTransaction = Omit<
  PrismaClient<DefaultArgs>, 
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

// ============================================================================
// SEASONAL STATS AND TOURNAMENT TYPES
// ============================================================================

/**
 * Seasonal statistics update interface for player statistics
 * This replaces Record<string, unknown> used throughout the codebase
 */
export interface SeasonalStatsUpdate {
  wins?: number
  losses?: number
  draws?: number
  tournaments?: number
  points?: number
}

/**
 * Tournament standing interface for standings calculations
 * Used in match-processor.ts for tournament completion
 */
export interface TournamentStanding {
  playerId: string
  playerName: string
  wins: number
  losses: number
  draws: number
  matchWinPercentage: number
  opponentMatchWinPercentage: number
  gameWinPercentage: number
}

/**
 * Player statistics interface for tournament standings
 * Used internally in match-processor.ts calculations
 */
export interface PlayerTournamentStats {
  playerId: string
  playerName: string
  wins: number
  losses: number
  draws: number
  matchWinPercentage: number
  opponentMatchWinPercentage: number
  gameWinPercentage: number
}

// ============================================================================
// DATE FILTERING TYPES
// ============================================================================

/**
 * Date filter clause for Prisma where conditions
 * This replaces the `any` type used in date filtering across routers
 */
export interface DateFilterClause {
  gte?: Date
  lte?: Date
}

/**
 * Date range filter for tournament and match queries
 * Used in tRPC routers for date-based filtering
 */
export interface DateRangeFilter {
  start?: Date
  end?: Date
}

// ============================================================================
// GAME METADATA TYPES
// ============================================================================

/**
 * Game metadata interface for game-specific settings
 * This replaces the `any` type used in server.ts for game metadata
 */
export interface GameMetadata {
  ageGroups?: string[]
  pointSystem?: string
  sanctioning?: Record<string, unknown>
  [key: string]: unknown
}

/**
 * Game update data interface for game updates
 * Used in server.ts for game update operations
 */
export interface GameUpdateData {
  shortName?: string
  metadata?: GameMetadata
  isActive?: boolean
}

// ============================================================================
// FILE PARSING TYPES
// ============================================================================

/**
 * CSV row data interface for CSV parsing
 * This replaces the `any` type used in upload/parsers.ts
 */
export interface CSVRowData {
  [key: string]: string | number | undefined
}

/**
 * Tournament file metadata interface for tournament information
 * Used in file parsing operations
 */
export interface TournamentFileMetadata {
  name: string
  date: string
  format: string
  maxPlayers?: number
  entryFee?: number
  prizePool?: string
  tournamentLevel?: string
}

/**
 * Player file data interface for player information from files
 * Used in file parsing operations
 */
export interface PlayerFileData {
  externalPlayerId: string
  playerName: string
  email?: string
}

/**
 * File format discriminated union for different file types
 * Used in upload/parsers.ts for type-safe file processing
 */
export type FileFormat = 
  | { type: 'CSV'; data: CSVRowData[] }
  | { type: 'JSON'; data: Record<string, unknown> }
  | { type: 'TDF'; data: string[] }

// ============================================================================
// DECK STATISTICS TYPES
// ============================================================================

/**
 * Deck statistics filter interface for deck-related queries
 * This replaces the `any` type used in decks.ts router
 */
export interface DeckStatsFilter {
  gameId: string
  format?: string
  startDate?: Date
  endDate?: Date
  minUsage?: number
  limit?: number
}

/**
 * Deck statistics result interface
 * Used in deck statistics calculations
 */
export interface DeckStatsResult {
  deckId: string
  deckName: string
  archetype: string
  format: string
  usage: number
  wins: number
  losses: number
  draws: number
  totalGames: number
  winRate: number
  uniquePlayers: number
  tournaments: number
}

// ============================================================================
// LEADERBOARD TYPES
// ============================================================================

/**
 * Leaderboard filter interface for leaderboard queries
 * This replaces the `any` type used in leaderboards.ts router
 */
export interface LeaderboardFilter {
  gameId: string
  season?: string
  format?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  minTournaments?: number
}

/**
 * Leaderboard entry interface
 * Used in leaderboard calculations and responses
 */
export interface LeaderboardEntry {
  rank: number
  playerId: string
  displayName: string
  currentRating: number
  seasonalStats: SeasonalStatsUpdate
  performance: {
    winRate: number
    totalGames: number
    winLossRatio: number
  }
  bestFinish?: number
  totalEarnings: number
}

// ============================================================================
// TOURNAMENT PROCESSING TYPES
// ============================================================================

/**
 * Tournament processing result interface
 * Used in tournament completion operations
 */
export interface TournamentProcessingResult {
  tournament: Record<string, unknown>
  standings: TournamentStanding[]
  championshipPointsAwarded: PlayerStatsUpdate[]
}

/**
 * Player stats update interface for match processing
 * Used in match-processor.ts for player updates
 */
export interface PlayerStatsUpdate {
  playerId: string
  gameId: string
  ratingChange: number
  newRating: number
  seasonalStatsUpdate: SeasonalStatsUpdate
  championshipPoints?: number
}

// ============================================================================
// MATCH PROCESSING TYPES
// ============================================================================

/**
 * Match processing result interface
 * Used in match-processor.ts for match result processing
 */
export interface MatchProcessingResult {
  match: Record<string, unknown>
  playerUpdates: PlayerStatsUpdate[]
}

/**
 * Batch match processing result interface
 * Used in batch match processing operations
 */
export interface BatchMatchProcessingResult {
  processedMatches: Array<Record<string, unknown>>
  playerUpdates: PlayerStatsUpdate[]
  errors: { matchId: string; error: string }[]
}

// ============================================================================
// PRISMA WHERE CLAUSE TYPES
// ============================================================================

/**
 * Tournament where clause interface
 * This replaces the `any` type used in tournament filtering
 */
export interface TournamentWhereClause {
  gameId?: string
  storeId?: string
  status?: string
  date?: DateFilterClause
  format?: string
  tournamentLevel?: string
}

/**
 * Match where clause interface
 * This replaces the `any` type used in match filtering
 */
export interface MatchWhereClause {
  tournamentId?: string
  player1Id?: string
  player2Id?: string
  winnerId?: string
  round?: number
  status?: string
  tournament?: TournamentWhereClause
}

/**
 * Player where clause interface
 * This replaces the `any` type used in player filtering
 */
export interface PlayerWhereClause {
  id?: string
  userId?: string
  displayName?: {
    contains: string
    mode: 'insensitive'
  }
  profileVisibility?: string
  gameStats?: {
    some: {
      gameId: string
    }
  }
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a value is a valid seasonal stats object
 */
export function isSeasonalStats(value: unknown): value is SeasonalStatsUpdate {
  if (typeof value !== 'object' || value === null) return false
  
  const stats = value as Record<string, unknown>
  return (
    (stats.wins === undefined || typeof stats.wins === 'number') &&
    (stats.losses === undefined || typeof stats.losses === 'number') &&
    (stats.draws === undefined || typeof stats.draws === 'number') &&
    (stats.tournaments === undefined || typeof stats.tournaments === 'number') &&
    (stats.points === undefined || typeof stats.points === 'number')
  )
}

/**
 * Type guard to check if a value is a valid date filter
 */
export function isDateFilter(value: unknown): value is DateFilterClause {
  if (typeof value !== 'object' || value === null) return false
  
  const filter = value as Record<string, unknown>
  return (
    (filter.gte === undefined || filter.gte instanceof Date) &&
    (filter.lte === undefined || filter.lte instanceof Date)
  )
}

/**
 * Type guard to check if a value is a valid game metadata object
 */
export function isGameMetadata(value: unknown): value is GameMetadata {
  if (typeof value !== 'object' || value === null) return false
  
  const metadata = value as Record<string, unknown>
  return (
    (metadata.ageGroups === undefined || Array.isArray(metadata.ageGroups)) &&
    (metadata.pointSystem === undefined || typeof metadata.pointSystem === 'string') &&
    (metadata.sanctioning === undefined || typeof metadata.sanctioning === 'object')
  )
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Utility type to extract Prisma model types
 */
export type PrismaModel<T extends keyof PrismaClient> = PrismaClient[T]

/**
 * Utility type for Prisma include operations
 */
export type PrismaInclude<T> = {
  [K in keyof T]?: boolean | PrismaInclude<T[K]>
}

/**
 * Utility type for Prisma select operations
 */
export type PrismaSelect<T> = {
  [K in keyof T]?: boolean
}

/**
 * Utility type for safe JSON parsing
 */
export type SafeJsonValue = 
  | string 
  | number 
  | boolean 
  | null 
  | SafeJsonValue[] 
  | { [key: string]: SafeJsonValue }

/**
 * Utility type for database record with timestamps
 */
export interface TimestampedRecord {
  createdAt: Date
  updatedAt: Date
}

/**
 * Utility type for database record with ID
 */
export interface IdentifiedRecord {
  id: string
}

/**
 * Combined utility type for standard database records
 */
export type DatabaseRecord = IdentifiedRecord & TimestampedRecord

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

/**
 * Custom error interface for backend operations
 */
export interface BackendError extends Error {
  code: string
  statusCode?: number
  details?: Record<string, unknown>
}

/**
 * Validation error interface
 */
export interface ValidationError extends BackendError {
  code: 'VALIDATION_ERROR'
  field?: string
  value?: unknown
}

/**
 * Database error interface
 */
export interface DatabaseError extends BackendError {
  code: 'DATABASE_ERROR'
  operation?: string
  table?: string
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export type {
  // Re-export Prisma types for convenience
  PrismaClient,
  DefaultArgs,
}

