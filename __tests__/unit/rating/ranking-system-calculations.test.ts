/**
 * Unit tests for Ranking System Calculations
 * 
 * Tests core ranking calculation logic, caching integration, and performance analytics.
 * These tests focus on the business logic functions that were previously untested.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  calculateSeasonalRankings,
  getRankingsWithCache,
  triggerRankingUpdate,
  analyzePerformanceTrends,
  batchUpdateRankings,
  getCurrentSeason,
  invalidateRankingCache,
  type SeasonalRankingData,
} from '@/lib/rating/ranking-system'
import { ELO_CONFIG } from '@/lib/rating/elo'

describe('Ranking System Calculations', () => {
  describe('calculateSeasonalRankings', () => {
    let mockPrisma: any

    beforeEach(() => {
      mockPrisma = {
        playerGameStats: {
          findMany: vi.fn(),
        },
        match: {
          findMany: vi.fn(),
        },
      }
    })

    it('should return empty array when no players have stats', async () => {
      mockPrisma.playerGameStats.findMany.mockResolvedValue([])

      const rankings = await calculateSeasonalRankings(mockPrisma, 'game-1', '2024-Q1')

      expect(rankings).toEqual([])
      expect(mockPrisma.playerGameStats.findMany).toHaveBeenCalledWith({
        where: {
          gameId: 'game-1',
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
    })

    it('should calculate rankings for players with no matches', async () => {
      mockPrisma.playerGameStats.findMany.mockResolvedValue([
        {
          playerId: 'player-1',
          gameId: 'game-1',
          currentRating: 1500,
          seasonalStats: { points: 0 },
          player: { id: 'player-1' },
        },
        {
          playerId: 'player-2',
          gameId: 'game-1',
          currentRating: 1400,
          seasonalStats: { points: 0 },
          player: { id: 'player-2' },
        },
      ])
      mockPrisma.match.findMany.mockResolvedValue([])

      const rankings = await calculateSeasonalRankings(mockPrisma, 'game-1', '2024-Q1')

      expect(rankings).toHaveLength(2)
      expect(rankings[0].playerId).toBe('player-1')
      expect(rankings[0].rank).toBe(1)
      expect(rankings[0].currentRating).toBe(1500)
      expect(rankings[0].seasonalStats).toEqual({
        wins: 0,
        losses: 0,
        draws: 0,
        tournaments: 0,
        points: 0,
      })
      expect(rankings[1].playerId).toBe('player-2')
      expect(rankings[1].rank).toBe(2)
    })

    it('should rank players by rating (highest first)', async () => {
      mockPrisma.playerGameStats.findMany.mockResolvedValue([
        {
          playerId: 'player-1',
          gameId: 'game-1',
          currentRating: 1300,
          seasonalStats: { points: 0 },
          player: { id: 'player-1' },
        },
        {
          playerId: 'player-2',
          gameId: 'game-1',
          currentRating: 1500,
          seasonalStats: { points: 0 },
          player: { id: 'player-2' },
        },
        {
          playerId: 'player-3',
          gameId: 'game-1',
          currentRating: 1400,
          seasonalStats: { points: 0 },
          player: { id: 'player-3' },
        },
      ])
      mockPrisma.match.findMany.mockResolvedValue([])

      const rankings = await calculateSeasonalRankings(mockPrisma, 'game-1', '2024-Q1')

      expect(rankings[0].playerId).toBe('player-2')
      expect(rankings[0].currentRating).toBe(1500)
      expect(rankings[0].rank).toBe(1)
      
      expect(rankings[1].playerId).toBe('player-3')
      expect(rankings[1].currentRating).toBe(1400)
      expect(rankings[1].rank).toBe(2)
      
      expect(rankings[2].playerId).toBe('player-1')
      expect(rankings[2].currentRating).toBe(1300)
      expect(rankings[2].rank).toBe(3)
    })

    it('should use championship points as tiebreaker for same rating', async () => {
      mockPrisma.playerGameStats.findMany.mockResolvedValue([
        {
          playerId: 'player-1',
          gameId: 'game-1',
          currentRating: 1500,
          seasonalStats: { points: 100 },
          player: { id: 'player-1' },
        },
        {
          playerId: 'player-2',
          gameId: 'game-1',
          currentRating: 1500,
          seasonalStats: { points: 150 },
          player: { id: 'player-2' },
        },
      ])
      mockPrisma.match.findMany.mockResolvedValue([])

      const rankings = await calculateSeasonalRankings(mockPrisma, 'game-1', '2024-Q1')

      expect(rankings[0].playerId).toBe('player-2')
      expect(rankings[0].seasonalStats.points).toBe(150)
      expect(rankings[1].playerId).toBe('player-1')
      expect(rankings[1].seasonalStats.points).toBe(100)
    })

    it('should calculate seasonal stats from matches', async () => {
      mockPrisma.playerGameStats.findMany.mockResolvedValue([
        {
          playerId: 'player-1',
          gameId: 'game-1',
          currentRating: 1500,
          seasonalStats: { points: 0 },
          player: { id: 'player-1' },
        },
        {
          playerId: 'player-2',
          gameId: 'game-1',
          currentRating: 1400,
          seasonalStats: { points: 0 },
          player: { id: 'player-2' },
        },
      ])

      mockPrisma.match.findMany.mockResolvedValue([
        {
          id: 'match-1',
          player1Id: 'player-1',
          player2Id: 'player-2',
          winnerId: 'player-1',
          tournamentId: 'tournament-1',
          status: 'COMPLETED',
          tournament: {
            date: new Date('2024-01-15'),
            tournamentLevel: 'local',
          },
          player1: {
            gameStats: [{ currentRating: 1500 }],
          },
          player2: {
            gameStats: [{ currentRating: 1400 }],
          },
        },
        {
          id: 'match-2',
          player1Id: 'player-2',
          player2Id: 'player-1',
          winnerId: 'player-2',
          tournamentId: 'tournament-1',
          status: 'COMPLETED',
          tournament: {
            date: new Date('2024-01-15'),
            tournamentLevel: 'local',
          },
          player1: {
            gameStats: [{ currentRating: 1400 }],
          },
          player2: {
            gameStats: [{ currentRating: 1500 }],
          },
        },
      ])

      const rankings = await calculateSeasonalRankings(mockPrisma, 'game-1', '2024-Q1')

      const player1Ranking = rankings.find(r => r.playerId === 'player-1')
      expect(player1Ranking?.seasonalStats.wins).toBe(1)
      expect(player1Ranking?.seasonalStats.losses).toBe(1)
      expect(player1Ranking?.seasonalStats.tournaments).toBe(1)
      expect(player1Ranking?.performance.totalGames).toBe(2)
      expect(player1Ranking?.performance.winRate).toBe(50) // Win rate is returned as percentage
    })

    it('should calculate average opponent rating', async () => {
      mockPrisma.playerGameStats.findMany.mockResolvedValue([
        {
          playerId: 'player-1',
          gameId: 'game-1',
          currentRating: 1500,
          seasonalStats: { points: 0 },
          player: { id: 'player-1' },
        },
      ])

      mockPrisma.match.findMany.mockResolvedValue([
        {
          id: 'match-1',
          player1Id: 'player-1',
          player2Id: 'player-2',
          winnerId: 'player-1',
          tournamentId: 'tournament-1',
          status: 'COMPLETED',
          tournament: {
            date: new Date('2024-01-15'),
            tournamentLevel: 'local',
          },
          player1: {
            gameStats: [{ currentRating: 1500 }],
          },
          player2: {
            gameStats: [{ currentRating: 1400 }],
          },
        },
        {
          id: 'match-2',
          player1Id: 'player-1',
          player2Id: 'player-3',
          winnerId: 'player-1',
          tournamentId: 'tournament-1',
          status: 'COMPLETED',
          tournament: {
            date: new Date('2024-01-15'),
            tournamentLevel: 'local',
          },
          player1: {
            gameStats: [{ currentRating: 1500 }],
          },
          player2: {
            gameStats: [{ currentRating: 1600 }],
          },
        },
      ])

      const rankings = await calculateSeasonalRankings(mockPrisma, 'game-1', '2024-Q1')

      const player1Ranking = rankings.find(r => r.playerId === 'player-1')
      // Average of 1400 and 1600 = 1500
      expect(player1Ranking?.performance.averageOpponentRating).toBe(1500)
    })

    it('should handle draws correctly', async () => {
      mockPrisma.playerGameStats.findMany.mockResolvedValue([
        {
          playerId: 'player-1',
          gameId: 'game-1',
          currentRating: 1500,
          seasonalStats: { points: 0 },
          player: { id: 'player-1' },
        },
      ])

      mockPrisma.match.findMany.mockResolvedValue([
        {
          id: 'match-1',
          player1Id: 'player-1',
          player2Id: 'player-2',
          winnerId: null, // Draw
          tournamentId: 'tournament-1',
          status: 'COMPLETED',
          tournament: {
            date: new Date('2024-01-15'),
            tournamentLevel: 'local',
          },
          player1: {
            gameStats: [{ currentRating: 1500 }],
          },
          player2: {
            gameStats: [{ currentRating: 1500 }],
          },
        },
      ])

      const rankings = await calculateSeasonalRankings(mockPrisma, 'game-1', '2024-Q1')

      const player1Ranking = rankings.find(r => r.playerId === 'player-1')
      expect(player1Ranking?.seasonalStats.draws).toBe(1)
      expect(player1Ranking?.seasonalStats.wins).toBe(0)
      expect(player1Ranking?.seasonalStats.losses).toBe(0)
    })

    it('should use starting rating for opponents without stats', async () => {
      mockPrisma.playerGameStats.findMany.mockResolvedValue([
        {
          playerId: 'player-1',
          gameId: 'game-1',
          currentRating: 1500,
          seasonalStats: { points: 0 },
          player: { id: 'player-1' },
        },
      ])

      mockPrisma.match.findMany.mockResolvedValue([
        {
          id: 'match-1',
          player1Id: 'player-1',
          player2Id: 'player-2',
          winnerId: 'player-1',
          tournamentId: 'tournament-1',
          status: 'COMPLETED',
          tournament: {
            date: new Date('2024-01-15'),
            tournamentLevel: 'local',
          },
          player1: {
            gameStats: [{ currentRating: 1500 }],
          },
          player2: {
            gameStats: [], // No stats
          },
        },
      ])

      const rankings = await calculateSeasonalRankings(mockPrisma, 'game-1', '2024-Q1')

      const player1Ranking = rankings.find(r => r.playerId === 'player-1')
      expect(player1Ranking?.performance.averageOpponentRating).toBe(ELO_CONFIG.STARTING_RATING)
    })

    it('should use current season when no season specified', async () => {
      const currentSeason = getCurrentSeason()
      
      mockPrisma.playerGameStats.findMany.mockResolvedValue([
        {
          playerId: 'player-1',
          gameId: 'game-1',
          currentRating: 1500,
          seasonalStats: { points: 0 },
          player: { id: 'player-1' },
        },
      ])
      mockPrisma.match.findMany.mockResolvedValue([])

      await calculateSeasonalRankings(mockPrisma, 'game-1')

      // Verify the match query was called (only happens if players exist)
      expect(mockPrisma.match.findMany).toHaveBeenCalled()
    })
  })

  describe('getRankingsWithCache', () => {
    let mockPrisma: any

    beforeEach(() => {
      mockPrisma = {
        playerGameStats: {
          findMany: vi.fn(),
        },
        match: {
          findMany: vi.fn(),
        },
      }
      
      // Clear cache before each test
      vi.clearAllMocks()
      
      // Clear the ranking cache
      invalidateRankingCache('game-1')
      invalidateRankingCache('game-2')
    })

    it('should calculate rankings on cache miss', async () => {
      mockPrisma.playerGameStats.findMany.mockResolvedValue([
        {
          playerId: 'player-1',
          gameId: 'game-1',
          currentRating: 1500,
          seasonalStats: { points: 0 },
          player: { id: 'player-1' },
        },
      ])
      mockPrisma.match.findMany.mockResolvedValue([])

      const rankings = await getRankingsWithCache(mockPrisma, 'game-1', '2024-Q1')

      expect(rankings).toHaveLength(1)
      expect(rankings[0].playerId).toBe('player-1')
      expect(mockPrisma.playerGameStats.findMany).toHaveBeenCalledTimes(1)
    })

    it('should return cached rankings on cache hit', async () => {
      mockPrisma.playerGameStats.findMany.mockResolvedValue([
        {
          playerId: 'player-1',
          gameId: 'game-1',
          currentRating: 1500,
          seasonalStats: { points: 0 },
          player: { id: 'player-1' },
        },
      ])
      mockPrisma.match.findMany.mockResolvedValue([])

      // First call - cache miss
      const rankings1 = await getRankingsWithCache(mockPrisma, 'game-1', '2024-Q1')
      
      // Second call - cache hit
      const rankings2 = await getRankingsWithCache(mockPrisma, 'game-1', '2024-Q1')

      expect(rankings1).toEqual(rankings2)
      // Should only calculate once
      expect(mockPrisma.playerGameStats.findMany).toHaveBeenCalledTimes(1)
    })

    it('should use current season when no season specified', async () => {
      mockPrisma.playerGameStats.findMany.mockResolvedValue([])
      mockPrisma.match.findMany.mockResolvedValue([])

      await getRankingsWithCache(mockPrisma, 'game-1')

      expect(mockPrisma.playerGameStats.findMany).toHaveBeenCalled()
    })
  })

  describe('triggerRankingUpdate', () => {
    let mockPrisma: any

    beforeEach(() => {
      mockPrisma = {
        tournament: {
          findUnique: vi.fn(),
        },
        playerGameStats: {
          findMany: vi.fn(),
        },
        match: {
          findMany: vi.fn(),
        },
      }
    })

    it('should do nothing if tournament not found', async () => {
      mockPrisma.tournament.findUnique.mockResolvedValue(null)

      await triggerRankingUpdate(mockPrisma, 'nonexistent')

      expect(mockPrisma.tournament.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent' },
        select: {
          gameId: true,
          date: true,
          status: true,
        },
      })
      // Should not attempt to calculate rankings
      expect(mockPrisma.playerGameStats.findMany).not.toHaveBeenCalled()
    })

    it('should do nothing if tournament not completed', async () => {
      mockPrisma.tournament.findUnique.mockResolvedValue({
        gameId: 'game-1',
        date: new Date('2024-01-15'),
        status: 'ACTIVE',
      })

      await triggerRankingUpdate(mockPrisma, 'tournament-1')

      expect(mockPrisma.playerGameStats.findMany).not.toHaveBeenCalled()
    })

    it('should pre-calculate rankings for completed tournament', async () => {
      mockPrisma.tournament.findUnique.mockResolvedValue({
        gameId: 'game-1',
        date: new Date('2024-01-15'),
        status: 'COMPLETED',
      })
      mockPrisma.playerGameStats.findMany.mockResolvedValue([])
      mockPrisma.match.findMany.mockResolvedValue([])

      await triggerRankingUpdate(mockPrisma, 'tournament-1')

      // Should attempt to calculate rankings
      expect(mockPrisma.playerGameStats.findMany).toHaveBeenCalled()
    })

    it('should handle errors gracefully during pre-calculation', async () => {
      mockPrisma.tournament.findUnique.mockResolvedValue({
        gameId: 'game-1',
        date: new Date('2024-01-15'),
        status: 'COMPLETED',
      })
      mockPrisma.playerGameStats.findMany.mockRejectedValue(new Error('Database error'))

      // Should not throw
      await expect(triggerRankingUpdate(mockPrisma, 'tournament-1')).resolves.not.toThrow()
    })
  })

  describe('analyzePerformanceTrends', () => {
    let mockPrisma: any

    beforeEach(() => {
      mockPrisma = {
        match: {
          findMany: vi.fn(),
        },
      }
    })

    it('should return low activity trend when no matches', async () => {
      mockPrisma.match.findMany.mockResolvedValue([])

      const trend = await analyzePerformanceTrends(mockPrisma, 'player-1', 'game-1', 'month')

      expect(trend).toEqual({
        playerId: 'player-1',
        gameId: 'game-1',
        period: 'month',
        ratingChange: 0,
        winRateChange: 0,
        activityLevel: 'low',
        trend: 'stable',
        confidence: 0,
      })
    })

    it('should detect improving trend', async () => {
      // Early matches: 1 win, 1 loss (50% win rate)
      // Late matches: 2 wins, 0 losses (100% win rate)
      mockPrisma.match.findMany.mockResolvedValue([
        {
          id: 'match-1',
          player1Id: 'player-1',
          player2Id: 'player-2',
          winnerId: 'player-1',
          tournamentId: 'tournament-1',
          tournament: { date: new Date('2024-01-01') },
        },
        {
          id: 'match-2',
          player1Id: 'player-1',
          player2Id: 'player-2',
          winnerId: 'player-2',
          tournamentId: 'tournament-1',
          tournament: { date: new Date('2024-01-02') },
        },
        {
          id: 'match-3',
          player1Id: 'player-1',
          player2Id: 'player-2',
          winnerId: 'player-1',
          tournamentId: 'tournament-1',
          tournament: { date: new Date('2024-01-15') },
        },
        {
          id: 'match-4',
          player1Id: 'player-1',
          player2Id: 'player-2',
          winnerId: 'player-1',
          tournamentId: 'tournament-1',
          tournament: { date: new Date('2024-01-16') },
        },
      ])

      const trend = await analyzePerformanceTrends(mockPrisma, 'player-1', 'game-1', 'month')

      expect(trend.trend).toBe('improving')
      expect(trend.winRateChange).toBeGreaterThan(0)
      expect(trend.ratingChange).toBeGreaterThan(0)
    })

    it('should detect declining trend', async () => {
      // Early matches: 2 wins, 0 losses (100% win rate)
      // Late matches: 0 wins, 2 losses (0% win rate)
      mockPrisma.match.findMany.mockResolvedValue([
        {
          id: 'match-1',
          player1Id: 'player-1',
          player2Id: 'player-2',
          winnerId: 'player-1',
          tournamentId: 'tournament-1',
          tournament: { date: new Date('2024-01-01') },
        },
        {
          id: 'match-2',
          player1Id: 'player-1',
          player2Id: 'player-2',
          winnerId: 'player-1',
          tournamentId: 'tournament-1',
          tournament: { date: new Date('2024-01-02') },
        },
        {
          id: 'match-3',
          player1Id: 'player-1',
          player2Id: 'player-2',
          winnerId: 'player-2',
          tournamentId: 'tournament-1',
          tournament: { date: new Date('2024-01-15') },
        },
        {
          id: 'match-4',
          player1Id: 'player-1',
          player2Id: 'player-2',
          winnerId: 'player-2',
          tournamentId: 'tournament-1',
          tournament: { date: new Date('2024-01-16') },
        },
      ])

      const trend = await analyzePerformanceTrends(mockPrisma, 'player-1', 'game-1', 'month')

      expect(trend.trend).toBe('declining')
      expect(trend.winRateChange).toBeLessThan(0)
      expect(trend.ratingChange).toBeLessThan(0)
    })

    it('should calculate activity level based on match frequency', async () => {
      // 20 matches in a month = high activity
      const matches = Array.from({ length: 20 }, (_, i) => ({
        id: `match-${i}`,
        player1Id: 'player-1',
        player2Id: 'player-2',
        winnerId: i % 2 === 0 ? 'player-1' : 'player-2',
        tournamentId: 'tournament-1',
        tournament: { date: new Date(`2024-01-${i + 1}`) },
      }))
      mockPrisma.match.findMany.mockResolvedValue(matches)

      const trend = await analyzePerformanceTrends(mockPrisma, 'player-1', 'game-1', 'month')

      expect(trend.activityLevel).toBe('high')
      expect(trend.confidence).toBe(1) // Full confidence with 20+ matches
    })

    it('should handle draws in win rate calculation', async () => {
      mockPrisma.match.findMany.mockResolvedValue([
        {
          id: 'match-1',
          player1Id: 'player-1',
          player2Id: 'player-2',
          winnerId: null, // Draw
          tournamentId: 'tournament-1',
          tournament: { date: new Date('2024-01-01') },
        },
        {
          id: 'match-2',
          player1Id: 'player-1',
          player2Id: 'player-2',
          winnerId: null, // Draw
          tournamentId: 'tournament-1',
          tournament: { date: new Date('2024-01-02') },
        },
      ])

      const trend = await analyzePerformanceTrends(mockPrisma, 'player-1', 'game-1', 'month')

      expect(trend.trend).toBe('stable')
      expect(trend.winRateChange).toBe(0)
    })

    it('should support different time periods', async () => {
      mockPrisma.match.findMany.mockResolvedValue([])

      const weekTrend = await analyzePerformanceTrends(mockPrisma, 'player-1', 'game-1', 'week')
      const monthTrend = await analyzePerformanceTrends(mockPrisma, 'player-1', 'game-1', 'month')
      const seasonTrend = await analyzePerformanceTrends(mockPrisma, 'player-1', 'game-1', 'season')

      expect(weekTrend.period).toBe('week')
      expect(monthTrend.period).toBe('month')
      expect(seasonTrend.period).toBe('season')
    })
  })

  describe('batchUpdateRankings', () => {
    let mockPrisma: any

    beforeEach(() => {
      mockPrisma = {
        playerGameStats: {
          findMany: vi.fn(),
        },
        match: {
          findMany: vi.fn(),
        },
      }
    })

    it('should update rankings for multiple games', async () => {
      mockPrisma.playerGameStats.findMany.mockResolvedValue([])
      mockPrisma.match.findMany.mockResolvedValue([])

      await batchUpdateRankings(mockPrisma, [
        { gameId: 'game-1', season: '2024-Q1' },
        { gameId: 'game-2', season: '2024-Q1' },
      ])

      expect(mockPrisma.playerGameStats.findMany).toHaveBeenCalledTimes(2)
    })

    it('should continue on error for individual updates', async () => {
      mockPrisma.playerGameStats.findMany
        .mockResolvedValueOnce([]) // First game succeeds
        .mockRejectedValueOnce(new Error('Database error')) // Second game fails
        .mockResolvedValueOnce([]) // Third game succeeds
      mockPrisma.match.findMany.mockResolvedValue([])

      // Should not throw
      await expect(
        batchUpdateRankings(mockPrisma, [
          { gameId: 'game-1' },
          { gameId: 'game-2' },
          { gameId: 'game-3' },
        ])
      ).resolves.not.toThrow()

      expect(mockPrisma.playerGameStats.findMany).toHaveBeenCalledTimes(3)
    })

    it('should handle empty update list', async () => {
      await batchUpdateRankings(mockPrisma, [])

      expect(mockPrisma.playerGameStats.findMany).not.toHaveBeenCalled()
    })
  })
})
