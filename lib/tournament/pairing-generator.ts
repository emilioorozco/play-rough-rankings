/**
 * Tournament Pairing Generator
 * 
 * Handles the generation of match pairings for both Swiss and Elimination
 * tournament formats. Includes logic for initial pairings, bracket structure,
 * and table assignments.
 */

import type { TournamentEntry, Match } from '@prisma/client'
import type { Pairing, TournamentStructure } from './types'

/**
 * Interface for player standings used in Swiss pairing
 */
interface PlayerStanding {
  playerId: string
  entry: TournamentEntry
  matchPoints: number
  gameWinPercentage: number
  opponentMatchWinPercentage: number
}

/**
 * PairingGenerator class for creating tournament match pairings
 */
export class PairingGenerator {
  /**
   * Generate Swiss pairings for next round
   * 
   * Pairs players based on current standings, avoiding repeat pairings
   * from previous rounds. Players with similar records are paired together.
   * 
   * @param entries - Tournament entries with current records
   * @param previousMatches - All matches from previous rounds
   * @param _round - Current round number (unused but kept for API consistency)
   * @returns Array of pairings for the next round
   */
  generateSwissPairings(
    entries: TournamentEntry[],
    previousMatches: Match[],
    _round: number
  ): Pairing[] {
    // Filter out dropped players
    const activeEntries = entries.filter(entry => !entry.dropped)

    if (activeEntries.length < 2) {
      throw new Error('Insufficient active players for pairings')
    }

    // Calculate standings for all active players
    const standings = this.calculateStandings(activeEntries, previousMatches)

    // Sort by match points (descending), then by tiebreakers
    standings.sort((a, b) => {
      if (a.matchPoints !== b.matchPoints) {
        return b.matchPoints - a.matchPoints
      }
      if (a.opponentMatchWinPercentage !== b.opponentMatchWinPercentage) {
        return b.opponentMatchWinPercentage - a.opponentMatchWinPercentage
      }
      return b.gameWinPercentage - a.gameWinPercentage
    })

    // Build pairing history to avoid rematches
    const pairingHistory = this.buildPairingHistory(previousMatches)

    // Generate pairings
    const pairings: Pairing[] = []
    const paired = new Set<string>()
    let tableNumber = 1

    // Handle odd number of players - assign bye first
    let byePlayerId: string | null = null
    if (standings.length % 2 === 1) {
      byePlayerId = this.assignBye(activeEntries, previousMatches)
      if (byePlayerId) {
        paired.add(byePlayerId)
        pairings.push({
          player1Id: byePlayerId,
          player2Id: byePlayerId,
          table: tableNumber++,
          isBye: true,
        })
      }
    }

    // Pair remaining players
    for (let i = 0; i < standings.length; i++) {
      const player1 = standings[i]
      
      if (paired.has(player1.playerId)) {
        continue
      }

      // Find best opponent for this player
      let opponent: PlayerStanding | null = null
      
      // Try to find opponent with similar record who hasn't been paired yet
      for (let j = i + 1; j < standings.length; j++) {
        const player2 = standings[j]
        
        if (paired.has(player2.playerId)) {
          continue
        }

        // Check if these players have already played each other
        const havePlayed = this.havePreviouslyPlayed(
          player1.playerId,
          player2.playerId,
          pairingHistory
        )

        if (!havePlayed) {
          opponent = player2
          break
        }
      }

      // If no opponent found without rematch, pair with closest available
      if (!opponent) {
        for (let j = i + 1; j < standings.length; j++) {
          const player2 = standings[j]
          
          if (!paired.has(player2.playerId)) {
            opponent = player2
            break
          }
        }
      }

      if (opponent) {
        paired.add(player1.playerId)
        paired.add(opponent.playerId)
        
        pairings.push({
          player1Id: player1.playerId,
          player2Id: opponent.playerId,
          table: tableNumber++,
        })
      }
    }

    return pairings
  }

  /**
   * Generate elimination bracket pairings for next round
   * 
   * Promotes winners from the previous round to the next bracket level.
   * Handles bracket structure progression (quarterfinals, semifinals, finals).
   * 
   * @param winners - Array of player IDs who won in the previous round
   * @param _round - Current round number (unused but kept for API consistency)
   * @returns Array of pairings for the next round
   */
  generateEliminationPairings(
    winners: string[],
    _round: number
  ): Pairing[] {
    if (winners.length < 2) {
      throw new Error('Insufficient winners for next round (minimum 2 required)')
    }

    if (winners.length === 1) {
      throw new Error('Tournament complete - only one player remains')
    }

    // Validate that winners count is even (or will be after byes)
    if (winners.length % 2 !== 0) {
      throw new Error('Odd number of winners - elimination tournaments require even player counts per round')
    }

    const pairings: Pairing[] = []
    let tableNumber = 1

    // Pair winners sequentially (bracket order is maintained)
    for (let i = 0; i < winners.length; i += 2) {
      pairings.push({
        player1Id: winners[i],
        player2Id: winners[i + 1],
        table: tableNumber++,
      })
    }

    return pairings
  }

  /**
   * Determine round name based on remaining players
   * 
   * Returns the traditional bracket round name based on how many
   * players remain in the tournament.
   * 
   * @param remainingPlayers - Number of players still in the tournament
   * @returns Round name (e.g., "Finals", "Semifinals", "Quarterfinals")
   */
  getRoundName(remainingPlayers: number): string {
    switch (remainingPlayers) {
      case 2:
        return 'Finals'
      case 4:
        return 'Semifinals'
      case 8:
        return 'Quarterfinals'
      case 16:
        return 'Round of 16'
      case 32:
        return 'Round of 32'
      case 64:
        return 'Round of 64'
      default:
        if (remainingPlayers > 64) {
          return `Round of ${remainingPlayers}`
        }
        return `Round ${Math.ceil(Math.log2(remainingPlayers))}`
    }
  }

  /**
   * Assign bye to a player in Swiss tournament
   * 
   * Assigns bye to the lowest-ranked player who hasn't received a bye yet.
   * If all players have had a bye, assigns to the lowest-ranked player.
   * 
   * @param entries - Active tournament entries
   * @param previousMatches - All matches from previous rounds
   * @returns Player ID who receives the bye, or null if no bye needed
   */
  assignBye(
    entries: TournamentEntry[],
    previousMatches: Match[]
  ): string | null {
    const activeEntries = entries.filter(entry => !entry.dropped)

    // No bye needed for even number of players
    if (activeEntries.length % 2 === 0) {
      return null
    }

    // Find players who have already received byes
    const playersWithByes = new Set<string>()
    previousMatches.forEach(match => {
      // Bye matches have same player for both sides
      if (match.player1Id === match.player2Id) {
        playersWithByes.add(match.player1Id)
      }
    })

    // Calculate standings to find lowest-ranked player
    const standings = this.calculateStandings(activeEntries, previousMatches)
    
    // Sort by match points (ascending) to get lowest-ranked first
    standings.sort((a, b) => {
      if (a.matchPoints !== b.matchPoints) {
        return a.matchPoints - b.matchPoints
      }
      if (a.opponentMatchWinPercentage !== b.opponentMatchWinPercentage) {
        return a.opponentMatchWinPercentage - b.opponentMatchWinPercentage
      }
      return a.gameWinPercentage - b.gameWinPercentage
    })

    // Find lowest-ranked player without a bye
    for (const standing of standings) {
      if (!playersWithByes.has(standing.playerId)) {
        return standing.playerId
      }
    }

    // If all players have had byes, give it to the lowest-ranked player
    return standings[0]?.playerId || null
  }

  /**
   * Calculate standings for all players
   * 
   * @param entries - Tournament entries
   * @param matches - All completed matches
   * @returns Array of player standings
   */
  private calculateStandings(
    entries: TournamentEntry[],
    matches: Match[]
  ): PlayerStanding[] {
    const standings: PlayerStanding[] = []

    for (const entry of entries) {
      const playerId = entry.playerId
      
      // Get player's matches
      const playerMatches = matches.filter(
        m => m.player1Id === playerId || m.player2Id === playerId
      )

      // Calculate match points (3 for win, 1 for draw, 0 for loss)
      let matchPoints = 0
      let gamesWon = 0
      let gamesPlayed = 0
      const opponentIds: string[] = []

      playerMatches.forEach(match => {
        if (match.status !== 'COMPLETED') {
          return
        }

        // Handle bye matches
        if (match.player1Id === match.player2Id) {
          matchPoints += 3 // Bye counts as a win
          return
        }

        const isPlayer1 = match.player1Id === playerId
        const opponentId = isPlayer1 ? match.player2Id : match.player1Id
        opponentIds.push(opponentId)

        const playerScore = isPlayer1 ? match.player1Score : match.player2Score
        const opponentScore = isPlayer1 ? match.player2Score : match.player1Score

        if (playerScore !== null && opponentScore !== null) {
          gamesWon += playerScore
          gamesPlayed += playerScore + opponentScore

          if (match.winnerId === playerId) {
            matchPoints += 3
          } else if (match.winnerId === null) {
            matchPoints += 1 // Draw
          }
        }
      })

      // Calculate game win percentage
      const gameWinPercentage = gamesPlayed > 0 ? gamesWon / gamesPlayed : 0

      // Calculate opponent match win percentage
      let opponentMatchWinPercentage = 0
      if (opponentIds.length > 0) {
        const opponentEntries = entries.filter(e => opponentIds.includes(e.playerId))
        const opponentStandings = opponentEntries.map(e => {
          const oppMatches = matches.filter(
            m => (m.player1Id === e.playerId || m.player2Id === e.playerId) && m.status === 'COMPLETED'
          )
          let oppPoints = 0
          oppMatches.forEach(m => {
            if (m.player1Id === m.player2Id) {
              oppPoints += 3
            } else if (m.winnerId === e.playerId) {
              oppPoints += 3
            } else if (m.winnerId === null) {
              oppPoints += 1
            }
          })
          const oppMatchesPlayed = oppMatches.filter(m => m.player1Id !== m.player2Id).length
          return oppMatchesPlayed > 0 ? oppPoints / (oppMatchesPlayed * 3) : 0
        })
        opponentMatchWinPercentage = opponentStandings.reduce((a, b) => a + b, 0) / opponentStandings.length
      }

      standings.push({
        playerId,
        entry,
        matchPoints,
        gameWinPercentage,
        opponentMatchWinPercentage,
      })
    }

    return standings
  }

  /**
   * Build pairing history from previous matches
   * 
   * @param matches - All previous matches
   * @returns Map of player pairs that have played each other
   */
  private buildPairingHistory(matches: Match[]): Map<string, Set<string>> {
    const history = new Map<string, Set<string>>()

    matches.forEach(match => {
      // Skip bye matches
      if (match.player1Id === match.player2Id) {
        return
      }

      if (!history.has(match.player1Id)) {
        history.set(match.player1Id, new Set())
      }
      if (!history.has(match.player2Id)) {
        history.set(match.player2Id, new Set())
      }

      history.get(match.player1Id)!.add(match.player2Id)
      history.get(match.player2Id)!.add(match.player1Id)
    })

    return history
  }

  /**
   * Check if two players have previously played each other
   * 
   * @param player1Id - First player ID
   * @param player2Id - Second player ID
   * @param pairingHistory - Pairing history map
   * @returns True if players have played each other before
   */
  private havePreviouslyPlayed(
    player1Id: string,
    player2Id: string,
    pairingHistory: Map<string, Set<string>>
  ): boolean {
    const player1Opponents = pairingHistory.get(player1Id)
    return player1Opponents ? player1Opponents.has(player2Id) : false
  }
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
