// API Response Types - These match what our tRPC endpoints actually return

// ============================================================================
// Base Types - Reusable components used across multiple API types
// ============================================================================

export interface ApiPlayer {
  id: string
  displayName: string
}

export interface ApiGameInfo {
  id: string
  name: string
  shortName: string
}

export interface ApiStoreInfo {
  id: string
  name: string
  city: string
  state: string
  address: string
  contactEmail?: string | null
  website?: string | null
}

export interface ApiOrganizerInfo {
  id: string
  name: string | null
  email?: string
}

export interface ApiMatch {
  id: string
  round: number
  table?: number | null
  status: string
  player1: ApiPlayer
  player2: ApiPlayer
  winner?: ApiPlayer | null
}

export interface ApiParticipant {
  id: string
  displayName: string
  isPublic: boolean
  gameStats?: Record<string, unknown> | null
}

export interface ApiSeasonalStats {
  wins: number
  losses: number
  tournaments: number
  points: number
}

export interface ApiPeriodStats {
  wins: number
  losses: number
  tournaments: number
  totalMatches: number
}

export interface ApiPerformance {
  winRate: number
  totalGames: number
  winLossRatio: number
}

// ============================================================================
// Main API Response Types
// ============================================================================

export interface ApiGame {
  id: string
  name: string
  shortName: string
  isActive: boolean
  createdAt: string | Date
  updatedAt: string | Date
  // Note: formats and metadata are now provided by game classes, not database
}

export interface ApiPlayerGameStats {
  id: string
  playerId: string
  gameId: string
  currentRating: number
  seasonalStats: ApiSeasonalStats | Record<string, unknown> | null
  bestFinish?: number | null
  totalEarnings: number
  metadata?: Record<string, unknown> | null
  game?: ApiGame
  player?: {
    displayName: string | null
    profileVisibility: string
  }
}

export interface ApiTournament {
  id: string
  name: string
  description?: string | null
  date: string | Date
  status: string
  format: string
  tournamentStructure?: string | null
  maxPlayers?: number | null
  totalRounds?: number | null
  entryFee?: number | null
  prizePool?: string | null
  tournamentLevel?: string | null
  registrationDeadline?: string | Date | null
  registrationOpen?: boolean
  timeUntilDeadline?: string | null
  participantCount?: number
  registrationProgress?: number
  game: ApiGameInfo
  store: ApiStoreInfo
  organizer: ApiOrganizerInfo
  matchCount: number
  participants?: ApiParticipant[]
  matches?: ApiMatch[]
}

// Tournament list item type for the tournaments.list endpoint
export interface ApiTournamentListItem {
  id: string
  name: string
  description: string | null
  date: Date
  status: string
  format: string
  maxPlayers: number | null
  entryFee: number | null
  prizePool: string | null
  tournamentLevel: string | null
  game: ApiGameInfo
  store: ApiStoreInfo
  organizer: ApiOrganizerInfo & { email: string }
  matchCount: number
  entryCount: number
}

// Tournament list response type for the tournaments.list endpoint
export interface ApiTournamentListResponse {
  tournaments: ApiTournamentListItem[]
  total: number
  hasMore: boolean
}

export interface ApiLeaderboardEntry {
  rank: number
  playerId: string
  displayName: string
  currentRating: number
  seasonalStats?: ApiSeasonalStats
  periodStats?: ApiPeriodStats
  performance: ApiPerformance
  bestFinish?: number | null
  totalEarnings: number
}

export interface ApiLeaderboardData {
  game: ApiGame
  leaderboard: ApiLeaderboardEntry[]
  season?: string
  seasonStart?: string
  seasonEnd?: string
  cached?: boolean
  totalPlayers?: number
}

export interface ApiPlayerSearchResult {
  id: string
  displayName: string | null
  userName: string | null
  role: string
  gameStats: ApiPlayerGameStats[]
  createdAt: string | Date
}

// tRPC Query Result Types
export interface TRPCQueryResult<T> {
  data?: T
  error?: {
    message: string
  }
  isLoading?: boolean
  isPending?: boolean
}

// Utility Types
export type SafeSeasonalStats = ApiSeasonalStats

export type GameStatsMetadata = Record<string, string | number | boolean | null>