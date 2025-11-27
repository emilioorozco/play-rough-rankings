import type { PrismaClient, Prisma } from '@prisma/client'
import type { GameMetadata } from '../games/base-game'
import type { DefaultArgs } from '@prisma/client/runtime/library'

// ============================================================================
// PRISMA TRANSACTION TYPES
// ============================================================================

/**
 * Prisma transaction type for database operations within transactions
 * This replaces the `any` type used in match-processor.ts
 */
export type PrismaTransaction = Omit<
  Prisma.TransactionClient,
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
 * Game update data interface for game updates
 * Used in server.ts for game update operations
 * Note: formats and metadata are now handled by game classes
 */
export interface GameUpdateData {
  shortName?: string
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
  tournamentLevel?: 'LOCAL' | 'REGIONAL' | 'NATIONAL' | 'INTERNATIONAL'
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
// TOURNAMENT ENTRY METADATA TYPES
// ============================================================================

/**
 * Tournament entry metadata interface for player-specific data
 * Stores player-specific information for each tournament entry
 */
export interface TournamentEntryMetadata {
  /** Player's specific deck list for this tournament entry */
  deckList?: string
  /** Whether the player wants to share their deck list publicly */
  shareDeckList?: boolean
  /** Any additional entry-specific metadata */
  [key: string]: unknown
}

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
// TYPE GUARDS FOR JSON FIELDS
// ============================================================================

/**
 * Type guard to check if a value is a valid seasonal stats object
 * Validates the structure of seasonal statistics stored in JSON fields
 * 
 * @param value - Value to validate
 * @returns True if value matches SeasonalStatsUpdate structure
 * 
 * @example
 * ```typescript
 * const rawStats = playerGameStats.seasonalStats
 * if (isSeasonalStats(rawStats)) {
 *   // TypeScript now knows rawStats is SeasonalStatsUpdate
 *   const totalGames = rawStats.wins + rawStats.losses
 * }
 * ```
 */
export function isSeasonalStats(value: unknown): value is SeasonalStatsUpdate {
  if (typeof value !== 'object' || value === null) return false
  
  const stats = value as Record<string, unknown>
  return (
    (stats.wins === undefined || (typeof stats.wins === 'number' && stats.wins >= 0)) &&
    (stats.losses === undefined || (typeof stats.losses === 'number' && stats.losses >= 0)) &&
    (stats.draws === undefined || (typeof stats.draws === 'number' && stats.draws >= 0)) &&
    (stats.tournaments === undefined || (typeof stats.tournaments === 'number' && stats.tournaments >= 0)) &&
    (stats.points === undefined || (typeof stats.points === 'number' && stats.points >= 0))
  )
}

/**
 * Type guard to check if a value is a valid external player IDs object
 * Validates the structure of external player IDs stored in JSON fields
 * 
 * @param value - Value to validate
 * @returns True if value matches external player IDs structure (Record<gameId, externalId>)
 * 
 * @example
 * ```typescript
 * const rawIds = player.externalPlayerIds
 * if (isExternalPlayerIds(rawIds)) {
 *   // TypeScript now knows rawIds is Record<string, string>
 *   const pokemonId = rawIds['game-uuid']
 * }
 * ```
 */
export function isExternalPlayerIds(value: unknown): value is Record<string, string> {
  if (typeof value !== 'object' || value === null) return false
  
  const ids = value as Record<string, unknown>
  
  // Check if all values are strings
  return Object.values(ids).every(id => typeof id === 'string' && id.length > 0)
}

/**
 * Type guard to check if a value is a valid tournament entry metadata object
 * Validates the structure of tournament entry metadata (deckList, shareDeckList, etc.)
 * 
 * @param value - Value to validate
 * @returns True if value matches TournamentEntryMetadata structure
 * 
 * @example
 * ```typescript
 * const rawMetadata = entry.metadata
 * if (isTournamentEntryMetadata(rawMetadata)) {
 *   // TypeScript now knows rawMetadata is TournamentEntryMetadata
 *   if (rawMetadata.shareDeckList && rawMetadata.deckList) {
 *     displayDeckList(rawMetadata.deckList)
 *   }
 * }
 * ```
 */
export function isTournamentEntryMetadata(value: unknown): value is TournamentEntryMetadata {
  if (typeof value !== 'object' || value === null) return false
  
  const metadata = value as Record<string, unknown>
  
  // Validate known fields
  if (metadata.deckList !== undefined && typeof metadata.deckList !== 'string') {
    return false
  }
  
  if (metadata.shareDeckList !== undefined && typeof metadata.shareDeckList !== 'boolean') {
    return false
  }
  
  return true
}

/**
 * Type guard to check if a value is a valid tournament metadata object
 * Validates the structure of tournament metadata (auditLogs, bracketType, etc.)
 * 
 * @param value - Value to validate
 * @returns True if value matches tournament metadata structure
 * 
 * @example
 * ```typescript
 * const rawMetadata = tournament.metadata
 * if (isTournamentMetadata(rawMetadata)) {
 *   // TypeScript now knows rawMetadata structure
 *   if (Array.isArray(rawMetadata.auditLogs)) {
 *     processAuditLogs(rawMetadata.auditLogs)
 *   }
 * }
 * ```
 */
export function isTournamentMetadata(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  
  const metadata = value as Record<string, unknown>
  
  // Validate auditLogs if present
  if (metadata.auditLogs !== undefined && !Array.isArray(metadata.auditLogs)) {
    return false
  }
  
  // Validate bracketType if present
  if (metadata.bracketType !== undefined) {
    const validBracketTypes = ['swiss', 'single_elimination', 'double_elimination']
    if (typeof metadata.bracketType !== 'string' || !validBracketTypes.includes(metadata.bracketType)) {
      return false
    }
  }
  
  // Validate roundsPlayed if present
  if (metadata.roundsPlayed !== undefined && typeof metadata.roundsPlayed !== 'number') {
    return false
  }
  
  // Validate cutToTop if present
  if (metadata.cutToTop !== undefined && typeof metadata.cutToTop !== 'number') {
    return false
  }
  
  // Validate streamUrl if present
  if (metadata.streamUrl !== undefined && typeof metadata.streamUrl !== 'string') {
    return false
  }
  
  return true
}

/**
 * Type guard to check if a value is a valid deck metadata object
 * Validates the structure of deck metadata (key cards, colors, etc.)
 * 
 * @param value - Value to validate
 * @returns True if value matches deck metadata structure
 */
export function isDeckMetadata(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  
  // Deck metadata is flexible, just ensure it's an object
  return true
}

/**
 * Type guard to check if a value is a valid player metadata object
 * Validates the structure of player metadata (age groups, preferences, etc.)
 * 
 * @param value - Value to validate
 * @returns True if value matches player metadata structure
 */
export function isPlayerMetadata(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  
  // Player metadata is flexible, just ensure it's an object
  return true
}

/**
 * Type guard to check if a value is a valid player game stats metadata object
 * Validates the structure of player game stats metadata (achievements, rankings, etc.)
 * 
 * @param value - Value to validate
 * @returns True if value matches player game stats metadata structure
 */
export function isPlayerGameStatsMetadata(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  
  // Player game stats metadata is flexible, just ensure it's an object
  return true
}

/**
 * Type guard to check if a value is a valid file format discriminated union
 * Validates the structure of file format data for upload processing
 * 
 * @param value - Value to validate
 * @returns True if value matches FileFormat discriminated union
 * 
 * @example
 * ```typescript
 * const parsedFile = parseFile(file)
 * if (isFileFormat(parsedFile)) {
 *   switch (parsedFile.type) {
 *     case 'CSV':
 *       // TypeScript knows parsedFile.data is CSVRowData[]
 *       processCSV(parsedFile.data)
 *       break
 *     case 'JSON':
 *       // TypeScript knows parsedFile.data is Record<string, unknown>
 *       processJSON(parsedFile.data)
 *       break
 *   }
 * }
 * ```
 */
export function isFileFormat(value: unknown): value is FileFormat {
  if (typeof value !== 'object' || value === null) return false
  
  const file = value as Record<string, unknown>
  
  // Check for discriminated union type field
  if (typeof file.type !== 'string') return false
  
  switch (file.type) {
    case 'CSV':
      // CSV format should have data as array of objects
      return Array.isArray(file.data) && file.data.every(row => typeof row === 'object' && row !== null)
    
    case 'JSON':
      // JSON format should have data as object
      return typeof file.data === 'object' && file.data !== null && !Array.isArray(file.data)
    
    case 'TDF':
      // TDF format should have data as array of strings
      return Array.isArray(file.data) && file.data.every(row => typeof row === 'string')
    
    default:
      return false
  }
}

// ============================================================================
// TYPE GUARDS FOR FILTERS AND QUERIES
// ============================================================================

/**
 * Type guard to check if a value is a valid date filter
 * Validates the structure of date filter clauses for Prisma queries
 * 
 * @param value - Value to validate
 * @returns True if value matches DateFilterClause structure
 */
export function isDateFilter(value: unknown): value is DateFilterClause {
  if (typeof value !== 'object' || value === null) return false
  
  const filter = value as Record<string, unknown>
  return (
    (filter.gte === undefined || filter.gte instanceof Date) &&
    (filter.lte === undefined || filter.lte instanceof Date)
  )
}

// ============================================================================
// TYPE GUARDS FOR GAME METADATA
// ============================================================================

/**
 * Type guard to check if a value is a valid game metadata object
 * Validates the structure of game metadata from game classes
 * 
 * @param value - Value to validate
 * @returns True if value matches GameMetadata structure
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
// TYPE GUARDS FOR USER PREFERENCES AND FORM DATA
// ============================================================================

/**
 * Type guard to check if a value is a valid user preferences object
 * Validates the structure of user preferences stored in JSON or persisted state
 * 
 * @param value - Value to validate
 * @returns True if value matches basic user preferences structure
 * 
 * @example
 * ```typescript
 * const rawPrefs = localStorage.getItem('user-preferences')
 * if (rawPrefs) {
 *   const parsed = JSON.parse(rawPrefs)
 *   if (isUserPreferences(parsed)) {
 *     // TypeScript now knows parsed structure
 *     setPreferences(parsed)
 *   }
 * }
 * ```
 */
export function isUserPreferences(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  
  const prefs = value as Record<string, unknown>
  
  // Validate common preference fields if present
  if (prefs.nameDisplayPreference !== undefined) {
    const validPreferences = ['DISPLAY_NAME', 'FIRST_NAME', 'FULL_NAME', 'OPT_OUT']
    if (typeof prefs.nameDisplayPreference !== 'string' || !validPreferences.includes(prefs.nameDisplayPreference)) {
      return false
    }
  }
  
  if (prefs.profileVisibility !== undefined) {
    const validVisibility = ['PUBLIC', 'PRIVATE']
    if (typeof prefs.profileVisibility !== 'string' || !validVisibility.includes(prefs.profileVisibility)) {
      return false
    }
  }
  
  // Validate boolean preference fields
  const booleanFields = [
    'optInCommunications',
    'optInTournamentUpdates',
    'optInLeaderboardUpdates',
    'optInMarketing',
    'subscribeToUpdates',
  ]
  
  for (const field of booleanFields) {
    if (prefs[field] !== undefined && typeof prefs[field] !== 'boolean') {
      return false
    }
  }
  
  return true
}

/**
 * Type guard to check if a value is a valid form draft data object
 * Validates the structure of form draft data stored in persisted state
 * 
 * @param value - Value to validate
 * @returns True if value matches form draft data structure
 * 
 * @example
 * ```typescript
 * const rawDraft = localStorage.getItem('form-draft')
 * if (rawDraft) {
 *   const parsed = JSON.parse(rawDraft)
 *   if (isFormDraftData(parsed)) {
 *     // TypeScript now knows parsed structure
 *     restoreFormDraft(parsed)
 *   }
 * }
 * ```
 */
export function isFormDraftData(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  
  const draft = value as Record<string, unknown>
  
  // Validate required fields if present
  if (draft.formType !== undefined && typeof draft.formType !== 'string') {
    return false
  }
  
  if (draft.formData !== undefined && typeof draft.formData !== 'object') {
    return false
  }
  
  if (draft.lastUpdated !== undefined && !(draft.lastUpdated instanceof Date || typeof draft.lastUpdated === 'string')) {
    return false
  }
  
  if (draft.isSubmitted !== undefined && typeof draft.isSubmitted !== 'boolean') {
    return false
  }
  
  return true
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

