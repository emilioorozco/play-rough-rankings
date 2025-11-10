/**
 * Tournament Processor
 * 
 * Manages the complete tournament lifecycle including starting tournaments,
 * advancing rounds, completing tournaments, and handling special situations
 * like pauses, cancellations, and player drops.
 */

import { PrismaClient, Tournament, Match, TournamentEntry } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { PairingGenerator } from './pairing-generator'
import { AuditLogger } from './audit-logger'
import type { TournamentStructure, Pairing } from './types'

/**
 * Result of starting a tournament
 */
export interface StartTournamentResult {
  /** Updated tournament with ACTIVE status */
  tournament: Tournament
  /** Array of created matches for round 1 */
  matches: Match[]
}

/**
 * Result of advancing to the next round
 */
export interface AdvanceRoundResult {
  /** Updated tournament with incremented round number */
  tournament: Tournament
  /** Array of created matches for the new round */
  newMatches: Match[]
  /** Current round number after advancement */
  currentRound: number
  /** Whether the tournament has ended (all rounds complete or one player remains) */
  tournamentEnded: boolean
}

/**
 * Result of completing a tournament
 */
export interface CompleteTournamentResult {
  /** Updated tournament with COMPLETED status */
  tournament: Tournament
  /** Final standings with placements */
  finalStandings: TournamentEntry[]
  /** Rating updates applied to all players */
  ratingUpdates: Array<{ playerId: string; oldRating: number; newRating: number }>
}

/**
 * TournamentProcessor class for managing tournament lifecycle
 */
export class TournamentProcessor {
  private pairingGenerator: PairingGenerator
  private auditLogger: AuditLogger

  constructor(private prisma: PrismaClient) {
    this.pairingGenerator = new PairingGenerator()
    this.auditLogger = new AuditLogger(prisma)
  }

  /**
   * Start a tournament and generate initial pairings
   * 
   * Validates tournament status and player count, generates initial pairings
   * using PairingGenerator, creates Match records, updates tournament status
   * to ACTIVE, and logs the action.
   * 
   * @param tournamentId - ID of the tournament to start
   * @param organizerId - ID of the user starting the tournament
   * @returns Tournament and created matches
   * @throws TRPCError if validation fails or tournament cannot be started
   * 
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
   */
  async startTournament(
    tournamentId: string,
    organizerId: string
  ): Promise<StartTournamentResult> {
    try {
      // Use transaction for atomicity
      const result = await this.prisma.$transaction(async (tx) => {
        // Fetch tournament with entries
        const tournament = await tx.tournament.findUnique({
          where: { id: tournamentId },
          include: {
            entries: {
              where: { dropped: false },
              orderBy: { seed: 'asc' }
            }
          }
        })

        if (!tournament) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Tournament not found'
          })
        }

        // Validate tournament status is UPCOMING
        if (tournament.status !== 'UPCOMING') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Cannot start tournament with status ${tournament.status}. Tournament must be in UPCOMING status.`
          })
        }

        // Validate sufficient players registered (minimum 2)
        const activeEntries = tournament.entries.filter(entry => !entry.dropped)
        if (activeEntries.length < 2) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Insufficient players registered. Minimum 2 players required, found ${activeEntries.length}.`
          })
        }

        // Determine tournament structure
        const tournamentStructure = (tournament.tournamentStructure?.toUpperCase() || 'SWISS') as TournamentStructure
        
        if (tournamentStructure !== 'SWISS' && tournamentStructure !== 'ELIMINATION') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Unsupported tournament structure: ${tournament.tournamentStructure}`
          })
        }

        // Generate initial pairings using PairingGenerator
        let pairings: Pairing[]
        try {
          pairings = this.pairingGenerator.generateInitialPairings(
            activeEntries,
            tournamentStructure
          )
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to generate pairings: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
        }

        // Create Match records in database
        const matches: Match[] = []
        for (const pairing of pairings) {
          const match = await tx.match.create({
            data: {
              tournamentId: tournament.id,
              player1Id: pairing.player1Id,
              player2Id: pairing.player2Id,
              round: 1,
              table: pairing.table,
              status: 'PENDING',
              // For bye matches, automatically set winner and scores
              ...(pairing.isBye ? {
                winnerId: pairing.player1Id,
                player1Score: 2,
                player2Score: 0,
                status: 'COMPLETED'
              } : {})
            }
          })
          matches.push(match)
        }

        // Update tournament status to ACTIVE
        const updatedTournament = await tx.tournament.update({
          where: { id: tournamentId },
          data: {
            status: 'ACTIVE',
            updatedAt: new Date()
          }
        })

        // Log action with AuditLogger (using transaction client)
        const txAuditLogger = new AuditLogger(tx as any)
        await txAuditLogger.logAction({
          id: crypto.randomUUID(),
          tournamentId: tournament.id,
          action: 'START',
          performedBy: organizerId,
          timestamp: new Date(),
          details: {
            round: 1,
            playerCount: activeEntries.length,
            matchCount: matches.length,
            tournamentStructure,
            pairingsGenerated: pairings.length
          }
        })

        return {
          tournament: updatedTournament,
          matches
        }
      })

      return result
    } catch (error) {
      // Re-throw TRPCError as-is
      if (error instanceof TRPCError) {
        throw error
      }

      // Wrap other errors
      console.error('Error starting tournament:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to start tournament: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  /**
   * Complete tournament and finalize results
   * 
   * Validates all rounds are finished, calculates final placements for all players,
   * updates TournamentEntry.placement, updates tournament status to COMPLETED,
   * applies rating changes using the ELO system, triggers ranking cache invalidation,
   * and logs the action.
   * 
   * @param tournamentId - ID of the tournament to complete
   * @param organizerId - ID of the user completing the tournament
   * @returns Tournament, final standings, and rating updates
   * @throws TRPCError if validation fails or tournament cannot be completed
   * 
   * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
   */
  async completeTournament(
    tournamentId: string,
    organizerId: string
  ): Promise<CompleteTournamentResult> {
    try {
      // Use transaction for atomicity
      const result = await this.prisma.$transaction(async (tx) => {
        // Fetch tournament with entries, matches, and game info
        const tournament = await tx.tournament.findUnique({
          where: { id: tournamentId },
          include: {
            entries: {
              where: { dropped: false },
              include: {
                player: {
                  include: {
                    gameStats: {
                      where: { gameId: { equals: '' } } // Will be filtered properly below
                    }
                  }
                }
              }
            },
            matches: {
              orderBy: [{ round: 'asc' }, { table: 'asc' }]
            },
            game: true
          }
        })

        if (!tournament) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Tournament not found'
          })
        }

        // Validate tournament status is ACTIVE
        if (tournament.status !== 'ACTIVE') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Cannot complete tournament with status ${tournament.status}. Tournament must be ACTIVE.`
          })
        }

        // Determine current round from matches
        const currentRound = tournament.matches.length > 0
          ? Math.max(...tournament.matches.map(m => m.round))
          : 0

        if (currentRound === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot complete tournament with no rounds played.'
          })
        }

        // Validate all rounds are finished
        const incompleteMatches = tournament.matches.filter(m => m.status !== 'COMPLETED')
        if (incompleteMatches.length > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Cannot complete tournament. ${incompleteMatches.length} match(es) are not completed.`
          })
        }

        // Determine tournament structure
        const tournamentStructure = (tournament.tournamentStructure?.toUpperCase() || 'SWISS') as TournamentStructure

        // Calculate final placements based on tournament structure
        const entriesWithPlacements = this.calculateFinalPlacements(
          tournament.entries,
          tournament.matches,
          tournamentStructure
        )

        // Update TournamentEntry.placement for all participants
        const updatedEntries: TournamentEntry[] = []
        for (const entry of entriesWithPlacements) {
          const updated = await tx.tournamentEntry.update({
            where: { id: entry.id },
            data: {
              placement: entry.placement,
              updatedAt: new Date()
            }
          })
          updatedEntries.push(updated)
        }

        // Apply rating changes using ELO system
        const ratingUpdates = await this.applyRatingChanges(
          tx,
          tournament,
          entriesWithPlacements
        )

        // Update tournament status to COMPLETED
        const updatedTournament = await tx.tournament.update({
          where: { id: tournamentId },
          data: {
            status: 'COMPLETED',
            updatedAt: new Date()
          }
        })

        // Log action with AuditLogger (using transaction client)
        const txAuditLogger = new AuditLogger(tx as any)
        await txAuditLogger.logAction({
          id: crypto.randomUUID(),
          tournamentId: tournament.id,
          action: 'COMPLETE',
          performedBy: organizerId,
          timestamp: new Date(),
          details: {
            totalRounds: currentRound,
            totalPlayers: entriesWithPlacements.length,
            tournamentStructure,
            ratingUpdatesApplied: ratingUpdates.length,
            winner: entriesWithPlacements.find(e => e.placement === 1)?.playerId
          }
        })

        return {
          tournament: updatedTournament,
          finalStandings: updatedEntries.sort((a, b) => (a.placement || 999) - (b.placement || 999)),
          ratingUpdates
        }
      })

      return result
    } catch (error) {
      // Re-throw TRPCError as-is
      if (error instanceof TRPCError) {
        throw error
      }

      // Wrap other errors
      console.error('Error completing tournament:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to complete tournament: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  /**
   * Calculate final placements for all players based on tournament structure
   * 
   * @param entries - Tournament entries
   * @param matches - All tournament matches
   * @param structure - Tournament structure (SWISS or ELIMINATION)
   * @returns Entries with calculated placements
   */
  private calculateFinalPlacements(
    entries: TournamentEntry[],
    matches: Match[],
    structure: TournamentStructure
  ): Array<TournamentEntry & { placement: number }> {
    if (structure === 'ELIMINATION') {
      return this.calculateEliminationPlacements(entries, matches)
    } else {
      return this.calculateSwissPlacements(entries, matches)
    }
  }

  /**
   * Calculate placements for Swiss tournaments based on match points and tiebreakers
   * 
   * @param entries - Tournament entries
   * @param matches - All tournament matches
   * @returns Entries with calculated placements
   */
  private calculateSwissPlacements(
    entries: TournamentEntry[],
    matches: Match[]
  ): Array<TournamentEntry & { placement: number }> {
    // Calculate match points and tiebreakers for each player
    const playerStats = entries.map(entry => {
      const playerMatches = matches.filter(
        m => m.player1Id === entry.playerId || m.player2Id === entry.playerId
      )

      let wins = 0
      let losses = 0
      let draws = 0
      let gameWins = 0
      let gameLosses = 0

      playerMatches.forEach(match => {
        const isPlayer1 = match.player1Id === entry.playerId
        const playerScore = isPlayer1 ? (match.player1Score || 0) : (match.player2Score || 0)
        const opponentScore = isPlayer1 ? (match.player2Score || 0) : (match.player1Score || 0)

        gameWins += playerScore
        gameLosses += opponentScore

        if (match.winnerId === entry.playerId) {
          wins++
        } else if (match.winnerId === null) {
          draws++
        } else {
          losses++
        }
      })

      const matchPoints = wins * 3 + draws * 1
      const totalGames = gameWins + gameLosses
      const gameWinPercentage = totalGames > 0 ? gameWins / totalGames : 0

      // Calculate opponent match win percentage (OMW%)
      const opponentIds = playerMatches.map(m =>
        m.player1Id === entry.playerId ? m.player2Id : m.player1Id
      )
      
      let totalOpponentMatchWinPercentage = 0
      opponentIds.forEach(opponentId => {
        const opponentMatches = matches.filter(
          m => m.player1Id === opponentId || m.player2Id === opponentId
        )
        const opponentWins = opponentMatches.filter(m => m.winnerId === opponentId).length
        const opponentDraws = opponentMatches.filter(m => m.winnerId === null).length
        const opponentMatchPoints = opponentWins * 3 + opponentDraws * 1
        const opponentMaxPoints = opponentMatches.length * 3
        const opponentWinPercentage = opponentMaxPoints > 0 ? opponentMatchPoints / opponentMaxPoints : 0
        totalOpponentMatchWinPercentage += Math.max(0.33, opponentWinPercentage) // Minimum 33%
      })

      const opponentMatchWinPercentage = opponentIds.length > 0
        ? totalOpponentMatchWinPercentage / opponentIds.length
        : 0

      return {
        entry,
        matchPoints,
        gameWinPercentage,
        opponentMatchWinPercentage,
        wins,
        losses,
        draws
      }
    })

    // Sort by match points (descending), then game win % (descending), then OMW% (descending)
    playerStats.sort((a, b) => {
      if (a.matchPoints !== b.matchPoints) {
        return b.matchPoints - a.matchPoints
      }
      if (a.gameWinPercentage !== b.gameWinPercentage) {
        return b.gameWinPercentage - a.gameWinPercentage
      }
      return b.opponentMatchWinPercentage - a.opponentMatchWinPercentage
    })

    // Assign placements
    return playerStats.map((stat, index) => ({
      ...stat.entry,
      placement: index + 1
    }))
  }

  /**
   * Calculate placements for elimination tournaments based on bracket progression
   * 
   * @param entries - Tournament entries
   * @param matches - All tournament matches
   * @returns Entries with calculated placements
   */
  private calculateEliminationPlacements(
    entries: TournamentEntry[],
    matches: Match[]
  ): Array<TournamentEntry & { placement: number }> {
    const maxRound = Math.max(...matches.map(m => m.round))
    
    // Find the winner (player who won in the final round)
    const finalMatch = matches.find(m => m.round === maxRound)
    const winnerId = finalMatch?.winnerId

    // Track elimination round for each player
    const playerEliminationRound = new Map<string, number>()

    // Players who never lost are still in (winner)
    entries.forEach(entry => {
      const losses = matches.filter(
        m => (m.player1Id === entry.playerId || m.player2Id === entry.playerId) &&
             m.winnerId !== null &&
             m.winnerId !== entry.playerId
      )

      if (losses.length === 0) {
        // Never lost - this is the winner
        playerEliminationRound.set(entry.playerId, maxRound + 1)
      } else {
        // Eliminated in the round of their last loss
        const lastLoss = losses[losses.length - 1]
        playerEliminationRound.set(entry.playerId, lastLoss.round)
      }
    })

    // Sort by elimination round (descending) - later elimination = better placement
    const sortedEntries = [...entries].sort((a, b) => {
      const aRound = playerEliminationRound.get(a.playerId) || 0
      const bRound = playerEliminationRound.get(b.playerId) || 0
      
      if (aRound !== bRound) {
        return bRound - aRound
      }

      // If eliminated in same round, use seed as tiebreaker
      return (a.seed || 999) - (b.seed || 999)
    })

    // Assign placements
    return sortedEntries.map((entry, index) => ({
      ...entry,
      placement: index + 1
    }))
  }

  /**
   * Apply rating changes to all players using the ELO system
   * 
   * @param tx - Prisma transaction client
   * @param tournament - Tournament data
   * @param entries - Tournament entries with placements
   * @returns Array of rating updates
   */
  private async applyRatingChanges(
    tx: any,
    tournament: any,
    entries: Array<TournamentEntry & { placement: number }>
  ): Promise<Array<{ playerId: string; oldRating: number; newRating: number }>> {
    const { calculateMatchRatingChanges } = await import('@/lib/rating/elo')
    
    const ratingUpdates: Array<{ playerId: string; oldRating: number; newRating: number }> = []
    const tournamentLevel = (tournament.tournamentLevel?.toUpperCase() || 'LOCAL') as 'LOCAL' | 'REGIONAL' | 'NATIONAL' | 'INTERNATIONAL'

    // Get or create PlayerGameStats for all players
    const playerStatsMap = new Map<string, any>()
    
    for (const entry of entries) {
      let stats = await tx.playerGameStats.findUnique({
        where: {
          playerId_gameId: {
            playerId: entry.playerId,
            gameId: tournament.gameId
          }
        }
      })

      if (!stats) {
        // Create new stats record with starting rating
        stats = await tx.playerGameStats.create({
          data: {
            playerId: entry.playerId,
            gameId: tournament.gameId,
            currentRating: 1200,
            seasonalStats: { wins: 0, losses: 0, draws: 0, tournaments: 0 }
          }
        })
      }

      playerStatsMap.set(entry.playerId, stats)
    }

    // Process each match and calculate rating changes
    const processedMatches = new Set<string>()
    
    for (const match of tournament.matches) {
      if (processedMatches.has(match.id) || match.status !== 'COMPLETED') {
        continue
      }

      const player1Stats = playerStatsMap.get(match.player1Id)
      const player2Stats = playerStatsMap.get(match.player2Id)

      if (!player1Stats || !player2Stats) {
        continue
      }

      // Calculate games played from seasonal stats
      const player1SeasonalStats = player1Stats.seasonalStats as any
      const player2SeasonalStats = player2Stats.seasonalStats as any
      
      const player1GamesPlayed = (player1SeasonalStats.wins || 0) + (player1SeasonalStats.losses || 0) + (player1SeasonalStats.draws || 0)
      const player2GamesPlayed = (player2SeasonalStats.wins || 0) + (player2SeasonalStats.losses || 0) + (player2SeasonalStats.draws || 0)

      // Calculate rating changes for this match
      const changes = calculateMatchRatingChanges(
        player1Stats.currentRating,
        player2Stats.currentRating,
        match.winnerId,
        match.player1Id,
        match.player2Id,
        player1GamesPlayed,
        player2GamesPlayed,
        tournamentLevel
      )

      // Update player 1 stats
      const updatedPlayer1Stats = await tx.playerGameStats.update({
        where: { id: player1Stats.id },
        data: {
          currentRating: changes.player1NewRating,
          updatedAt: new Date()
        }
      })

      // Update player 2 stats
      const updatedPlayer2Stats = await tx.playerGameStats.update({
        where: { id: player2Stats.id },
        data: {
          currentRating: changes.player2NewRating,
          updatedAt: new Date()
        }
      })

      // Track rating updates
      ratingUpdates.push({
        playerId: match.player1Id,
        oldRating: player1Stats.currentRating,
        newRating: changes.player1NewRating
      })

      ratingUpdates.push({
        playerId: match.player2Id,
        oldRating: player2Stats.currentRating,
        newRating: changes.player2NewRating
      })

      // Update the map with new ratings for subsequent matches
      playerStatsMap.set(match.player1Id, updatedPlayer1Stats)
      playerStatsMap.set(match.player2Id, updatedPlayer2Stats)

      processedMatches.add(match.id)
    }

    // Update seasonal stats for all players
    for (const entry of entries) {
      const stats = playerStatsMap.get(entry.playerId)
      if (!stats) continue

      const seasonalStats = stats.seasonalStats as any
      const updatedSeasonalStats = {
        ...seasonalStats,
        tournaments: (seasonalStats.tournaments || 0) + 1
      }

      await tx.playerGameStats.update({
        where: { id: stats.id },
        data: {
          seasonalStats: updatedSeasonalStats,
          // Update best finish if this placement is better
          bestFinish: stats.bestFinish === null || (entry.placement && entry.placement < stats.bestFinish)
            ? entry.placement
            : stats.bestFinish,
          updatedAt: new Date()
        }
      })
    }

    return ratingUpdates
  }

  /**
   * Advance tournament to the next round
   * 
   * Validates all current round matches are completed, generates pairings for
   * the next round based on tournament structure (Swiss or Elimination), creates
   * new Match records, updates tournament round number, and logs the action.
   * Detects end-of-tournament conditions.
   * 
   * @param tournamentId - ID of the tournament to advance
   * @param organizerId - ID of the user advancing the tournament
   * @returns Tournament, new matches, current round, and tournament ended flag
   * @throws TRPCError if validation fails or tournament cannot be advanced
   * 
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
   */
  async advanceRound(
    tournamentId: string,
    organizerId: string
  ): Promise<AdvanceRoundResult> {
    try {
      // Use transaction for atomicity
      const result = await this.prisma.$transaction(async (tx) => {
        // Fetch tournament with entries and matches
        const tournament = await tx.tournament.findUnique({
          where: { id: tournamentId },
          include: {
            entries: {
              where: { dropped: false },
              orderBy: { seed: 'asc' }
            },
            matches: {
              orderBy: [{ round: 'asc' }, { table: 'asc' }]
            }
          }
        })

        if (!tournament) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Tournament not found'
          })
        }

        // Validate tournament status is ACTIVE
        if (tournament.status !== 'ACTIVE') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Cannot advance tournament with status ${tournament.status}. Tournament must be ACTIVE.`
          })
        }

        // Determine current round from matches
        const currentRound = tournament.matches.length > 0
          ? Math.max(...tournament.matches.map(m => m.round))
          : 0

        // Validate all current round matches are completed
        const currentRoundMatches = tournament.matches.filter(m => m.round === currentRound)
        const incompleteMatches = currentRoundMatches.filter(m => m.status !== 'COMPLETED')

        if (incompleteMatches.length > 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Cannot advance round. ${incompleteMatches.length} match(es) in round ${currentRound} are not completed.`
          })
        }

        // Determine tournament structure
        const tournamentStructure = (tournament.tournamentStructure?.toUpperCase() || 'SWISS') as TournamentStructure

        if (tournamentStructure !== 'SWISS' && tournamentStructure !== 'ELIMINATION') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Unsupported tournament structure: ${tournament.tournamentStructure}`
          })
        }

        const nextRound = currentRound + 1
        let pairings: Pairing[] = []
        let tournamentEnded = false

        // Generate pairings based on tournament structure
        if (tournamentStructure === 'SWISS') {
          // Check if all Swiss rounds are complete
          if (tournament.totalRounds && currentRound >= tournament.totalRounds) {
            tournamentEnded = true
          } else {
            // Generate Swiss pairings based on current standings
            try {
              pairings = this.pairingGenerator.generateSwissPairings(
                tournament.entries,
                tournament.matches,
                nextRound
              )
            } catch (error) {
              throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to generate Swiss pairings: ${error instanceof Error ? error.message : 'Unknown error'}`
              })
            }
          }
        } else if (tournamentStructure === 'ELIMINATION') {
          // Get winners from current round
          const winners = currentRoundMatches
            .filter(m => m.winnerId !== null)
            .map(m => m.winnerId as string)

          // Check if only one player remains (tournament complete)
          if (winners.length === 1) {
            tournamentEnded = true
          } else if (winners.length === 0) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'No winners found in current round. Cannot advance elimination tournament.'
            })
          } else {
            // Generate elimination pairings for winners
            try {
              pairings = this.pairingGenerator.generateEliminationPairings(
                winners,
                nextRound
              )
            } catch (error) {
              throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to generate elimination pairings: ${error instanceof Error ? error.message : 'Unknown error'}`
              })
            }
          }
        }

        const newMatches: Match[] = []

        // Create new matches if tournament hasn't ended
        if (!tournamentEnded && pairings.length > 0) {
          for (const pairing of pairings) {
            const match = await tx.match.create({
              data: {
                tournamentId: tournament.id,
                player1Id: pairing.player1Id,
                player2Id: pairing.player2Id,
                round: nextRound,
                table: pairing.table,
                status: 'PENDING',
                // For bye matches, automatically set winner and scores
                ...(pairing.isBye ? {
                  winnerId: pairing.player1Id,
                  player1Score: 2,
                  player2Score: 0,
                  status: 'COMPLETED'
                } : {})
              }
            })
            newMatches.push(match)
          }
        }

        // Update tournament (no status change, just updatedAt)
        const updatedTournament = await tx.tournament.update({
          where: { id: tournamentId },
          data: {
            updatedAt: new Date()
          }
        })

        // Log action with AuditLogger (using transaction client)
        const txAuditLogger = new AuditLogger(tx as any)
        await txAuditLogger.logAction({
          id: crypto.randomUUID(),
          tournamentId: tournament.id,
          action: 'ADVANCE_ROUND',
          performedBy: organizerId,
          timestamp: new Date(),
          details: {
            round: nextRound,
            previousRound: currentRound,
            matchCount: newMatches.length,
            tournamentStructure,
            tournamentEnded,
            ...(tournamentStructure === 'ELIMINATION' && {
              remainingPlayers: pairings.length * 2
            })
          }
        })

        return {
          tournament: updatedTournament,
          newMatches,
          currentRound: tournamentEnded ? currentRound : nextRound,
          tournamentEnded
        }
      })

      return result
    } catch (error) {
      // Re-throw TRPCError as-is
      if (error instanceof TRPCError) {
        throw error
      }

      // Wrap other errors
      console.error('Error advancing tournament round:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to advance tournament round: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  /**
   * Pause tournament
   * 
   * Validates tournament is ACTIVE, updates status to PAUSED, and logs the action
   * with an optional reason. Prevents new match submissions and round advancement
   * while paused.
   * 
   * @param tournamentId - ID of the tournament to pause
   * @param organizerId - ID of the user pausing the tournament
   * @param reason - Optional reason for pausing
   * @returns Updated tournament with PAUSED status
   * @throws TRPCError if validation fails or tournament cannot be paused
   * 
   * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
   */
  async pauseTournament(
    tournamentId: string,
    organizerId: string,
    reason?: string
  ): Promise<Tournament> {
    try {
      // Use transaction for atomicity
      const result = await this.prisma.$transaction(async (tx) => {
        // Fetch tournament
        const tournament = await tx.tournament.findUnique({
          where: { id: tournamentId }
        })

        if (!tournament) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Tournament not found'
          })
        }

        // Validate tournament is ACTIVE
        if (tournament.status !== 'ACTIVE') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Cannot pause tournament with status ${tournament.status}. Tournament must be ACTIVE.`
          })
        }

        // Update status to PAUSED
        const updatedTournament = await tx.tournament.update({
          where: { id: tournamentId },
          data: {
            status: 'PAUSED',
            updatedAt: new Date()
          }
        })

        // Log action with AuditLogger (using transaction client)
        const txAuditLogger = new AuditLogger(tx as any)
        await txAuditLogger.logAction({
          id: crypto.randomUUID(),
          tournamentId: tournament.id,
          action: 'PAUSE',
          performedBy: organizerId,
          timestamp: new Date(),
          details: {
            reason: reason || 'No reason provided',
            previousStatus: tournament.status
          }
        })

        return updatedTournament
      })

      return result
    } catch (error) {
      // Re-throw TRPCError as-is
      if (error instanceof TRPCError) {
        throw error
      }

      // Wrap other errors
      console.error('Error pausing tournament:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to pause tournament: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  /**
   * Resume tournament
   * 
   * Validates tournament is PAUSED, updates status to ACTIVE, and logs the action.
   * Restores normal match submission and progression capabilities.
   * 
   * @param tournamentId - ID of the tournament to resume
   * @param organizerId - ID of the user resuming the tournament
   * @returns Updated tournament with ACTIVE status
   * @throws TRPCError if validation fails or tournament cannot be resumed
   * 
   * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
   */
  async resumeTournament(
    tournamentId: string,
    organizerId: string
  ): Promise<Tournament> {
    try {
      // Use transaction for atomicity
      const result = await this.prisma.$transaction(async (tx) => {
        // Fetch tournament
        const tournament = await tx.tournament.findUnique({
          where: { id: tournamentId }
        })

        if (!tournament) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Tournament not found'
          })
        }

        // Validate tournament is PAUSED
        if (tournament.status !== 'PAUSED') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Cannot resume tournament with status ${tournament.status}. Tournament must be PAUSED.`
          })
        }

        // Update status to ACTIVE
        const updatedTournament = await tx.tournament.update({
          where: { id: tournamentId },
          data: {
            status: 'ACTIVE',
            updatedAt: new Date()
          }
        })

        // Log action with AuditLogger (using transaction client)
        const txAuditLogger = new AuditLogger(tx as any)
        await txAuditLogger.logAction({
          id: crypto.randomUUID(),
          tournamentId: tournament.id,
          action: 'RESUME',
          performedBy: organizerId,
          timestamp: new Date(),
          details: {
            previousStatus: tournament.status
          }
        })

        return updatedTournament
      })

      return result
    } catch (error) {
      // Re-throw TRPCError as-is
      if (error instanceof TRPCError) {
        throw error
      }

      // Wrap other errors
      console.error('Error resuming tournament:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to resume tournament: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  /**
   * Cancel tournament
   * 
   * Validates tournament is not COMPLETED, updates status to CANCELLED, logs the
   * action with reason, and preserves all match results and standings for record
   * keeping. Prevents any further match submissions or tournament progression.
   * 
   * @param tournamentId - ID of the tournament to cancel
   * @param organizerId - ID of the user cancelling the tournament
   * @param reason - Reason for cancellation (required)
   * @returns Updated tournament with CANCELLED status
   * @throws TRPCError if validation fails or tournament cannot be cancelled
   * 
   * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
   */
  async cancelTournament(
    tournamentId: string,
    organizerId: string,
    reason: string
  ): Promise<Tournament> {
    try {
      // Use transaction for atomicity
      const result = await this.prisma.$transaction(async (tx) => {
        // Fetch tournament with entries for notification purposes
        const tournament = await tx.tournament.findUnique({
          where: { id: tournamentId },
          include: {
            entries: {
              select: {
                playerId: true
              }
            }
          }
        })

        if (!tournament) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Tournament not found'
          })
        }

        // Validate tournament is not COMPLETED
        if (tournament.status === 'COMPLETED') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot cancel a completed tournament.'
          })
        }

        // Validate reason is provided
        if (!reason || reason.trim() === '') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cancellation reason is required.'
          })
        }

        // Update status to CANCELLED
        const updatedTournament = await tx.tournament.update({
          where: { id: tournamentId },
          data: {
            status: 'CANCELLED',
            updatedAt: new Date()
          }
        })

        // Log action with AuditLogger (using transaction client)
        const txAuditLogger = new AuditLogger(tx as any)
        await txAuditLogger.logAction({
          id: crypto.randomUUID(),
          tournamentId: tournament.id,
          action: 'CANCEL',
          performedBy: organizerId,
          timestamp: new Date(),
          details: {
            reason: reason.trim(),
            previousStatus: tournament.status,
            participantCount: tournament.entries.length
          }
        })

        return updatedTournament
      })

      return result
    } catch (error) {
      // Re-throw TRPCError as-is
      if (error instanceof TRPCError) {
        throw error
      }

      // Wrap other errors
      console.error('Error cancelling tournament:', error)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to cancel tournament: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }
}
