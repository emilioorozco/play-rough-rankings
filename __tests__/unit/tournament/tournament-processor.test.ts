/**
 * Unit tests for TournamentProcessor
 * 
 * Tests the tournament lifecycle management functionality including
 * starting tournaments, validation, and error handling.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { PrismaClient } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { TournamentProcessor } from '@/lib/tournament/tournament-processor'

// Create a properly typed mock Prisma Client
const createMockPrisma = () => ({
  $transaction: jest.fn<any>(),
  tournament: {
    findUnique: jest.fn<any>(),
    update: jest.fn<any>()
  },
  match: {
    create: jest.fn<any>()
  }
})

type MockPrisma = ReturnType<typeof createMockPrisma>

let mockPrisma: MockPrisma

describe('TournamentProcessor', () => {
  let processor: TournamentProcessor

  beforeEach(() => {
    mockPrisma = createMockPrisma()
    processor = new TournamentProcessor(mockPrisma as unknown as PrismaClient)
    jest.clearAllMocks()
  })

  describe('startTournament', () => {
    const tournamentId = 'tournament-123'
    const organizerId = 'organizer-456'

    const mockTournament = {
      id: tournamentId,
      name: 'Test Tournament',
      status: 'UPCOMING',
      tournamentStructure: 'SWISS',
      gameId: 'game-123',
      organizerId,
      storeId: 'store-123',
      date: new Date(),
      format: 'Standard',
      createdAt: new Date(),
      updatedAt: new Date(),
      description: null,
      entryFee: null,
      maxPlayers: null,
      metadata: null,
      prizePool: null,
      registrationDeadline: null,
      rules: [],
      totalRounds: 3,
      tournamentLevel: null
    }

    const mockEntries = [
      {
        id: 'entry-1',
        tournamentId,
        playerId: 'player-1',
        deckId: null,
        placement: null,
        record: null,
        seed: 1,
        registrationDate: new Date(),
        dropped: false,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'entry-2',
        tournamentId,
        playerId: 'player-2',
        deckId: null,
        placement: null,
        record: null,
        seed: 2,
        registrationDate: new Date(),
        dropped: false,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    const mockPairings = [
      {
        player1Id: 'player-1',
        player2Id: 'player-2',
        table: 1
      }
    ]

    const mockMatch = {
      id: 'match-1',
      tournamentId,
      player1Id: 'player-1',
      player2Id: 'player-2',
      winnerId: null,
      round: 1,
      table: 1,
      status: 'PENDING',
      player1Score: null,
      player2Score: null,
      scheduledTime: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    it('should successfully start a tournament with valid data', async () => {
      // Setup mocks
      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue({
              ...mockTournament,
              entries: mockEntries
            }),
            update: jest.fn<any>().mockResolvedValue({
              ...mockTournament,
              status: 'ACTIVE'
            })
          },
          match: {
            create: jest.fn<any>().mockResolvedValue(mockMatch)
          }
        }
        return callback(tx)
      })

      // Execute
      const result = await processor.startTournament(tournamentId, organizerId)

      // Verify
      expect(result).toBeDefined()
      expect(result.tournament.status).toBe('ACTIVE')
      expect(result.matches).toHaveLength(1)
      expect(result.matches[0]).toEqual(mockMatch)
    })

    it('should throw NOT_FOUND error when tournament does not exist', async () => {
      // Setup mocks
      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue(null)
          }
        }
        return callback(tx)
      })

      // Execute and verify
      await expect(
        processor.startTournament(tournamentId, organizerId)
      ).rejects.toThrow('Tournament not found')
    })

    it('should throw BAD_REQUEST error when tournament is not in UPCOMING status', async () => {
      // Setup mocks
      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue({
              ...mockTournament,
              status: 'ACTIVE',
              entries: mockEntries
            })
          }
        }
        return callback(tx)
      })

      // Execute and verify
      await expect(
        processor.startTournament(tournamentId, organizerId)
      ).rejects.toThrow('Cannot start tournament with status ACTIVE')
    })

    it('should throw BAD_REQUEST error when insufficient players registered', async () => {
      // Setup mocks with only 1 player
      const singleEntry = [mockEntries[0]]

      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue({
              ...mockTournament,
              entries: singleEntry
            })
          }
        }
        return callback(tx)
      })

      // Execute and verify
      await expect(
        processor.startTournament(tournamentId, organizerId)
      ).rejects.toThrow('Insufficient players registered')
    })

    it('should handle transaction rollback on failure', async () => {
      // Setup mocks to fail during match creation
      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue({
              ...mockTournament,
              entries: mockEntries
            }),
            update: jest.fn<any>().mockResolvedValue({
              ...mockTournament,
              status: 'ACTIVE'
            })
          },
          match: {
            create: jest.fn<any>().mockRejectedValue(new Error('Database error'))
          }
        }
        return callback(tx)
      })

      // Execute and verify
      await expect(
        processor.startTournament(tournamentId, organizerId)
      ).rejects.toThrow()
    })

    it('should handle bye matches in Swiss tournaments with odd player count', async () => {
      // Setup mocks with 3 players (odd number)
      const threeEntries = [
        ...mockEntries,
        {
          id: 'entry-3',
          tournamentId,
          playerId: 'player-3',
          deckId: null,
          placement: null,
          record: null,
          seed: 3,
          registrationDate: new Date(),
          dropped: false,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      const mockByeMatch = {
        ...mockMatch,
        id: 'match-2',
        player1Id: 'player-3',
        player2Id: 'player-3',
        winnerId: 'player-3',
        player1Score: 2,
        player2Score: 0,
        status: 'COMPLETED',
        table: 2
      }

      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue({
              ...mockTournament,
              entries: threeEntries
            }),
            update: jest.fn<any>().mockResolvedValue({
              ...mockTournament,
              status: 'ACTIVE'
            })
          },
          match: {
            create: jest.fn<any>()
              .mockResolvedValueOnce(mockMatch)
              .mockResolvedValueOnce(mockByeMatch)
          }
        }
        return callback(tx)
      })

      // Execute
      const result = await processor.startTournament(tournamentId, organizerId)

      // Verify
      expect(result.matches).toHaveLength(2)
      expect(result.matches[1].status).toBe('COMPLETED')
      expect(result.matches[1].winnerId).toBe('player-3')
    })

    it('should support ELIMINATION tournament structure', async () => {
      // Setup mocks for elimination tournament
      const eliminationTournament = {
        ...mockTournament,
        tournamentStructure: 'ELIMINATION'
      }

      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue({
              ...eliminationTournament,
              entries: mockEntries
            }),
            update: jest.fn<any>().mockResolvedValue({
              ...eliminationTournament,
              status: 'ACTIVE'
            })
          },
          match: {
            create: jest.fn<any>().mockResolvedValue(mockMatch)
          }
        }
        return callback(tx)
      })

      // Execute
      const result = await processor.startTournament(tournamentId, organizerId)

      // Verify
      expect(result.tournament.status).toBe('ACTIVE')
    })

    it('should filter out dropped players before generating pairings', async () => {
      // Setup mocks with one dropped player
      const entriesWithDropped = [
        ...mockEntries,
        {
          id: 'entry-3',
          tournamentId,
          playerId: 'player-3',
          deckId: null,
          placement: null,
          record: null,
          seed: 3,
          registrationDate: new Date(),
          dropped: true, // This player is dropped
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue({
              ...mockTournament,
              entries: entriesWithDropped
            }),
            update: jest.fn<any>().mockResolvedValue({
              ...mockTournament,
              status: 'ACTIVE'
            })
          },
          match: {
            create: jest.fn<any>().mockResolvedValue(mockMatch)
          }
        }
        return callback(tx)
      })

      // Execute
      const result = await processor.startTournament(tournamentId, organizerId)

      // Verify result includes only active players
      expect(result.matches).toHaveLength(1)
    })
  })

  describe('advanceRound', () => {
    const tournamentId = 'tournament-123'
    const organizerId = 'organizer-456'

    const mockTournament = {
      id: tournamentId,
      name: 'Test Tournament',
      status: 'ACTIVE',
      tournamentStructure: 'SWISS',
      gameId: 'game-123',
      organizerId,
      storeId: 'store-123',
      date: new Date(),
      format: 'Standard',
      createdAt: new Date(),
      updatedAt: new Date(),
      description: null,
      entryFee: null,
      maxPlayers: null,
      metadata: null,
      prizePool: null,
      registrationDeadline: null,
      rules: [],
      totalRounds: 3,
      tournamentLevel: null
    }

    const mockEntries = [
      {
        id: 'entry-1',
        tournamentId,
        playerId: 'player-1',
        deckId: null,
        placement: null,
        record: { wins: 1, losses: 0, draws: 0 },
        seed: 1,
        registrationDate: new Date(),
        dropped: false,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'entry-2',
        tournamentId,
        playerId: 'player-2',
        deckId: null,
        placement: null,
        record: { wins: 1, losses: 0, draws: 0 },
        seed: 2,
        registrationDate: new Date(),
        dropped: false,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'entry-3',
        tournamentId,
        playerId: 'player-3',
        deckId: null,
        placement: null,
        record: { wins: 0, losses: 1, draws: 0 },
        seed: 3,
        registrationDate: new Date(),
        dropped: false,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'entry-4',
        tournamentId,
        playerId: 'player-4',
        deckId: null,
        placement: null,
        record: { wins: 0, losses: 1, draws: 0 },
        seed: 4,
        registrationDate: new Date(),
        dropped: false,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    const mockRound1Matches = [
      {
        id: 'match-1',
        tournamentId,
        player1Id: 'player-1',
        player2Id: 'player-2',
        winnerId: 'player-1',
        round: 1,
        table: 1,
        status: 'COMPLETED',
        player1Score: 2,
        player2Score: 1,
        scheduledTime: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'match-2',
        tournamentId,
        player1Id: 'player-3',
        player2Id: 'player-4',
        winnerId: 'player-3',
        round: 1,
        table: 2,
        status: 'COMPLETED',
        player1Score: 2,
        player2Score: 0,
        scheduledTime: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    const mockNewMatch = {
      id: 'match-3',
      tournamentId,
      player1Id: 'player-1',
      player2Id: 'player-3',
      winnerId: null,
      round: 2,
      table: 1,
      status: 'PENDING',
      player1Score: null,
      player2Score: null,
      scheduledTime: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    it('should successfully advance Swiss tournament to next round', async () => {
      // Setup mocks
      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue({
              ...mockTournament,
              entries: mockEntries,
              matches: mockRound1Matches
            }),
            update: jest.fn<any>().mockResolvedValue(mockTournament)
          },
          match: {
            create: jest.fn<any>().mockResolvedValue(mockNewMatch)
          }
        }
        return callback(tx)
      })

      // Execute
      const result = await processor.advanceRound(tournamentId, organizerId)

      // Verify
      expect(result).toBeDefined()
      expect(result.currentRound).toBe(2)
      expect(result.tournamentEnded).toBe(false)
      expect(result.newMatches.length).toBeGreaterThan(0)
    })

    it('should successfully advance elimination tournament to next round', async () => {
      const eliminationTournament = {
        ...mockTournament,
        tournamentStructure: 'ELIMINATION',
        totalRounds: null
      }

      const eliminationMatches = [
        {
          ...mockRound1Matches[0],
          winnerId: 'player-1'
        },
        {
          ...mockRound1Matches[1],
          winnerId: 'player-3'
        }
      ]

      // Setup mocks
      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue({
              ...eliminationTournament,
              entries: mockEntries,
              matches: eliminationMatches
            }),
            update: jest.fn<any>().mockResolvedValue(eliminationTournament)
          },
          match: {
            create: jest.fn<any>().mockResolvedValue(mockNewMatch)
          }
        }
        return callback(tx)
      })

      // Execute
      const result = await processor.advanceRound(tournamentId, organizerId)

      // Verify
      expect(result).toBeDefined()
      expect(result.currentRound).toBe(2)
      expect(result.tournamentEnded).toBe(false)
    })

    it('should throw NOT_FOUND error when tournament does not exist', async () => {
      // Setup mocks
      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue(null)
          }
        }
        return callback(tx)
      })

      // Execute and verify
      await expect(
        processor.advanceRound(tournamentId, organizerId)
      ).rejects.toThrow('Tournament not found')
    })

    it('should throw BAD_REQUEST error when tournament is not ACTIVE', async () => {
      // Setup mocks
      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue({
              ...mockTournament,
              status: 'COMPLETED',
              entries: mockEntries,
              matches: mockRound1Matches
            })
          }
        }
        return callback(tx)
      })

      // Execute and verify
      await expect(
        processor.advanceRound(tournamentId, organizerId)
      ).rejects.toThrow('Cannot advance tournament with status COMPLETED')
    })

    it('should throw BAD_REQUEST error when current round has incomplete matches', async () => {
      const incompleteMatches = [
        {
          ...mockRound1Matches[0],
          status: 'COMPLETED'
        },
        {
          ...mockRound1Matches[1],
          status: 'PENDING' // This match is not completed
        }
      ]

      // Setup mocks
      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue({
              ...mockTournament,
              entries: mockEntries,
              matches: incompleteMatches
            })
          }
        }
        return callback(tx)
      })

      // Execute and verify
      await expect(
        processor.advanceRound(tournamentId, organizerId)
      ).rejects.toThrow('Cannot advance round')
    })

    it('should detect end of Swiss tournament when all rounds complete', async () => {
      const finalRoundTournament = {
        ...mockTournament,
        totalRounds: 1 // Only 1 round total
      }

      // Setup mocks
      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue({
              ...finalRoundTournament,
              entries: mockEntries,
              matches: mockRound1Matches
            }),
            update: jest.fn<any>().mockResolvedValue(finalRoundTournament)
          }
        }
        return callback(tx)
      })

      // Execute
      const result = await processor.advanceRound(tournamentId, organizerId)

      // Verify
      expect(result.tournamentEnded).toBe(true)
      expect(result.newMatches).toHaveLength(0)
      expect(result.currentRound).toBe(1)
    })

    it('should detect end of elimination tournament when one player remains', async () => {
      const eliminationTournament = {
        ...mockTournament,
        tournamentStructure: 'ELIMINATION',
        totalRounds: null
      }

      const finalMatch = [
        {
          ...mockRound1Matches[0],
          round: 2,
          winnerId: 'player-1'
        }
      ]

      // Setup mocks
      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue({
              ...eliminationTournament,
              entries: mockEntries,
              matches: finalMatch
            }),
            update: jest.fn<any>().mockResolvedValue(eliminationTournament)
          }
        }
        return callback(tx)
      })

      // Execute
      const result = await processor.advanceRound(tournamentId, organizerId)

      // Verify
      expect(result.tournamentEnded).toBe(true)
      expect(result.newMatches).toHaveLength(0)
      expect(result.currentRound).toBe(2)
    })

    it('should handle bye matches in Swiss round advancement', async () => {
      // Setup with 3 players (odd number) for round 2
      const threePlayerEntries = mockEntries.slice(0, 3)

      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue({
              ...mockTournament,
              entries: threePlayerEntries,
              matches: mockRound1Matches.slice(0, 1) // Only one match in round 1
            }),
            update: jest.fn<any>().mockResolvedValue(mockTournament)
          },
          match: {
            create: jest.fn<any>()
              .mockResolvedValueOnce(mockNewMatch)
              .mockResolvedValueOnce({
                ...mockNewMatch,
                id: 'match-bye',
                player1Id: 'player-3',
                player2Id: 'player-3',
                winnerId: 'player-3',
                status: 'COMPLETED',
                player1Score: 2,
                player2Score: 0
              })
          }
        }
        return callback(tx)
      })

      // Execute
      const result = await processor.advanceRound(tournamentId, organizerId)

      // Verify
      expect(result.newMatches.length).toBeGreaterThan(0)
      expect(result.tournamentEnded).toBe(false)
    })

    it('should throw error when elimination tournament has no winners', async () => {
      const eliminationTournament = {
        ...mockTournament,
        tournamentStructure: 'ELIMINATION'
      }

      const matchesWithNoWinners = [
        {
          ...mockRound1Matches[0],
          winnerId: null // No winner
        }
      ]

      // Setup mocks
      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue({
              ...eliminationTournament,
              entries: mockEntries,
              matches: matchesWithNoWinners
            })
          }
        }
        return callback(tx)
      })

      // Execute and verify
      await expect(
        processor.advanceRound(tournamentId, organizerId)
      ).rejects.toThrow('No winners found in current round')
    })
  })

  describe('completeTournament', () => {
    const tournamentId = 'tournament-123'
    const organizerId = 'organizer-456'

    const mockTournament = {
      id: tournamentId,
      name: 'Test Tournament',
      status: 'ACTIVE',
      tournamentStructure: 'SWISS',
      gameId: 'game-123',
      organizerId,
      storeId: 'store-123',
      date: new Date(),
      format: 'Standard',
      createdAt: new Date(),
      updatedAt: new Date(),
      description: null,
      entryFee: null,
      maxPlayers: null,
      metadata: null,
      prizePool: null,
      registrationDeadline: null,
      rules: [],
      totalRounds: 3,
      tournamentLevel: 'LOCAL'
    }

    const mockEntries = [
      {
        id: 'entry-1',
        tournamentId,
        playerId: 'player-1',
        deckId: null,
        placement: null,
        record: { wins: 3, losses: 0, draws: 0 },
        seed: 1,
        registrationDate: new Date(),
        dropped: false,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        player: {
          id: 'player-1',
          userId: 'user-1',
          externalPlayerIds: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          gameStats: []
        }
      },
      {
        id: 'entry-2',
        tournamentId,
        playerId: 'player-2',
        deckId: null,
        placement: null,
        record: { wins: 2, losses: 1, draws: 0 },
        seed: 2,
        registrationDate: new Date(),
        dropped: false,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        player: {
          id: 'player-2',
          userId: 'user-2',
          externalPlayerIds: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          gameStats: []
        }
      },
      {
        id: 'entry-3',
        tournamentId,
        playerId: 'player-3',
        deckId: null,
        placement: null,
        record: { wins: 1, losses: 2, draws: 0 },
        seed: 3,
        registrationDate: new Date(),
        dropped: false,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        player: {
          id: 'player-3',
          userId: 'user-3',
          externalPlayerIds: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          gameStats: []
        }
      },
      {
        id: 'entry-4',
        tournamentId,
        playerId: 'player-4',
        deckId: null,
        placement: null,
        record: { wins: 0, losses: 3, draws: 0 },
        seed: 4,
        registrationDate: new Date(),
        dropped: false,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        player: {
          id: 'player-4',
          userId: 'user-4',
          externalPlayerIds: null,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          gameStats: []
        }
      }
    ]

    const mockCompletedMatches = [
      // Round 1
      {
        id: 'match-1',
        tournamentId,
        player1Id: 'player-1',
        player2Id: 'player-2',
        winnerId: 'player-1',
        round: 1,
        table: 1,
        status: 'COMPLETED',
        player1Score: 2,
        player2Score: 1,
        scheduledTime: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'match-2',
        tournamentId,
        player1Id: 'player-3',
        player2Id: 'player-4',
        winnerId: 'player-3',
        round: 1,
        table: 2,
        status: 'COMPLETED',
        player1Score: 2,
        player2Score: 0,
        scheduledTime: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Round 2
      {
        id: 'match-3',
        tournamentId,
        player1Id: 'player-1',
        player2Id: 'player-3',
        winnerId: 'player-1',
        round: 2,
        table: 1,
        status: 'COMPLETED',
        player1Score: 2,
        player2Score: 1,
        scheduledTime: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'match-4',
        tournamentId,
        player1Id: 'player-2',
        player2Id: 'player-4',
        winnerId: 'player-2',
        round: 2,
        table: 2,
        status: 'COMPLETED',
        player1Score: 2,
        player2Score: 0,
        scheduledTime: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Round 3
      {
        id: 'match-5',
        tournamentId,
        player1Id: 'player-1',
        player2Id: 'player-4',
        winnerId: 'player-1',
        round: 3,
        table: 1,
        status: 'COMPLETED',
        player1Score: 2,
        player2Score: 0,
        scheduledTime: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'match-6',
        tournamentId,
        player1Id: 'player-2',
        player2Id: 'player-3',
        winnerId: 'player-2',
        round: 3,
        table: 2,
        status: 'COMPLETED',
        player1Score: 2,
        player2Score: 1,
        scheduledTime: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    const mockPlayerStats = {
      id: 'stats-1',
      playerId: 'player-1',
      gameId: 'game-123',
      currentRating: 1200,
      seasonalStats: { wins: 0, losses: 0, draws: 0, tournaments: 0 },
      bestFinish: null,
      totalEarnings: 0,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    it('should successfully complete a Swiss tournament with rating updates', async () => {
      // Setup mocks
      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue({
              ...mockTournament,
              entries: mockEntries,
              matches: mockCompletedMatches,
              game: { id: 'game-123', name: 'Test Game' }
            }),
            update: jest.fn<any>().mockResolvedValue({
              ...mockTournament,
              status: 'COMPLETED'
            })
          },
          tournamentEntry: {
            update: jest.fn<any>().mockImplementation((args: any) => {
              const entry = mockEntries.find(e => e.id === args.where.id)
              return Promise.resolve({
                ...entry,
                placement: args.data.placement
              })
            })
          },
          playerGameStats: {
            findUnique: jest.fn<any>().mockResolvedValue(mockPlayerStats),
            create: jest.fn<any>().mockResolvedValue(mockPlayerStats),
            update: jest.fn<any>().mockImplementation((args: any) => {
              return Promise.resolve({
                ...mockPlayerStats,
                currentRating: args.data.currentRating || mockPlayerStats.currentRating
              })
            })
          }
        }
        return callback(tx)
      })

      // Execute
      const result = await processor.completeTournament(tournamentId, organizerId)

      // Verify
      expect(result).toBeDefined()
      expect(result.tournament.status).toBe('COMPLETED')
      expect(result.finalStandings).toHaveLength(4)
      expect(result.finalStandings[0].placement).toBe(1)
      expect(result.ratingUpdates.length).toBeGreaterThan(0)
    })

    it('should throw NOT_FOUND error when tournament does not exist', async () => {
      // Setup mocks
      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue(null)
          }
        }
        return callback(tx)
      })

      // Execute and verify
      await expect(
        processor.completeTournament(tournamentId, organizerId)
      ).rejects.toThrow('Tournament not found')
    })

    it('should throw BAD_REQUEST error when tournament is not ACTIVE', async () => {
      // Setup mocks
      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue({
              ...mockTournament,
              status: 'COMPLETED',
              entries: mockEntries,
              matches: mockCompletedMatches,
              game: { id: 'game-123', name: 'Test Game' }
            })
          }
        }
        return callback(tx)
      })

      // Execute and verify
      await expect(
        processor.completeTournament(tournamentId, organizerId)
      ).rejects.toThrow('Cannot complete tournament with status COMPLETED')
    })

    it('should throw BAD_REQUEST error when matches are incomplete', async () => {
      const incompleteMatches = [
        ...mockCompletedMatches.slice(0, -1),
        {
          ...mockCompletedMatches[mockCompletedMatches.length - 1],
          status: 'PENDING'
        }
      ]

      // Setup mocks
      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue({
              ...mockTournament,
              entries: mockEntries,
              matches: incompleteMatches,
              game: { id: 'game-123', name: 'Test Game' }
            })
          }
        }
        return callback(tx)
      })

      // Execute and verify
      await expect(
        processor.completeTournament(tournamentId, organizerId)
      ).rejects.toThrow('Cannot complete tournament')
    })

    it('should calculate correct final placements for Swiss tournament', async () => {
      // Setup mocks
      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue({
              ...mockTournament,
              entries: mockEntries,
              matches: mockCompletedMatches,
              game: { id: 'game-123', name: 'Test Game' }
            }),
            update: jest.fn<any>().mockResolvedValue({
              ...mockTournament,
              status: 'COMPLETED'
            })
          },
          tournamentEntry: {
            update: jest.fn<any>().mockImplementation((args: any) => {
              const entry = mockEntries.find(e => e.id === args.where.id)
              return Promise.resolve({
                ...entry,
                placement: args.data.placement
              })
            })
          },
          playerGameStats: {
            findUnique: jest.fn<any>().mockResolvedValue(mockPlayerStats),
            create: jest.fn<any>().mockResolvedValue(mockPlayerStats),
            update: jest.fn<any>().mockResolvedValue(mockPlayerStats)
          }
        }
        return callback(tx)
      })

      // Execute
      const result = await processor.completeTournament(tournamentId, organizerId)

      // Verify placements are in correct order (player-1 should be 1st with 3 wins)
      expect(result.finalStandings[0].playerId).toBe('player-1')
      expect(result.finalStandings[0].placement).toBe(1)
      expect(result.finalStandings[1].playerId).toBe('player-2')
      expect(result.finalStandings[1].placement).toBe(2)
    })

    it('should handle elimination tournament completion', async () => {
      const eliminationTournament = {
        ...mockTournament,
        tournamentStructure: 'ELIMINATION'
      }

      const eliminationMatches = [
        // Round 1 (semifinals)
        {
          ...mockCompletedMatches[0],
          winnerId: 'player-1'
        },
        {
          ...mockCompletedMatches[1],
          winnerId: 'player-3'
        },
        // Round 2 (finals)
        {
          ...mockCompletedMatches[2],
          round: 2,
          player1Id: 'player-1',
          player2Id: 'player-3',
          winnerId: 'player-1'
        }
      ]

      // Setup mocks
      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue({
              ...eliminationTournament,
              entries: mockEntries,
              matches: eliminationMatches,
              game: { id: 'game-123', name: 'Test Game' }
            }),
            update: jest.fn<any>().mockResolvedValue({
              ...eliminationTournament,
              status: 'COMPLETED'
            })
          },
          tournamentEntry: {
            update: jest.fn<any>().mockImplementation((args: any) => {
              const entry = mockEntries.find(e => e.id === args.where.id)
              return Promise.resolve({
                ...entry,
                placement: args.data.placement
              })
            })
          },
          playerGameStats: {
            findUnique: jest.fn<any>().mockResolvedValue(mockPlayerStats),
            create: jest.fn<any>().mockResolvedValue(mockPlayerStats),
            update: jest.fn<any>().mockResolvedValue(mockPlayerStats)
          }
        }
        return callback(tx)
      })

      // Execute
      const result = await processor.completeTournament(tournamentId, organizerId)

      // Verify
      expect(result.tournament.status).toBe('COMPLETED')
      expect(result.finalStandings[0].playerId).toBe('player-1') // Winner
    })

    it('should create PlayerGameStats if not exists', async () => {
      // Setup mocks with no existing stats
      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue({
              ...mockTournament,
              entries: mockEntries,
              matches: mockCompletedMatches,
              game: { id: 'game-123', name: 'Test Game' }
            }),
            update: jest.fn<any>().mockResolvedValue({
              ...mockTournament,
              status: 'COMPLETED'
            })
          },
          tournamentEntry: {
            update: jest.fn<any>().mockImplementation((args: any) => {
              const entry = mockEntries.find(e => e.id === args.where.id)
              return Promise.resolve({
                ...entry,
                placement: args.data.placement
              })
            })
          },
          playerGameStats: {
            findUnique: jest.fn<any>().mockResolvedValue(null), // No existing stats
            create: jest.fn<any>().mockResolvedValue(mockPlayerStats),
            update: jest.fn<any>().mockResolvedValue(mockPlayerStats)
          }
        }
        return callback(tx)
      })

      // Execute
      const result = await processor.completeTournament(tournamentId, organizerId)

      // Verify
      expect(result).toBeDefined()
      expect(result.tournament.status).toBe('COMPLETED')
    })

    it('should throw error when tournament has no rounds played', async () => {
      // Setup mocks with no matches
      ;(mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
        const tx = {
          tournament: {
            findUnique: jest.fn<any>().mockResolvedValue({
              ...mockTournament,
              entries: mockEntries,
              matches: [], // No matches
              game: { id: 'game-123', name: 'Test Game' }
            })
          }
        }
        return callback(tx)
      })

      // Execute and verify
      await expect(
        processor.completeTournament(tournamentId, organizerId)
      ).rejects.toThrow('Cannot complete tournament with no rounds played')
    })
  })
})
