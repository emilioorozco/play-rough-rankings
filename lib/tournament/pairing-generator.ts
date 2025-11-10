/**
 * Tournament Pairing Generator
 * 
 * Handles the generation of match pairings for both Swiss and Elimination
 * tournament formats. Includes logic for initial pairings, bracket structure,
 * and table assignments.
 */

import type { TournamentEntry } from '@prisma/client'
import type { Pairing, TournamentStructure } from './types'

/**
 * PairingGenerator class for creating tournament match pairings
 */
export class PairingGenerator {
  /**
   * Generate initial pairings for tournament start
   * 
   * @param entries - Array of tournament entries (registered players)
   * @param format - Tournament format (SWISS or ELIMINATION)
   * @returns Array of pairings with player IDs and optional table assignments
   */
  generateInitialPairings(
    entries: TournamentEntry[],
    format: TournamentStructure
  ): Pairing[] {
    if (entries.length < 2) {
      throw new Error('Insufficient players for pairings (minimum 2 required)')
    }

    if (format === 'SWISS') {
      return this.generateSwissInitialPairings(entries)
    } else if (format === 'ELIMINATION') {
      return this.generateEliminationInitialPairings(entries)
    } else {
      throw new Error(`Unsupported tournament format: ${format}`)
    }
  }

  /**
   * Generate initial Swiss pairings with optional seeding
   * 
   * For Swiss tournaments, we randomize players (respecting seeds if provided)
   * and pair them sequentially.
   * 
   * @param entries - Tournament entries
   * @returns Array of pairings
   */
  private generateSwissInitialPairings(entries: TournamentEntry[]): Pairing[] {
    // Sort by seed if available, otherwise randomize
    const sortedEntries = [...entries].sort((a, b) => {
      if (a.seed !== null && b.seed !== null) {
        return a.seed - b.seed
      }
      // Random order for unseeded players
      return Math.random() - 0.5
    })

    const pairings: Pairing[] = []
    let tableNumber = 1

    // Pair players sequentially
    for (let i = 0; i < sortedEntries.length - 1; i += 2) {
      pairings.push({
        player1Id: sortedEntries[i].playerId,
        player2Id: sortedEntries[i + 1].playerId,
        table: tableNumber++,
      })
    }

    // Handle odd number of players (bye)
    if (sortedEntries.length % 2 === 1) {
      const byePlayer = sortedEntries[sortedEntries.length - 1]
      pairings.push({
        player1Id: byePlayer.playerId,
        player2Id: byePlayer.playerId, // Bye match uses same player for both
        table: tableNumber,
        isBye: true,
      })
    }

    return pairings
  }

  /**
   * Generate initial elimination bracket pairings
   * 
   * Creates a bracket structure based on the next power of 2.
   * Players with byes are automatically advanced if the player count
   * is not a power of 2.
   * 
   * @param entries - Tournament entries
   * @returns Array of pairings for first round
   */
  private generateEliminationInitialPairings(entries: TournamentEntry[]): Pairing[] {
    const bracketSize = this.calculateBracketSize(entries.length)

    // Sort by seed if available
    const sortedEntries = [...entries].sort((a, b) => {
      if (a.seed !== null && b.seed !== null) {
        return a.seed - b.seed
      }
      return 0
    })

    const pairings: Pairing[] = []
    let tableNumber = 1

    // Create a bracket array with players and null for byes
    const bracket: (TournamentEntry | null)[] = new Array(bracketSize).fill(null)
    
    // Place players in bracket positions
    for (let i = 0; i < sortedEntries.length; i++) {
      bracket[i] = sortedEntries[i]
    }

    // Generate pairings for all bracket positions
    for (let i = 0; i < bracketSize; i += 2) {
      const player1 = bracket[i]
      const player2 = bracket[i + 1]

      if (player1 && player2) {
        // Normal match with two players
        pairings.push({
          player1Id: player1.playerId,
          player2Id: player2.playerId,
          table: tableNumber++,
        })
      } else if (player1 && !player2) {
        // Player 1 gets a bye
        pairings.push({
          player1Id: player1.playerId,
          player2Id: player1.playerId,
          table: tableNumber++,
          isBye: true,
        })
      } else if (!player1 && player2) {
        // Player 2 gets a bye
        pairings.push({
          player1Id: player2.playerId,
          player2Id: player2.playerId,
          table: tableNumber++,
          isBye: true,
        })
      }
      // If both are null, skip (shouldn't happen with proper bracket filling)
    }

    return pairings
  }

  /**
   * Calculate the bracket size (next power of 2)
   * 
   * For elimination tournaments, the bracket size must be a power of 2.
   * This function calculates the smallest power of 2 that can accommodate
   * all players.
   * 
   * @param playerCount - Number of players in the tournament
   * @returns Bracket size as a power of 2
   */
  calculateBracketSize(playerCount: number): number {
    if (playerCount < 2) {
      throw new Error('Bracket size requires at least 2 players')
    }

    // Find the next power of 2
    let bracketSize = 2
    while (bracketSize < playerCount) {
      bracketSize *= 2
    }

    return bracketSize
  }

  /**
   * Assign table numbers to pairings
   * 
   * Utility method to assign sequential table numbers to a set of pairings.
   * 
   * @param pairings - Array of pairings without table assignments
   * @param startingTable - Starting table number (default: 1)
   * @returns Array of pairings with table numbers assigned
   */
  assignTableNumbers(pairings: Pairing[], startingTable: number = 1): Pairing[] {
    return pairings.map((pairing, index) => ({
      ...pairing,
      table: startingTable + index,
    }))
  }
}
