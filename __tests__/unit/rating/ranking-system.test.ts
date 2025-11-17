/**
 * Unit tests for Ranking System
 * 
 * Tests tier calculation logic, seasonal statistics, ranking updates, and caching.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getCurrentSeason,
  getSeasonDateRange,
  getCachedRankings,
  setCachedRankings,
  invalidateRankingCache,
  type SeasonalRankingData,
  type RankingCache,
} from '@/lib/rating/ranking-system'
import { TRPCError } from '@trpc/server'

describe('Ranking System', () => {
  describe('getCurrentSeason', () => {
    beforeEach(() => {
      vi.useRealTimers()
    })

    it('should return Q1 for January', () => {
      vi.setSystemTime(new Date('2024-01-15'))
      const season = getCurrentSeason()
      expect(season).toBe('2024-Q1')
    })

    it('should return Q1 for February', () => {
      vi.setSystemTime(new Date('2024-02-15'))
      const season = getCurrentSeason()
      expect(season).toBe('2024-Q1')
    })

    it('should return Q1 for March', () => {
      vi.setSystemTime(new Date('2024-03-15'))
      const season = getCurrentSeason()
      expect(season).toBe('2024-Q1')
    })

    it('should return Q2 for April', () => {
      vi.setSystemTime(new Date('2024-04-15'))
      const season = getCurrentSeason()
      expect(season).toBe('2024-Q2')
    })

    it('should return Q2 for May', () => {
      vi.setSystemTime(new Date('2024-05-15'))
      const season = getCurrentSeason()
      expect(season).toBe('2024-Q2')
    })

    it('should return Q2 for June', () => {
      vi.setSystemTime(new Date('2024-06-15'))
      const season = getCurrentSeason()
      expect(season).toBe('2024-Q2')
    })

    it('should return Q3 for July', () => {
      vi.setSystemTime(new Date('2024-07-15'))
      const season = getCurrentSeason()
      expect(season).toBe('2024-Q3')
    })

    it('should return Q3 for August', () => {
      vi.setSystemTime(new Date('2024-08-15'))
      const season = getCurrentSeason()
      expect(season).toBe('2024-Q3')
    })

    it('should return Q3 for September', () => {
      vi.setSystemTime(new Date('2024-09-15'))
      const season = getCurrentSeason()
      expect(season).toBe('2024-Q3')
    })

    it('should return Q4 for October', () => {
      vi.setSystemTime(new Date('2024-10-15'))
      const season = getCurrentSeason()
      expect(season).toBe('2024-Q4')
    })

    it('should return Q4 for November', () => {
      vi.setSystemTime(new Date('2024-11-15'))
      const season = getCurrentSeason()
      expect(season).toBe('2024-Q4')
    })

    it('should return Q4 for December', () => {
      vi.setSystemTime(new Date('2024-12-15'))
      const season = getCurrentSeason()
      expect(season).toBe('2024-Q4')
    })

    it('should handle year boundaries correctly', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-12-31'))
      const season = getCurrentSeason()
      expect(season).toBe('2024-Q4')
    })

    it('should handle new year correctly', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-01T12:00:00Z'))
      const season = getCurrentSeason()
      expect(season).toBe('2025-Q1')
    })
  })

  describe('getSeasonDateRange', () => {
    describe('Q1 date ranges', () => {
      it('should return correct date range for Q1', () => {
        const { start, end } = getSeasonDateRange('2024-Q1')
        
        expect(start.getFullYear()).toBe(2024)
        expect(start.getMonth()).toBe(0) // January
        expect(start.getDate()).toBe(1)
        
        expect(end.getFullYear()).toBe(2024)
        expect(end.getMonth()).toBe(2) // March
        expect(end.getDate()).toBe(31)
      })

      it('should set Q1 start time to beginning of day', () => {
        const { start } = getSeasonDateRange('2024-Q1')
        expect(start.getHours()).toBe(0)
        expect(start.getMinutes()).toBe(0)
        expect(start.getSeconds()).toBe(0)
      })

      it('should set Q1 end time to end of day', () => {
        const { end } = getSeasonDateRange('2024-Q1')
        expect(end.getHours()).toBe(23)
        expect(end.getMinutes()).toBe(59)
        expect(end.getSeconds()).toBe(59)
      })
    })

    describe('Q2 date ranges', () => {
      it('should return correct date range for Q2', () => {
        const { start, end } = getSeasonDateRange('2024-Q2')
        
        expect(start.getFullYear()).toBe(2024)
        expect(start.getMonth()).toBe(3) // April
        expect(start.getDate()).toBe(1)
        
        expect(end.getFullYear()).toBe(2024)
        expect(end.getMonth()).toBe(5) // June
        expect(end.getDate()).toBe(30)
      })
    })

    describe('Q3 date ranges', () => {
      it('should return correct date range for Q3', () => {
        const { start, end } = getSeasonDateRange('2024-Q3')
        
        expect(start.getFullYear()).toBe(2024)
        expect(start.getMonth()).toBe(6) // July
        expect(start.getDate()).toBe(1)
        
        expect(end.getFullYear()).toBe(2024)
        expect(end.getMonth()).toBe(8) // September
        expect(end.getDate()).toBe(30)
      })
    })

    describe('Q4 date ranges', () => {
      it('should return correct date range for Q4', () => {
        const { start, end } = getSeasonDateRange('2024-Q4')
        
        expect(start.getFullYear()).toBe(2024)
        expect(start.getMonth()).toBe(9) // October
        expect(start.getDate()).toBe(1)
        
        expect(end.getFullYear()).toBe(2024)
        expect(end.getMonth()).toBe(11) // December
        expect(end.getDate()).toBe(31)
      })
    })

    describe('error handling', () => {
      it('should throw error for invalid season format', () => {
        expect(() => {
          getSeasonDateRange('2024-Q5')
        }).toThrow(TRPCError)
      })

      it('should throw error with correct message for invalid quarter', () => {
        expect(() => {
          getSeasonDateRange('2024-Q5')
        }).toThrow('Invalid season format')
      })

      it('should throw error for malformed season string', () => {
        expect(() => {
          getSeasonDateRange('invalid')
        }).toThrow(TRPCError)
      })

      it('should throw error for missing quarter', () => {
        expect(() => {
          getSeasonDateRange('2024')
        }).toThrow(TRPCError)
      })
    })

    describe('different years', () => {
      it('should handle different years correctly', () => {
        const { start: start2023 } = getSeasonDateRange('2023-Q1')
        const { start: start2024 } = getSeasonDateRange('2024-Q1')
        
        expect(start2023.getFullYear()).toBe(2023)
        expect(start2024.getFullYear()).toBe(2024)
      })
    })
  })

  describe('Ranking Cache Management', () => {
    const mockRankings: SeasonalRankingData[] = [
      {
        playerId: 'player-1',
        gameId: 'game-1',
        season: '2024-Q1',
        currentRating: 1500,
        seasonalStats: {
          wins: 10,
          losses: 5,
          draws: 2,
          tournaments: 3,
          points: 32,
        },
        performance: {
          winRate: 58.82,
          totalGames: 17,
          winLossRatio: 2.0,
          averageOpponentRating: 1450,
          ratingTrend: 50,
        },
        rank: 1,
      },
    ]

    beforeEach(() => {
      // Clear cache before each test
      invalidateRankingCache('game-1')
      invalidateRankingCache('game-2')
      vi.useRealTimers()
    })

    describe('setCachedRankings', () => {
      it('should store rankings in cache', () => {
        const cache: RankingCache = {
          gameId: 'game-1',
          season: '2024-Q1',
          rankings: mockRankings,
          lastUpdated: new Date(),
          totalPlayers: 1,
        }

        setCachedRankings(cache)
        const retrieved = getCachedRankings('game-1', '2024-Q1')
        
        expect(retrieved).not.toBeNull()
        expect(retrieved?.rankings).toEqual(mockRankings)
      })

      it('should store multiple caches for different games', () => {
        const cache1: RankingCache = {
          gameId: 'game-1',
          season: '2024-Q1',
          rankings: mockRankings,
          lastUpdated: new Date(),
          totalPlayers: 1,
        }

        const cache2: RankingCache = {
          gameId: 'game-2',
          season: '2024-Q1',
          rankings: [],
          lastUpdated: new Date(),
          totalPlayers: 0,
        }

        setCachedRankings(cache1)
        setCachedRankings(cache2)
        
        expect(getCachedRankings('game-1', '2024-Q1')).not.toBeNull()
        expect(getCachedRankings('game-2', '2024-Q1')).not.toBeNull()
      })

      it('should store multiple caches for different seasons', () => {
        const cache1: RankingCache = {
          gameId: 'game-1',
          season: '2024-Q1',
          rankings: mockRankings,
          lastUpdated: new Date(),
          totalPlayers: 1,
        }

        const cache2: RankingCache = {
          gameId: 'game-1',
          season: '2024-Q2',
          rankings: [],
          lastUpdated: new Date(),
          totalPlayers: 0,
        }

        setCachedRankings(cache1)
        setCachedRankings(cache2)
        
        expect(getCachedRankings('game-1', '2024-Q1')).not.toBeNull()
        expect(getCachedRankings('game-1', '2024-Q2')).not.toBeNull()
      })
    })

    describe('getCachedRankings', () => {
      it('should return null for non-existent cache', () => {
        const result = getCachedRankings('non-existent', '2024-Q1')
        expect(result).toBeNull()
      })

      it('should return cached rankings when valid', () => {
        const cache: RankingCache = {
          gameId: 'game-1',
          season: '2024-Q1',
          rankings: mockRankings,
          lastUpdated: new Date(),
          totalPlayers: 1,
        }

        setCachedRankings(cache)
        const result = getCachedRankings('game-1', '2024-Q1')
        
        expect(result).not.toBeNull()
        expect(result?.rankings).toEqual(mockRankings)
        expect(result?.totalPlayers).toBe(1)
      })

      it('should return null for expired current season cache (> 5 minutes)', () => {
        vi.useFakeTimers()
        const now = new Date('2024-03-15T12:00:00Z')
        vi.setSystemTime(now)

        const cache: RankingCache = {
          gameId: 'game-1',
          season: '2024-Q1', // Current season
          rankings: mockRankings,
          lastUpdated: new Date('2024-03-15T11:54:00Z'), // 6 minutes ago
          totalPlayers: 1,
        }

        setCachedRankings(cache)
        
        // Advance time to make cache expire
        vi.setSystemTime(new Date('2024-03-15T12:00:01Z'))
        
        const result = getCachedRankings('game-1', '2024-Q1')
        expect(result).toBeNull()
      })

      it('should return cached rankings for current season within 5 minutes', () => {
        vi.useFakeTimers()
        const now = new Date('2024-03-15T12:00:00Z')
        vi.setSystemTime(now)

        const cache: RankingCache = {
          gameId: 'game-1',
          season: '2024-Q1', // Current season
          rankings: mockRankings,
          lastUpdated: new Date('2024-03-15T11:56:00Z'), // 4 minutes ago
          totalPlayers: 1,
        }

        setCachedRankings(cache)
        
        const result = getCachedRankings('game-1', '2024-Q1')
        expect(result).not.toBeNull()
        expect(result?.rankings).toEqual(mockRankings)
      })

      it('should return null for expired past season cache (> 1 hour)', () => {
        vi.useFakeTimers()
        const now = new Date('2024-06-15T12:00:00Z') // Q2
        vi.setSystemTime(now)

        const cache: RankingCache = {
          gameId: 'game-1',
          season: '2024-Q1', // Past season
          rankings: mockRankings,
          lastUpdated: new Date('2024-06-15T10:59:00Z'), // 61 minutes ago
          totalPlayers: 1,
        }

        setCachedRankings(cache)
        
        const result = getCachedRankings('game-1', '2024-Q1')
        expect(result).toBeNull()
      })

      it('should return cached rankings for past season within 1 hour', () => {
        vi.useFakeTimers()
        const now = new Date('2024-06-15T12:00:00Z') // Q2
        vi.setSystemTime(now)

        const cache: RankingCache = {
          gameId: 'game-1',
          season: '2024-Q1', // Past season
          rankings: mockRankings,
          lastUpdated: new Date('2024-06-15T11:01:00Z'), // 59 minutes ago
          totalPlayers: 1,
        }

        setCachedRankings(cache)
        
        const result = getCachedRankings('game-1', '2024-Q1')
        expect(result).not.toBeNull()
        expect(result?.rankings).toEqual(mockRankings)
      })
    })

    describe('invalidateRankingCache', () => {
      beforeEach(() => {
        // Set up multiple caches
        const cache1: RankingCache = {
          gameId: 'game-1',
          season: '2024-Q1',
          rankings: mockRankings,
          lastUpdated: new Date(),
          totalPlayers: 1,
        }

        const cache2: RankingCache = {
          gameId: 'game-1',
          season: '2024-Q2',
          rankings: [],
          lastUpdated: new Date(),
          totalPlayers: 0,
        }

        const cache3: RankingCache = {
          gameId: 'game-2',
          season: '2024-Q1',
          rankings: [],
          lastUpdated: new Date(),
          totalPlayers: 0,
        }

        setCachedRankings(cache1)
        setCachedRankings(cache2)
        setCachedRankings(cache3)
      })

      it('should invalidate specific season cache', () => {
        invalidateRankingCache('game-1', '2024-Q1')
        
        expect(getCachedRankings('game-1', '2024-Q1')).toBeNull()
        expect(getCachedRankings('game-1', '2024-Q2')).not.toBeNull()
        expect(getCachedRankings('game-2', '2024-Q1')).not.toBeNull()
      })

      it('should invalidate all seasons for a game when season not specified', () => {
        invalidateRankingCache('game-1')
        
        expect(getCachedRankings('game-1', '2024-Q1')).toBeNull()
        expect(getCachedRankings('game-1', '2024-Q2')).toBeNull()
        expect(getCachedRankings('game-2', '2024-Q1')).not.toBeNull()
      })

      it('should not affect other games when invalidating', () => {
        invalidateRankingCache('game-1')
        
        expect(getCachedRankings('game-2', '2024-Q1')).not.toBeNull()
      })

      it('should handle invalidating non-existent cache gracefully', () => {
        expect(() => {
          invalidateRankingCache('non-existent', '2024-Q1')
        }).not.toThrow()
      })
    })
  })

  describe('Seasonal Statistics', () => {
    describe('SeasonalRankingData structure', () => {
      it('should have correct seasonal stats structure', () => {
        const ranking: SeasonalRankingData = {
          playerId: 'player-1',
          gameId: 'game-1',
          season: '2024-Q1',
          currentRating: 1500,
          seasonalStats: {
            wins: 10,
            losses: 5,
            draws: 2,
            tournaments: 3,
            points: 32,
          },
          performance: {
            winRate: 58.82,
            totalGames: 17,
            winLossRatio: 2.0,
            averageOpponentRating: 1450,
            ratingTrend: 50,
          },
          rank: 1,
        }

        expect(ranking.seasonalStats.wins).toBe(10)
        expect(ranking.seasonalStats.losses).toBe(5)
        expect(ranking.seasonalStats.draws).toBe(2)
        expect(ranking.seasonalStats.tournaments).toBe(3)
        expect(ranking.seasonalStats.points).toBe(32)
      })

      it('should have correct performance metrics structure', () => {
        const ranking: SeasonalRankingData = {
          playerId: 'player-1',
          gameId: 'game-1',
          season: '2024-Q1',
          currentRating: 1500,
          seasonalStats: {
            wins: 10,
            losses: 5,
            draws: 2,
            tournaments: 3,
            points: 32,
          },
          performance: {
            winRate: 58.82,
            totalGames: 17,
            winLossRatio: 2.0,
            averageOpponentRating: 1450,
            ratingTrend: 50,
          },
          rank: 1,
        }

        expect(ranking.performance.winRate).toBe(58.82)
        expect(ranking.performance.totalGames).toBe(17)
        expect(ranking.performance.winLossRatio).toBe(2.0)
        expect(ranking.performance.averageOpponentRating).toBe(1450)
        expect(ranking.performance.ratingTrend).toBe(50)
      })

      it('should support optional rank change fields', () => {
        const ranking: SeasonalRankingData = {
          playerId: 'player-1',
          gameId: 'game-1',
          season: '2024-Q1',
          currentRating: 1500,
          seasonalStats: {
            wins: 10,
            losses: 5,
            draws: 2,
            tournaments: 3,
            points: 32,
          },
          performance: {
            winRate: 58.82,
            totalGames: 17,
            winLossRatio: 2.0,
            averageOpponentRating: 1450,
            ratingTrend: 50,
          },
          rank: 1,
          previousRank: 3,
          rankChange: -2, // Improved from rank 3 to rank 1
        }

        expect(ranking.previousRank).toBe(3)
        expect(ranking.rankChange).toBe(-2)
      })
    })
  })
})
