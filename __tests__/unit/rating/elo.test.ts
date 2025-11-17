/**
 * Unit tests for ELO rating system
 * 
 * Tests ELO calculations, K-factor variations, rating adjustments, and edge cases.
 */

import { describe, it, expect } from 'vitest'
import {
  ELO_CONFIG,
  calculateExpectedScore,
  calculateNewRating,
  calculateMatchRatingChanges,
  calculateChampionshipPoints,
  calculatePerformanceMetrics,
  validateRatingInputs,
} from '@/lib/rating/elo'
import { TRPCError } from '@trpc/server'

describe('ELO Rating System', () => {
  describe('calculateExpectedScore', () => {
    it('should calculate expected score for equal ratings', () => {
      const result = calculateExpectedScore(1200, 1200)
      expect(result).toBe(0.5)
    })

    it('should calculate expected score when player A is higher rated', () => {
      const result = calculateExpectedScore(1400, 1200)
      expect(result).toBeGreaterThan(0.5)
      expect(result).toBeLessThan(1)
    })

    it('should calculate expected score when player A is lower rated', () => {
      const result = calculateExpectedScore(1200, 1400)
      expect(result).toBeLessThan(0.5)
      expect(result).toBeGreaterThan(0)
    })

    it('should handle large rating differences', () => {
      const result = calculateExpectedScore(2000, 1000)
      expect(result).toBeGreaterThan(0.99)
    })

    it('should handle extreme rating differences', () => {
      const result = calculateExpectedScore(1000, 2000)
      expect(result).toBeLessThan(0.01)
    })
  })

  describe('calculateNewRating', () => {
    describe('K-factor variations', () => {
      it('should use provisional K-factor for new players (< 10 games)', () => {
        const newRating = calculateNewRating(1200, 1200, 1, 5, 'LOCAL')
        const expectedChange = ELO_CONFIG.K_FACTOR.PROVISIONAL * 0.5
        expect(newRating).toBe(Math.round(1200 + expectedChange))
      })

      it('should use default K-factor for intermediate players (10-50 games)', () => {
        const newRating = calculateNewRating(1200, 1200, 1, 25, 'LOCAL')
        const expectedChange = ELO_CONFIG.K_FACTOR.DEFAULT * 0.5
        expect(newRating).toBe(Math.round(1200 + expectedChange))
      })

      it('should use experienced K-factor for veteran players (> 50 games)', () => {
        const newRating = calculateNewRating(1200, 1200, 1, 60, 'LOCAL')
        const expectedChange = ELO_CONFIG.K_FACTOR.EXPERIENCED * 0.5
        expect(newRating).toBe(Math.round(1200 + expectedChange))
      })

      it('should handle exactly 10 games (boundary)', () => {
        const newRating = calculateNewRating(1200, 1200, 1, 10, 'LOCAL')
        const expectedChange = ELO_CONFIG.K_FACTOR.DEFAULT * 0.5
        expect(newRating).toBe(Math.round(1200 + expectedChange))
      })

      it('should handle exactly 50 games (boundary)', () => {
        const newRating = calculateNewRating(1200, 1200, 1, 50, 'LOCAL')
        const expectedChange = ELO_CONFIG.K_FACTOR.DEFAULT * 0.5
        expect(newRating).toBe(Math.round(1200 + expectedChange))
      })
    })

    describe('tournament level multipliers', () => {
      it('should apply LOCAL multiplier (1.0)', () => {
        const newRating = calculateNewRating(1200, 1200, 1, 25, 'LOCAL')
        const expectedChange = ELO_CONFIG.K_FACTOR.DEFAULT * 1.0 * 0.5
        expect(newRating).toBe(Math.round(1200 + expectedChange))
      })

      it('should apply REGIONAL multiplier (1.2)', () => {
        const newRating = calculateNewRating(1200, 1200, 1, 25, 'REGIONAL')
        const expectedChange = ELO_CONFIG.K_FACTOR.DEFAULT * 1.2 * 0.5
        expect(newRating).toBe(Math.round(1200 + expectedChange))
      })

      it('should apply NATIONAL multiplier (1.5)', () => {
        const newRating = calculateNewRating(1200, 1200, 1, 25, 'NATIONAL')
        const expectedChange = ELO_CONFIG.K_FACTOR.DEFAULT * 1.5 * 0.5
        expect(newRating).toBe(Math.round(1200 + expectedChange))
      })

      it('should apply INTERNATIONAL multiplier (2.0)', () => {
        const newRating = calculateNewRating(1200, 1200, 1, 25, 'INTERNATIONAL')
        const expectedChange = ELO_CONFIG.K_FACTOR.DEFAULT * 2.0 * 0.5
        expect(newRating).toBe(Math.round(1200 + expectedChange))
      })
    })

    describe('match outcomes', () => {
      it('should increase rating for a win', () => {
        const newRating = calculateNewRating(1200, 1200, 1, 25, 'LOCAL')
        expect(newRating).toBeGreaterThan(1200)
      })

      it('should decrease rating for a loss', () => {
        const newRating = calculateNewRating(1200, 1200, 0, 25, 'LOCAL')
        expect(newRating).toBeLessThan(1200)
      })

      it('should maintain rating for a draw against equal opponent', () => {
        const newRating = calculateNewRating(1200, 1200, 0.5, 25, 'LOCAL')
        expect(newRating).toBe(1200)
      })

      it('should gain rating for draw against higher-rated opponent', () => {
        const newRating = calculateNewRating(1200, 1400, 0.5, 25, 'LOCAL')
        expect(newRating).toBeGreaterThan(1200)
      })

      it('should lose rating for draw against lower-rated opponent', () => {
        const newRating = calculateNewRating(1400, 1200, 0.5, 25, 'LOCAL')
        expect(newRating).toBeLessThan(1400)
      })
    })

    describe('rating bounds', () => {
      it('should not exceed maximum rating', () => {
        const newRating = calculateNewRating(2990, 1200, 1, 25, 'INTERNATIONAL')
        expect(newRating).toBeLessThanOrEqual(ELO_CONFIG.MAX_RATING)
      })

      it('should not go below minimum rating', () => {
        const newRating = calculateNewRating(110, 2000, 0, 25, 'INTERNATIONAL')
        expect(newRating).toBeGreaterThanOrEqual(ELO_CONFIG.MIN_RATING)
      })

      it('should clamp to maximum rating when calculation exceeds', () => {
        // Test that the clamping logic works by verifying rating doesn't exceed max
        // Even with extreme scenarios, rating should be capped at MAX_RATING
        const newRating = calculateNewRating(2990, 1200, 1, 5, 'INTERNATIONAL')
        expect(newRating).toBeLessThanOrEqual(ELO_CONFIG.MAX_RATING)
      })

      it('should clamp to minimum rating when calculation goes below', () => {
        // Test that the clamping logic works by verifying rating doesn't go below min
        // Even with extreme scenarios, rating should be capped at MIN_RATING
        const newRating = calculateNewRating(110, 2000, 0, 5, 'INTERNATIONAL')
        expect(newRating).toBeGreaterThanOrEqual(ELO_CONFIG.MIN_RATING)
      })
    })

    describe('edge cases', () => {
      it('should handle zero games played', () => {
        const newRating = calculateNewRating(1200, 1200, 1, 0, 'LOCAL')
        expect(newRating).toBeGreaterThan(1200)
      })

      it('should round rating to nearest integer', () => {
        const newRating = calculateNewRating(1200, 1201, 1, 25, 'LOCAL')
        expect(Number.isInteger(newRating)).toBe(true)
      })

      it('should handle upset victory (low rating beats high rating)', () => {
        const newRating = calculateNewRating(1000, 2000, 1, 25, 'LOCAL')
        const ratingGain = newRating - 1000
        expect(ratingGain).toBeGreaterThan(30) // Should gain significant rating
      })

      it('should handle expected victory (high rating beats low rating)', () => {
        const newRating = calculateNewRating(2000, 1000, 1, 25, 'LOCAL')
        const ratingGain = newRating - 2000
        expect(ratingGain).toBeLessThan(2) // Should gain minimal rating
      })
    })
  })

  describe('calculateMatchRatingChanges', () => {
    const player1Id = 'player-1'
    const player2Id = 'player-2'

    describe('match outcomes', () => {
      it('should calculate rating changes for player 1 win', () => {
        const result = calculateMatchRatingChanges(
          1200, 1200, player1Id, player1Id, player2Id, 25, 25, 'LOCAL'
        )

        expect(result.player1NewRating).toBeGreaterThan(1200)
        expect(result.player2NewRating).toBeLessThan(1200)
        expect(result.player1RatingChange).toBeGreaterThan(0)
        expect(result.player2RatingChange).toBeLessThan(0)
      })

      it('should calculate rating changes for player 2 win', () => {
        const result = calculateMatchRatingChanges(
          1200, 1200, player2Id, player1Id, player2Id, 25, 25, 'LOCAL'
        )

        expect(result.player1NewRating).toBeLessThan(1200)
        expect(result.player2NewRating).toBeGreaterThan(1200)
        expect(result.player1RatingChange).toBeLessThan(0)
        expect(result.player2RatingChange).toBeGreaterThan(0)
      })

      it('should calculate rating changes for draw', () => {
        const result = calculateMatchRatingChanges(
          1200, 1200, null, player1Id, player2Id, 25, 25, 'LOCAL'
        )

        expect(result.player1NewRating).toBe(1200)
        expect(result.player2NewRating).toBe(1200)
        expect(result.player1RatingChange).toBe(0)
        expect(result.player2RatingChange).toBe(0)
      })
    })

    describe('rating differences', () => {
      it('should handle higher-rated player winning', () => {
        const result = calculateMatchRatingChanges(
          1400, 1200, player1Id, player1Id, player2Id, 25, 25, 'LOCAL'
        )

        expect(result.player1RatingChange).toBeLessThan(16) // Small gain
        expect(result.player2RatingChange).toBeGreaterThan(-16) // Small loss
      })

      it('should handle lower-rated player winning (upset)', () => {
        const result = calculateMatchRatingChanges(
          1200, 1400, player1Id, player1Id, player2Id, 25, 25, 'LOCAL'
        )

        expect(result.player1RatingChange).toBeGreaterThan(16) // Large gain
        expect(result.player2RatingChange).toBeLessThan(-16) // Large loss
      })
    })

    describe('experience levels', () => {
      it('should apply different K-factors based on player experience', () => {
        const newPlayerResult = calculateMatchRatingChanges(
          1200, 1200, player1Id, player1Id, player2Id, 5, 60, 'LOCAL'
        )

        const experiencedPlayerResult = calculateMatchRatingChanges(
          1200, 1200, player1Id, player1Id, player2Id, 60, 5, 'LOCAL'
        )

        // New player should have larger rating change
        expect(Math.abs(newPlayerResult.player1RatingChange)).toBeGreaterThan(
          Math.abs(experiencedPlayerResult.player1RatingChange)
        )
      })
    })

    describe('tournament levels', () => {
      it('should apply tournament multipliers correctly', () => {
        const localResult = calculateMatchRatingChanges(
          1200, 1200, player1Id, player1Id, player2Id, 25, 25, 'LOCAL'
        )

        const internationalResult = calculateMatchRatingChanges(
          1200, 1200, player1Id, player1Id, player2Id, 25, 25, 'INTERNATIONAL'
        )

        // International should have larger rating changes
        expect(Math.abs(internationalResult.player1RatingChange)).toBeGreaterThan(
          Math.abs(localResult.player1RatingChange)
        )
      })
    })

    describe('error handling', () => {
      it('should throw error for invalid winner ID', () => {
        expect(() => {
          calculateMatchRatingChanges(
            1200, 1200, 'invalid-id', player1Id, player2Id, 25, 25, 'LOCAL'
          )
        }).toThrow(TRPCError)
      })

      it('should throw error with correct message for invalid winner', () => {
        expect(() => {
          calculateMatchRatingChanges(
            1200, 1200, 'invalid-id', player1Id, player2Id, 25, 25, 'LOCAL'
          )
        }).toThrow('Winner ID must match one of the players or be null for a draw')
      })
    })

    describe('zero-sum property', () => {
      it('should maintain zero-sum for equal ratings', () => {
        const result = calculateMatchRatingChanges(
          1200, 1200, player1Id, player1Id, player2Id, 25, 25, 'LOCAL'
        )

        const totalChange = result.player1RatingChange + result.player2RatingChange
        expect(Math.abs(totalChange)).toBeLessThan(1) // Should be close to zero (rounding)
      })
    })
  })

  describe('calculateChampionshipPoints', () => {
    describe('placement within points table', () => {
      it('should return exact points for 1st place LOCAL', () => {
        const points = calculateChampionshipPoints(1, 100, 'LOCAL')
        expect(points).toBe(50)
      })

      it('should return exact points for 1st place INTERNATIONAL', () => {
        const points = calculateChampionshipPoints(1, 100, 'INTERNATIONAL')
        expect(points).toBe(500)
      })

      it('should return exact points for 5th place REGIONAL', () => {
        const points = calculateChampionshipPoints(5, 100, 'REGIONAL')
        expect(points).toBe(40)
      })

      it('should return exact points for last position in table', () => {
        const points = calculateChampionshipPoints(15, 100, 'LOCAL')
        expect(points).toBe(1)
      })
    })

    describe('placement beyond points table', () => {
      it('should calculate proportional points for top half beyond table', () => {
        const points = calculateChampionshipPoints(20, 100, 'LOCAL')
        expect(points).toBeGreaterThan(0)
        // Points are rounded, so minimum is 1
        expect(points).toBeGreaterThanOrEqual(1)
      })

      it('should return 0 points for bottom half', () => {
        const points = calculateChampionshipPoints(60, 100, 'LOCAL')
        expect(points).toBe(0)
      })

      it('should return 0 points for last place', () => {
        const points = calculateChampionshipPoints(100, 100, 'LOCAL')
        expect(points).toBe(0)
      })
    })

    describe('tournament level scaling', () => {
      it('should scale points by tournament level', () => {
        const localPoints = calculateChampionshipPoints(1, 100, 'LOCAL')
        const regionalPoints = calculateChampionshipPoints(1, 100, 'REGIONAL')
        const nationalPoints = calculateChampionshipPoints(1, 100, 'NATIONAL')
        const internationalPoints = calculateChampionshipPoints(1, 100, 'INTERNATIONAL')

        expect(regionalPoints).toBeGreaterThan(localPoints)
        expect(nationalPoints).toBeGreaterThan(regionalPoints)
        expect(internationalPoints).toBeGreaterThan(nationalPoints)
      })
    })

    describe('edge cases', () => {
      it('should handle small tournaments', () => {
        const points = calculateChampionshipPoints(1, 8, 'LOCAL')
        expect(points).toBe(50)
      })

      it('should handle very large tournaments', () => {
        const points = calculateChampionshipPoints(1, 1000, 'INTERNATIONAL')
        expect(points).toBe(500)
      })

      it('should return at least 1 point for top half placements', () => {
        const points = calculateChampionshipPoints(25, 100, 'LOCAL')
        expect(points).toBeGreaterThanOrEqual(1)
      })
    })
  })

  describe('calculatePerformanceMetrics', () => {
    describe('win rate calculations', () => {
      it('should calculate 100% win rate for all wins', () => {
        const metrics = calculatePerformanceMetrics(10, 0, 0)
        expect(metrics.winRate).toBe(100)
      })

      it('should calculate 0% win rate for all losses', () => {
        const metrics = calculatePerformanceMetrics(0, 10, 0)
        expect(metrics.winRate).toBe(0)
      })

      it('should calculate 50% win rate for equal wins and losses', () => {
        const metrics = calculatePerformanceMetrics(5, 5, 0)
        expect(metrics.winRate).toBe(50)
      })

      it('should handle draws in win rate calculation', () => {
        const metrics = calculatePerformanceMetrics(5, 5, 2)
        expect(metrics.winRate).toBeCloseTo(41.67, 1)
      })

      it('should return 0 win rate for no games', () => {
        const metrics = calculatePerformanceMetrics(0, 0, 0)
        expect(metrics.winRate).toBe(0)
      })
    })

    describe('total games', () => {
      it('should count all games including draws', () => {
        const metrics = calculatePerformanceMetrics(5, 3, 2)
        expect(metrics.totalGames).toBe(10)
      })

      it('should handle zero games', () => {
        const metrics = calculatePerformanceMetrics(0, 0, 0)
        expect(metrics.totalGames).toBe(0)
      })
    })

    describe('win/loss ratio', () => {
      it('should calculate ratio for wins and losses', () => {
        const metrics = calculatePerformanceMetrics(10, 5, 0)
        expect(metrics.winLossRatio).toBe(2)
      })

      it('should handle zero losses', () => {
        const metrics = calculatePerformanceMetrics(10, 0, 0)
        expect(metrics.winLossRatio).toBe(10)
      })

      it('should handle zero wins', () => {
        const metrics = calculatePerformanceMetrics(0, 10, 0)
        expect(metrics.winLossRatio).toBe(0)
      })

      it('should round to 2 decimal places', () => {
        const metrics = calculatePerformanceMetrics(7, 3, 0)
        expect(metrics.winLossRatio).toBe(2.33)
      })
    })

    describe('points calculation', () => {
      it('should award 3 points per win', () => {
        const metrics = calculatePerformanceMetrics(5, 0, 0)
        expect(metrics.points).toBe(15)
      })

      it('should award 1 point per draw', () => {
        const metrics = calculatePerformanceMetrics(0, 0, 5)
        expect(metrics.points).toBe(5)
      })

      it('should award 0 points per loss', () => {
        const metrics = calculatePerformanceMetrics(0, 5, 0)
        expect(metrics.points).toBe(0)
      })

      it('should calculate combined points correctly', () => {
        const metrics = calculatePerformanceMetrics(5, 3, 2)
        expect(metrics.points).toBe(17) // 5*3 + 2*1 + 3*0
      })
    })

    describe('edge cases', () => {
      it('should handle large numbers', () => {
        const metrics = calculatePerformanceMetrics(1000, 500, 100)
        expect(metrics.totalGames).toBe(1600)
        expect(metrics.points).toBe(3100)
      })

      it('should handle only draws', () => {
        const metrics = calculatePerformanceMetrics(0, 0, 10)
        expect(metrics.winRate).toBe(0)
        expect(metrics.winLossRatio).toBe(0)
        expect(metrics.points).toBe(10)
      })
    })
  })

  describe('validateRatingInputs', () => {
    const player1Id = 'player-1'
    const player2Id = 'player-2'

    describe('rating bounds validation', () => {
      it('should accept valid ratings', () => {
        expect(() => {
          validateRatingInputs(1200, 1300, player1Id, player1Id, player2Id)
        }).not.toThrow()
      })

      it('should reject player 1 rating below minimum', () => {
        expect(() => {
          validateRatingInputs(50, 1200, player1Id, player1Id, player2Id)
        }).toThrow(TRPCError)
      })

      it('should reject player 1 rating above maximum', () => {
        expect(() => {
          validateRatingInputs(3500, 1200, player1Id, player1Id, player2Id)
        }).toThrow(TRPCError)
      })

      it('should reject player 2 rating below minimum', () => {
        expect(() => {
          validateRatingInputs(1200, 50, player1Id, player1Id, player2Id)
        }).toThrow(TRPCError)
      })

      it('should reject player 2 rating above maximum', () => {
        expect(() => {
          validateRatingInputs(1200, 3500, player1Id, player1Id, player2Id)
        }).toThrow(TRPCError)
      })

      it('should accept minimum valid rating', () => {
        expect(() => {
          validateRatingInputs(100, 100, player1Id, player1Id, player2Id)
        }).not.toThrow()
      })

      it('should accept maximum valid rating', () => {
        expect(() => {
          validateRatingInputs(3000, 3000, player1Id, player1Id, player2Id)
        }).not.toThrow()
      })
    })

    describe('player ID validation', () => {
      it('should reject same player IDs', () => {
        expect(() => {
          validateRatingInputs(1200, 1200, player1Id, player1Id, player1Id)
        }).toThrow(TRPCError)
      })

      it('should reject same player IDs with error message', () => {
        expect(() => {
          validateRatingInputs(1200, 1200, player1Id, player1Id, player1Id)
        }).toThrow('Player cannot play against themselves')
      })
    })

    describe('winner ID validation', () => {
      it('should accept null winner (draw)', () => {
        expect(() => {
          validateRatingInputs(1200, 1200, null, player1Id, player2Id)
        }).not.toThrow()
      })

      it('should accept player 1 as winner', () => {
        expect(() => {
          validateRatingInputs(1200, 1200, player1Id, player1Id, player2Id)
        }).not.toThrow()
      })

      it('should accept player 2 as winner', () => {
        expect(() => {
          validateRatingInputs(1200, 1200, player2Id, player1Id, player2Id)
        }).not.toThrow()
      })

      it('should reject invalid winner ID', () => {
        expect(() => {
          validateRatingInputs(1200, 1200, 'invalid-id', player1Id, player2Id)
        }).toThrow(TRPCError)
      })

      it('should reject invalid winner ID with error message', () => {
        expect(() => {
          validateRatingInputs(1200, 1200, 'invalid-id', player1Id, player2Id)
        }).toThrow('Winner ID must match one of the players')
      })
    })

    describe('error messages', () => {
      it('should include rating value in error message', () => {
        expect(() => {
          validateRatingInputs(50, 1200, player1Id, player1Id, player2Id)
        }).toThrow('50')
      })

      it('should specify which player has invalid rating', () => {
        expect(() => {
          validateRatingInputs(1200, 3500, player1Id, player1Id, player2Id)
        }).toThrow('Player 2')
      })
    })
  })
})
