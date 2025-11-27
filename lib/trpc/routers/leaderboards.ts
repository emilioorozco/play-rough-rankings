import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from '../router-factory'
import { LeaderboardQuerySchema } from '@/lib/schemas'
import { calculatePerformanceMetrics } from '@/lib/rating/elo'
import { 
  getRankingsWithCache, 
  analyzePerformanceTrends, 
  invalidateRankingCache,
  batchUpdateRankings,
  getCurrentSeason,
  getSeasonDateRange 
} from '@/lib/rating/ranking-system'
import { getDisplayName, userPublicSelectMinimal } from '@/lib/utils/user'
import type {
  DateFilterClause,
  TournamentWhereClause,
  SeasonalStatsUpdate
} from '@/lib/types/backend'
import type { PrismaClient } from '@prisma/client'
import type {
  ApiLeaderboardData,
  ApiLeaderboardEntry,
  ApiGame
} from '@/lib/types/api'
import {
  TopPlayersQuerySchema,
  FilteredLeaderboardQuerySchema,
  HistoricalSeasonsQuerySchema,
  AvailableSeasonsQuerySchema,
  SeasonalCachedQuerySchema,
  PlayerTrendsQuerySchema,
  RefreshCacheQuerySchema,
  BatchRefreshCacheQuerySchema,
  RankingStatsQuerySchema,
  PlayerDeckStatsQuerySchema
} from '@/lib/schemas'

// Note: Season utilities are imported from ranking-system.ts to avoid duplication

export const leaderboardsRouter = router({
  // Get seasonal rankings by game
  getSeasonal: publicProcedure
    .input(LeaderboardQuerySchema.extend({
      season: z.string().optional(),
    }))
    .query(async ({ ctx, input }): Promise<ApiLeaderboardData> => {
      // Verify game exists
      const game = await ctx.prisma.game.findUnique({
        where: { id: input.gameId },
      })

      if (!game) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Game not found'
        })
      }

      const season = input.season || getCurrentSeason()
      const { start: seasonStart, end: seasonEnd } = getSeasonDateRange(season)

      // Get player stats for the game, ordered by rating
      const playerStats = await ctx.prisma.playerGameStats.findMany({
        where: {
          gameId: input.gameId,
          player: {
            user: {
              is: {
                userPreferences: {
                  is: {
                    profileVisibility: 'PUBLIC', // Only show public profiles
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
              user: { select: userPublicSelectMinimal },
            },
          },
        },
        orderBy: [
          { currentRating: 'desc' },
        ],
        take: input.limit,
      })

      // Sort by seasonal wins as secondary criteria
      playerStats.sort((a, b) => {
        // Primary sort: current rating (desc)
        if (a.currentRating !== b.currentRating) {
          return b.currentRating - a.currentRating
        }
        // Secondary sort: seasonal wins (desc)
        const aWins = (a.seasonalStats as SeasonalStatsUpdate)?.wins || 0
        const bWins = (b.seasonalStats as SeasonalStatsUpdate)?.wins || 0
        return bWins - aWins
      })

      // Calculate additional metrics for each player
      const leaderboard: ApiLeaderboardEntry[] = playerStats.map((stat, index) => {
        const seasonalStats = stat.seasonalStats as SeasonalStatsUpdate
        const metrics = calculatePerformanceMetrics(
          seasonalStats.wins || 0,
          seasonalStats.losses || 0
        )

        return {
          rank: index + 1,
          playerId: stat.playerId,
          displayName: getDisplayName(stat.player.user),
          currentRating: stat.currentRating,
          seasonalStats: {
            wins: seasonalStats.wins || 0,
            losses: seasonalStats.losses || 0,
            tournaments: seasonalStats.tournaments || 0,
            points: seasonalStats.points || 0,
          },
          performance: {
            winRate: metrics.winRate,
            totalGames: metrics.totalGames,
            winLossRatio: metrics.winLossRatio,
          },
          bestFinish: stat.bestFinish,
          totalEarnings: stat.totalEarnings,
        }
      })

      return {
        game: {
          id: game.id,
          name: game.name,
          shortName: game.shortName,
          isActive: game.isActive,
          createdAt: game.createdAt,
          updatedAt: game.updatedAt,
        },
        season,
        seasonStart: seasonStart.toISOString(),
        seasonEnd: seasonEnd.toISOString(),
        leaderboard,
        totalPlayers: leaderboard.length,
      }
    }),

  // Get top players listing with configurable limit
  getTopPlayers: publicProcedure
    .input(TopPlayersQuerySchema)
    .query(async ({ ctx, input }): Promise<{
      game: ApiGame;
      format?: string;
      topPlayers: Array<ApiLeaderboardEntry & {
        recentActivity: {
          tournaments: Array<{ id: string; name: string; date: Date; format: string }>;
          lastActive: Date | null;
        };
      }>;
      totalShown: number;
    }> => {
      // Verify game exists
      const game = await ctx.prisma.game.findUnique({
        where: { id: input.gameId },
      })

      if (!game) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Game not found'
        })
      }

      // Build where clause for format filtering
      const tournamentWhere: TournamentWhereClause = {
        gameId: input.gameId,
        status: 'COMPLETED',
      }

      if (input.format) {
        tournamentWhere.format = input.format
      }

      // Get top players based on current rating
      const topPlayers = await ctx.prisma.playerGameStats.findMany({
        where: {
          gameId: input.gameId,
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
              user: { select: userPublicSelectMinimal },
            },
          },
        },
        orderBy: [
          { currentRating: 'desc' },
        ],
        take: input.limit,
      })

      // Get recent tournament activity for each player
      const playerIds = topPlayers.map(p => p.playerId)
      const recentMatches = await ctx.prisma.match.findMany({
        where: {
          OR: [
            { player1Id: { in: playerIds } },
            { player2Id: { in: playerIds } },
          ],
          tournament: tournamentWhere,
        },
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              date: true,
              format: true,
            },
          },
        },
        orderBy: { tournament: { date: 'desc' } },
        take: 100, // Limit to recent matches
      })

      // Sort by championship points as secondary criteria
      topPlayers.sort((a, b) => {
        // Primary sort: current rating (desc)
        if (a.currentRating !== b.currentRating) {
          return b.currentRating - a.currentRating
        }
        // Secondary sort: championship points (desc)
        const aPoints = (a.seasonalStats as SeasonalStatsUpdate)?.points || 0
        const bPoints = (b.seasonalStats as SeasonalStatsUpdate)?.points || 0
        return bPoints - aPoints
      })

      // Calculate recent activity for each player
      const playersWithActivity = topPlayers.map((playerStat, index) => {
        const seasonalStats = playerStat.seasonalStats as SeasonalStatsUpdate
        const metrics = calculatePerformanceMetrics(
          seasonalStats.wins || 0,
          seasonalStats.losses || 0
        )

        // Find recent matches for this player
        const playerMatches = recentMatches.filter(match => 
          match.player1Id === playerStat.playerId || 
          match.player2Id === playerStat.playerId
        )

        const recentTournaments = playerMatches
          .map(match => match.tournament)
          .filter((tournament, idx, arr) => 
            arr.findIndex(t => t.id === tournament.id) === idx
          )
          .slice(0, 3) // Last 3 tournaments

        return {
          rank: index + 1,
          playerId: playerStat.playerId,
          displayName: getDisplayName(playerStat.player.user),
          currentRating: playerStat.currentRating,
          seasonalStats: {
            wins: seasonalStats.wins || 0,
            losses: seasonalStats.losses || 0,
            tournaments: seasonalStats.tournaments || 0,
            points: seasonalStats.points || 0,
          },
          performance: {
            winRate: metrics.winRate,
            totalGames: metrics.totalGames,
            winLossRatio: metrics.winLossRatio,
          },
          bestFinish: playerStat.bestFinish,
          totalEarnings: playerStat.totalEarnings,
          recentActivity: {
            tournaments: recentTournaments,
            lastActive: recentTournaments[0]?.date || null,
          },
        }
      })

      return {
        game: {
          id: game.id,
          name: game.name,
          shortName: game.shortName,
          isActive: game.isActive,
          createdAt: game.createdAt,
          updatedAt: game.updatedAt,
        },
        format: input.format,
        topPlayers: playersWithActivity,
        totalShown: playersWithActivity.length,
      }
    }),

  // Get leaderboard with filtering by game, format, and time period
  getFiltered: publicProcedure
    .input(FilteredLeaderboardQuerySchema)
    .query(async ({ ctx, input }): Promise<{
      game: ApiGame;
      format?: string;
      dateRange: {
        start?: Date;
        end?: Date;
      };
      leaderboard: Array<ApiLeaderboardEntry & {
        periodStats: {
          wins: number;
          losses: number;
          tournaments: number;
          totalMatches: number;
        };
      }>;
      totalPlayers: number;
      qualificationCriteria?: {
        minTournaments: number;
        totalQualified: number;
      };
    }> => {
      // Verify game exists
      const game = await ctx.prisma.game.findUnique({
        where: { id: input.gameId },
      })

      if (!game) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Game not found'
        })
      }

      // Build tournament filter for the time period and format
      const tournamentWhere: TournamentWhereClause = {
        gameId: input.gameId,
        status: 'COMPLETED',
      }

      if (input.format) {
        tournamentWhere.format = input.format
      }

      if (input.startDate || input.endDate) {
        tournamentWhere.date = {} as DateFilterClause
        if (input.startDate) {
          tournamentWhere.date.gte = input.startDate
        }
        if (input.endDate) {
          tournamentWhere.date.lte = input.endDate
        }
      }

      // Get tournaments in the specified period
      const tournaments = await ctx.prisma.tournament.findMany({
        where: tournamentWhere,
        select: { id: true },
      })

      const tournamentIds = tournaments.map(t => t.id)

      if (tournamentIds.length === 0) {
        return {
          game,
          format: input.format,
          dateRange: {
            start: input.startDate,
            end: input.endDate,
          },
          leaderboard: [],
          totalPlayers: 0,
        }
      }

      // Get all matches from these tournaments
      const matches = await ctx.prisma.match.findMany({
        where: {
          tournamentId: { in: tournamentIds },
          status: 'COMPLETED',
        },
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              date: true,
              format: true,
            },
          },
        },
      })

      // Calculate period-specific statistics for each player
      const playerStats = new Map<string, {
        playerId: string
        wins: number
        losses: number
        tournaments: Set<string>
        totalMatches: number
      }>()

      matches.forEach(match => {
        const { player1Id, player2Id, winnerId } = match

        // Initialize player stats if not exists
        if (!playerStats.has(player1Id)) {
          playerStats.set(player1Id, {
            playerId: player1Id,
            wins: 0,
            losses: 0,
            tournaments: new Set(),
            totalMatches: 0,
          })
        }
        if (!playerStats.has(player2Id)) {
          playerStats.set(player2Id, {
            playerId: player2Id,
            wins: 0,
            losses: 0,
            tournaments: new Set(),
            totalMatches: 0,
          })
        }

        const player1Stats = playerStats.get(player1Id)!
        const player2Stats = playerStats.get(player2Id)!

        // Update match counts
        player1Stats.totalMatches++
        player2Stats.totalMatches++
        player1Stats.tournaments.add(match.tournamentId)
        player2Stats.tournaments.add(match.tournamentId)

        // Update win/loss records
        if (winnerId === player1Id) {
          player1Stats.wins++
          player2Stats.losses++
        } else if (winnerId === player2Id) {
          player2Stats.wins++
          player1Stats.losses++
        }
        // Draws don't count as wins or losses
      })

      // Filter players by minimum tournament requirement
      const qualifiedPlayerIds = Array.from(playerStats.values())
        .filter(stats => stats.tournaments.size >= input.minTournaments)
        .map(stats => stats.playerId)

      if (qualifiedPlayerIds.length === 0) {
        return {
          game,
          format: input.format,
          dateRange: {
            start: input.startDate,
            end: input.endDate,
          },
          leaderboard: [],
          totalPlayers: 0,
        }
      }

      // Get current player data and ratings
      const players = await ctx.prisma.playerGameStats.findMany({
        where: {
          playerId: { in: qualifiedPlayerIds },
          gameId: input.gameId,
          player: {
            user: {
              userPreferences: {
                profileVisibility: 'PUBLIC',
              },
            },
          },
        },
        include: {
          player: {
            select: {
              id: true,
              user: { select: userPublicSelectMinimal },
            },
          },
        },
      })

      // Combine period stats with current ratings
      const leaderboard = players
        .map(playerData => {
          const periodStats = playerStats.get(playerData.playerId)!
          const metrics = calculatePerformanceMetrics(
            periodStats.wins,
            periodStats.losses
          )

          return {
            playerId: playerData.playerId,
            displayName: getDisplayName(playerData.player.user),
            currentRating: playerData.currentRating,
            periodStats: {
              wins: periodStats.wins,
              losses: periodStats.losses,
              tournaments: periodStats.tournaments.size,
              totalMatches: periodStats.totalMatches,
            },
            performance: {
              winRate: metrics.winRate,
              totalGames: metrics.totalGames,
              winLossRatio: metrics.winLossRatio,
            },
            bestFinish: playerData.bestFinish,
            totalEarnings: playerData.totalEarnings,
          }
        })
        .sort((a, b) => {
          // Sort by win rate first, then by current rating
          if (a.performance.winRate !== b.performance.winRate) {
            return b.performance.winRate - a.performance.winRate
          }
          return b.currentRating - a.currentRating
        })
        .slice(0, input.limit)
        .map((player, index) => ({
          ...player,
          rank: index + 1,
        }))

      return {
        game: {
          id: game.id,
          name: game.name,
          shortName: game.shortName,
          isActive: game.isActive,
          createdAt: game.createdAt,
          updatedAt: game.updatedAt,
        },
        format: input.format,
        dateRange: {
          start: input.startDate,
          end: input.endDate,
        },
        leaderboard,
        totalPlayers: leaderboard.length,
        qualificationCriteria: {
          minTournaments: input.minTournaments,
          totalQualified: qualifiedPlayerIds.length,
        },
      }
    }),

  // Get historical season data
  getHistoricalSeasons: publicProcedure
    .input(HistoricalSeasonsQuerySchema)
    .query(async ({ ctx, input }): Promise<{
      game: ApiGame;
      seasons: Array<{
        season: string;
        year: number;
        quarter: string;
        dateRange: { start: Date; end: Date };
        tournamentCount: number;
        playerCount: number;
        topPlayer?: {
          playerId: string;
          displayName: string;
          rating: number;
        };
      }>;
      totalSeasons: number;
    }> => {
      // Verify game exists
      const game = await ctx.prisma.game.findUnique({
        where: { id: input.gameId },
      })

      if (!game) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Game not found'
        })
      }

      const currentYear = new Date().getFullYear()
      const seasons: Array<{
        season: string
        year: number
        quarter: string
        dateRange: { start: Date; end: Date }
        tournamentCount: number
        playerCount: number
        topPlayer?: {
          playerId: string
          displayName: string
          rating: number
        }
      }> = []

      // Generate seasons for the requested years
      for (let year = currentYear; year > currentYear - input.years; year--) {
        for (const quarter of ['Q4', 'Q3', 'Q2', 'Q1']) {
          const season = `${year}-${quarter}`
          const dateRange = getSeasonDateRange(season)
          
          // Skip future seasons
          if (dateRange.start > new Date()) continue

          // Get tournament count for this season
          const tournamentCount = await ctx.prisma.tournament.count({
            where: {
              gameId: input.gameId,
              date: {
                gte: dateRange.start,
                lte: dateRange.end,
              },
              status: 'COMPLETED',
            },
          })

          // Get unique players who participated in this season
          const matches = await ctx.prisma.match.findMany({
            where: {
              tournament: {
                gameId: input.gameId,
                date: {
                  gte: dateRange.start,
                  lte: dateRange.end,
                },
                status: 'COMPLETED',
              },
              status: 'COMPLETED',
            },
            select: {
              player1Id: true,
              player2Id: true,
            },
          })

          const uniquePlayerIds = new Set<string>()
          matches.forEach(match => {
            uniquePlayerIds.add(match.player1Id)
            uniquePlayerIds.add(match.player2Id)
          })

          // Get top player for this season (if any tournaments occurred)
          let topPlayer: { playerId: string; displayName: string; rating: number } | undefined = undefined
          if (tournamentCount > 0 && uniquePlayerIds.size > 0) {
            const topPlayerStat = await ctx.prisma.playerGameStats.findFirst({
              where: {
                playerId: { in: Array.from(uniquePlayerIds) },
                gameId: input.gameId,
                player: {
                  user: {
                    userPreferences: {
                      profileVisibility: 'PUBLIC',
                    },
                  },
                },
              },
              include: {
                player: {
                  select: {
                    user: {
                      select: {
                        name: true,
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
              orderBy: { currentRating: 'desc' },
            })

            if (topPlayerStat) {
              topPlayer = {
                playerId: topPlayerStat.playerId,
                displayName: topPlayerStat.player.user.firstName || topPlayerStat.player.user.name || 'Anonymous Player',
                rating: topPlayerStat.currentRating,
              }
            }
          }

          seasons.push({
            season,
            year,
            quarter,
            dateRange,
            tournamentCount,
            playerCount: uniquePlayerIds.size,
            topPlayer,
          })
        }
      }

      // Sort seasons by date (most recent first)
      seasons.sort((a, b) => b.dateRange.start.getTime() - a.dateRange.start.getTime())

      return {
        game: {
          id: game.id,
          name: game.name,
          shortName: game.shortName,
          isActive: game.isActive,
          createdAt: game.createdAt,
          updatedAt: game.updatedAt,
        },
        seasons,
        totalSeasons: seasons.length,
      }
    }),

  // Get available seasons for a game
  getAvailableSeasons: publicProcedure
    .input(AvailableSeasonsQuerySchema)
    .query(async ({ ctx, input }): Promise<{
      game: ApiGame;
      seasons: string[];
      currentSeason: string;
      dateRange?: {
        earliest: Date;
        latest: Date;
      };
    }> => {
      // Verify game exists
      const game = await ctx.prisma.game.findUnique({
        where: { id: input.gameId },
      })

      if (!game) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Game not found'
        })
      }

      // Get the date range of all tournaments for this game
      const dateRange = await ctx.prisma.tournament.aggregate({
        where: {
          gameId: input.gameId,
          status: 'COMPLETED',
        },
        _min: { date: true },
        _max: { date: true },
      })

      if (!dateRange._min.date || !dateRange._max.date) {
        return {
          game,
          seasons: [],
          currentSeason: getCurrentSeason(),
        }
      }

      const startYear = dateRange._min.date.getFullYear()
      const endYear = dateRange._max.date.getFullYear()
      const seasons: string[] = []

      // Generate all possible seasons between start and end dates
      for (let year = endYear; year >= startYear; year--) {
        for (const quarter of ['Q4', 'Q3', 'Q2', 'Q1']) {
          const season = `${year}-${quarter}`
          const seasonRange = getSeasonDateRange(season)
          
          // Only include seasons that have some overlap with tournament data
          if (seasonRange.end >= dateRange._min.date && seasonRange.start <= dateRange._max.date) {
            seasons.push(season)
          }
        }
      }

      return {
        game: {
          id: game.id,
          name: game.name,
          shortName: game.shortName,
          isActive: game.isActive,
          createdAt: game.createdAt,
          updatedAt: game.updatedAt,
        },
        seasons,
        currentSeason: getCurrentSeason(),
        dateRange: {
          earliest: dateRange._min.date,
          latest: dateRange._max.date,
        },
      }
    }),

  // Get cached seasonal rankings (optimized version)
  getSeasonalCached: publicProcedure
    .input(SeasonalCachedQuerySchema)
    .query(async ({ ctx, input }): Promise<ApiLeaderboardData> => {
      // Verify game exists
      const game = await ctx.prisma.game.findUnique({
        where: { id: input.gameId },
      })

      if (!game) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Game not found'
        })
      }

      const season = input.season || getCurrentSeason()
      
      // Get rankings using the caching system
      const rankings = await getRankingsWithCache(ctx.basePrisma, input.gameId, season)
      
      // Apply limit
      const limitedRankings = rankings.slice(0, input.limit)
      const playerIds = [...new Set(limitedRankings.map(ranking => ranking.playerId))]

      // Fetch player metadata required for API response fields
      const leaderboardPlayers = playerIds.length > 0
        ? await ctx.prisma.playerGameStats.findMany({
            where: {
              playerId: { in: playerIds },
              gameId: input.gameId,
            },
            include: {
              player: {
                select: {
                  id: true,
                  user: { select: userPublicSelectMinimal },
                },
              },
            },
          })
        : []

      const playerMetadata = new Map(
        leaderboardPlayers.map(playerStat => [playerStat.playerId, playerStat])
      )

      const { start: seasonStart, end: seasonEnd } = getSeasonDateRange(season)

      const leaderboard: ApiLeaderboardEntry[] = limitedRankings.map(entry => {
        const playerStat = playerMetadata.get(entry.playerId)
        return {
          rank: entry.rank,
          playerId: entry.playerId,
          displayName: playerStat
            ? getDisplayName(playerStat.player.user)
            : 'Unknown Player',
          currentRating: entry.currentRating,
          seasonalStats: {
            wins: entry.seasonalStats.wins,
            losses: entry.seasonalStats.losses,
            tournaments: entry.seasonalStats.tournaments,
            points: entry.seasonalStats.points,
          },
          performance: {
            winRate: entry.performance.winRate,
            totalGames: entry.performance.totalGames,
            winLossRatio: entry.performance.winLossRatio,
          },
          bestFinish: playerStat?.bestFinish ?? null,
          totalEarnings: playerStat?.totalEarnings ?? 0,
        }
      })

      return {
        game: {
          id: game.id,
          name: game.name,
          shortName: game.shortName,
          isActive: game.isActive,
          createdAt: game.createdAt,
          updatedAt: game.updatedAt,
        },
        season,
        seasonStart: seasonStart.toISOString(),
        seasonEnd: seasonEnd.toISOString(),
        leaderboard,
        totalPlayers: rankings.length,
        cached: true,
      }
    }),

  // Get performance trends for a player
  getPlayerTrends: publicProcedure
    .input(PlayerTrendsQuerySchema)
    .query(async ({ ctx, input }): Promise<{
      game: ApiGame;
      player: {
        id: string;
        displayName: string;
      };
      trends: unknown;
    }> => {
      // Verify game exists
      const game = await ctx.prisma.game.findUnique({
        where: { id: input.gameId },
      })

      if (!game) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Game not found'
        })
      }

      // Verify player exists and check privacy
      const player = await ctx.prisma.player.findUnique({
        where: { id: input.playerId },
        include: {
          user: {
            select: {
              name: true,
              firstName: true,
              lastName: true,
              userPreferences: {
                select: { profileVisibility: true },
              },
            },
          },
        },
      })

      if (!player) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Player not found'
        })
      }

      if (player.user.userPreferences?.profileVisibility !== 'PUBLIC') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This player profile is private'
        })
      }

      // Analyze performance trends
      const trends = await analyzePerformanceTrends(
        ctx.basePrisma,
        input.playerId,
        input.gameId,
        input.period
      )

      return {
        game: {
          id: game.id,
          name: game.name,
          shortName: game.shortName,
          isActive: game.isActive,
          createdAt: game.createdAt,
          updatedAt: game.updatedAt,
        },
        player: {
          id: player.id,
          displayName: getDisplayName(player.user),
        },
        trends,
      }
    }),

  // Refresh rankings cache (admin only)
  refreshCache: protectedProcedure
    .input(RefreshCacheQuerySchema)
    .mutation(async ({ ctx, input }): Promise<{
      success: boolean;
      message: string;
      rankingsCount: number;
      season: string;
    }> => {
      // TODO: Add admin role check when auth is fully implemented
      
      // Verify game exists
      const game = await ctx.prisma.game.findUnique({
        where: { id: input.gameId },
      })

      if (!game) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Game not found'
        })
      }

      const season = input.season || getCurrentSeason()

      // Invalidate cache
      invalidateRankingCache(input.gameId, season)

      // Recalculate rankings
      const rankings = await getRankingsWithCache(ctx.basePrisma, input.gameId, season)

      return {
        success: true,
        message: `Rankings cache refreshed for ${game.name} - ${season}`,
        rankingsCount: rankings.length,
        season,
      }
    }),

  // Batch refresh multiple game rankings (admin only)
  batchRefreshCache: protectedProcedure
    .input(BatchRefreshCacheQuerySchema)
    .mutation(async ({ ctx, input }): Promise<{
      success: boolean;
      message: string;
      updates: Array<{ gameId: string; season?: string }>;
    }> => {
      // TODO: Add admin role check when auth is fully implemented

      // Validate all games exist
      const gameIds = input.updates.map(u => u.gameId)
      const games = await ctx.prisma.game.findMany({
        where: { id: { in: gameIds } },
      })

      if (games.length !== gameIds.length) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'One or more games not found'
        })
      }

      // Batch update rankings
      await batchUpdateRankings(ctx.basePrisma, input.updates)

      return {
        success: true,
        message: `Batch refresh completed for ${input.updates.length} game/season combinations`,
        updates: input.updates,
      }
    }),

  // Get ranking statistics and cache info
  getRankingStats: publicProcedure
    .input(RankingStatsQuerySchema)
    .query(async ({ ctx, input }): Promise<{
      game: ApiGame;
      season: string;
      statistics: {
        totalPlayers: number;
        activePlayers: number;
        averageRating: number;
        topPerformers: Array<{
          playerId: string;
          rank: number;
          rating: number;
          winRate: number;
          tournaments: number;
        }>;
        mostActive: Array<{
          playerId: string;
          totalGames: number;
          tournaments: number;
          winRate: number;
        }>;
        popularDecks: Array<{
          deckId: string | null;
          name: string;
          archetype: string;
          usage: number;
        }>;
      };
      lastUpdated: Date;
    }> => {
      // Verify game exists
      const game = await ctx.prisma.game.findUnique({
        where: { id: input.gameId },
      })

      if (!game) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Game not found'
        })
      }

      const currentSeason = getCurrentSeason()
      
      // Get current season rankings
      const currentRankings = await getRankingsWithCache(ctx.basePrisma, input.gameId, currentSeason)
      
      // Calculate statistics
      const totalPlayers = currentRankings.length
      const activePlayers = currentRankings.filter(r => r.performance.totalGames > 0).length
      const averageRating = totalPlayers > 0 
        ? Math.round(currentRankings.reduce((sum, r) => sum + r.currentRating, 0) / totalPlayers)
        : 1200

      // Get top performers
      const topPerformers = currentRankings.slice(0, 5).map(r => ({
        playerId: r.playerId,
        rank: r.rank,
        rating: r.currentRating,
        winRate: r.performance.winRate,
        tournaments: r.seasonalStats.tournaments,
      }))

      // Get most active players
      const mostActive = [...currentRankings]
        .sort((a, b) => b.performance.totalGames - a.performance.totalGames)
        .slice(0, 5)
        .map(r => ({
          playerId: r.playerId,
          totalGames: r.performance.totalGames,
          tournaments: r.seasonalStats.tournaments,
          winRate: r.performance.winRate,
        }))

      // Get popular decks for this season
      const { start: seasonStart, end: seasonEnd } = getSeasonDateRange(currentSeason)
      const popularDecks = await ctx.prisma.tournamentEntry.groupBy({
        by: ['deckId'],
        where: {
          tournament: {
            gameId: input.gameId,
            date: {
              gte: seasonStart,
              lte: seasonEnd,
            },
            status: 'COMPLETED',
          },
          deckId: { not: null },
        },
        _count: {
          deckId: true,
        },
        orderBy: {
          _count: {
            deckId: 'desc',
          },
        },
        take: 5,
      })

      // Get deck details for popular decks
      const deckIds = popularDecks.map(d => d.deckId).filter((id): id is string => id !== null)
      const deckDetails = await ctx.prisma.deck.findMany({
        where: { id: { in: deckIds } },
        select: {
          id: true,
          name: true,
          archetype: true,
        },
      })

      const popularDecksWithDetails = popularDecks.map(deck => {
        const details = deckDetails.find(d => d.id === deck.deckId)
        return {
          deckId: deck.deckId,
          name: details?.name || 'Unknown Deck',
          archetype: details?.archetype || 'Unknown',
          usage: deck._count.deckId,
        }
      })

      return {
        game: {
          id: game.id,
          name: game.name,
          shortName: game.shortName,
          isActive: game.isActive,
          createdAt: game.createdAt,
          updatedAt: game.updatedAt,
        },
        season: currentSeason,
        statistics: {
          totalPlayers,
          activePlayers,
          averageRating,
          topPerformers,
          mostActive,
          popularDecks: popularDecksWithDetails,
        },
        lastUpdated: new Date(),
      }
    }),

  // Get player deck usage statistics
  getPlayerDeckStats: publicProcedure
    .input(PlayerDeckStatsQuerySchema)
    .query(async ({ ctx, input }): Promise<{
      game: ApiGame;
      player: {
        id: string;
        displayName: string;
      };
      season: string;
      deckStats: Array<{
        deckId: string;
        deckName: string;
        archetype: string;
        format: string;
        usage: number;
        wins: number;
        losses: number;
        draws: number;
        winRate: number;
        tournaments: string[];
        tournamentCount: number;
        totalGames: number;
        lastUsed: Date;
      }>;
      totalDecksUsed: number;
      totalTournaments: number;
    }> => {
      // Verify game exists
      const game = await ctx.prisma.game.findUnique({
        where: { id: input.gameId },
      })

      if (!game) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Game not found'
        })
      }

      // Verify player exists and check privacy
      const player = await ctx.prisma.player.findUnique({
        where: { id: input.playerId },
        include: {
          user: {
            select: {
              name: true,
              firstName: true,
              lastName: true,
              userPreferences: {
                select: { profileVisibility: true },
              },
            },
          },
        },
      })

      if (!player) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Player not found'
        })
      }

      if (player.user.userPreferences?.profileVisibility !== 'PUBLIC') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This player profile is private'
        })
      }

      const season = input.season || getCurrentSeason()
      const { start: seasonStart, end: seasonEnd } = getSeasonDateRange(season)

      // Get player's tournament entries for the season
      const entries = await ctx.prisma.tournamentEntry.findMany({
        where: {
          playerId: input.playerId,
          tournament: {
            gameId: input.gameId,
            date: {
              gte: seasonStart,
              lte: seasonEnd,
            },
            status: 'COMPLETED',
          },
          deckId: { not: null },
        },
        include: {
          deck: {
            select: {
              id: true,
              name: true,
              archetype: true,
              format: true,
            },
          },
          tournament: {
            select: {
              name: true,
              date: true,
              format: true,
            },
          },
        },
        orderBy: {
          tournament: { date: 'desc' },
        },
      })

      // Group by deck and calculate statistics
      const deckStats = new Map<string, {
        deckId: string
        deckName: string
        archetype: string
        format: string
        usage: number
        wins: number
        losses: number
        draws: number
        winRate: number
        tournaments: string[]
        lastUsed: Date
      }>()

      entries.forEach(entry => {
        if (!entry.deck) return

        const deckId = entry.deck.id
        if (!deckStats.has(deckId)) {
          deckStats.set(deckId, {
            deckId,
            deckName: entry.deck.name,
            archetype: entry.deck.archetype,
            format: entry.deck.format,
            usage: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            winRate: 0,
            tournaments: [],
            lastUsed: entry.tournament.date,
          })
        }

        const stats = deckStats.get(deckId)!
        stats.usage++
        stats.tournaments.push(entry.tournament.name)
        
        if (entry.tournament.date > stats.lastUsed) {
          stats.lastUsed = entry.tournament.date
        }

        if (entry.record) {
          const record = entry.record as { wins?: number; losses?: number; draws?: number }
          stats.wins += record.wins || 0
          stats.losses += record.losses || 0
          stats.draws += record.draws || 0
        }
      })

      // Calculate win rates
      const playerDeckStats = Array.from(deckStats.values()).map(stats => {
        const totalGames = stats.wins + stats.losses + stats.draws
        stats.winRate = totalGames > 0 ? (stats.wins / totalGames) * 100 : 0
        
        return {
          ...stats,
          winRate: Math.round(stats.winRate * 100) / 100,
          totalGames,
          tournamentCount: stats.tournaments.length,
        }
      }).sort((a, b) => b.usage - a.usage)

      return {
        game,
        player: {
          id: player.id,
          displayName: getDisplayName(player.user),
        },
        season,
        deckStats: playerDeckStats,
        totalDecksUsed: playerDeckStats.length,
        totalTournaments: entries.length,
      }
    }),
})