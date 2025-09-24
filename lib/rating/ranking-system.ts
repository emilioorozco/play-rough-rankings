import { PrismaClient } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { calculatePerformanceMetrics, ELO_CONFIG } from './elo'

export interface SeasonalRankingData {
  playerId: string
  gameId: string
  season: string
  currentRating: number
  seasonalStats: {
    wins: number
    losses: number
    draws: number
    tournaments: number
    points: number
  }
  performance: {
    winRate: number
    totalGames: number
    winLossRatio: number
    averageOpponentRating: number
    ratingTrend: number // Rating change over the season
  }
  rank: number
  previousRank?: number
  rankChange?: number
}

export interface RankingCache {
  gameId: string
  season: string
  rankings: SeasonalRankingData[]
  lastUpdated: Date
  totalPlayers: number
}

// Season utilities
export const getCurrentSeason = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  
  if (month >= 1 && month <= 3) return `${year}-Q1`
  if (month >= 4 && month <= 6) return `${year}-Q2`
  if (month >= 7 && month <= 9) return `${year}-Q3`
  return `${year}-Q4`
}

export const getSeasonDateRange = (season: string): { start: Date; end: Date } => {
  const [year, quarter] = season.split('-')
  const yearNum = parseInt(year)
  
  switch (quarter) {
    case 'Q1':
      return {
        start: new Date(yearNum, 0, 1),
        end: new Date(yearNum, 2, 31, 23, 59, 59)
      }
    case 'Q2':
      return {
        start: new Date(yearNum, 3, 1),
        end: new Date(yearNum, 5, 30, 23, 59, 59)
      }
    case 'Q3':
      return {
        start: new Date(yearNum, 6, 1),
        end: new Date(yearNum, 8, 30, 23, 59, 59)
      }
    case 'Q4':
      return {
        start: new Date(yearNum, 9, 1),
        end: new Date(yearNum, 11, 31, 23, 59, 59)
      }
    default:
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid season format. Use YYYY-Q1, YYYY-Q2, YYYY-Q3, or YYYY-Q4'
      })
  }
}

// Calculate seasonal rankings for a specific game and season
export const calculateSeasonalRankings = async (
  prisma: PrismaClient,
  gameId: string,
  season?: string
): Promise<SeasonalRankingData[]> => {
  const targetSeason = season || getCurrentSeason()
  const { start: seasonStart, end: seasonEnd } = getSeasonDateRange(targetSeason)

  // Get all players who have stats for this game
  const playerStats = await prisma.playerGameStats.findMany({
    where: {
      gameId,
      player: {
        user: {
          is: {
            userPreferences: {
              is: {
                profileVisibility: 'PUBLIC',
              },
            },
          },
        },
      },
    },
    include: {
      player: {
        select: {
          id: true,
        },
      },
    },
  })

  if (playerStats.length === 0) {
    return []
  }

  const playerIds = playerStats.map(stat => stat.playerId)

  // Get all matches for these players in the season
  const seasonMatches = await prisma.match.findMany({
    where: {
      OR: [
        { player1Id: { in: playerIds } },
        { player2Id: { in: playerIds } },
      ],
      tournament: {
        gameId,
        date: {
          gte: seasonStart,
          lte: seasonEnd,
        },
        status: 'COMPLETED',
      },
      status: 'COMPLETED',
    },
    include: {
      tournament: {
        select: {
          date: true,
          tournamentLevel: true,
        },
      },
      player1: {
        include: {
          gameStats: {
            where: { gameId },
            select: { currentRating: true },
          },
        },
      },
      player2: {
        include: {
          gameStats: {
            where: { gameId },
            select: { currentRating: true },
          },
        },
      },
    },
    orderBy: {
      tournament: { date: 'asc' },
    },
  })

  // Calculate seasonal performance for each player
  const seasonalData = new Map<string, {
    playerId: string
    wins: number
    losses: number
    draws: number
    tournaments: Set<string>
    totalMatches: number
    opponentRatings: number[]
    ratingHistory: { date: Date; rating: number }[]
    championshipPoints: number
  }>()

  // Initialize data for all players
  playerStats.forEach(stat => {
    seasonalData.set(stat.playerId, {
      playerId: stat.playerId,
      wins: 0,
      losses: 0,
      draws: 0,
      tournaments: new Set(),
      totalMatches: 0,
      opponentRatings: [],
      ratingHistory: [],
      championshipPoints: (stat.seasonalStats as Record<string, unknown>)?.points as number || 0,
    })
  })

  // Process matches to calculate seasonal stats
  seasonMatches.forEach(match => {
    const { player1Id, player2Id, winnerId, tournament } = match
    
    const player1Data = seasonalData.get(player1Id)
    const player2Data = seasonalData.get(player2Id)

    if (player1Data) {
      player1Data.totalMatches++
      player1Data.tournaments.add(match.tournamentId)
      
      // Record opponent rating
      const player2Rating = match.player2.gameStats[0]?.currentRating || ELO_CONFIG.STARTING_RATING
      player1Data.opponentRatings.push(player2Rating)

      // Update win/loss record
      if (winnerId === player1Id) {
        player1Data.wins++
      } else if (winnerId === player2Id) {
        player1Data.losses++
      } else {
        player1Data.draws++
      }
    }

    if (player2Data) {
      player2Data.totalMatches++
      player2Data.tournaments.add(match.tournamentId)
      
      // Record opponent rating
      const player1Rating = match.player1.gameStats[0]?.currentRating || ELO_CONFIG.STARTING_RATING
      player2Data.opponentRatings.push(player1Rating)

      // Update win/loss record
      if (winnerId === player2Id) {
        player2Data.wins++
      } else if (winnerId === player1Id) {
        player2Data.losses++
      } else {
        player2Data.draws++
      }
    }
  })

  // Calculate rating trends (simplified - would need historical rating data for full implementation)
  const ratingTrends = await calculateRatingTrends(prisma, gameId, playerIds, seasonStart, seasonEnd)

  // Build ranking data
  const rankings: SeasonalRankingData[] = playerStats.map(stat => {
    const seasonData = seasonalData.get(stat.playerId)!
    const currentSeasonalStats = stat.seasonalStats as Record<string, unknown> || {
      wins: 0, losses: 0, tournaments: 0, points: 0
    }

    const performance = calculatePerformanceMetrics(
      seasonData.wins,
      seasonData.losses,
      seasonData.draws
    )

    const averageOpponentRating = seasonData.opponentRatings.length > 0
      ? seasonData.opponentRatings.reduce((sum, rating) => sum + rating, 0) / seasonData.opponentRatings.length
      : ELO_CONFIG.STARTING_RATING

    return {
      playerId: stat.playerId,
      gameId,
      season: targetSeason,
      currentRating: stat.currentRating,
      seasonalStats: {
        wins: seasonData.wins,
        losses: seasonData.losses,
        draws: seasonData.draws,
        tournaments: seasonData.tournaments.size,
        points: seasonData.championshipPoints,
      },
      performance: {
        winRate: performance.winRate,
        totalGames: performance.totalGames,
        winLossRatio: performance.winLossRatio,
        averageOpponentRating: Math.round(averageOpponentRating),
        ratingTrend: ratingTrends.get(stat.playerId) || 0,
      },
      rank: 0, // Will be set after sorting
    }
  })

  // Sort rankings by multiple criteria
  rankings.sort((a, b) => {
    // Primary: Current rating
    if (a.currentRating !== b.currentRating) {
      return b.currentRating - a.currentRating
    }
    
    // Secondary: Championship points
    if (a.seasonalStats.points !== b.seasonalStats.points) {
      return b.seasonalStats.points - a.seasonalStats.points
    }
    
    // Tertiary: Win rate (for players with games played)
    if (a.performance.totalGames > 0 && b.performance.totalGames > 0) {
      if (a.performance.winRate !== b.performance.winRate) {
        return b.performance.winRate - a.performance.winRate
      }
    }
    
    // Quaternary: Total games played (activity)
    return b.performance.totalGames - a.performance.totalGames
  })

  // Assign ranks
  rankings.forEach((ranking, index) => {
    ranking.rank = index + 1
  })

  return rankings
}

// Calculate rating trends for players over a season
const calculateRatingTrends = async (
  prisma: PrismaClient,
  gameId: string,
  playerIds: string[],
  seasonStart: Date,
  seasonEnd: Date
): Promise<Map<string, number>> => {
  const trends = new Map<string, number>()

  // For each player, calculate their rating change over the season
  // This is a simplified implementation - in a full system, you'd track historical ratings
  for (const playerId of playerIds) {
    // Get matches at the beginning and end of the season
    const earlyMatches = await prisma.match.findMany({
      where: {
        OR: [
          { player1Id: playerId },
          { player2Id: playerId },
        ],
        tournament: {
          gameId,
          date: {
            gte: seasonStart,
            lte: new Date(seasonStart.getTime() + 30 * 24 * 60 * 60 * 1000), // First 30 days
          },
          status: 'COMPLETED',
        },
        status: 'COMPLETED',
      },
      take: 5,
      orderBy: {
        tournament: { date: 'asc' },
      },
    })

    const lateMatches = await prisma.match.findMany({
      where: {
        OR: [
          { player1Id: playerId },
          { player2Id: playerId },
        ],
        tournament: {
          gameId,
          date: {
            gte: new Date(seasonEnd.getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            lte: seasonEnd,
          },
          status: 'COMPLETED',
        },
        status: 'COMPLETED',
      },
      take: 5,
      orderBy: {
        tournament: { date: 'desc' },
      },
    })

    // Simple trend calculation based on match performance
    const earlyWinRate = calculateMatchWinRate(earlyMatches, playerId)
    const lateWinRate = calculateMatchWinRate(lateMatches, playerId)
    
    // Estimate rating trend (positive = improving, negative = declining)
    const trend = (lateWinRate - earlyWinRate) * 100 // Scale to rating points
    trends.set(playerId, Math.round(trend))
  }

  return trends
}

// Helper function to calculate win rate from matches
const calculateMatchWinRate = (matches: Array<Record<string, unknown>>, playerId: string): number => {
  if (matches.length === 0) return 0.5 // Neutral if no matches

  let wins = 0
  let total = 0

  matches.forEach(match => {
    total++
    if (match.winnerId === playerId) {
      wins++
    } else if (match.winnerId === null) {
      wins += 0.5 // Count draws as half wins
    }
  })

  return total > 0 ? wins / total : 0.5
}

// Cache management for rankings
const rankingCache = new Map<string, RankingCache>()

export const getCachedRankings = (gameId: string, season: string): RankingCache | null => {
  const cacheKey = `${gameId}-${season}`
  const cached = rankingCache.get(cacheKey)
  
  if (!cached) return null
  
  // Check if cache is still valid (5 minutes for active season, 1 hour for past seasons)
  const now = new Date()
  const currentSeason = getCurrentSeason()
  const maxAge = season === currentSeason ? 5 * 60 * 1000 : 60 * 60 * 1000
  
  if (now.getTime() - cached.lastUpdated.getTime() > maxAge) {
    rankingCache.delete(cacheKey)
    return null
  }
  
  return cached
}

export const setCachedRankings = (cache: RankingCache): void => {
  const cacheKey = `${cache.gameId}-${cache.season}`
  rankingCache.set(cacheKey, cache)
}

export const invalidateRankingCache = (gameId: string, season?: string): void => {
  if (season) {
    const cacheKey = `${gameId}-${season}`
    rankingCache.delete(cacheKey)
  } else {
    // Invalidate all seasons for this game
    for (const [key] of rankingCache) {
      if (key.startsWith(`${gameId}-`)) {
        rankingCache.delete(key)
      }
    }
  }
}

// Get rankings with caching
export const getRankingsWithCache = async (
  prisma: PrismaClient,
  gameId: string,
  season?: string
): Promise<SeasonalRankingData[]> => {
  const targetSeason = season || getCurrentSeason()
  
  // Check cache first
  const cached = getCachedRankings(gameId, targetSeason)
  if (cached) {
    return cached.rankings
  }
  
  // Calculate fresh rankings
  const rankings = await calculateSeasonalRankings(prisma, gameId, targetSeason)
  
  // Cache the results
  setCachedRankings({
    gameId,
    season: targetSeason,
    rankings,
    lastUpdated: new Date(),
    totalPlayers: rankings.length,
  })
  
  return rankings
}

// Trigger ranking updates after tournament completion
export const triggerRankingUpdate = async (
  prisma: PrismaClient,
  tournamentId: string
): Promise<void> => {
  // Get tournament details
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      gameId: true,
      date: true,
      status: true,
    },
  })

  if (!tournament || tournament.status !== 'COMPLETED') {
    return
  }

  // Determine which season this tournament affects
  const tournamentDate = tournament.date
  const year = tournamentDate.getFullYear()
  const month = tournamentDate.getMonth() + 1
  
  let season: string
  if (month >= 1 && month <= 3) season = `${year}-Q1`
  else if (month >= 4 && month <= 6) season = `${year}-Q2`
  else if (month >= 7 && month <= 9) season = `${year}-Q3`
  else season = `${year}-Q4`

  // Invalidate cache for this game and season
  invalidateRankingCache(tournament.gameId, season)
  
  // Also invalidate current season if different
  const currentSeason = getCurrentSeason()
  if (season !== currentSeason) {
    invalidateRankingCache(tournament.gameId, currentSeason)
  }

  // Pre-calculate fresh rankings to warm the cache
  try {
    await getRankingsWithCache(prisma, tournament.gameId, season)
    if (season !== currentSeason) {
      await getRankingsWithCache(prisma, tournament.gameId, currentSeason)
    }
  } catch (error) {
    console.error('Failed to pre-calculate rankings:', error)
    // Don't throw - cache warming is optional
  }
}

// Performance trend analysis
export interface PerformanceTrend {
  playerId: string
  gameId: string
  period: 'week' | 'month' | 'season'
  ratingChange: number
  winRateChange: number
  activityLevel: 'low' | 'medium' | 'high'
  trend: 'improving' | 'stable' | 'declining'
  confidence: number // 0-1, how confident we are in the trend
}

export const analyzePerformanceTrends = async (
  prisma: PrismaClient,
  playerId: string,
  gameId: string,
  period: 'week' | 'month' | 'season' = 'month'
): Promise<PerformanceTrend> => {
  const now = new Date()
  let startDate: Date
  
  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case 'season':
      const currentSeason = getCurrentSeason()
      const seasonRange = getSeasonDateRange(currentSeason)
      startDate = seasonRange.start
      break
  }

  // Get matches in the period
  const matches = await prisma.match.findMany({
    where: {
      OR: [
        { player1Id: playerId },
        { player2Id: playerId },
      ],
      tournament: {
        gameId,
        date: {
          gte: startDate,
          lte: now,
        },
        status: 'COMPLETED',
      },
      status: 'COMPLETED',
    },
    orderBy: {
      tournament: { date: 'asc' },
    },
  })

  if (matches.length === 0) {
    return {
      playerId,
      gameId,
      period,
      ratingChange: 0,
      winRateChange: 0,
      activityLevel: 'low',
      trend: 'stable',
      confidence: 0,
    }
  }

  // Split matches into early and late periods
  const midpoint = Math.floor(matches.length / 2)
  const earlyMatches = matches.slice(0, midpoint)
  const lateMatches = matches.slice(midpoint)

  const earlyWinRate = calculateMatchWinRate(earlyMatches, playerId)
  const lateWinRate = calculateMatchWinRate(lateMatches, playerId)
  const winRateChange = lateWinRate - earlyWinRate

  // Estimate rating change (simplified)
  const ratingChange = winRateChange * 100 // Rough estimate

  // Determine activity level
  let activityLevel: 'low' | 'medium' | 'high'
  const matchesPerWeek = matches.length / (period === 'week' ? 1 : period === 'month' ? 4 : 12)
  if (matchesPerWeek < 1) activityLevel = 'low'
  else if (matchesPerWeek < 3) activityLevel = 'medium'
  else activityLevel = 'high'

  // Determine trend
  let trend: 'improving' | 'stable' | 'declining'
  if (winRateChange > 0.1) trend = 'improving'
  else if (winRateChange < -0.1) trend = 'declining'
  else trend = 'stable'

  // Calculate confidence based on sample size
  const confidence = Math.min(matches.length / 20, 1) // Full confidence at 20+ matches

  return {
    playerId,
    gameId,
    period,
    ratingChange: Math.round(ratingChange),
    winRateChange: Math.round(winRateChange * 100), // Convert to percentage
    activityLevel,
    trend,
    confidence,
  }
}

// Batch update rankings for multiple games/seasons
export const batchUpdateRankings = async (
  prisma: PrismaClient,
  updates: Array<{ gameId: string; season?: string }>
): Promise<void> => {
  for (const update of updates) {
    try {
      await getRankingsWithCache(prisma, update.gameId, update.season)
    } catch (error) {
      console.error(`Failed to update rankings for game ${update.gameId}, season ${update.season}:`, error)
    }
  }
}