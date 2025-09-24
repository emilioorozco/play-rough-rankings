// API Response Types - These match what our tRPC endpoints actually return

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
  seasonalStats: {
    wins: number
    losses: number
    tournaments: number
    points: number
  } | Record<string, unknown> | null
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
  maxPlayers?: number | null
  entryFee?: number | null
  prizePool?: string | null
  tournamentLevel?: string | null
  game: {
    id: string
    name: string
    shortName: string
  }
  store: {
    id: string
    name: string
    city: string
    state: string
    address: string
    contactEmail?: string | null
    website?: string | null
  }
  organizer: {
    id: string
    name: string | null
  }
  matchCount: number
  participants?: Array<{
    id: string
    displayName: string
    isPublic: boolean
    gameStats?: Record<string, unknown> | null
  }>
  matches?: Array<{
    id: string
    round: number
    table?: number | null
    status: string
    player1: {
      id: string
      displayName: string
    }
    player2: {
      id: string
      displayName: string
    }
    winner?: {
      id: string
      displayName: string
    } | null
  }>
}

export interface ApiLeaderboardEntry {
  rank: number
  playerId: string
  displayName: string
  currentRating: number
  seasonalStats?: {
    wins: number
    losses: number
    tournaments: number
    points: number
  }
  periodStats?: {
    wins: number
    losses: number
    tournaments: number
    totalMatches: number
  }
  performance: {
    winRate: number
    totalGames: number
    winLossRatio: number
  }
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
export type SafeSeasonalStats = {
  wins: number
  losses: number
  tournaments: number
  points: number
}

export type GameStatsMetadata = Record<string, string | number | boolean | null>