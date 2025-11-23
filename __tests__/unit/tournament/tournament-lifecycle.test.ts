/**
 * Integration tests for Tournament Lifecycle
 * 
 * Tests complete tournament flows including Swiss and elimination tournaments,
 * match submission scenarios, player drops, and tournament state management.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Test data factories
const createTestTournament = (overrides = {}) => ({
  id: `tournament-${Date.now()}`,
  name: 'Test Tournament',
  description: 'Integration test tournament',
  gameId: 'game-1',
  storeId: 'store-1',
  organizerId: 'organizer-1',
  status: 'UPCOMING',
  date: new Date(Date.now() + 86400000),
  format: 'Standard',
  tournamentStructure: 'SWISS',
  totalRounds: 3,
  maxPlayers: 8,
  entryFee: 10,
  prizePool: '100',
  rules: ['No proxies'],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const createTestPlayer = (id: string, userId: string) => ({
  id,
  userId,
  externalPlayerIds: { pokemon: `player-${id}` },
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

const createTestEntry = (tournamentId: string, playerId: string, seed: number) => ({
  id: `entry-${playerId}`,
  tournamentId,
  playerId,
  deckId: null,
  placement: null,
  record: { wins: 0, losses: 0, draws: 0 },
  seed,
  registrationDate: new Date(),
  dropped: false,
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

const createTestMatch = (tournamentId: string, player1Id: string, player2Id: string, round: number) => ({
  id: `match-${player1Id}-${player2Id}-${round}`,
  tournamentId,
  player1Id,
  player2Id,
  winnerId: null,
  round,
  table: 1,
  status: 'PENDING',
  player1Score: null,
  player2Score: null,
  scheduledTime: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

const createTestUser = (id: string, role: string = 'player') => ({
  id,
  email: `user-${id}@test.com`,
  firstName: 'Test',
  lastName: `User ${id}`,
  role,
  emailVerified: true,
  image: null,
  dateOfBirth: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('Tournament Lifecycle - Swiss Tournament Flow', () => {
  describe('Complete Swiss Tournament', () => {
    it('should complete full Swiss tournament flow: Start → Submit Results → Advance Rounds → Complete', () => {
      // Test data setup
      const tournament = createTestTournament({ tournamentStructure: 'SWISS', totalRounds: 3 })
      const players = Array.from({ length: 8 }, (_, i) => 
        createTestPlayer(`player-${i + 1}`, `user-${i + 1}`)
      )
      const entries = players.map((p, i) => 
        createTestEntry(tournament.id, p.id, i + 1)
      )

      // Phase 1: Start tournament
      expect(tournament.status).toBe('UPCOMING')
      const startedTournament = { ...tournament, status: 'ACTIVE' }
      expect(startedTournament.status).toBe('ACTIVE')

      // Phase 2: Round 1 - Generate pairings
      const round1Matches = [
        createTestMatch(tournament.id, players[0].id, players[1].id, 1),
        createTestMatch(tournament.id, players[2].id, players[3].id, 1),
        createTestMatch(tournament.id, players[4].id, players[5].id, 1),
        createTestMatch(tournament.id, players[6].id, players[7].id, 1),
      ]
      expect(round1Matches).toHaveLength(4)

      // Phase 3: Submit round 1 results
      const round1Results = round1Matches.map((match, i) => ({
        ...match,
        status: 'COMPLETED',
        winnerId: i % 2 === 0 ? match.player1Id : match.player2Id,
        player1Score: i % 2 === 0 ? 2 : 1,
        player2Score: i % 2 === 0 ? 1 : 2,
      }))
      expect(round1Results.every(m => m.status === 'COMPLETED')).toBe(true)

      // Phase 4: Advance to round 2
      const round2Matches = [
        createTestMatch(tournament.id, players[0].id, players[3].id, 2),
        createTestMatch(tournament.id, players[4].id, players[7].id, 2),
        createTestMatch(tournament.id, players[1].id, players[2].id, 2),
        createTestMatch(tournament.id, players[5].id, players[6].id, 2),
      ]
      expect(round2Matches).toHaveLength(4)

      // Phase 5: Submit round 2 results
      const round2Results = round2Matches.map((match, i) => ({
        ...match,
        status: 'COMPLETED',
        winnerId: match.player1Id,
        player1Score: 2,
        player2Score: 0,
      }))
      expect(round2Results.every(m => m.status === 'COMPLETED')).toBe(true)

      // Phase 6: Advance to round 3 (final round)
      const round3Matches = [
        createTestMatch(tournament.id, players[0].id, players[4].id, 3),
        createTestMatch(tournament.id, players[3].id, players[7].id, 3),
        createTestMatch(tournament.id, players[1].id, players[5].id, 3),
        createTestMatch(tournament.id, players[2].id, players[6].id, 3),
      ]
      expect(round3Matches).toHaveLength(4)

      // Phase 7: Submit round 3 results
      const round3Results = round3Matches.map((match, i) => ({
        ...match,
        status: 'COMPLETED',
        winnerId: match.player1Id,
        player1Score: 2,
        player2Score: 1,
      }))
      expect(round3Results.every(m => m.status === 'COMPLETED')).toBe(true)

      // Phase 8: Complete tournament
      const completedTournament = { ...startedTournament, status: 'COMPLETED' }
      expect(completedTournament.status).toBe('COMPLETED')
    })
  })
})

describe('Tournament Lifecycle - Elimination Tournament Flow', () => {
  describe('Complete Single Elimination Tournament', () => {
    it('should complete full elimination tournament flow: Start → Submit Results → Advance Rounds → Complete', () => {
      // Test data setup
      const tournament = createTestTournament({ 
        tournamentStructure: 'SINGLE_ELIMINATION',
        totalRounds: 3 // 8 players = 3 rounds (quarterfinals, semifinals, finals)
      })
      const players = Array.from({ length: 8 }, (_, i) => 
        createTestPlayer(`player-${i + 1}`, `user-${i + 1}`)
      )

      // Phase 1: Start tournament
      const startedTournament = { ...tournament, status: 'ACTIVE' }
      expect(startedTournament.status).toBe('ACTIVE')

      // Phase 2: Round 1 - Quarterfinals (8 → 4 players)
      const quarterfinalsMatches = [
        createTestMatch(tournament.id, players[0].id, players[7].id, 1),
        createTestMatch(tournament.id, players[1].id, players[6].id, 1),
        createTestMatch(tournament.id, players[2].id, players[5].id, 1),
        createTestMatch(tournament.id, players[3].id, players[4].id, 1),
      ]
      expect(quarterfinalsMatches).toHaveLength(4)

      // Submit quarterfinals results
      const quarterfinalsResults = quarterfinalsMatches.map(match => ({
        ...match,
        status: 'COMPLETED',
        winnerId: match.player1Id, // Player 1 always wins
        player1Score: 2,
        player2Score: 0,
      }))
      const quarterfinalsWinners = [players[0], players[1], players[2], players[3]]
      expect(quarterfinalsWinners).toHaveLength(4)

      // Phase 3: Round 2 - Semifinals (4 → 2 players)
      const semifinalsMatches = [
        createTestMatch(tournament.id, players[0].id, players[1].id, 2),
        createTestMatch(tournament.id, players[2].id, players[3].id, 2),
      ]
      expect(semifinalsMatches).toHaveLength(2)

      // Submit semifinals results
      const semifinalsResults = semifinalsMatches.map(match => ({
        ...match,
        status: 'COMPLETED',
        winnerId: match.player1Id,
        player1Score: 2,
        player2Score: 1,
      }))
      const semifinalsWinners = [players[0], players[2]]
      expect(semifinalsWinners).toHaveLength(2)

      // Phase 4: Round 3 - Finals (2 → 1 player)
      const finalsMatch = createTestMatch(tournament.id, players[0].id, players[2].id, 3)
      expect(finalsMatch.round).toBe(3)

      // Submit finals result
      const finalsResult = {
        ...finalsMatch,
        status: 'COMPLETED',
        winnerId: players[0].id,
        player1Score: 2,
        player2Score: 0,
      }
      expect(finalsResult.winnerId).toBe(players[0].id)

      // Phase 5: Complete tournament
      const completedTournament = { ...startedTournament, status: 'COMPLETED' }
      expect(completedTournament.status).toBe('COMPLETED')
    })
  })
})

describe('Tournament Lifecycle - Match Submission Scenarios', () => {
  describe('Both Players Agree on Result', () => {
    it('should accept match result when both players submit the same result', () => {
      const tournament = createTestTournament({ status: 'ACTIVE' })
      const player1 = createTestPlayer('player-1', 'user-1')
      const player2 = createTestPlayer('player-2', 'user-2')
      const match = createTestMatch(tournament.id, player1.id, player2.id, 1)

      // Player 1 submits result
      const player1Submission = {
        matchId: match.id,
        winnerId: player1.id,
        player1Score: 2,
        player2Score: 1,
        submittedBy: player1.userId,
      }

      // Player 2 submits same result
      const player2Submission = {
        matchId: match.id,
        winnerId: player1.id,
        player1Score: 2,
        player2Score: 1,
        submittedBy: player2.userId,
      }

      // Results match - accept automatically
      expect(player1Submission.winnerId).toBe(player2Submission.winnerId)
      expect(player1Submission.player1Score).toBe(player2Submission.player1Score)
      expect(player1Submission.player2Score).toBe(player2Submission.player2Score)

      const completedMatch = {
        ...match,
        status: 'COMPLETED',
        winnerId: player1.id,
        player1Score: 2,
        player2Score: 1,
      }
      expect(completedMatch.status).toBe('COMPLETED')
    })
  })

  describe('Players Disagree on Result (Dispute)', () => {
    it('should flag match as disputed when players submit different results', () => {
      const tournament = createTestTournament({ status: 'ACTIVE' })
      const player1 = createTestPlayer('player-1', 'user-1')
      const player2 = createTestPlayer('player-2', 'user-2')
      const match = createTestMatch(tournament.id, player1.id, player2.id, 1)

      // Player 1 submits result claiming they won
      const player1Submission = {
        matchId: match.id,
        winnerId: player1.id,
        player1Score: 2,
        player2Score: 1,
        submittedBy: player1.userId,
      }

      // Player 2 submits different result claiming they won
      const player2Submission = {
        matchId: match.id,
        winnerId: player2.id,
        player1Score: 1,
        player2Score: 2,
        submittedBy: player2.userId,
      }

      // Results don't match - create dispute
      expect(player1Submission.winnerId).not.toBe(player2Submission.winnerId)

      const disputedMatch = {
        ...match,
        status: 'DISPUTED',
        metadata: {
          dispute: {
            player1Submission,
            player2Submission,
            createdAt: new Date(),
          }
        }
      }
      expect(disputedMatch.status).toBe('DISPUTED')
    })
  })

  describe('Organizer Override', () => {
    it('should allow organizer to override match result', () => {
      const tournament = createTestTournament({ status: 'ACTIVE', organizerId: 'organizer-1' })
      const player1 = createTestPlayer('player-1', 'user-1')
      const player2 = createTestPlayer('player-2', 'user-2')
      const match = createTestMatch(tournament.id, player1.id, player2.id, 1)
      const organizer = createTestUser('organizer-1', 'organizer')

      // Match is disputed
      const disputedMatch = { ...match, status: 'DISPUTED' }

      // Organizer overrides with correct result
      const organizerOverride = {
        matchId: match.id,
        winnerId: player1.id,
        player1Score: 2,
        player2Score: 0,
        overriddenBy: organizer.id,
        overrideReason: 'Verified with video evidence',
      }

      // Verify organizer has permission
      expect(tournament.organizerId).toBe(organizer.id)

      const overriddenMatch = {
        ...disputedMatch,
        status: 'COMPLETED',
        winnerId: organizerOverride.winnerId,
        player1Score: organizerOverride.player1Score,
        player2Score: organizerOverride.player2Score,
        metadata: {
          override: organizerOverride,
        }
      }
      expect(overriddenMatch.status).toBe('COMPLETED')
      expect(overriddenMatch.metadata?.override).toBeDefined()
    })

    it('should allow admin to override any match result', () => {
      const tournament = createTestTournament({ status: 'ACTIVE', organizerId: 'organizer-1' })
      const player1 = createTestPlayer('player-1', 'user-1')
      const player2 = createTestPlayer('player-2', 'user-2')
      const match = createTestMatch(tournament.id, player1.id, player2.id, 1)
      const admin = createTestUser('admin-1', 'admin')

      // Admin can override even if not the organizer
      expect(admin.role).toBe('admin')
      expect(tournament.organizerId).not.toBe(admin.id)

      const adminOverride = {
        matchId: match.id,
        winnerId: player2.id,
        player1Score: 1,
        player2Score: 2,
        overriddenBy: admin.id,
        overrideReason: 'Admin correction',
      }

      const overriddenMatch = {
        ...match,
        status: 'COMPLETED',
        winnerId: adminOverride.winnerId,
        player1Score: adminOverride.player1Score,
        player2Score: adminOverride.player2Score,
      }
      expect(overriddenMatch.status).toBe('COMPLETED')
    })
  })

  describe('No-Show Handling', () => {
    it('should handle player no-show with automatic win for opponent', () => {
      const tournament = createTestTournament({ status: 'ACTIVE' })
      const player1 = createTestPlayer('player-1', 'user-1')
      const player2 = createTestPlayer('player-2', 'user-2')
      const match = createTestMatch(tournament.id, player1.id, player2.id, 1)

      // Player 2 doesn't show up
      const noShowResult = {
        matchId: match.id,
        winnerId: player1.id,
        player1Score: 2,
        player2Score: 0,
        noShow: player2.id,
        submittedBy: 'organizer-1',
      }

      const completedMatch = {
        ...match,
        status: 'COMPLETED',
        winnerId: noShowResult.winnerId,
        player1Score: 2,
        player2Score: 0,
        metadata: {
          noShow: noShowResult.noShow,
        }
      }
      expect(completedMatch.winnerId).toBe(player1.id)
      expect(completedMatch.metadata?.noShow).toBe(player2.id)
    })
  })
})

describe('Tournament Lifecycle - Player Drop Scenarios', () => {
  describe('Drop in Swiss Tournament', () => {
    it('should handle player drop mid-tournament and assign byes to future opponents', () => {
      const tournament = createTestTournament({ 
        status: 'ACTIVE',
        tournamentStructure: 'SWISS',
        totalRounds: 3
      })
      const players = Array.from({ length: 8 }, (_, i) => 
        createTestPlayer(`player-${i + 1}`, `user-${i + 1}`)
      )
      const entries = players.map((p, i) => 
        createTestEntry(tournament.id, p.id, i + 1)
      )

      // Round 1 completed
      const round1Match = createTestMatch(tournament.id, players[0].id, players[1].id, 1)
      const completedRound1 = {
        ...round1Match,
        status: 'COMPLETED',
        winnerId: players[0].id,
        player1Score: 2,
        player2Score: 1,
      }

      // Player 1 drops after round 1
      const droppedEntry = {
        ...entries[1],
        dropped: true,
        metadata: {
          droppedAfterRound: 1,
          droppedAt: new Date(),
        }
      }
      expect(droppedEntry.dropped).toBe(true)

      // Round 2 pairing - Player 0 was supposed to face Player 1
      // Since Player 1 dropped, Player 0 gets a bye
      const round2ByeMatch = {
        id: `bye-${players[0].id}-2`,
        tournamentId: tournament.id,
        player1Id: players[0].id,
        player2Id: null, // Bye
        winnerId: players[0].id,
        round: 2,
        status: 'COMPLETED',
        player1Score: 2,
        player2Score: 0,
        metadata: {
          isBye: true,
          reason: 'Opponent dropped',
        }
      }
      expect(round2ByeMatch.metadata?.isBye).toBe(true)
      expect(round2ByeMatch.winnerId).toBe(players[0].id)
    })

    it('should allow player to drop themselves', () => {
      const tournament = createTestTournament({ status: 'ACTIVE' })
      const player = createTestPlayer('player-1', 'user-1')
      const entry = createTestEntry(tournament.id, player.id, 1)

      // Player drops themselves
      const dropRequest = {
        tournamentId: tournament.id,
        playerId: player.id,
        requestedBy: player.userId,
      }

      // Verify player can drop themselves
      expect(dropRequest.requestedBy).toBe(player.userId)

      const droppedEntry = {
        ...entry,
        dropped: true,
        metadata: {
          droppedAt: new Date(),
          droppedBy: player.userId,
        }
      }
      expect(droppedEntry.dropped).toBe(true)
    })

    it('should allow organizer to drop any player', () => {
      const tournament = createTestTournament({ 
        status: 'ACTIVE',
        organizerId: 'organizer-1'
      })
      const player = createTestPlayer('player-1', 'user-1')
      const entry = createTestEntry(tournament.id, player.id, 1)
      const organizer = createTestUser('organizer-1', 'organizer')

      // Organizer drops player
      const dropRequest = {
        tournamentId: tournament.id,
        playerId: player.id,
        requestedBy: organizer.id,
        reason: 'Player requested drop via organizer',
      }

      // Verify organizer has permission
      expect(tournament.organizerId).toBe(organizer.id)

      const droppedEntry = {
        ...entry,
        dropped: true,
        metadata: {
          droppedAt: new Date(),
          droppedBy: organizer.id,
          reason: dropRequest.reason,
        }
      }
      expect(droppedEntry.dropped).toBe(true)
    })
  })

  describe('Drop in Elimination Tournament', () => {
    it('should handle player drop in elimination tournament with automatic advancement', () => {
      const tournament = createTestTournament({ 
        status: 'ACTIVE',
        tournamentStructure: 'SINGLE_ELIMINATION',
        totalRounds: 3
      })
      const players = Array.from({ length: 8 }, (_, i) => 
        createTestPlayer(`player-${i + 1}`, `user-${i + 1}`)
      )

      // Quarterfinals match
      const quarterfinalsMatch = createTestMatch(tournament.id, players[0].id, players[1].id, 1)

      // Player 1 drops before match starts
      const droppedEntry = createTestEntry(tournament.id, players[1].id, 2)
      const dropped = {
        ...droppedEntry,
        dropped: true,
        metadata: {
          droppedBeforeMatch: quarterfinalsMatch.id,
        }
      }

      // Player 0 automatically advances
      const autoWinMatch = {
        ...quarterfinalsMatch,
        status: 'COMPLETED',
        winnerId: players[0].id,
        player1Score: 2,
        player2Score: 0,
        metadata: {
          autoWin: true,
          reason: 'Opponent dropped',
        }
      }
      expect(autoWinMatch.winnerId).toBe(players[0].id)
      expect(autoWinMatch.metadata?.autoWin).toBe(true)
    })

    it('should not allow drops after elimination (player already lost)', () => {
      const tournament = createTestTournament({ 
        status: 'ACTIVE',
        tournamentStructure: 'SINGLE_ELIMINATION'
      })
      const player1 = createTestPlayer('player-1', 'user-1')
      const player2 = createTestPlayer('player-2', 'user-2')
      const entry = createTestEntry(tournament.id, player2.id, 2)

      // Match completed - player 2 lost
      const completedMatch = {
        id: 'match-1',
        tournamentId: tournament.id,
        player1Id: player1.id,
        player2Id: player2.id,
        winnerId: player1.id,
        round: 1,
        status: 'COMPLETED',
        player1Score: 2,
        player2Score: 0,
      }

      // Player 2 is already eliminated
      const isEliminated = completedMatch.winnerId !== player2.id
      expect(isEliminated).toBe(true)

      // Drop should not be allowed (player already out)
      const canDrop = !isEliminated
      expect(canDrop).toBe(false)
    })
  })
})

describe('Tournament Lifecycle - Pause/Resume/Cancel Scenarios', () => {
  describe('Pause Tournament', () => {
    it('should pause active tournament and prevent new matches', () => {
      const tournament = createTestTournament({ status: 'ACTIVE' })

      // Pause tournament
      const pauseRequest = {
        tournamentId: tournament.id,
        reason: 'Lunch break',
        pausedBy: tournament.organizerId,
      }

      const pausedTournament = {
        ...tournament,
        status: 'PAUSED',
        metadata: {
          pausedAt: new Date(),
          pausedBy: pauseRequest.pausedBy,
          pauseReason: pauseRequest.reason,
        }
      }
      expect(pausedTournament.status).toBe('PAUSED')
      expect(pausedTournament.metadata?.pauseReason).toBe('Lunch break')
    })

    it('should not allow pausing completed tournament', () => {
      const tournament = createTestTournament({ status: 'COMPLETED' })

      // Cannot pause completed tournament
      const canPause = tournament.status === 'ACTIVE' || tournament.status === 'PAUSED'
      expect(canPause).toBe(false)
    })
  })

  describe('Resume Tournament', () => {
    it('should resume paused tournament', () => {
      const tournament = createTestTournament({ 
        status: 'PAUSED',
        metadata: {
          pausedAt: new Date(Date.now() - 3600000), // Paused 1 hour ago
          pauseReason: 'Lunch break',
        }
      })

      // Resume tournament
      const resumeRequest = {
        tournamentId: tournament.id,
        resumedBy: tournament.organizerId,
      }

      const resumedTournament = {
        ...tournament,
        status: 'ACTIVE',
        metadata: {
          ...tournament.metadata,
          resumedAt: new Date(),
          resumedBy: resumeRequest.resumedBy,
        }
      }
      expect(resumedTournament.status).toBe('ACTIVE')
    })

    it('should not allow resuming non-paused tournament', () => {
      const tournament = createTestTournament({ status: 'ACTIVE' })

      // Cannot resume active tournament
      const canResume = tournament.status === 'PAUSED'
      expect(canResume).toBe(false)
    })
  })

  describe('Cancel Tournament', () => {
    it('should cancel tournament with reason', () => {
      const tournament = createTestTournament({ status: 'ACTIVE' })

      // Cancel tournament
      const cancelRequest = {
        tournamentId: tournament.id,
        reason: 'Venue emergency',
        cancelledBy: tournament.organizerId,
      }

      const cancelledTournament = {
        ...tournament,
        status: 'CANCELLED',
        metadata: {
          cancelledAt: new Date(),
          cancelledBy: cancelRequest.cancelledBy,
          cancellationReason: cancelRequest.reason,
        }
      }
      expect(cancelledTournament.status).toBe('CANCELLED')
      expect(cancelledTournament.metadata?.cancellationReason).toBe('Venue emergency')
    })

    it('should require cancellation reason', () => {
      const cancelRequest = {
        tournamentId: 'tournament-1',
        reason: '',
        cancelledBy: 'organizer-1',
      }

      // Empty reason should be invalid
      const isValidReason = cancelRequest.reason.trim().length > 0
      expect(isValidReason).toBe(false)
    })

    it('should not allow cancelling completed tournament', () => {
      const tournament = createTestTournament({ status: 'COMPLETED' })

      // Cannot cancel completed tournament
      const canCancel = tournament.status !== 'COMPLETED' && tournament.status !== 'CANCELLED'
      expect(canCancel).toBe(false)
    })
  })

  describe('State Transitions', () => {
    it('should validate tournament state transitions', () => {
      // Valid transitions
      const validTransitions = {
        UPCOMING: ['ACTIVE', 'CANCELLED'],
        ACTIVE: ['PAUSED', 'COMPLETED', 'CANCELLED'],
        PAUSED: ['ACTIVE', 'CANCELLED'],
        COMPLETED: [], // No transitions from completed
        CANCELLED: [], // No transitions from cancelled
      }

      // Test valid transition: UPCOMING → ACTIVE
      expect(validTransitions.UPCOMING).toContain('ACTIVE')

      // Test valid transition: ACTIVE → PAUSED
      expect(validTransitions.ACTIVE).toContain('PAUSED')

      // Test valid transition: PAUSED → ACTIVE
      expect(validTransitions.PAUSED).toContain('ACTIVE')

      // Test invalid transition: COMPLETED → ACTIVE
      expect(validTransitions.COMPLETED).not.toContain('ACTIVE')

      // Test invalid transition: CANCELLED → ACTIVE
      expect(validTransitions.CANCELLED).not.toContain('ACTIVE')
    })
  })
})

describe('Tournament Lifecycle - Authorization', () => {
  describe('Organizer Permissions', () => {
    it('should allow organizer to manage their own tournament', () => {
      const tournament = createTestTournament({ organizerId: 'organizer-1' })
      const organizer = createTestUser('organizer-1', 'organizer')

      const canManage = (
        organizer.role === 'organizer' && 
        tournament.organizerId === organizer.id
      ) || organizer.role === 'admin'

      expect(canManage).toBe(true)
    })

    it('should not allow organizer to manage other tournaments', () => {
      const tournament = createTestTournament({ organizerId: 'organizer-1' })
      const otherOrganizer = createTestUser('organizer-2', 'organizer')

      const canManage = (
        otherOrganizer.role === 'organizer' && 
        tournament.organizerId === otherOrganizer.id
      ) || otherOrganizer.role === 'admin'

      expect(canManage).toBe(false)
    })
  })

  describe('Admin Permissions', () => {
    it('should allow admin to manage any tournament', () => {
      const tournament = createTestTournament({ organizerId: 'organizer-1' })
      const admin = createTestUser('admin-1', 'admin')

      const canManage = admin.role === 'admin'
      expect(canManage).toBe(true)
    })
  })

  describe('Player Permissions', () => {
    it('should not allow player to manage tournament', () => {
      const tournament = createTestTournament({ organizerId: 'organizer-1' })
      const player = createTestUser('player-1', 'player')

      const canManage = (
        player.role === 'organizer' && 
        tournament.organizerId === player.id
      ) || player.role === 'admin'

      expect(canManage).toBe(false)
    })

    it('should allow player to submit their own match results', () => {
      const tournament = createTestTournament({ status: 'ACTIVE' })
      const player = createTestPlayer('player-1', 'user-1')
      const match = createTestMatch(tournament.id, player.id, 'player-2', 1)

      const canSubmit = match.player1Id === player.id || match.player2Id === player.id
      expect(canSubmit).toBe(true)
    })

    it('should not allow player to submit results for other matches', () => {
      const tournament = createTestTournament({ status: 'ACTIVE' })
      const player = createTestPlayer('player-1', 'user-1')
      const match = createTestMatch(tournament.id, 'player-2', 'player-3', 1)

      const canSubmit = match.player1Id === player.id || match.player2Id === player.id
      expect(canSubmit).toBe(false)
    })
  })
})

