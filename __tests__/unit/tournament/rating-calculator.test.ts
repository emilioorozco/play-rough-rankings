/**
 * Unit tests for RatingCalculator
 * 
 * Tests projected rating calculations, rating application, and cache management.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RatingCalculator } from '@/lib/tournament/rating-calculator'
import { TRPCError } from '@trpc/server'
import { createMockPrisma, type MockPrisma } from '@/__tests__/__mocks__/prisma'

let mockPrisma: MockPrisma

describe('RatingCalculator', () => {
  let ratingCalculator: RatingCalculator

  beforeEach(() => {
    mockPrisma = createMockPrisma()
    ratingCalculator = new RatingCalculator(mockPrisma)
    vi.clearAllMocks()
  })

  describe('calculateProjectedRatings', () => {
    it('should calculate projected ratings for all tournament participants with completed matches', async () => {
      const tournamentId = 'tournament-123'
      const gameId = 'game-123'

      // Mock tournament data
      mockPrisma.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        gameId,
        tournamentLevel: 'LOCAL',
        matches: [],
      })

      // Mock tournament entries
      mockPrisma.tournamentEntry.findMany.mockResolvedValue([
        {
          playerId: 'player-1',
          player: {
            gameStats: [
              {
                currentRating: 1200,
                seasonalStats: { totalGames: 10 },
              },
            ],
          },
        },
        {
          playerId: 'player-2',
          player: {
            gameStats: [
              {
                currentRating: 1300,
                seasonalStats: { totalGames: 15 },
              },
            ],
          },
        },
      ])

      // Mock completed matches - player-1 vs player-2
      mockPrisma.match.findMany.mockResolvedValue([
        {
          player1Id: 'player-1',
          player2Id: 'player-2',
          winnerId: 'player-1',
          player1: {
            gameStats: [{ currentRating: 1200, seasonalStats: { totalGames: 10 } }],
          },
          player2: {
            gameStats: [{ currentRating: 1300, seasonalStats: { totalGames: 15 } }],
          },
        },
      ])

      const result = await ratingCalculator.calculateProjectedRatings(tournamentId)

      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('playerId')
      expect(result[0]).toHaveProperty('gameId')
      expect(result[0]).toHaveProperty('currentRating')
      expect(result[0]).toHaveProperty('projectedRating')
      expect(result[0]).toHaveProperty('ratingChange')
      expect(result[0]).toHaveProperty('matchesConsidered')
      expect(result[0]).toHaveProperty('confidence')
    })

    it('should throw error if tournament not found', async () => {
      mockPrisma.tournament.findUnique.mockResolvedValue(null)

      await expect(
        ratingCalculator.calculateProjectedRatings('invalid-id')
      ).rejects.toThrow(TRPCError)
    })

    it('should calculate confidence level based on matches played', async () => {
      const tournamentId = 'tournament-123'
      const gameId = 'game-123'

      mockPrisma.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        gameId,
        tournamentLevel: 'LOCAL',
        matches: [],
      })

      mockPrisma.tournamentEntry.findMany.mockResolvedValue([
        {
          playerId: 'player-1',
          player: {
            gameStats: [
              {
                currentRating: 1200,
                seasonalStats: { totalGames: 10 },
              },
            ],
          },
        },
      ])

      // Mock 5 completed matches for HIGH confidence
      mockPrisma.match.findMany.mockResolvedValue([
        {
          player1Id: 'player-1',
          player2Id: 'player-2',
          winnerId: 'player-1',
          player1: {
            gameStats: [{ currentRating: 1200, seasonalStats: { totalGames: 10 } }],
          },
          player2: {
            gameStats: [{ currentRating: 1300, seasonalStats: { totalGames: 15 } }],
          },
        },
        {
          player1Id: 'player-1',
          player2Id: 'player-3',
          winnerId: 'player-1',
          player1: {
            gameStats: [{ currentRating: 1200, seasonalStats: { totalGames: 10 } }],
          },
          player2: {
            gameStats: [{ currentRating: 1250, seasonalStats: { totalGames: 12 } }],
          },
        },
        {
          player1Id: 'player-1',
          player2Id: 'player-4',
          winnerId: 'player-1',
          player1: {
            gameStats: [{ currentRating: 1200, seasonalStats: { totalGames: 10 } }],
          },
          player2: {
            gameStats: [{ currentRating: 1280, seasonalStats: { totalGames: 14 } }],
          },
        },
        {
          player1Id: 'player-1',
          player2Id: 'player-5',
          winnerId: 'player-1',
          player1: {
            gameStats: [{ currentRating: 1200, seasonalStats: { totalGames: 10 } }],
          },
          player2: {
            gameStats: [{ currentRating: 1220, seasonalStats: { totalGames: 11 } }],
          },
        },
        {
          player1Id: 'player-1',
          player2Id: 'player-6',
          winnerId: 'player-1',
          player1: {
            gameStats: [{ currentRating: 1200, seasonalStats: { totalGames: 10 } }],
          },
          player2: {
            gameStats: [{ currentRating: 1240, seasonalStats: { totalGames: 13 } }],
          },
        },
      ])

      const result = await ratingCalculator.calculateProjectedRatings(tournamentId)

      expect(result[0].confidence).toBe('HIGH')
      expect(result[0].matchesConsidered).toBe(5)
    })

    it('should skip players without completed matches', async () => {
      const tournamentId = 'tournament-123'
      const gameId = 'game-123'

      mockPrisma.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        gameId,
        tournamentLevel: 'LOCAL',
        matches: [],
      })

      mockPrisma.tournamentEntry.findMany.mockResolvedValue([
        {
          playerId: 'player-1',
          player: {
            gameStats: [
              {
                currentRating: 1200,
                seasonalStats: { totalGames: 10 },
              },
            ],
          },
        },
        {
          playerId: 'player-2',
          player: {
            gameStats: [
              {
                currentRating: 1300,
                seasonalStats: { totalGames: 15 },
              },
            ],
          },
        },
      ])

      // Only player-2 has completed a match
      mockPrisma.match.findMany.mockResolvedValue([
        {
          player1Id: 'player-2',
          player2Id: 'player-3',
          winnerId: 'player-2',
          player1: {
            gameStats: [{ currentRating: 1300, seasonalStats: { totalGames: 15 } }],
          },
          player2: {
            gameStats: [{ currentRating: 1250, seasonalStats: { totalGames: 12 } }],
          },
        },
      ])

      const result = await ratingCalculator.calculateProjectedRatings(tournamentId)

      // Should only include player-2 (has completed matches)
      expect(result).toHaveLength(1)
      expect(result[0].playerId).toBe('player-2')
    })

    it('should use cache for repeated calls within TTL', async () => {
      const tournamentId = 'tournament-123'
      const gameId = 'game-123'

      mockPrisma.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        gameId,
        tournamentLevel: 'LOCAL',
        matches: [],
      })

      mockPrisma.tournamentEntry.findMany.mockResolvedValue([
        {
          playerId: 'player-1',
          player: {
            gameStats: [
              {
                currentRating: 1200,
                seasonalStats: { totalGames: 10 },
              },
            ],
          },
        },
      ])

      mockPrisma.match.findMany.mockResolvedValue([])

      // First call
      await ratingCalculator.calculateProjectedRatings(tournamentId)

      // Second call should use cache
      await ratingCalculator.calculateProjectedRatings(tournamentId)

      // Should only call database once
      expect(mockPrisma.tournament.findUnique).toHaveBeenCalledTimes(1)
    })
  })

  describe('applyRatingChanges', () => {
    it('should apply rating changes to all players with completed matches', async () => {
      const tournamentId = 'tournament-123'
      const gameId = 'game-123'

      // Mock tournament and entries
      mockPrisma.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        gameId,
        tournamentLevel: 'LOCAL',
        status: 'COMPLETED',
        date: new Date('2024-01-15'),
        matches: [],
      })

      mockPrisma.tournamentEntry.findMany.mockResolvedValue([
        {
          playerId: 'player-1',
          player: {
            gameStats: [
              {
                currentRating: 1200,
                seasonalStats: { totalGames: 10 },
              },
            ],
          },
        },
      ])

      // Add a completed match for player-1
      mockPrisma.match.findMany.mockResolvedValue([
        {
          player1Id: 'player-1',
          player2Id: 'player-2',
          winnerId: 'player-1',
          player1: {
            gameStats: [{ currentRating: 1200, seasonalStats: { totalGames: 10 } }],
          },
          player2: {
            gameStats: [{ currentRating: 1300, seasonalStats: { totalGames: 15 } }],
          },
        },
      ])

      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          playerGameStats: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        })
      })

      const result = await ratingCalculator.applyRatingChanges(tournamentId)

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('playerId')
      expect(result[0]).toHaveProperty('gameId')
      expect(result[0]).toHaveProperty('oldRating')
      expect(result[0]).toHaveProperty('newRating')
      expect(result[0]).toHaveProperty('ratingChange')
      expect(mockPrisma.$transaction).toHaveBeenCalled()
    })

    it('should update seasonal stats with tournament results', async () => {
      const tournamentId = 'tournament-123'
      const gameId = 'game-123'
      const playerId = 'player-1'

      mockPrisma.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        gameId,
        tournamentLevel: 'LOCAL',
        status: 'COMPLETED',
        date: new Date('2024-01-15'),
        matches: [],
      })

      mockPrisma.tournamentEntry.findMany.mockResolvedValue([
        {
          playerId,
          player: {
            gameStats: [
              {
                currentRating: 1200,
                seasonalStats: { 
                  totalGames: 10,
                  wins: 5,
                  losses: 5,
                  draws: 0,
                  tournaments: 2
                },
              },
            ],
          },
        },
      ])

      // Mock completed matches - player won 2, lost 1
      mockPrisma.match.findMany.mockResolvedValue([
        {
          player1Id: playerId,
          player2Id: 'player-2',
          winnerId: playerId,
          player1: {
            gameStats: [{ currentRating: 1200, seasonalStats: { totalGames: 10 } }],
          },
          player2: {
            gameStats: [{ currentRating: 1300, seasonalStats: { totalGames: 15 } }],
          },
        },
        {
          player1Id: playerId,
          player2Id: 'player-3',
          winnerId: playerId,
          player1: {
            gameStats: [{ currentRating: 1200, seasonalStats: { totalGames: 10 } }],
          },
          player2: {
            gameStats: [{ currentRating: 1250, seasonalStats: { totalGames: 12 } }],
          },
        },
        {
          player1Id: playerId,
          player2Id: 'player-4',
          winnerId: 'player-4',
          player1: {
            gameStats: [{ currentRating: 1200, seasonalStats: { totalGames: 10 } }],
          },
          player2: {
            gameStats: [{ currentRating: 1280, seasonalStats: { totalGames: 14 } }],
          },
        },
      ])

      let capturedSeasonalStats: any = null

      // Mock transaction to capture the seasonal stats update
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          playerGameStats: {
            updateMany: vi.fn().mockImplementation((args: any) => {
              capturedSeasonalStats = args.data.seasonalStats
              return Promise.resolve({ count: 1 })
            }),
          },
        })
      })

      await ratingCalculator.applyRatingChanges(tournamentId)

      // Verify seasonal stats were updated correctly
      expect(capturedSeasonalStats).toBeDefined()
      expect(capturedSeasonalStats.totalGames).toBe(13) // 10 + 3 new matches
      expect(capturedSeasonalStats.wins).toBe(7) // 5 + 2 new wins
      expect(capturedSeasonalStats.losses).toBe(6) // 5 + 1 new loss
      expect(capturedSeasonalStats.draws).toBe(0)
      expect(capturedSeasonalStats.tournaments).toBe(3) // 2 + 1 new tournament
      expect(capturedSeasonalStats.lastTournamentDate).toBeDefined()
    })

    it('should invalidate cache after applying changes', async () => {
      const tournamentId = 'tournament-123'
      const gameId = 'game-123'

      mockPrisma.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        gameId,
        tournamentLevel: 'LOCAL',
        status: 'COMPLETED',
        date: new Date('2024-01-15'),
        matches: [],
      })

      mockPrisma.tournamentEntry.findMany.mockResolvedValue([
        {
          playerId: 'player-1',
          player: {
            gameStats: [
              {
                currentRating: 1200,
                seasonalStats: { totalGames: 10 },
              },
            ],
          },
        },
      ])

      mockPrisma.match.findMany.mockResolvedValue([])

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          playerGameStats: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        })
      })

      // First call to populate cache
      await ratingCalculator.calculateProjectedRatings(tournamentId)

      // Apply changes (should invalidate cache)
      // Note: applyRatingChanges now makes additional calls for tournament details and entries
      await ratingCalculator.applyRatingChanges(tournamentId)

      // Next call should hit database again
      await ratingCalculator.calculateProjectedRatings(tournamentId)

      // Should call database at least twice (once before apply, once after)
      // The applyRatingChanges method makes additional calls for tournament details
      expect(mockPrisma.tournament.findUnique).toHaveBeenCalledTimes(4)
    })
  })

  describe('calculateMatchRatingImpact', () => {
    it('should calculate rating impact for a single match', async () => {
      const player1Id = 'player-1'
      const player2Id = 'player-2'
      const gameId = 'game-123'

      mockPrisma.playerGameStats.findFirst
        .mockResolvedValueOnce({
          currentRating: 1200,
          seasonalStats: { totalGames: 10 },
        })
        .mockResolvedValueOnce({
          currentRating: 1300,
          seasonalStats: { totalGames: 15 },
        })

      const result = await ratingCalculator.calculateMatchRatingImpact(
        player1Id,
        player2Id,
        player1Id, // player1 wins
        gameId,
        'LOCAL'
      )

      expect(result).toHaveProperty('player1Change')
      expect(result).toHaveProperty('player2Change')
      expect(result.player1Change).toBeGreaterThan(0) // Winner gains rating
      expect(result.player2Change).toBeLessThan(0) // Loser loses rating
    })

    it('should throw error if player stats not found', async () => {
      mockPrisma.playerGameStats.findFirst.mockResolvedValue(null)

      await expect(
        ratingCalculator.calculateMatchRatingImpact(
          'player-1',
          'player-2',
          'player-1',
          'game-123',
          'LOCAL'
        )
      ).rejects.toThrow(TRPCError)
    })
  })

  describe('cache management', () => {
    it('should invalidate cache for specific tournament', async () => {
      const tournamentId = 'tournament-123'
      const gameId = 'game-123'

      mockPrisma.tournament.findUnique.mockResolvedValue({
        id: tournamentId,
        gameId,
        tournamentLevel: 'LOCAL',
        matches: [],
      })

      mockPrisma.tournamentEntry.findMany.mockResolvedValue([
        {
          playerId: 'player-1',
          player: {
            gameStats: [
              {
                currentRating: 1200,
                seasonalStats: { totalGames: 10 },
              },
            ],
          },
        },
      ])

      mockPrisma.match.findMany.mockResolvedValue([])

      // Populate cache
      await ratingCalculator.calculateProjectedRatings(tournamentId)

      // Invalidate cache
      ratingCalculator.invalidateCache(tournamentId)

      // Next call should hit database
      await ratingCalculator.calculateProjectedRatings(tournamentId)

      expect(mockPrisma.tournament.findUnique).toHaveBeenCalledTimes(2)
    })

    it('should clear all cache', async () => {
      const tournamentId1 = 'tournament-1'
      const tournamentId2 = 'tournament-2'
      const gameId = 'game-123'

      mockPrisma.tournament.findUnique.mockResolvedValue({
        id: tournamentId1,
        gameId,
        tournamentLevel: 'LOCAL',
        matches: [],
      })

      mockPrisma.tournamentEntry.findMany.mockResolvedValue([
        {
          playerId: 'player-1',
          player: {
            gameStats: [
              {
                currentRating: 1200,
                seasonalStats: { totalGames: 10 },
              },
            ],
          },
        },
      ])

      mockPrisma.match.findMany.mockResolvedValue([])

      // Populate cache for both tournaments
      await ratingCalculator.calculateProjectedRatings(tournamentId1)
      
      mockPrisma.tournament.findUnique.mockResolvedValue({
        id: tournamentId2,
        gameId,
        tournamentLevel: 'LOCAL',
        matches: [],
      })
      
      await ratingCalculator.calculateProjectedRatings(tournamentId2)

      // Clear all cache
      ratingCalculator.clearAllCache()

      // Next calls should hit database
      mockPrisma.tournament.findUnique.mockResolvedValue({
        id: tournamentId1,
        gameId,
        tournamentLevel: 'LOCAL',
        matches: [],
      })
      
      await ratingCalculator.calculateProjectedRatings(tournamentId1)

      // Should have been called 3 times total (2 initial + 1 after clear)
      expect(mockPrisma.tournament.findUnique).toHaveBeenCalledTimes(3)
    })
  })
})
