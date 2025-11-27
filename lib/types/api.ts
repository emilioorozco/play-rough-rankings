/**
 * API Response Types
 * 
 * These types represent the data structures returned from tRPC procedures.
 * All API response types use the `Api` prefix to distinguish them from
 * backend/internal types.
 * 
 * Type Flow: Database (Prisma) → Backend Types → API Types → Client Types
 * 
 * @see lib/types/backend.ts - Backend operation types
 * @see lib/types/stores.ts - Client-side store types
 */

// ============================================================================
// Base Types - Reusable components used across multiple API types
// ============================================================================

/**
 * Base player information for API responses
 * Used as a component in other API types
 */
export interface ApiPlayer {
  /** Unique player identifier */
  id: string
  /** Player's display name */
  displayName: string
}

/**
 * Game information for API responses
 * Used as a component in tournament and leaderboard responses
 */
export interface ApiGameInfo {
  /** Unique game identifier */
  id: string
  /** Full game name (e.g., "Pokemon Trading Card Game") */
  name: string
  /** Abbreviated game name (e.g., "PTCG") */
  shortName: string
}

/**
 * Store/venue information for API responses
 * Used in tournament responses
 */
export interface ApiStoreInfo {
  /** Unique store identifier */
  id: string
  /** Store name */
  name: string
  /** Store city */
  city: string
  /** Store state/province */
  state: string
  /** Store street address */
  address: string
  /** Store contact email (optional) */
  contactEmail?: string | null
  /** Store website URL (optional) */
  website?: string | null
}

/**
 * Tournament organizer information for API responses
 * Used in tournament responses
 */
export interface ApiOrganizerInfo {
  /** Unique organizer identifier */
  id: string
  /** Organizer's display name */
  name: string | null
  /** Organizer's email address (optional) */
  email?: string
}

/**
 * Match information for API responses
 * Used in tournament match listings
 */
export interface ApiMatch {
  /** Unique match identifier */
  id: string
  /** Tournament round number */
  round: number
  /** Table assignment (optional) */
  table?: number | null
  /** Match status (PENDING, IN_PROGRESS, COMPLETED, etc.) */
  status: string
  /** Player 1 information */
  player1: ApiPlayer
  /** Player 2 information */
  player2: ApiPlayer
  /** Match winner (null for draws or pending matches) */
  winner?: ApiPlayer | null
}

/**
 * Tournament participant information for API responses
 * Used in tournament participant listings
 */
export interface ApiParticipant {
  /** Unique participant identifier */
  id: string
  /** Participant's display name */
  displayName: string
  /** Optional username or handle */
  username?: string
  /** Whether participant's profile is public */
  isPublic: boolean
  /** Tournament seed (if available) */
  seed?: number
  /** Wins recorded for this tournament */
  wins?: number
  /** Losses recorded for this tournament */
  losses?: number
  /** Participant status within the tournament */
  status?: 'active' | 'eliminated' | 'bye' | 'dropped'
  /** Ladder tier derived from rating */
  tier?: 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze'
  /** Current rating used for tier display */
  rating?: number
  /** Registration timestamp */
  registrationDate?: string | Date
  /** Whether the participant has dropped */
  dropped?: boolean
  /** Deck information (only when profile is public) */
  deck?: {
    id: string
    name: string
    archetype: string
    format: string
  } | null
  /** Participant's game statistics (optional) */
  gameStats?: Record<string, unknown> | null
}

/**
 * Seasonal statistics for API responses
 * Represents a player's performance over a season
 */
export interface ApiSeasonalStats {
  /** Number of wins */
  wins: number
  /** Number of losses */
  losses: number
  /** Number of tournaments participated in */
  tournaments: number
  /** Total championship points earned */
  points: number
}

/**
 * Period statistics for API responses
 * Represents a player's performance over a specific time period
 */
export interface ApiPeriodStats {
  /** Number of wins */
  wins: number
  /** Number of losses */
  losses: number
  /** Number of tournaments participated in */
  tournaments: number
  /** Total number of matches played */
  totalMatches: number
}

/**
 * Performance metrics for API responses
 * Calculated performance statistics
 */
export interface ApiPerformance {
  /** Win rate as a decimal (0.0 to 1.0) */
  winRate: number
  /** Total number of games played */
  totalGames: number
  /** Win/loss ratio */
  winLossRatio: number
}

// ============================================================================
// Main API Response Types
// ============================================================================

/**
 * Full game information for API responses
 * Returned by games.getById and included in game-related responses
 * 
 * @note Formats and metadata are now provided by game classes, not database
 */
export interface ApiGame {
  /** Unique game identifier */
  id: string
  /** Full game name */
  name: string
  /** Abbreviated game name */
  shortName: string
  /** Whether the game is currently active */
  isActive: boolean
  /** Game creation timestamp */
  createdAt: string | Date
  /** Game last update timestamp */
  updatedAt: string | Date
}

/**
 * Player game statistics for API responses
 * Returned by players.getGameStats and included in player profiles
 */
export interface ApiPlayerGameStats {
  /** Unique statistics record identifier */
  id: string
  /** Player identifier */
  playerId: string
  /** Game identifier */
  gameId: string
  /** Current ELO rating */
  currentRating: number
  /** Seasonal statistics (validated) or raw data */
  seasonalStats: ApiSeasonalStats | Record<string, unknown> | null
  /** Best tournament finish (placement) */
  bestFinish?: number | null
  /** Total prize money earned */
  totalEarnings: number
  /** Additional game-specific metadata */
  metadata?: Record<string, unknown> | null
  /** Game information (optional, included when requested) */
  game?: ApiGame
  /** Player information (optional, included when requested) */
  player?: {
    displayName: string | null
    profileVisibility: string
  }
  /** Statistics record creation timestamp */
  createdAt: string | Date
  /** Statistics record last update timestamp */
  updatedAt: string | Date
}

/**
 * Full tournament information for API responses
 * Returned by tournaments.getById and used in tournament detail views
 */
export interface ApiTournament {
  /** Unique tournament identifier */
  id: string
  /** Tournament creation timestamp */
  createdAt?: string | Date
  /** Tournament update timestamp */
  updatedAt?: string | Date
  /** Tournament name */
  name: string
  /** Tournament description (optional) */
  description?: string | null
  /** Tournament date/time */
  date: string | Date
  /** Tournament status (UPCOMING, ACTIVE, COMPLETED, CANCELLED) */
  status: string
  /** Game format (Standard, Expanded, etc.) */
  format: string
  /** Game identifier */
  gameId?: string
  /** Tournament structure (Swiss, Single Elimination, etc.) */
  tournamentStructure?: string | null
  /** Maximum number of players */
  maxPlayers?: number | null
  /** Store identifier */
  storeId?: string
  /** Organizer identifier */
  organizerId?: string
  /** Total number of rounds */
  totalRounds?: number | null
  /** Current round number (may be derived from matches) */
  currentRound?: number | string | null
  /** Tournament rules document (optional) */
  rules?: string | string[] | null
  /** Entry fee amount */
  entryFee?: number | null
  /** Prize pool description */
  prizePool?: string | null
  /** Tournament level (LOCAL, REGIONAL, NATIONAL, INTERNATIONAL) */
  tournamentLevel?: string | null
  /** Registration deadline */
  registrationDeadline?: string | Date | null
  /** Whether registration is currently open */
  registrationOpen?: boolean
  /** Time remaining until registration deadline */
  timeUntilDeadline?: string | null
  /** Current number of participants */
  participantCount?: number
  /** Registration progress percentage */
  registrationProgress?: number
  /** Completion percentage for live progress */
  completionPercentage?: number
  /** Whether the tournament is currently live */
  isLive?: boolean
  /** Friendly formatted date */
  formattedDate?: string
  /** Friendly formatted time */
  formattedTime?: string
  /** Additional metadata */
  metadata?: Record<string, unknown> | null
  /** Game information */
  game: ApiGameInfo
  /** Store/venue information */
  store: ApiStoreInfo
  /** Organizer information */
  organizer: ApiOrganizerInfo
  /** Total number of matches */
  matchCount: number
  /** Total number of entries */
  entryCount?: number
  /** Tournament participants (optional, included when requested) */
  participants?: ApiParticipant[]
  /** Tournament matches (optional, included when requested) */
  matches?: ApiMatch[]
}

/**
 * Tournament list item for API responses
 * Used in tournaments.list endpoint for efficient list display
 */
export interface ApiTournamentListItem {
  /** Unique tournament identifier */
  id: string
  /** Tournament name */
  name: string
  /** Tournament description */
  description: string | null
  /** Tournament date */
  date: Date
  /** Tournament status */
  status: string
  /** Game format */
  format: string
  /** Maximum number of players */
  maxPlayers: number | null
  /** Entry fee amount */
  entryFee: number | null
  /** Prize pool description */
  prizePool: string | null
  /** Tournament level */
  tournamentLevel: string | null
  /** Game information */
  game: ApiGameInfo
  /** Store information */
  store: ApiStoreInfo
  /** Organizer information (includes email) */
  organizer: ApiOrganizerInfo & { email: string }
  /** Total number of matches */
  matchCount: number
  /** Current number of entries */
  entryCount: number
}

/**
 * Tournament list response for API responses
 * Returned by tournaments.list endpoint with pagination
 */
export interface ApiTournamentListResponse {
  /** Array of tournament list items */
  tournaments: ApiTournamentListItem[]
  /** Total number of tournaments matching filters */
  total: number
  /** Whether more tournaments are available */
  hasMore: boolean
}

/**
 * Leaderboard entry for API responses
 * Used in leaderboard listings and rankings
 */
export interface ApiLeaderboardEntry {
  /** Player's rank in the leaderboard */
  rank: number
  /** Player identifier */
  playerId: string
  /** Player's display name */
  displayName: string
  /** Current ELO rating */
  currentRating: number
  /** Seasonal statistics (optional) */
  seasonalStats?: ApiSeasonalStats
  /** Period statistics (optional) */
  periodStats?: ApiPeriodStats
  /** Performance metrics */
  performance: ApiPerformance
  /** Best tournament finish */
  bestFinish?: number | null
  /** Total prize money earned */
  totalEarnings: number
}

/**
 * Leaderboard data for API responses
 * Returned by leaderboards.getSeasonal and related endpoints
 */
export interface ApiLeaderboardData {
  /** Game information */
  game: ApiGame
  /** Array of leaderboard entries */
  leaderboard: ApiLeaderboardEntry[]
  /** Season identifier (optional) */
  season?: string
  /** Season start date (optional) */
  seasonStart?: string
  /** Season end date (optional) */
  seasonEnd?: string
  /** Whether the data was served from cache */
  cached?: boolean
  /** Total number of players in the leaderboard */
  totalPlayers?: number
}

/**
 * Player search result for API responses
 * Returned by players.searchPlayers endpoint
 */
export interface ApiPlayerSearchResult {
  /** Player identifier */
  id: string
  /** Player's display name */
  displayName: string | null
  /** Player's username */
  userName: string | null
  /** User role */
  role: string
  /** Player's game statistics */
  gameStats: ApiPlayerGameStats[]
  /** Account creation timestamp */
  createdAt: string | Date
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * tRPC query result wrapper
 * Used for type-safe query results with loading and error states
 * 
 * @template T - The data type returned by the query
 */
export interface TRPCQueryResult<T> {
  /** Query result data */
  data?: T
  /** Error information (if query failed) */
  error?: {
    message: string
  }
  /** Whether the query is currently loading */
  isLoading?: boolean
  /** Whether the query is pending (React Query v5) */
  isPending?: boolean
}

/**
 * Type alias for validated seasonal statistics
 * Ensures type safety when working with seasonal stats
 */
export type SafeSeasonalStats = ApiSeasonalStats

/**
 * Game statistics metadata type
 * Used for flexible game-specific metadata storage
 */
export type GameStatsMetadata = Record<string, string | number | boolean | null>
