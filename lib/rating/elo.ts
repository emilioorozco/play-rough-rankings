import { TRPCError } from '@trpc/server'

// ELO rating system configuration
export const ELO_CONFIG = {
  // K-factor determines how much ratings change per game
  K_FACTOR: {
    DEFAULT: 32,        // Standard K-factor
    PROVISIONAL: 40,    // Higher K-factor for new players (< 10 games)
    EXPERIENCED: 24,    // Lower K-factor for experienced players (> 50 games)
  },
  
  // Starting rating for new players
  STARTING_RATING: 1200,
  
  // Rating bounds
  MIN_RATING: 100,
  MAX_RATING: 3000,
  
  // Tournament level multipliers
  TOURNAMENT_MULTIPLIERS: {
    LOCAL: 1.0,
    REGIONAL: 1.2,
    NATIONAL: 1.5,
    INTERNATIONAL: 2.0,
  },
}

// Calculate expected score for player A against player B
export const calculateExpectedScore = (ratingA: number, ratingB: number): number => {
  const exponent = (ratingB - ratingA) / 400
  return 1 / (1 + Math.pow(10, exponent))
}

// Calculate new ELO rating after a match
export const calculateNewRating = (
  currentRating: number,
  opponentRating: number,
  actualScore: number, // 1 for win, 0.5 for draw, 0 for loss
  gamesPlayed: number = 0,
  tournamentLevel: 'LOCAL' | 'REGIONAL' | 'NATIONAL' | 'INTERNATIONAL' = 'LOCAL'
): number => {
  // Determine K-factor based on experience
  let kFactor = ELO_CONFIG.K_FACTOR.DEFAULT
  if (gamesPlayed < 10) {
    kFactor = ELO_CONFIG.K_FACTOR.PROVISIONAL
  } else if (gamesPlayed > 50) {
    kFactor = ELO_CONFIG.K_FACTOR.EXPERIENCED
  }

  // Apply tournament level multiplier
  const multiplier = ELO_CONFIG.TOURNAMENT_MULTIPLIERS[tournamentLevel]
  kFactor *= multiplier

  // Calculate expected score
  const expectedScore = calculateExpectedScore(currentRating, opponentRating)

  // Calculate new rating
  const ratingChange = kFactor * (actualScore - expectedScore)
  const newRating = currentRating + ratingChange

  // Apply bounds
  return Math.max(
    ELO_CONFIG.MIN_RATING,
    Math.min(ELO_CONFIG.MAX_RATING, Math.round(newRating))
  )
}

// Calculate rating changes for both players in a match
export const calculateMatchRatingChanges = (
  player1Rating: number,
  player2Rating: number,
  winnerId: string | null, // null for draw
  player1Id: string,
  player2Id: string,
  player1GamesPlayed: number = 0,
  player2GamesPlayed: number = 0,
  tournamentLevel: 'LOCAL' | 'REGIONAL' | 'NATIONAL' | 'INTERNATIONAL' = 'LOCAL'
): {
  player1NewRating: number
  player2NewRating: number
  player1RatingChange: number
  player2RatingChange: number
} => {
  // Determine actual scores
  let player1Score: number
  let player2Score: number

  if (winnerId === null) {
    // Draw
    player1Score = 0.5
    player2Score = 0.5
  } else if (winnerId === player1Id) {
    // Player 1 wins
    player1Score = 1
    player2Score = 0
  } else if (winnerId === player2Id) {
    // Player 2 wins
    player1Score = 0
    player2Score = 1
  } else {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Winner ID must match one of the players or be null for a draw'
    })
  }

  // Calculate new ratings
  const player1NewRating = calculateNewRating(
    player1Rating,
    player2Rating,
    player1Score,
    player1GamesPlayed,
    tournamentLevel
  )

  const player2NewRating = calculateNewRating(
    player2Rating,
    player1Rating,
    player2Score,
    player2GamesPlayed,
    tournamentLevel
  )

  return {
    player1NewRating,
    player2NewRating,
    player1RatingChange: player1NewRating - player1Rating,
    player2RatingChange: player2NewRating - player2Rating,
  }
}

// Calculate championship points based on tournament placement
export const calculateChampionshipPoints = (
  placement: number,
  totalPlayers: number,
  tournamentLevel: 'LOCAL' | 'REGIONAL' | 'NATIONAL' | 'INTERNATIONAL' = 'LOCAL'
): number => {
  // Base points structure (can be customized per game)
  const basePoints: Record<string, number[]> = {
    LOCAL: [50, 39, 31, 25, 20, 16, 13, 10, 8, 6, 5, 4, 3, 2, 1],
    REGIONAL: [100, 78, 62, 50, 40, 32, 26, 20, 16, 12, 10, 8, 6, 4, 2],
    NATIONAL: [200, 156, 124, 100, 80, 64, 52, 40, 32, 24, 20, 16, 12, 8, 4],
    INTERNATIONAL: [500, 390, 310, 250, 200, 160, 130, 100, 80, 60, 50, 40, 30, 20, 10],
  }

  const pointsTable = basePoints[tournamentLevel]
  
  // If placement is within the points table, return the exact points
  if (placement <= pointsTable.length) {
    return pointsTable[placement - 1]
  }

  // For placements beyond the table, calculate proportional points
  const lastPoints = pointsTable[pointsTable.length - 1]
  const maxPointsPlacement = pointsTable.length
  
  // Linear decay for remaining placements
  if (placement <= totalPlayers / 2) {
    const decayFactor = (totalPlayers / 2 - placement) / (totalPlayers / 2 - maxPointsPlacement)
    return Math.max(1, Math.round(lastPoints * decayFactor))
  }

  // No points for bottom half
  return 0
}

// Calculate performance metrics for a player
export const calculatePerformanceMetrics = (
  wins: number,
  losses: number,
  draws: number = 0
): {
  winRate: number
  totalGames: number
  winLossRatio: number
  points: number // Win = 3 points, Draw = 1 point, Loss = 0 points
} => {
  const totalGames = wins + losses + draws
  const winRate = totalGames > 0 ? wins / totalGames : 0
  const winLossRatio = losses > 0 ? wins / losses : wins
  const points = wins * 3 + draws * 1

  return {
    winRate: Math.round(winRate * 10000) / 100, // Percentage with 2 decimal places
    totalGames,
    winLossRatio: Math.round(winLossRatio * 100) / 100,
    points,
  }
}

// Validate rating calculation inputs
export const validateRatingInputs = (
  player1Rating: number,
  player2Rating: number,
  winnerId: string | null,
  player1Id: string,
  player2Id: string
): void => {
  if (player1Rating < ELO_CONFIG.MIN_RATING || player1Rating > ELO_CONFIG.MAX_RATING) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Player 1 rating out of bounds: ${player1Rating}`
    })
  }

  if (player2Rating < ELO_CONFIG.MIN_RATING || player2Rating > ELO_CONFIG.MAX_RATING) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Player 2 rating out of bounds: ${player2Rating}`
    })
  }

  if (player1Id === player2Id) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Player cannot play against themselves'
    })
  }

  if (winnerId && winnerId !== player1Id && winnerId !== player2Id) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Winner ID must match one of the players'
    })
  }
}