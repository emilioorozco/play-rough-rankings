import { TRPCError } from '@trpc/server'
import { Prisma, PrismaClient } from '@prisma/client'
import { 
  calculateMatchRatingChanges, 
  calculateChampionshipPoints, 
  validateRatingInputs,
  ELO_CONFIG 
} from '@/lib/rating/elo'
import { triggerRankingUpdate } from '@/lib/rating/ranking-system'
import type {
  PrismaTransaction,
  SeasonalStatsUpdate,
  TournamentStanding,
  PlayerTournamentStats,
  PlayerStatsUpdate,
  MatchProcessingResult,
  TournamentProcessingResult,
  BatchMatchProcessingResult
} from '@/lib/types/backend'

export interface MatchResult {
  matchId: string
  tournamentId: string
  player1Id: string
  player2Id: string
  winnerId: string | null
  round: number
  table?: number
}

// PlayerStatsUpdate interface is now imported from backend types

// Process a single match result and update player statistics
export const processMatchResult = async (
  prisma: PrismaClient,
  matchResult: MatchResult
): Promise<MatchProcessingResult> => {
  return await prisma.$transaction(async (tx) => {
    // Verify match exists and is in correct state
    const existingMatch = await tx.match.findUnique({
      where: { id: matchResult.matchId },
      include: {
        tournament: {
          include: {
            game: true,
          },
        },
        player1: {
          include: {
            gameStats: {
              where: { gameId: { not: undefined } },
            },
          },
        },
        player2: {
          include: {
            gameStats: {
              where: { gameId: { not: undefined } },
            },
          },
        },
      },
    })

    if (!existingMatch) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Match not found'
      })
    }

    if (existingMatch.status === 'COMPLETED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Match is already completed'
      })
    }

    // Validate winner
    if (matchResult.winnerId && 
        matchResult.winnerId !== matchResult.player1Id && 
        matchResult.winnerId !== matchResult.player2Id) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Winner must be one of the match players'
      })
    }

    const gameId = existingMatch.tournament.gameId
    const tournamentLevel = (existingMatch.tournament.tournamentLevel || 'LOCAL') as 
      'LOCAL' | 'REGIONAL' | 'NATIONAL' | 'INTERNATIONAL'

    // Get or create player game stats
    const [player1Stats, player2Stats] = await Promise.all([
      getOrCreatePlayerGameStats(tx, matchResult.player1Id, gameId),
      getOrCreatePlayerGameStats(tx, matchResult.player2Id, gameId),
    ])

    // Validate rating inputs
    validateRatingInputs(
      player1Stats.currentRating,
      player2Stats.currentRating,
      matchResult.winnerId,
      matchResult.player1Id,
      matchResult.player2Id
    )

    // Calculate games played for each player
    const player1SeasonalStats = player1Stats.seasonalStats as SeasonalStatsUpdate
    const player2SeasonalStats = player2Stats.seasonalStats as SeasonalStatsUpdate
    const player1GamesPlayed = (player1SeasonalStats?.wins || 0) + (player1SeasonalStats?.losses || 0)
    const player2GamesPlayed = (player2SeasonalStats?.wins || 0) + (player2SeasonalStats?.losses || 0)

    // Calculate new ratings
    const ratingChanges = calculateMatchRatingChanges(
      player1Stats.currentRating,
      player2Stats.currentRating,
      matchResult.winnerId,
      matchResult.player1Id,
      matchResult.player2Id,
      player1GamesPlayed,
      player2GamesPlayed,
      tournamentLevel
    )

    // Update match record
    const updatedMatch = await tx.match.update({
      where: { id: matchResult.matchId },
      data: {
        winnerId: matchResult.winnerId,
        status: 'COMPLETED',
      },
      include: {
        tournament: true,
        player1: true,
        player2: true,
        winner: true,
      },
    })

    // Prepare seasonal stats updates
    const player1CurrentStats = (player1Stats.seasonalStats as SeasonalStatsUpdate) || {
      wins: 0, losses: 0, tournaments: 0, points: 0
    }
    const player2CurrentStats = (player2Stats.seasonalStats as SeasonalStatsUpdate) || {
      wins: 0, losses: 0, tournaments: 0, points: 0
    }

    const player1StatsUpdate: SeasonalStatsUpdate = { ...player1CurrentStats }
    const player2StatsUpdate: SeasonalStatsUpdate = { ...player2CurrentStats }

    // Update win/loss records
    if (matchResult.winnerId === matchResult.player1Id) {
      player1StatsUpdate.wins = (player1StatsUpdate.wins || 0) + 1
      player2StatsUpdate.losses = (player2StatsUpdate.losses || 0) + 1
    } else if (matchResult.winnerId === matchResult.player2Id) {
      player1StatsUpdate.losses = (player1StatsUpdate.losses || 0) + 1
      player2StatsUpdate.wins = (player2StatsUpdate.wins || 0) + 1
    } else {
      // Draw - add draws field if it doesn't exist
      player1StatsUpdate.draws = (player1StatsUpdate.draws || 0) + 1
      player2StatsUpdate.draws = (player2StatsUpdate.draws || 0) + 1
    }

    // Update player game statistics
    await Promise.all([
      tx.playerGameStats.update({
        where: {
          playerId_gameId: {
            playerId: matchResult.player1Id,
            gameId,
          },
        },
        data: {
          currentRating: ratingChanges.player1NewRating,
          seasonalStats: player1StatsUpdate as unknown as Prisma.InputJsonValue,
        },
      }),
      tx.playerGameStats.update({
        where: {
          playerId_gameId: {
            playerId: matchResult.player2Id,
            gameId,
          },
        },
        data: {
          currentRating: ratingChanges.player2NewRating,
          seasonalStats: player2StatsUpdate as unknown as Prisma.InputJsonValue,
        },
      }),
    ])

    const playerUpdates: PlayerStatsUpdate[] = [
      {
        playerId: matchResult.player1Id,
        gameId,
        ratingChange: ratingChanges.player1RatingChange,
        newRating: ratingChanges.player1NewRating,
        seasonalStatsUpdate: {
          wins: matchResult.winnerId === matchResult.player1Id ? 1 : 0,
          losses: matchResult.winnerId === matchResult.player2Id ? 1 : 0,
          draws: matchResult.winnerId === null ? 1 : 0,
        },
      },
      {
        playerId: matchResult.player2Id,
        gameId,
        ratingChange: ratingChanges.player2RatingChange,
        newRating: ratingChanges.player2NewRating,
        seasonalStatsUpdate: {
          wins: matchResult.winnerId === matchResult.player2Id ? 1 : 0,
          losses: matchResult.winnerId === matchResult.player1Id ? 1 : 0,
          draws: matchResult.winnerId === null ? 1 : 0,
        },
      },
    ]

    return {
      match: updatedMatch,
      playerUpdates,
    }
  })
}

// Process tournament completion and calculate final standings
export const processTournamentCompletion = async (
  prisma: PrismaClient,
  tournamentId: string
): Promise<TournamentProcessingResult> => {
  return await prisma.$transaction(async (tx) => {
    // Get tournament with all matches
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        game: true,
        matches: {
          include: {
            player1: true,
            player2: true,
            winner: true,
          },
        },
      },
    })

    if (!tournament) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Tournament not found'
      })
    }

    if (tournament.status === 'COMPLETED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Tournament is already completed'
      })
    }

    // Check if all matches are completed
    const incompleteMatches = tournament.matches.filter(match => match.status !== 'COMPLETED')
    if (incompleteMatches.length > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Tournament has ${incompleteMatches.length} incomplete matches`
      })
    }

    // Calculate standings
    const standings = calculateTournamentStandings(tournament.matches)
    const totalPlayers = standings.length
    const tournamentLevel = (tournament.tournamentLevel || 'LOCAL') as 
      'LOCAL' | 'REGIONAL' | 'NATIONAL' | 'INTERNATIONAL'

    // Award championship points
    const championshipPointsUpdates: PlayerStatsUpdate[] = []
    
    for (let i = 0; i < standings.length; i++) {
      const standing = standings[i]
      const placement = i + 1
      const championshipPoints = calculateChampionshipPoints(
        placement, 
        totalPlayers, 
        tournamentLevel
      )

      if (championshipPoints > 0) {
        // Update player's seasonal stats with championship points
        const playerStats = await tx.playerGameStats.findUnique({
          where: {
            playerId_gameId: {
              playerId: standing.playerId as string,
              gameId: tournament.gameId,
            },
          },
        })

        if (playerStats) {
          const currentSeasonalStats = (playerStats.seasonalStats as SeasonalStatsUpdate) || { points: 0 }
          const updatedSeasonalStats: SeasonalStatsUpdate = {
            ...currentSeasonalStats,
            points: (currentSeasonalStats.points || 0) + championshipPoints,
            tournaments: (currentSeasonalStats.tournaments || 0) + 1,
          }

          await tx.playerGameStats.update({
            where: {
              playerId_gameId: {
                playerId: standing.playerId as string,
                gameId: tournament.gameId,
              },
            },
            data: {
              seasonalStats: updatedSeasonalStats as unknown as Prisma.InputJsonValue,
              bestFinish: playerStats.bestFinish 
                ? Math.min(playerStats.bestFinish, placement)
                : placement,
            },
          })

          championshipPointsUpdates.push({
            playerId: standing.playerId as string,
            gameId: tournament.gameId,
            ratingChange: 0,
            newRating: playerStats.currentRating,
            seasonalStatsUpdate: {
              tournaments: 1,
              points: championshipPoints,
            },
            championshipPoints,
          })
        }
      }
    }

    // Update tournament status
    const updatedTournament = await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: 'COMPLETED' },
      include: {
        game: true,
        store: true,
        organizer: true,
      },
    })

    return {
      tournament: updatedTournament,
      standings,
      championshipPointsAwarded: championshipPointsUpdates,
    }
  })
  .then(async (result) => {
    // Trigger ranking updates after successful tournament completion
    try {
      await triggerRankingUpdate(prisma, tournamentId)
    } catch (error) {
      console.error('Failed to trigger ranking update:', error)
      // Don't fail the transaction for ranking update errors
    }
    return result
  })
}

// Calculate tournament standings based on match results
const calculateTournamentStandings = (matches: Array<Record<string, unknown>>): TournamentStanding[] => {
  const playerStats = new Map<string, PlayerTournamentStats>()

  // Initialize player stats
  matches.forEach(match => {
    const player1Id = match.player1Id as string
    const player2Id = match.player2Id as string
    const player1 = match.player1 as { displayName?: string; user?: { name?: string } } | null
    const player2 = match.player2 as { displayName?: string; user?: { name?: string } } | null
    
    if (!playerStats.has(player1Id)) {
      playerStats.set(player1Id, {
        playerId: player1Id,
        playerName: player1?.displayName || player1?.user?.name || 'Unknown',
        wins: 0,
        losses: 0,
        draws: 0,
        matchWinPercentage: 0,
        opponentMatchWinPercentage: 0,
        gameWinPercentage: 0,
      })
    }
    if (!playerStats.has(player2Id)) {
      playerStats.set(player2Id, {
        playerId: player2Id,
        playerName: player2?.displayName || player2?.user?.name || 'Unknown',
        wins: 0,
        losses: 0,
        draws: 0,
        matchWinPercentage: 0,
        opponentMatchWinPercentage: 0,
        gameWinPercentage: 0,
      })
    }
  })

  // Calculate win/loss records
  matches.forEach(match => {
    const player1Id = match.player1Id as string
    const player2Id = match.player2Id as string
    const player1Stats = playerStats.get(player1Id)!
    const player2Stats = playerStats.get(player2Id)!

    if (match.winnerId === match.player1Id) {
      player1Stats.wins += 1
      player2Stats.losses += 1
    } else if (match.winnerId === match.player2Id) {
      player1Stats.wins += 1
      player2Stats.losses += 1
    } else {
      // Draw
      player1Stats.draws += 1
      player2Stats.draws += 1
    }
  })

  // Calculate match win percentages
  playerStats.forEach(stats => {
    const totalMatches = stats.wins + stats.losses + stats.draws
    if (totalMatches > 0) {
      stats.matchWinPercentage = (stats.wins + stats.draws * 0.5) / totalMatches
    }
  })

  // Sort by match win percentage (primary), then by opponent match win percentage (tiebreaker)
  const standings = Array.from(playerStats.values()).sort((a, b) => {
    if (a.matchWinPercentage !== b.matchWinPercentage) {
      return b.matchWinPercentage - a.matchWinPercentage
    }
    // Add more tiebreakers as needed
    return b.wins - a.wins
  })

  return standings
}

// Get or create player game stats
const getOrCreatePlayerGameStats = async (
  tx: PrismaTransaction,
  playerId: string,
  gameId: string
) => {
  let playerStats = await tx.playerGameStats.findUnique({
    where: {
      playerId_gameId: {
        playerId,
        gameId,
      },
    },
  })

  if (!playerStats) {
    playerStats = await tx.playerGameStats.create({
      data: {
        playerId,
        gameId,
        currentRating: ELO_CONFIG.STARTING_RATING,
        seasonalStats: {
          wins: 0,
          losses: 0,
          tournaments: 0,
          points: 0,
        },
        totalEarnings: 0,
      },
    })
  }

  return playerStats
}

// Batch process multiple match results
export const batchProcessMatchResults = async (
  prisma: PrismaClient,
  matchResults: MatchResult[]
): Promise<BatchMatchProcessingResult> => {
  const processedMatches: Array<Record<string, unknown>> = []
  const allPlayerUpdates: PlayerStatsUpdate[] = []
  const errors: { matchId: string; error: string }[] = []

  for (const matchResult of matchResults) {
    try {
      const result = await processMatchResult(prisma, matchResult)
      processedMatches.push(result.match)
      allPlayerUpdates.push(...result.playerUpdates)
    } catch (error) {
      errors.push({
        matchId: matchResult.matchId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return {
    processedMatches,
    playerUpdates: allPlayerUpdates,
    errors,
  }
}