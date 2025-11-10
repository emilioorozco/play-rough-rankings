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

        let newMatches: Match[] = []

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
}
