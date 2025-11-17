/**
 * Error Handling Tests
 * 
 * Tests for tournament error handling utilities including concurrent operations,
 * state transitions, pairing validation, and rating calculation error handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  TournamentError,
  TournamentErrorCode,
  ConcurrentOperationHandler,
  StateTransitionValidator,
  PairingValidator,
  RatingCalculationHandler,
  ErrorRecovery,
  ErrorMessages,
} from '@/lib/tournament/error-handling'
import { TRPCError } from '@trpc/server'

describe('TournamentError', () => {
  it('should create error with code and message', () => {
    const error = new TournamentError(
      TournamentErrorCode.CONCURRENT_MODIFICATION,
      'Test error message'
    )

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('TournamentError')
    expect(error.code).toBe(TournamentErrorCode.CONCURRENT_MODIFICATION)
    expect(error.message).toBe('Test error message')
  })

  it('should include details when provided', () => {
    const details = { tournamentId: '123', playerId: '456' }
    const error = new TournamentError(
      TournamentErrorCode.INVALID_PAIRING,
      'Invalid pairing',
      details
    )

    expect(error.details).toEqual(details)
  })
})

describe('ConcurrentOperationHandler', () => {
  describe('executeWithRetry', () => {
    it('should execute operation successfully on first try', async () => {
      const operation = vi.fn().mockResolvedValue('success')

      const result = await ConcurrentOperationHandler.executeWithRetry(operation)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on concurrent modification error', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new TRPCError({ code: 'CONFLICT', message: 'concurrent modification' }))
        .mockResolvedValueOnce('success')

      const result = await ConcurrentOperationHandler.executeWithRetry(operation)

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should throw error after max retries', async () => {
      const error = new TRPCError({ code: 'CONFLICT', message: 'concurrent modification' })
      const operation = vi.fn().mockRejectedValue(error)

      await expect(
        ConcurrentOperationHandler.executeWithRetry(operation, 2)
      ).rejects.toThrow(error)

      expect(operation).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })

    it('should not retry on non-concurrent errors', async () => {
      const error = new TRPCError({ code: 'BAD_REQUEST', message: 'validation error' })
      const operation = vi.fn().mockRejectedValue(error)

      await expect(
        ConcurrentOperationHandler.executeWithRetry(operation)
      ).rejects.toThrow(error)

      expect(operation).toHaveBeenCalledTimes(1)
    })
  })
})

describe('StateTransitionValidator', () => {
  describe('validateTransition', () => {
    it('should allow valid transitions', () => {
      expect(() => {
        StateTransitionValidator.validateTransition('UPCOMING', 'ACTIVE')
      }).not.toThrow()

      expect(() => {
        StateTransitionValidator.validateTransition('ACTIVE', 'PAUSED')
      }).not.toThrow()

      expect(() => {
        StateTransitionValidator.validateTransition('PAUSED', 'ACTIVE')
      }).not.toThrow()

      expect(() => {
        StateTransitionValidator.validateTransition('ACTIVE', 'COMPLETED')
      }).not.toThrow()
    })

    it('should reject invalid transitions', () => {
      expect(() => {
        StateTransitionValidator.validateTransition('COMPLETED', 'ACTIVE')
      }).toThrow(TournamentError)

      expect(() => {
        StateTransitionValidator.validateTransition('CANCELLED', 'ACTIVE')
      }).toThrow(TournamentError)

      expect(() => {
        StateTransitionValidator.validateTransition('UPCOMING', 'COMPLETED')
      }).toThrow(TournamentError)
    })

    it('should include transition details in error', () => {
      try {
        StateTransitionValidator.validateTransition('COMPLETED', 'ACTIVE')
        expect.fail('Should have thrown error')
      } catch (error) {
        expect(error).toBeInstanceOf(TournamentError)
        const tournamentError = error as TournamentError
        expect(tournamentError.code).toBe(TournamentErrorCode.INVALID_STATE_TRANSITION)
        expect(tournamentError.details).toHaveProperty('currentStatus', 'COMPLETED')
        expect(tournamentError.details).toHaveProperty('newStatus', 'ACTIVE')
      }
    })
  })

  describe('validateReadyForAdvancement', () => {
    it('should pass when tournament is ready', () => {
      const tournament = {
        id: '1',
        status: 'ACTIVE',
        matches: [
          { id: '1', round: 1, status: 'COMPLETED' },
          { id: '2', round: 1, status: 'COMPLETED' },
        ]
      } as any

      expect(() => {
        StateTransitionValidator.validateReadyForAdvancement(tournament, 1)
      }).not.toThrow()
    })

    it('should throw when tournament is not active', () => {
      const tournament = {
        id: '1',
        status: 'PAUSED',
        matches: []
      } as any

      expect(() => {
        StateTransitionValidator.validateReadyForAdvancement(tournament, 1)
      }).toThrow(TournamentError)
    })

    it('should throw when matches are incomplete', () => {
      const tournament = {
        id: '1',
        status: 'ACTIVE',
        matches: [
          { id: '1', round: 1, status: 'COMPLETED' },
          { id: '2', round: 1, status: 'PENDING' },
        ]
      } as any

      expect(() => {
        StateTransitionValidator.validateReadyForAdvancement(tournament, 1)
      }).toThrow(TournamentError)
    })
  })

  describe('validateReadyForCompletion', () => {
    it('should pass when tournament is ready', () => {
      const tournament = {
        id: '1',
        status: 'ACTIVE',
        matches: [
          { id: '1', round: 1, status: 'COMPLETED' },
          { id: '2', round: 2, status: 'COMPLETED' },
        ]
      } as any

      expect(() => {
        StateTransitionValidator.validateReadyForCompletion(tournament)
      }).not.toThrow()
    })

    it('should throw when tournament has no matches', () => {
      const tournament = {
        id: '1',
        status: 'ACTIVE',
        matches: []
      } as any

      expect(() => {
        StateTransitionValidator.validateReadyForCompletion(tournament)
      }).toThrow(TournamentError)
    })

    it('should throw when matches are incomplete', () => {
      const tournament = {
        id: '1',
        status: 'ACTIVE',
        matches: [
          { id: '1', round: 1, status: 'COMPLETED' },
          { id: '2', round: 2, status: 'PENDING' },
        ]
      } as any

      expect(() => {
        StateTransitionValidator.validateReadyForCompletion(tournament)
      }).toThrow(TournamentError)
    })
  })
})

describe('PairingValidator', () => {
  describe('validatePairing', () => {
    it('should allow valid pairings', () => {
      const activePlayerIds = new Set(['player1', 'player2', 'player3'])

      expect(() => {
        PairingValidator.validatePairing('player1', 'player2', activePlayerIds)
      }).not.toThrow()
    })

    it('should allow bye pairings (same player)', () => {
      const activePlayerIds = new Set(['player1'])

      expect(() => {
        PairingValidator.validatePairing('player1', 'player1', activePlayerIds)
      }).not.toThrow()
    })

    it('should throw when player1 is not active', () => {
      const activePlayerIds = new Set(['player2'])

      expect(() => {
        PairingValidator.validatePairing('player1', 'player2', activePlayerIds)
      }).toThrow(TournamentError)
    })

    it('should throw when player2 is not active', () => {
      const activePlayerIds = new Set(['player1'])

      expect(() => {
        PairingValidator.validatePairing('player1', 'player2', activePlayerIds)
      }).toThrow(TournamentError)
    })
  })

  describe('validateNoDuplicates', () => {
    it('should pass when no duplicates exist', () => {
      const pairings = [
        { player1Id: 'p1', player2Id: 'p2' },
        { player1Id: 'p3', player2Id: 'p4' },
      ]
      const existingMatches = [] as any[]

      expect(() => {
        PairingValidator.validateNoDuplicates(pairings, existingMatches, 1)
      }).not.toThrow()
    })

    it('should throw on duplicate within new pairings', () => {
      const pairings = [
        { player1Id: 'p1', player2Id: 'p2' },
        { player1Id: 'p2', player2Id: 'p1' }, // Same pairing, reversed
      ]
      const existingMatches = [] as any[]

      expect(() => {
        PairingValidator.validateNoDuplicates(pairings, existingMatches, 1)
      }).toThrow(TournamentError)
    })

    it('should throw when player is paired multiple times', () => {
      const pairings = [
        { player1Id: 'p1', player2Id: 'p2' },
        { player1Id: 'p1', player2Id: 'p3' }, // p1 paired twice
      ]
      const existingMatches = [] as any[]

      expect(() => {
        PairingValidator.validateNoDuplicates(pairings, existingMatches, 1)
      }).toThrow(TournamentError)
    })

    it('should throw when pairing exists in database', () => {
      const pairings = [
        { player1Id: 'p1', player2Id: 'p2' },
      ]
      const existingMatches = [
        { id: 'm1', player1Id: 'p1', player2Id: 'p2', round: 1 }
      ] as any[]

      expect(() => {
        PairingValidator.validateNoDuplicates(pairings, existingMatches, 1)
      }).toThrow(TournamentError)
    })

    it('should allow bye pairings without duplicate check', () => {
      const pairings = [
        { player1Id: 'p1', player2Id: 'p1' }, // Bye
        { player1Id: 'p2', player2Id: 'p3' },
      ]
      const existingMatches = [] as any[]

      expect(() => {
        PairingValidator.validateNoDuplicates(pairings, existingMatches, 1)
      }).not.toThrow()
    })
  })

  describe('validateSufficientPlayers', () => {
    it('should pass with sufficient players', () => {
      expect(() => {
        PairingValidator.validateSufficientPlayers(4, 2)
      }).not.toThrow()
    })

    it('should throw with insufficient players', () => {
      expect(() => {
        PairingValidator.validateSufficientPlayers(1, 2)
      }).toThrow(TournamentError)
    })

    it('should use default minimum of 2', () => {
      expect(() => {
        PairingValidator.validateSufficientPlayers(2)
      }).not.toThrow()

      expect(() => {
        PairingValidator.validateSufficientPlayers(1)
      }).toThrow(TournamentError)
    })
  })
})

describe('RatingCalculationHandler', () => {
  describe('safeCalculate', () => {
    it('should return calculated value on success', async () => {
      const calculateFn = vi.fn().mockResolvedValue(1500)

      const result = await RatingCalculationHandler.safeCalculate(
        calculateFn,
        1200,
        'test context'
      )

      expect(result).toBe(1500)
    })

    it('should return fallback value on error', async () => {
      const calculateFn = vi.fn().mockRejectedValue(new Error('Calculation failed'))

      const result = await RatingCalculationHandler.safeCalculate(
        calculateFn,
        1200,
        'test context'
      )

      expect(result).toBe(1200)
    })
  })

  describe('validatePlayerStats', () => {
    it('should pass when stats exist', () => {
      const stats = { currentRating: 1500 }

      expect(() => {
        RatingCalculationHandler.validatePlayerStats('p1', 'g1', stats)
      }).not.toThrow()
    })

    it('should throw when stats are null', () => {
      expect(() => {
        RatingCalculationHandler.validatePlayerStats('p1', 'g1', null)
      }).toThrow(TournamentError)
    })
  })

  describe('validateRating', () => {
    it('should pass for valid ratings', () => {
      expect(() => {
        RatingCalculationHandler.validateRating(1500, 'test')
      }).not.toThrow()

      expect(() => {
        RatingCalculationHandler.validateRating(0, 'test')
      }).not.toThrow()
    })

    it('should throw for invalid ratings', () => {
      expect(() => {
        RatingCalculationHandler.validateRating(-100, 'test')
      }).toThrow(TournamentError)

      expect(() => {
        RatingCalculationHandler.validateRating(NaN, 'test')
      }).toThrow(TournamentError)

      expect(() => {
        RatingCalculationHandler.validateRating('1500' as any, 'test')
      }).toThrow(TournamentError)
    })
  })
})

describe('ErrorRecovery', () => {
  describe('attemptRecovery', () => {
    it('should return recovery result on success', async () => {
      const error = new Error('Original error')
      const recoveryFn = vi.fn().mockResolvedValue('recovered')

      const result = await ErrorRecovery.attemptRecovery(error, recoveryFn)

      expect(result).toBe('recovered')
    })

    it('should rethrow original error if recovery fails', async () => {
      const originalError = new Error('Original error')
      const recoveryFn = vi.fn().mockRejectedValue(new Error('Recovery failed'))

      await expect(
        ErrorRecovery.attemptRecovery(originalError, recoveryFn)
      ).rejects.toThrow(originalError)
    })
  })

  describe('toTRPCError', () => {
    it('should convert concurrent modification to CONFLICT', () => {
      const error = new TournamentError(
        TournamentErrorCode.CONCURRENT_MODIFICATION,
        'Concurrent modification detected'
      )

      const trpcError = ErrorRecovery.toTRPCError(error)

      expect(trpcError).toBeInstanceOf(TRPCError)
      expect(trpcError.code).toBe('CONFLICT')
      expect(trpcError.message).toBe('Concurrent modification detected')
    })

    it('should convert validation errors to BAD_REQUEST', () => {
      const error = new TournamentError(
        TournamentErrorCode.INVALID_PAIRING,
        'Invalid pairing'
      )

      const trpcError = ErrorRecovery.toTRPCError(error)

      expect(trpcError.code).toBe('BAD_REQUEST')
    })

    it('should convert rating errors to INTERNAL_SERVER_ERROR', () => {
      const error = new TournamentError(
        TournamentErrorCode.RATING_CALCULATION_FAILED,
        'Rating calculation failed'
      )

      const trpcError = ErrorRecovery.toTRPCError(error)

      expect(trpcError.code).toBe('INTERNAL_SERVER_ERROR')
    })

    it('should include error details in cause', () => {
      const details = { playerId: '123' }
      const error = new TournamentError(
        TournamentErrorCode.INVALID_PAIRING,
        'Invalid pairing',
        details
      )

      const trpcError = ErrorRecovery.toTRPCError(error)

      // TRPCError wraps cause in UnknownCauseError, so check the properties
      expect(trpcError.cause).toHaveProperty('playerId', '123')
    })
  })
})

describe('ErrorMessages', () => {
  it('should provide user-friendly concurrent operation messages', () => {
    expect(ErrorMessages.CONCURRENT_MATCH_SUBMISSION).toContain('just submitted')
    expect(ErrorMessages.CONCURRENT_TOURNAMENT_UPDATE).toContain('just updated')
  })

  it('should provide dynamic error messages', () => {
    const statusMessage = ErrorMessages.INVALID_TOURNAMENT_STATUS('COMPLETED', 'start')
    expect(statusMessage).toContain('COMPLETED')
    expect(statusMessage).toContain('start')

    const incompleteMessage = ErrorMessages.INCOMPLETE_MATCHES(3, 2)
    expect(incompleteMessage).toContain('3')
    expect(incompleteMessage).toContain('round 2')

    const duplicateMessage = ErrorMessages.DUPLICATE_PAIRING('p1', 'p2')
    expect(duplicateMessage).toContain('p1')
    expect(duplicateMessage).toContain('p2')
  })
})
