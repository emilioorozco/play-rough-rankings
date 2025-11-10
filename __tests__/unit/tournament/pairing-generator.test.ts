/**
 * Unit tests for PairingGenerator
 * 
 * Tests the pairing generation logic for both Swiss and Elimination
 * tournament formats, including bracket size calculation and table assignment.
 */

import { PairingGenerator } from '@/lib/tournament/pairing-generator'
import type { TournamentEntry } from '@prisma/client'

describe('PairingGenerator', () => {
  let generator: PairingGenerator

  beforeEach(() => {
    generator = new PairingGenerator()
  })

  // Helper function to create mock tournament entries
  const createMockEntries = (count: number, withSeeds: boolean = false): TournamentEntry[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `entry-${i + 1}`,
      tournamentId: 'tournament-1',
      playerId: `player-${i + 1}`,
      deckId: null,
      placement: null,
      record: null,
      seed: withSeeds ? i + 1 : null,
      registrationDate: new Date(),
      dropped: false,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
  }

  describe('generateInitialPairings', () => {
    it('should throw error with insufficient players', () => {
      const entries = createMockEntries(1)
      expect(() => generator.generateInitialPairings(entries, 'SWISS')).toThrow(
        'Insufficient players for pairings (minimum 2 required)'
      )
    })

    it('should throw error with unsupported format', () => {
      const entries = createMockEntries(4)
      expect(() => generator.generateInitialPairings(entries, 'INVALID' as any)).toThrow(
        'Unsupported tournament format: INVALID'
      )
    })

    it('should generate Swiss pairings for even player count', () => {
      const entries = createMockEntries(8, true)
      const pairings = generator.generateInitialPairings(entries, 'SWISS')

      expect(pairings).toHaveLength(4)
      pairings.forEach((pairing, index) => {
        expect(pairing.player1Id).toBeDefined()
        expect(pairing.player2Id).toBeDefined()
        expect(pairing.player1Id).not.toBe(pairing.player2Id)
        expect(pairing.table).toBe(index + 1)
        expect(pairing.isBye).toBeUndefined()
      })
    })

    it('should generate Swiss pairings for odd player count with bye', () => {
      const entries = createMockEntries(7, true)
      const pairings = generator.generateInitialPairings(entries, 'SWISS')

      expect(pairings).toHaveLength(4) // 3 regular matches + 1 bye
      
      // Check regular matches
      const regularPairings = pairings.slice(0, 3)
      regularPairings.forEach((pairing) => {
        expect(pairing.player1Id).not.toBe(pairing.player2Id)
        expect(pairing.isBye).toBeUndefined()
      })

      // Check bye match
      const byeMatch = pairings[3]
      expect(byeMatch.player1Id).toBe(byeMatch.player2Id)
      expect(byeMatch.isBye).toBe(true)
      expect(byeMatch.table).toBe(4)
    })

    it('should respect seeding in Swiss pairings', () => {
      const entries = createMockEntries(4, true)
      const pairings = generator.generateInitialPairings(entries, 'SWISS')

      // With seeding, players should be paired in order
      expect(pairings).toHaveLength(2)
      expect(pairings[0].player1Id).toBe('player-1')
      expect(pairings[0].player2Id).toBe('player-2')
      expect(pairings[1].player1Id).toBe('player-3')
      expect(pairings[1].player2Id).toBe('player-4')
    })

    it('should generate elimination bracket for power of 2 players', () => {
      const entries = createMockEntries(8, true)
      const pairings = generator.generateInitialPairings(entries, 'ELIMINATION')

      expect(pairings).toHaveLength(4)
      pairings.forEach((pairing, index) => {
        expect(pairing.player1Id).toBeDefined()
        expect(pairing.player2Id).toBeDefined()
        expect(pairing.player1Id).not.toBe(pairing.player2Id)
        expect(pairing.table).toBe(index + 1)
        expect(pairing.isBye).toBeUndefined()
      })
    })

    it('should generate elimination bracket with byes for non-power of 2', () => {
      const entries = createMockEntries(6, true)
      const pairings = generator.generateInitialPairings(entries, 'ELIMINATION')

      // Bracket size is 8, with 6 players we get 3 matches in round 1
      // (2 regular matches + 0 byes, since 6 is even)
      expect(pairings).toHaveLength(3)

      // All matches should be regular matches (no byes with 6 players)
      const byeMatches = pairings.filter(p => p.isBye)
      expect(byeMatches).toHaveLength(0)

      // All matches should have different players
      pairings.forEach(pairing => {
        expect(pairing.player1Id).not.toBe(pairing.player2Id)
      })
    })
  })

  describe('calculateBracketSize', () => {
    it('should throw error for less than 2 players', () => {
      expect(() => generator.calculateBracketSize(0)).toThrow(
        'Bracket size requires at least 2 players'
      )
      expect(() => generator.calculateBracketSize(1)).toThrow(
        'Bracket size requires at least 2 players'
      )
    })

    it('should return correct bracket size for power of 2', () => {
      expect(generator.calculateBracketSize(2)).toBe(2)
      expect(generator.calculateBracketSize(4)).toBe(4)
      expect(generator.calculateBracketSize(8)).toBe(8)
      expect(generator.calculateBracketSize(16)).toBe(16)
      expect(generator.calculateBracketSize(32)).toBe(32)
    })

    it('should return next power of 2 for non-power of 2', () => {
      expect(generator.calculateBracketSize(3)).toBe(4)
      expect(generator.calculateBracketSize(5)).toBe(8)
      expect(generator.calculateBracketSize(6)).toBe(8)
      expect(generator.calculateBracketSize(7)).toBe(8)
      expect(generator.calculateBracketSize(9)).toBe(16)
      expect(generator.calculateBracketSize(15)).toBe(16)
      expect(generator.calculateBracketSize(17)).toBe(32)
    })
  })

  describe('assignTableNumbers', () => {
    it('should assign sequential table numbers starting from 1', () => {
      const pairings = [
        { player1Id: 'p1', player2Id: 'p2' },
        { player1Id: 'p3', player2Id: 'p4' },
        { player1Id: 'p5', player2Id: 'p6' },
      ]

      const result = generator.assignTableNumbers(pairings)

      expect(result).toHaveLength(3)
      expect(result[0].table).toBe(1)
      expect(result[1].table).toBe(2)
      expect(result[2].table).toBe(3)
    })

    it('should assign sequential table numbers starting from custom number', () => {
      const pairings = [
        { player1Id: 'p1', player2Id: 'p2' },
        { player1Id: 'p3', player2Id: 'p4' },
      ]

      const result = generator.assignTableNumbers(pairings, 10)

      expect(result).toHaveLength(2)
      expect(result[0].table).toBe(10)
      expect(result[1].table).toBe(11)
    })

    it('should preserve existing pairing properties', () => {
      const pairings = [
        { player1Id: 'p1', player2Id: 'p2', isBye: true },
        { player1Id: 'p3', player2Id: 'p4' },
      ]

      const result = generator.assignTableNumbers(pairings)

      expect(result[0].isBye).toBe(true)
      expect(result[0].player1Id).toBe('p1')
      expect(result[0].player2Id).toBe('p2')
    })

    it('should handle empty array', () => {
      const result = generator.assignTableNumbers([])
      expect(result).toHaveLength(0)
    })
  })

  describe('Swiss tournament scenarios', () => {
    it('should handle minimum players (2)', () => {
      const entries = createMockEntries(2, true)
      const pairings = generator.generateInitialPairings(entries, 'SWISS')

      expect(pairings).toHaveLength(1)
      expect(pairings[0].player1Id).toBe('player-1')
      expect(pairings[0].player2Id).toBe('player-2')
      expect(pairings[0].table).toBe(1)
    })

    it('should handle large player count', () => {
      const entries = createMockEntries(100, true)
      const pairings = generator.generateInitialPairings(entries, 'SWISS')

      expect(pairings).toHaveLength(50)
      
      // Verify all players are paired
      const allPlayerIds = new Set<string>()
      pairings.forEach(pairing => {
        allPlayerIds.add(pairing.player1Id)
        if (!pairing.isBye) {
          allPlayerIds.add(pairing.player2Id)
        }
      })
      expect(allPlayerIds.size).toBe(100)
    })
  })

  describe('Elimination tournament scenarios', () => {
    it('should handle 8 player bracket', () => {
      const entries = createMockEntries(8, true)
      const pairings = generator.generateInitialPairings(entries, 'ELIMINATION')

      expect(pairings).toHaveLength(4)
      expect(generator.calculateBracketSize(8)).toBe(8)
      
      // No byes needed
      const byeMatches = pairings.filter(p => p.isBye)
      expect(byeMatches).toHaveLength(0)
    })

    it('should handle 16 player bracket', () => {
      const entries = createMockEntries(16, true)
      const pairings = generator.generateInitialPairings(entries, 'ELIMINATION')

      expect(pairings).toHaveLength(8)
      expect(generator.calculateBracketSize(16)).toBe(16)
      
      // No byes needed
      const byeMatches = pairings.filter(p => p.isBye)
      expect(byeMatches).toHaveLength(0)
    })

    it('should handle 32 player bracket', () => {
      const entries = createMockEntries(32, true)
      const pairings = generator.generateInitialPairings(entries, 'ELIMINATION')

      expect(pairings).toHaveLength(16)
      expect(generator.calculateBracketSize(32)).toBe(32)
      
      // No byes needed
      const byeMatches = pairings.filter(p => p.isBye)
      expect(byeMatches).toHaveLength(0)
    })

    it('should handle 5 players with 1 bye in 8-bracket', () => {
      const entries = createMockEntries(5, true)
      const pairings = generator.generateInitialPairings(entries, 'ELIMINATION')

      // With 5 players, we get 3 matches: 2 regular + 1 bye
      expect(pairings).toHaveLength(3)
      expect(generator.calculateBracketSize(5)).toBe(8)
      
      // 1 bye needed (5 is odd)
      const byeMatches = pairings.filter(p => p.isBye)
      expect(byeMatches).toHaveLength(1)
      
      // Bye match should have same player for both sides
      byeMatches.forEach(bye => {
        expect(bye.player1Id).toBe(bye.player2Id)
      })
    })
  })

  describe('Table assignment', () => {
    it('should assign tables sequentially in Swiss format', () => {
      const entries = createMockEntries(6, true)
      const pairings = generator.generateInitialPairings(entries, 'SWISS')

      expect(pairings[0].table).toBe(1)
      expect(pairings[1].table).toBe(2)
      expect(pairings[2].table).toBe(3)
    })

    it('should assign tables sequentially in Elimination format', () => {
      const entries = createMockEntries(8, true)
      const pairings = generator.generateInitialPairings(entries, 'ELIMINATION')

      expect(pairings[0].table).toBe(1)
      expect(pairings[1].table).toBe(2)
      expect(pairings[2].table).toBe(3)
      expect(pairings[3].table).toBe(4)
    })

    it('should include bye matches in table numbering', () => {
      const entries = createMockEntries(7, true)
      const pairings = generator.generateInitialPairings(entries, 'SWISS')

      // All matches including bye should have sequential table numbers
      pairings.forEach((pairing, index) => {
        expect(pairing.table).toBe(index + 1)
      })
    })
  })
})
