/**
 * Match Processor
 * 
 * Handles match result submission, validation, and conflict resolution.
 * Supports player submissions with confirmation flow and organizer overrides.
 */

import { PrismaClient, Match } from '@prisma/client'
// Note: TournamentEntry type is accessed through Prisma queries (tx.tournamentEntry.findMany)
import { AuditLogger } from './audit-logger'
import { MatchSubmission, MatchDispute, MatchResult, TournamentRecord } from './types'

/**
 * Result of a match submission operation
 */
export interface SubmitMatchResultResponse {
  /** Updated match record */
  match: Match
  /** Whether the submission requires confirmation from opponent */
  requiresConfirmation: boolean
  /** Dispute information if players disagree on results */
  dispute?: MatchDispute
}

/**
 * MatchProcessor class for managing match result submissions and disputes
 * 
 * Handles player submissions with confirmation flow, organizer overrides,
 * and dispute resolution. Stores submissions in Match metadata JSON field
 * and updates TournamentEntry records when matches are completed.
 */
export class MatchProcessor {
  private auditLogger: AuditLogger

  constructor(private prisma: PrismaClient) {
    this.auditLogger = new AuditLogger(prisma)
  }

  /**
   * Submit match result by a player
   * 
   * Validates player authorization and match status, stores submission in metadata,
   * checks for opponent submission, and handles agreement/disagreement scenarios.
   * 
   * @param matchId - ID of the match
   * @param playerId - ID of the player submitting the result
   * @param result - Match result data (winner, scores)
   * @returns Match with submission status and potential dispute
   * @throws Error if validation fails
   */
  async submitMatchResult(
    matchId: string,
    playerId: string,
    result: MatchResult
  ): Promise<SubmitMatchResultResponse> {
    // Fetch match with related data
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: true,
        player1: true,
        player2: true,
      },
    })

    if (!match) {
      throw new Error(`Match not found: ${matchId}`)
    }

    // Validate player is in the match
    if (match.player1Id !== playerId && match.player2Id !== playerId) {
      throw new Error('Player is not authorized to submit results for this match')
    }

    // Validate match status
    if (match.status !== 'PENDING' && match.status !== 'IN_PROGRESS') {
      throw new Error(`Cannot submit results for match with status: ${match.status}`)
    }

    // Validate tournament is active
    if (match.tournament.status !== 'ACTIVE') {
      throw new Error(`Cannot submit results for tournament with status: ${match.tournament.status}`)
    }

    // Validate scores are non-negative
    if (result.player1Score < 0 || result.player2Score < 0) {
      throw new Error('Match scores must be non-negative')
    }

    // Validate winner is one of the players or null (for draws)
    if (result.winnerId !== null && 
        result.winnerId !== match.player1Id && 
        result.winnerId !== match.player2Id) {
      throw new Error('Winner must be one of the match players or null for a draw')
    }

    // Create submission record
    const submission: MatchSubmission = {
      matchId,
      submittedBy: playerId,
      winnerId: result.winnerId,
      player1Score: result.player1Score,
      player2Score: result.player2Score,
      timestamp: new Date(),
      confirmed: false,
    }

    // Parse existing player submissions
    const playerSubmissions = (match.playerSubmissions as any) || {}
    const submissions = playerSubmissions.submissions || {}

    // Store submission
    submissions[playerId] = submission

    // Check if opponent has already submitted
    const opponentId = playerId === match.player1Id ? match.player2Id : match.player1Id
    const opponentSubmission = submissions[opponentId] as MatchSubmission | undefined

    if (opponentSubmission) {
      // Check if submissions agree
      const agree = this.submissionsAgree(submission, opponentSubmission)

      if (agree) {
        // Both players agree - complete the match
        const updatedMatch = await this.completeMatch(
          matchId,
          result,
          match.tournament.id,
          playerId
        )

        // Log the action
        await this.auditLogger.logAction({
          id: `audit-${Date.now()}-${Math.random()}`,
          tournamentId: match.tournament.id,
          action: 'SUBMIT_MATCH',
          performedBy: playerId,
          timestamp: new Date(),
          details: {
            matchId,
            round: match.round,
            winnerId: result.winnerId,
            player1Score: result.player1Score,
            player2Score: result.player2Score,
            agreed: true,
          },
        })

        return {
          match: updatedMatch,
          requiresConfirmation: false,
        }
      } else {
        // Players disagree - create dispute
        const dispute: MatchDispute = {
          matchId,
          player1Submission: submissions[match.player1Id],
          player2Submission: submissions[match.player2Id],
        }

        // Update match status to DISPUTED
        const updatedMatch = await this.prisma.match.update({
          where: { id: matchId },
          data: {
            status: 'DISPUTED',
            playerSubmissions: {
              ...playerSubmissions,
              submissions,
              dispute,
            },
          },
        })

        // Log the dispute
        await this.auditLogger.logAction({
          id: `audit-${Date.now()}-${Math.random()}`,
          tournamentId: match.tournament.id,
          action: 'SUBMIT_MATCH',
          performedBy: playerId,
          timestamp: new Date(),
          details: {
            matchId,
            round: match.round,
            disputed: true,
            player1Submission: submissions[match.player1Id],
            player2Submission: submissions[match.player2Id],
          },
        })

        return {
          match: updatedMatch,
          requiresConfirmation: false,
          dispute,
        }
      }
    } else {
      // First submission - store and wait for opponent
      const updatedMatch = await this.prisma.match.update({
        where: { id: matchId },
        data: {
          status: 'IN_PROGRESS',
          playerSubmissions: {
            ...playerSubmissions,
            submissions,
          },
        },
      })

      // Log the submission
      await this.auditLogger.logAction({
        id: `audit-${Date.now()}-${Math.random()}`,
        tournamentId: match.tournament.id,
        action: 'SUBMIT_MATCH',
        performedBy: playerId,
        timestamp: new Date(),
        details: {
          matchId,
          round: match.round,
          winnerId: result.winnerId,
          player1Score: result.player1Score,
          player2Score: result.player2Score,
          awaitingConfirmation: true,
        },
      })

      return {
        match: updatedMatch,
        requiresConfirmation: true,
      }
    }
  }

  /**
   * Confirm match result by opponent
   * 
   * Retrieves pending submission and completes the match if confirmation matches.
   * 
   * @param matchId - ID of the match
   * @param playerId - ID of the player confirming the result
   * @returns Completed match
   * @throws Error if validation fails or no pending submission exists
   */
  async confirmMatchResult(matchId: string, playerId: string): Promise<Match> {
    // Fetch match with related data
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: true,
      },
    })

    if (!match) {
      throw new Error(`Match not found: ${matchId}`)
    }

    // Validate player is in the match
    if (match.player1Id !== playerId && match.player2Id !== playerId) {
      throw new Error('Player is not authorized to confirm results for this match')
    }

    // Parse player submissions
    const playerSubmissions = (match.playerSubmissions as any) || {}
    const submissions = playerSubmissions.submissions || {}

    // Get opponent's submission
    const opponentId = playerId === match.player1Id ? match.player2Id : match.player1Id
    const opponentSubmission = submissions[opponentId] as MatchSubmission | undefined

    if (!opponentSubmission) {
      throw new Error('No pending submission to confirm')
    }

    // Complete the match with opponent's submission
    const result: MatchResult = {
      winnerId: opponentSubmission.winnerId,
      player1Score: opponentSubmission.player1Score,
      player2Score: opponentSubmission.player2Score,
    }

    const updatedMatch = await this.completeMatch(
      matchId,
      result,
      match.tournament.id,
      playerId
    )

    // Log the confirmation
    await this.auditLogger.logAction({
      id: `audit-${Date.now()}-${Math.random()}`,
      tournamentId: match.tournament.id,
      action: 'SUBMIT_MATCH',
      performedBy: playerId,
      timestamp: new Date(),
      details: {
        matchId,
        round: match.round,
        confirmed: true,
        winnerId: result.winnerId,
        player1Score: result.player1Score,
        player2Score: result.player2Score,
      },
    })

    return updatedMatch
  }

  /**
   * Submit or override match result by organizer
   * 
   * Allows organizers to submit results without player confirmation.
   * Logs the action with optional reason.
   * 
   * @param matchId - ID of the match
   * @param organizerId - ID of the organizer
   * @param result - Match result data
   * @param reason - Optional reason for the override
   * @returns Completed match
   * @throws Error if validation fails
   */
  async organizerSubmitResult(
    matchId: string,
    organizerId: string,
    result: MatchResult,
    reason?: string
  ): Promise<Match> {
    // Fetch match with related data
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: true,
      },
    })

    if (!match) {
      throw new Error(`Match not found: ${matchId}`)
    }

    // Validate match exists and is in correct status
    if (match.status === 'COMPLETED') {
      throw new Error('Match is already completed')
    }

    // Validate scores
    if (result.player1Score < 0 || result.player2Score < 0) {
      throw new Error('Match scores must be non-negative')
    }

    // Validate winner
    if (result.winnerId !== null && 
        result.winnerId !== match.player1Id && 
        result.winnerId !== match.player2Id) {
      throw new Error('Winner must be one of the match players or null for a draw')
    }

    // Store previous values for audit log
    const playerSubmissions = (match.playerSubmissions as any) || {}
    const previousSubmissions = playerSubmissions.submissions

    // Complete the match
    const updatedMatch = await this.completeMatch(
      matchId,
      result,
      match.tournament.id,
      organizerId
    )

    // Log the organizer override
    await this.auditLogger.logAction({
      id: `audit-${Date.now()}-${Math.random()}`,
      tournamentId: match.tournament.id,
      action: 'OVERRIDE_MATCH',
      performedBy: organizerId,
      timestamp: new Date(),
      details: {
        matchId,
        round: match.round,
        winnerId: result.winnerId,
        player1Score: result.player1Score,
        player2Score: result.player2Score,
        reason,
        previousSubmissions,
        previousStatus: match.status,
      },
    })

    return updatedMatch
  }

  /**
   * Resolve a disputed match
   * 
   * Allows organizers to resolve disputes by providing the correct result.
   * 
   * @param matchId - ID of the match
   * @param organizerId - ID of the organizer
   * @param resolution - Correct match result
   * @returns Completed match
   * @throws Error if validation fails or match is not disputed
   */
  async resolveDispute(
    matchId: string,
    organizerId: string,
    resolution: MatchResult
  ): Promise<Match> {
    // Fetch match
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: true,
      },
    })

    if (!match) {
      throw new Error(`Match not found: ${matchId}`)
    }

    // Validate match is disputed
    if (match.status !== 'DISPUTED') {
      throw new Error('Match is not disputed')
    }

    // Validate resolution
    if (resolution.player1Score < 0 || resolution.player2Score < 0) {
      throw new Error('Match scores must be non-negative')
    }

    if (resolution.winnerId !== null && 
        resolution.winnerId !== match.player1Id && 
        resolution.winnerId !== match.player2Id) {
      throw new Error('Winner must be one of the match players or null for a draw')
    }

    // Get dispute from player submissions
    const playerSubmissions = (match.playerSubmissions as any) || {}
    const dispute = playerSubmissions.dispute as MatchDispute | undefined

    // Update dispute with resolution
    const resolvedDispute: MatchDispute = {
      ...dispute!,
      resolvedBy: organizerId,
      resolution: {
        matchId,
        submittedBy: organizerId,
        winnerId: resolution.winnerId,
        player1Score: resolution.player1Score,
        player2Score: resolution.player2Score,
        timestamp: new Date(),
        confirmed: true,
      },
      resolvedAt: new Date(),
    }

    // Complete the match
    const updatedMatch = await this.completeMatch(
      matchId,
      resolution,
      match.tournament.id,
      organizerId,
      resolvedDispute
    )

    // Log the dispute resolution
    await this.auditLogger.logAction({
      id: `audit-${Date.now()}-${Math.random()}`,
      tournamentId: match.tournament.id,
      action: 'RESOLVE_DISPUTE',
      performedBy: organizerId,
      timestamp: new Date(),
      details: {
        matchId,
        round: match.round,
        winnerId: resolution.winnerId,
        player1Score: resolution.player1Score,
        player2Score: resolution.player2Score,
        dispute: resolvedDispute,
      },
    })

    return updatedMatch
  }

  /**
   * Award match due to no-show
   * 
   * Allows organizers to award a match to the present player when opponent doesn't show.
   * 
   * @param matchId - ID of the match
   * @param organizerId - ID of the organizer
   * @param winnerId - ID of the player who showed up
   * @returns Completed match
   * @throws Error if validation fails
   */
  async awardMatchNoShow(
    matchId: string,
    organizerId: string,
    winnerId: string
  ): Promise<Match> {
    // Fetch match
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: true,
      },
    })

    if (!match) {
      throw new Error(`Match not found: ${matchId}`)
    }

    // Validate winner is one of the players
    if (winnerId !== match.player1Id && winnerId !== match.player2Id) {
      throw new Error('Winner must be one of the match players')
    }

    // Award match with 2-0 score (standard for no-show)
    const result: MatchResult = {
      winnerId,
      player1Score: winnerId === match.player1Id ? 2 : 0,
      player2Score: winnerId === match.player2Id ? 2 : 0,
    }

    // Complete the match
    const updatedMatch = await this.completeMatch(
      matchId,
      result,
      match.tournament.id,
      organizerId
    )

    // Log the no-show award
    await this.auditLogger.logAction({
      id: `audit-${Date.now()}-${Math.random()}`,
      tournamentId: match.tournament.id,
      action: 'OVERRIDE_MATCH',
      performedBy: organizerId,
      timestamp: new Date(),
      details: {
        matchId,
        round: match.round,
        winnerId,
        player1Score: result.player1Score,
        player2Score: result.player2Score,
        reason: 'No-show',
        noShow: true,
      },
    })

    return updatedMatch
  }

  /**
   * Complete a match and update tournament entry records
   * 
   * @param matchId - ID of the match
   * @param result - Match result data
   * @param tournamentId - ID of the tournament
   * @param performedBy - ID of the user completing the match
   * @param resolvedDispute - Optional resolved dispute data
   * @returns Completed match
   */
  private async completeMatch(
    matchId: string,
    result: MatchResult,
    tournamentId: string,
    performedBy: string,
    resolvedDispute?: MatchDispute
  ): Promise<Match> {
    return await this.prisma.$transaction(async (tx) => {
      // Update match
      const match = await tx.match.update({
        where: { id: matchId },
        data: {
          status: 'COMPLETED',
          winnerId: result.winnerId,
          player1Score: result.player1Score,
          player2Score: result.player2Score,
          playerSubmissions: resolvedDispute ? JSON.parse(JSON.stringify({ dispute: resolvedDispute })) : {},
        },
      })

      // Update tournament entry records
      await this.updateTournamentEntryRecords(
        tx,
        tournamentId,
        match.player1Id,
        match.player2Id,
        result.winnerId
      )

      return match
    })
  }

  /**
   * Update tournament entry records for both players
   * 
   * @param tx - Prisma transaction client
   * @param tournamentId - ID of the tournament
   * @param player1Id - ID of player 1
   * @param player2Id - ID of player 2
   * @param winnerId - ID of the winner (null for draw)
   */
  private async updateTournamentEntryRecords(
    tx: any,
    tournamentId: string,
    player1Id: string,
    player2Id: string,
    winnerId: string | null
  ): Promise<void> {
    // Fetch both entries
    const entries = await tx.tournamentEntry.findMany({
      where: {
        tournamentId,
        playerId: { in: [player1Id, player2Id] },
      },
    })

    // Update each entry
    for (const entry of entries) {
      const record = (entry.record as TournamentRecord) || { wins: 0, losses: 0, draws: 0 }

      if (winnerId === null) {
        // Draw
        record.draws = (record.draws || 0) + 1
      } else if (entry.playerId === winnerId) {
        // Win
        record.wins = (record.wins || 0) + 1
      } else {
        // Loss
        record.losses = (record.losses || 0) + 1
      }

      await tx.tournamentEntry.update({
        where: { id: entry.id },
        data: { record },
      })
    }
  }

  /**
   * Check if two submissions agree on the match result
   * 
   * @param submission1 - First submission
   * @param submission2 - Second submission
   * @returns True if submissions agree, false otherwise
   */
  private submissionsAgree(
    submission1: MatchSubmission,
    submission2: MatchSubmission
  ): boolean {
    return (
      submission1.winnerId === submission2.winnerId &&
      submission1.player1Score === submission2.player1Score &&
      submission1.player2Score === submission2.player2Score
    )
  }
}
