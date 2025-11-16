/**
 * Unit tests for MatchProcessor
 * 
 * Tests match result submission, confirmation, disputes, and organizer overrides.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MatchProcessor } from '@/lib/tournament/match-processor'
import { MatchResult } from '@/lib/tournament/types'
import { createMockPrisma, type MockPrisma } from '@/__tests__/__mocks__/prisma'

let mockPrisma: MockPrisma

describe('MatchProcessor', () => {
  let matchProcessor: MatchProcessor

  beforeEach(() => {
    mockPrisma = createMockPrisma()
    matchProcessor = new MatchProcessor(mockPrisma)
    vi.clearAllMocks()
  })

  describe('submitMatchResult', () => {
    const matchId = 'match-123'
    const player1Id = 'player-1'
    const player2Id = 'player-2'
    const tournamentId = 'tournament-123'

    const mockMatch = {
      id: matchId,
      tournamentId,
      player1Id,
      player2Id,
      winnerId: null,
      round: 1,
      status: 'PENDING',
      player1Score: null,
      player2Score: null,
      playerSubmissions: null,
      tournament: {
        id: tournamentId,
        status: 'ACTIVE',
      },
      player1: { id: player1Id },
      player2: { id: player2Id },
    }

    it('should store first player submission and require confirmation', async () => {
      const result: MatchResult = {
        winnerId: player1Id,
        player1Score: 2,
        player2Score: 1,
      }

      ;(mockPrisma.match.findUnique as any).mockResolvedValue(mockMatch)
      ;(mockPrisma.match.update as any).mockResolvedValue({
        ...mockMatch,
        status: 'IN_PROGRESS',
        playerSubmissions: {
          submissions: {
            [player1Id]: {
              matchId,
              submittedBy: player1Id,
              winnerId: player1Id,
              player1Score: 2,
              player2Score: 1,
              timestamp: expect.any(Date),
              confirmed: false,
            },
          },
        },
      })
      ;(mockPrisma.tournament.findUnique as any).mockResolvedValue({
        metadata: {},
      })
      ;(mockPrisma.tournament.update as any).mockResolvedValue({})

      const response = await matchProcessor.submitMatchResult(matchId, player1Id, result)

      expect(response.requiresConfirmation).toBe(true)
      expect(response.dispute).toBeUndefined()
      expect(mockPrisma.match.update).toHaveBeenCalledWith({
        where: { id: matchId },
        data: {
          status: 'IN_PROGRESS',
          playerSubmissions: expect.objectContaining({
            submissions: expect.any(Object),
          }),
        },
      })
    })

    it('should complete match when both players agree', async () => {
      const result: MatchResult = {
        winnerId: player1Id,
        player1Score: 2,
        player2Score: 1,
      }

      const matchWithSubmission = {
        ...mockMatch,
        playerSubmissions: {
          submissions: {
            [player2Id]: {
              matchId,
              submittedBy: player2Id,
              winnerId: player1Id,
              player1Score: 2,
              player2Score: 1,
              timestamp: new Date(),
              confirmed: false,
            },
          },
        },
      }

      ;(mockPrisma.match.findUnique as any).mockResolvedValue(matchWithSubmission)
      ;(mockPrisma.$transaction as any).mockImplementation(async (callback) => {
        const tx = {
          match: {
            update: vi.fn().mockResolvedValue({
              ...mockMatch,
              status: 'COMPLETED',
              winnerId: player1Id,
              player1Score: 2,
              player2Score: 1,
            }),
          },
          tournamentEntry: {
            findMany: vi.fn().mockResolvedValue([
              { id: 'entry-1', playerId: player1Id, record: { wins: 0, losses: 0, draws: 0 } },
              { id: 'entry-2', playerId: player2Id, record: { wins: 0, losses: 0, draws: 0 } },
            ]),
            update: vi.fn().mockResolvedValue({}),
          },
        }
        return await callback(tx)
      })
      ;(mockPrisma.tournament.findUnique as any).mockResolvedValue({
        metadata: {},
      })
      ;(mockPrisma.tournament.update as any).mockResolvedValue({})

      const response = await matchProcessor.submitMatchResult(matchId, player1Id, result)

      expect(response.requiresConfirmation).toBe(false)
      expect(response.dispute).toBeUndefined()
      expect(response.match.status).toBe('COMPLETED')
    })

    it('should create dispute when players disagree', async () => {
      const result: MatchResult = {
        winnerId: player1Id,
        player1Score: 2,
        player2Score: 1,
      }

      const matchWithSubmission = {
        ...mockMatch,
        playerSubmissions: {
          submissions: {
            [player2Id]: {
              matchId,
              submittedBy: player2Id,
              winnerId: player2Id, // Different winner
              player1Score: 1,
              player2Score: 2,
              timestamp: new Date(),
              confirmed: false,
            },
          },
        },
      }

      ;(mockPrisma.match.findUnique as any).mockResolvedValue(matchWithSubmission)
      ;(mockPrisma.match.update as any).mockResolvedValue({
        ...mockMatch,
        status: 'DISPUTED',
        playerSubmissions: {
          submissions: expect.any(Object),
          dispute: expect.any(Object),
        },
      })
      ;(mockPrisma.tournament.findUnique as any).mockResolvedValue({
        metadata: {},
      })
      ;(mockPrisma.tournament.update as any).mockResolvedValue({})

      const response = await matchProcessor.submitMatchResult(matchId, player1Id, result)

      expect(response.requiresConfirmation).toBe(false)
      expect(response.dispute).toBeDefined()
      expect(mockPrisma.match.update).toHaveBeenCalledWith({
        where: { id: matchId },
        data: {
          status: 'DISPUTED',
          playerSubmissions: expect.objectContaining({
            dispute: expect.any(Object),
          }),
        },
      })
    })

    it('should throw error if player not in match', async () => {
      ;(mockPrisma.match.findUnique as any).mockResolvedValue(mockMatch)

      const result: MatchResult = {
        winnerId: player1Id,
        player1Score: 2,
        player2Score: 1,
      }

      await expect(
        matchProcessor.submitMatchResult(matchId, 'other-player', result)
      ).rejects.toThrow('Player is not authorized to submit results for this match')
    })

    it('should throw error if match not found', async () => {
      ;(mockPrisma.match.findUnique as any).mockResolvedValue(null)

      const result: MatchResult = {
        winnerId: player1Id,
        player1Score: 2,
        player2Score: 1,
      }

      await expect(
        matchProcessor.submitMatchResult(matchId, player1Id, result)
      ).rejects.toThrow('Match not found')
    })

    it('should throw error if match already completed', async () => {
      ;(mockPrisma.match.findUnique as any).mockResolvedValue({
        ...mockMatch,
        status: 'COMPLETED',
      })

      const result: MatchResult = {
        winnerId: player1Id,
        player1Score: 2,
        player2Score: 1,
      }

      await expect(
        matchProcessor.submitMatchResult(matchId, player1Id, result)
      ).rejects.toThrow('Cannot submit results for match with status: COMPLETED')
    })

    it('should throw error if tournament not active', async () => {
      ;(mockPrisma.match.findUnique as any).mockResolvedValue({
        ...mockMatch,
        tournament: {
          ...mockMatch.tournament,
          status: 'COMPLETED',
        },
      })

      const result: MatchResult = {
        winnerId: player1Id,
        player1Score: 2,
        player2Score: 1,
      }

      await expect(
        matchProcessor.submitMatchResult(matchId, player1Id, result)
      ).rejects.toThrow('Cannot submit results for tournament with status: COMPLETED')
    })

    it('should throw error if scores are negative', async () => {
      ;(mockPrisma.match.findUnique as any).mockResolvedValue(mockMatch)

      const result: MatchResult = {
        winnerId: player1Id,
        player1Score: -1,
        player2Score: 1,
      }

      await expect(
        matchProcessor.submitMatchResult(matchId, player1Id, result)
      ).rejects.toThrow('Match scores must be non-negative')
    })

    it('should throw error if winner is not a match player', async () => {
      ;(mockPrisma.match.findUnique as any).mockResolvedValue(mockMatch)

      const result: MatchResult = {
        winnerId: 'other-player',
        player1Score: 2,
        player2Score: 1,
      }

      await expect(
        matchProcessor.submitMatchResult(matchId, player1Id, result)
      ).rejects.toThrow('Winner must be one of the match players or null for a draw')
    })
  })

  describe('confirmMatchResult', () => {
    const matchId = 'match-123'
    const player1Id = 'player-1'
    const player2Id = 'player-2'
    const tournamentId = 'tournament-123'

    it('should confirm pending submission and complete match', async () => {
      const mockMatch = {
        id: matchId,
        tournamentId,
        player1Id,
        player2Id,
        winnerId: null,
        round: 1,
        status: 'IN_PROGRESS',
        playerSubmissions: {
          submissions: {
            [player1Id]: {
              matchId,
              submittedBy: player1Id,
              winnerId: player1Id,
              player1Score: 2,
              player2Score: 1,
              timestamp: new Date(),
              confirmed: false,
            },
          },
        },
        tournament: {
          id: tournamentId,
          status: 'ACTIVE',
        },
      }

      ;(mockPrisma.match.findUnique as any).mockResolvedValue(mockMatch)
      ;(mockPrisma.$transaction as any).mockImplementation(async (callback) => {
        const tx = {
          match: {
            update: vi.fn().mockResolvedValue({
              ...mockMatch,
              status: 'COMPLETED',
              winnerId: player1Id,
              player1Score: 2,
              player2Score: 1,
            }),
          },
          tournamentEntry: {
            findMany: vi.fn().mockResolvedValue([
              { id: 'entry-1', playerId: player1Id, record: { wins: 0, losses: 0, draws: 0 } },
              { id: 'entry-2', playerId: player2Id, record: { wins: 0, losses: 0, draws: 0 } },
            ]),
            update: vi.fn().mockResolvedValue({}),
          },
        }
        return await callback(tx)
      })
      ;(mockPrisma.tournament.findUnique as any).mockResolvedValue({
        metadata: {},
      })
      ;(mockPrisma.tournament.update as any).mockResolvedValue({})

      const result = await matchProcessor.confirmMatchResult(matchId, player2Id)

      expect(result.status).toBe('COMPLETED')
      expect(result.winnerId).toBe(player1Id)
    })

    it('should throw error if no pending submission', async () => {
      const mockMatch = {
        id: matchId,
        tournamentId,
        player1Id,
        player2Id,
        playerSubmissions: {},
        tournament: {
          id: tournamentId,
          status: 'ACTIVE',
        },
      }

      ;(mockPrisma.match.findUnique as any).mockResolvedValue(mockMatch)

      await expect(
        matchProcessor.confirmMatchResult(matchId, player2Id)
      ).rejects.toThrow('No pending submission to confirm')
    })
  })

  describe('organizerSubmitResult', () => {
    const matchId = 'match-123'
    const player1Id = 'player-1'
    const player2Id = 'player-2'
    const organizerId = 'organizer-1'
    const tournamentId = 'tournament-123'

    it('should allow organizer to submit result without confirmation', async () => {
      const mockMatch = {
        id: matchId,
        tournamentId,
        player1Id,
        player2Id,
        winnerId: null,
        round: 1,
        status: 'PENDING',
        playerSubmissions: null,
        tournament: {
          id: tournamentId,
          status: 'ACTIVE',
        },
      }

      const result: MatchResult = {
        winnerId: player1Id,
        player1Score: 2,
        player2Score: 1,
      }

      ;(mockPrisma.match.findUnique as any).mockResolvedValue(mockMatch)
      ;(mockPrisma.$transaction as any).mockImplementation(async (callback) => {
        const tx = {
          match: {
            update: vi.fn().mockResolvedValue({
              ...mockMatch,
              status: 'COMPLETED',
              winnerId: player1Id,
              player1Score: 2,
              player2Score: 1,
            }),
          },
          tournamentEntry: {
            findMany: vi.fn().mockResolvedValue([
              { id: 'entry-1', playerId: player1Id, record: { wins: 0, losses: 0, draws: 0 } },
              { id: 'entry-2', playerId: player2Id, record: { wins: 0, losses: 0, draws: 0 } },
            ]),
            update: vi.fn().mockResolvedValue({}),
          },
        }
        return await callback(tx)
      })
      ;(mockPrisma.tournament.findUnique as any).mockResolvedValue({
        metadata: {},
      })
      ;(mockPrisma.tournament.update as any).mockResolvedValue({})

      const updatedMatch = await matchProcessor.organizerSubmitResult(
        matchId,
        organizerId,
        result,
        'Organizer override'
      )

      expect(updatedMatch.status).toBe('COMPLETED')
      expect(updatedMatch.winnerId).toBe(player1Id)
    })

    it('should throw error if match already completed', async () => {
      const mockMatch = {
        id: matchId,
        tournamentId,
        player1Id,
        player2Id,
        status: 'COMPLETED',
        tournament: {
          id: tournamentId,
          status: 'ACTIVE',
        },
      }

      ;(mockPrisma.match.findUnique as any).mockResolvedValue(mockMatch)

      const result: MatchResult = {
        winnerId: player1Id,
        player1Score: 2,
        player2Score: 1,
      }

      await expect(
        matchProcessor.organizerSubmitResult(matchId, organizerId, result)
      ).rejects.toThrow('Match is already completed')
    })
  })

  describe('resolveDispute', () => {
    const matchId = 'match-123'
    const player1Id = 'player-1'
    const player2Id = 'player-2'
    const organizerId = 'organizer-1'
    const tournamentId = 'tournament-123'

    it('should resolve disputed match', async () => {
      const mockMatch = {
        id: matchId,
        tournamentId,
        player1Id,
        player2Id,
        winnerId: null,
        round: 1,
        status: 'DISPUTED',
        playerSubmissions: {
          dispute: {
            matchId,
            player1Submission: {
              matchId,
              submittedBy: player1Id,
              winnerId: player1Id,
              player1Score: 2,
              player2Score: 1,
              timestamp: new Date(),
              confirmed: false,
            },
            player2Submission: {
              matchId,
              submittedBy: player2Id,
              winnerId: player2Id,
              player1Score: 1,
              player2Score: 2,
              timestamp: new Date(),
              confirmed: false,
            },
          },
        },
        tournament: {
          id: tournamentId,
          status: 'ACTIVE',
        },
      }

      const resolution: MatchResult = {
        winnerId: player1Id,
        player1Score: 2,
        player2Score: 1,
      }

      ;(mockPrisma.match.findUnique as any).mockResolvedValue(mockMatch)
      ;(mockPrisma.$transaction as any).mockImplementation(async (callback) => {
        const tx = {
          match: {
            update: vi.fn().mockResolvedValue({
              ...mockMatch,
              status: 'COMPLETED',
              winnerId: player1Id,
              player1Score: 2,
              player2Score: 1,
            }),
          },
          tournamentEntry: {
            findMany: vi.fn().mockResolvedValue([
              { id: 'entry-1', playerId: player1Id, record: { wins: 0, losses: 0, draws: 0 } },
              { id: 'entry-2', playerId: player2Id, record: { wins: 0, losses: 0, draws: 0 } },
            ]),
            update: vi.fn().mockResolvedValue({}),
          },
        }
        return await callback(tx)
      })
      ;(mockPrisma.tournament.findUnique as any).mockResolvedValue({
        metadata: {},
      })
      ;(mockPrisma.tournament.update as any).mockResolvedValue({})

      const result = await matchProcessor.resolveDispute(matchId, organizerId, resolution)

      expect(result.status).toBe('COMPLETED')
      expect(result.winnerId).toBe(player1Id)
    })

    it('should throw error if match not disputed', async () => {
      const mockMatch = {
        id: matchId,
        tournamentId,
        player1Id,
        player2Id,
        status: 'PENDING',
        tournament: {
          id: tournamentId,
          status: 'ACTIVE',
        },
      }

      ;(mockPrisma.match.findUnique as any).mockResolvedValue(mockMatch)

      const resolution: MatchResult = {
        winnerId: player1Id,
        player1Score: 2,
        player2Score: 1,
      }

      await expect(
        matchProcessor.resolveDispute(matchId, organizerId, resolution)
      ).rejects.toThrow('Match is not disputed')
    })
  })

  describe('awardMatchNoShow', () => {
    const matchId = 'match-123'
    const player1Id = 'player-1'
    const player2Id = 'player-2'
    const organizerId = 'organizer-1'
    const tournamentId = 'tournament-123'

    it('should award match to present player', async () => {
      const mockMatch = {
        id: matchId,
        tournamentId,
        player1Id,
        player2Id,
        winnerId: null,
        round: 1,
        status: 'PENDING',
        playerSubmissions: null,
        tournament: {
          id: tournamentId,
          status: 'ACTIVE',
        },
      }

      ;(mockPrisma.match.findUnique as any).mockResolvedValue(mockMatch)
      ;(mockPrisma.$transaction as any).mockImplementation(async (callback) => {
        const tx = {
          match: {
            update: vi.fn().mockResolvedValue({
              ...mockMatch,
              status: 'COMPLETED',
              winnerId: player1Id,
              player1Score: 2,
              player2Score: 0,
            }),
          },
          tournamentEntry: {
            findMany: vi.fn().mockResolvedValue([
              { id: 'entry-1', playerId: player1Id, record: { wins: 0, losses: 0, draws: 0 } },
              { id: 'entry-2', playerId: player2Id, record: { wins: 0, losses: 0, draws: 0 } },
            ]),
            update: vi.fn().mockResolvedValue({}),
          },
        }
        return await callback(tx)
      })
      ;(mockPrisma.tournament.findUnique as any).mockResolvedValue({
        metadata: {},
      })
      ;(mockPrisma.tournament.update as any).mockResolvedValue({})

      const result = await matchProcessor.awardMatchNoShow(matchId, organizerId, player1Id)

      expect(result.status).toBe('COMPLETED')
      expect(result.winnerId).toBe(player1Id)
      expect(result.player1Score).toBe(2)
      expect(result.player2Score).toBe(0)
    })

    it('should throw error if winner not in match', async () => {
      const mockMatch = {
        id: matchId,
        tournamentId,
        player1Id,
        player2Id,
        tournament: {
          id: tournamentId,
          status: 'ACTIVE',
        },
      }

      ;(mockPrisma.match.findUnique as any).mockResolvedValue(mockMatch)

      await expect(
        matchProcessor.awardMatchNoShow(matchId, organizerId, 'other-player')
      ).rejects.toThrow('Winner must be one of the match players')
    })
  })
})
