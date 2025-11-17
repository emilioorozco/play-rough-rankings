import { prisma } from '@/lib/prisma'
import type { Tournament, Match } from '@prisma/client'
// TournamentEntry and User types are used indirectly through Prisma queries

/**
 * Notification types for tournament events
 */
export type TournamentNotificationType =
  | 'TOURNAMENT_STARTED'
  | 'ROUND_ADVANCED'
  | 'MATCH_ASSIGNED'
  | 'MATCH_RESULT_SUBMITTED'
  | 'MATCH_RESULT_CONFIRMED'
  | 'MATCH_DISPUTED'
  | 'TOURNAMENT_PAUSED'
  | 'TOURNAMENT_RESUMED'
  | 'TOURNAMENT_CANCELLED'
  | 'TOURNAMENT_COMPLETED'
  | 'PLAYER_DROPPED'

/**
 * Notification payload for tournament events
 */
export interface TournamentNotification {
  type: TournamentNotificationType
  tournamentId: string
  tournamentName: string
  recipientIds: string[]
  title: string
  message: string
  data?: Record<string, unknown>
}

/**
 * User notification preferences from database
 */
interface UserNotificationPreferences {
  userId: string
  optInTournamentUpdates: boolean
  optInCommunications: boolean
}

/**
 * Tournament Notification Service
 * Handles sending notifications for tournament lifecycle events
 */
export class TournamentNotificationService {
  /**
   * Get user notification preferences from database
   */
  private async getUserPreferences(userIds: string[]): Promise<Map<string, UserNotificationPreferences>> {
    const preferences = await prisma.userPreferences.findMany({
      where: {
        userId: { in: userIds },
      },
      select: {
        userId: true,
        optInTournamentUpdates: true,
        optInCommunications: true,
      },
    })

    const preferencesMap = new Map<string, UserNotificationPreferences>()
    preferences.forEach((pref) => {
      preferencesMap.set(pref.userId, pref)
    })

    return preferencesMap
  }

  /**
   * Filter recipients based on their notification preferences
   */
  private async filterRecipientsByPreferences(
    recipientIds: string[],
    notificationType: TournamentNotificationType
  ): Promise<string[]> {
    const preferencesMap = await this.getUserPreferences(recipientIds)

    return recipientIds.filter((userId) => {
      const prefs = preferencesMap.get(userId)
      
      // If no preferences found, default to not sending
      if (!prefs) return false

      // Check if user has opted in to tournament updates
      if (!prefs.optInTournamentUpdates) return false

      // For certain critical notifications, also check general communications
      const criticalNotifications: TournamentNotificationType[] = [
        'TOURNAMENT_CANCELLED',
        'TOURNAMENT_PAUSED',
        'MATCH_DISPUTED',
      ]

      if (criticalNotifications.includes(notificationType)) {
        return prefs.optInCommunications || prefs.optInTournamentUpdates
      }

      return true
    })
  }

  /**
   * Send notification to users (placeholder for actual implementation)
   * In a real implementation, this would integrate with email service, push notifications, etc.
   */
  private async sendNotification(notification: TournamentNotification): Promise<void> {
    // Filter recipients based on preferences
    const filteredRecipients = await this.filterRecipientsByPreferences(
      notification.recipientIds,
      notification.type
    )

    if (filteredRecipients.length === 0) {
      console.log(`No recipients opted in for notification type: ${notification.type}`)
      return
    }

    // Log notification for debugging
    console.log('Sending tournament notification:', {
      type: notification.type,
      tournamentId: notification.tournamentId,
      recipientCount: filteredRecipients.length,
      title: notification.title,
    })

    // TODO: Implement actual notification delivery
    // This could include:
    // - Email notifications via SendGrid/AWS SES
    // - Push notifications via Firebase/OneSignal
    // - In-app notifications via WebSocket/SSE
    // - SMS notifications via Twilio
    
    // For now, we'll store notifications in the database for in-app display
    // This integrates with the existing app-store notification system
  }

  /**
   * Get all participant user IDs for a tournament
   */
  private async getTournamentParticipantIds(tournamentId: string): Promise<string[]> {
    const entries = await prisma.tournamentEntry.findMany({
      where: { tournamentId },
      include: {
        player: {
          select: { userId: true },
        },
      },
    })

    return entries.map((entry) => entry.player.userId)
  }

  /**
   * Get user IDs for players in a specific match
   */
  private async getMatchPlayerIds(matchId: string): Promise<string[]> {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        player1: { select: { userId: true } },
        player2: { select: { userId: true } },
      },
    })

    if (!match) return []

    return [match.player1.userId, match.player2.userId]
  }

  /**
   * Notify participants when tournament starts
   */
  async notifyTournamentStarted(tournament: Tournament): Promise<void> {
    const participantIds = await this.getTournamentParticipantIds(tournament.id)

    await this.sendNotification({
      type: 'TOURNAMENT_STARTED',
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      recipientIds: participantIds,
      title: 'Tournament Started',
      message: `${tournament.name} has started! Check your first round match assignment.`,
      data: {
        tournamentId: tournament.id,
        status: tournament.status,
      },
    })
  }

  /**
   * Notify participants when round advances
   */
  async notifyRoundAdvanced(
    tournament: Tournament,
    newRound: number,
    matches: Match[]
  ): Promise<void> {
    const participantIds = await this.getTournamentParticipantIds(tournament.id)

    await this.sendNotification({
      type: 'ROUND_ADVANCED',
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      recipientIds: participantIds,
      title: 'New Round Started',
      message: `Round ${newRound} of ${tournament.name} has started. Check your match assignment.`,
      data: {
        tournamentId: tournament.id,
        round: newRound,
        matchCount: matches.length,
      },
    })

    // Send individual match assignments
    for (const match of matches) {
      await this.notifyMatchAssigned(tournament, match)
    }
  }

  /**
   * Notify players of their match assignment
   */
  async notifyMatchAssigned(tournament: Tournament, match: Match): Promise<void> {
    const playerIds = await this.getMatchPlayerIds(match.id)

    await this.sendNotification({
      type: 'MATCH_ASSIGNED',
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      recipientIds: playerIds,
      title: 'Match Assignment',
      message: `You have been assigned to Round ${match.round}${match.table ? ` at Table ${match.table}` : ''} in ${tournament.name}.`,
      data: {
        tournamentId: tournament.id,
        matchId: match.id,
        round: match.round,
        table: match.table,
      },
    })
  }

  /**
   * Notify when match result is submitted (pending confirmation)
   */
  async notifyMatchResultSubmitted(
    tournament: Tournament,
    match: Match,
    submitterId: string
  ): Promise<void> {
    const playerIds = await this.getMatchPlayerIds(match.id)
    const opponentId = playerIds.find((id) => id !== submitterId)

    if (!opponentId) return

    await this.sendNotification({
      type: 'MATCH_RESULT_SUBMITTED',
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      recipientIds: [opponentId],
      title: 'Match Result Submitted',
      message: `Your opponent has submitted results for your Round ${match.round} match in ${tournament.name}. Please confirm or report a dispute.`,
      data: {
        tournamentId: tournament.id,
        matchId: match.id,
        round: match.round,
      },
    })
  }

  /**
   * Notify when match result is confirmed
   */
  async notifyMatchResultConfirmed(tournament: Tournament, match: Match): Promise<void> {
    const playerIds = await this.getMatchPlayerIds(match.id)

    await this.sendNotification({
      type: 'MATCH_RESULT_CONFIRMED',
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      recipientIds: playerIds,
      title: 'Match Result Confirmed',
      message: `Results for your Round ${match.round} match in ${tournament.name} have been confirmed.`,
      data: {
        tournamentId: tournament.id,
        matchId: match.id,
        round: match.round,
        winnerId: match.winnerId,
      },
    })
  }

  /**
   * Notify when match is disputed
   */
  async notifyMatchDisputed(tournament: Tournament, match: Match): Promise<void> {
    const playerIds = await this.getMatchPlayerIds(match.id)

    // Get tournament organizer
    const organizerId = tournament.organizerId

    await this.sendNotification({
      type: 'MATCH_DISPUTED',
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      recipientIds: [...playerIds, organizerId],
      title: 'Match Disputed',
      message: `A dispute has been reported for Round ${match.round} match in ${tournament.name}. Tournament organizer will resolve.`,
      data: {
        tournamentId: tournament.id,
        matchId: match.id,
        round: match.round,
      },
    })
  }

  /**
   * Notify when tournament is paused
   */
  async notifyTournamentPaused(tournament: Tournament, reason?: string): Promise<void> {
    const participantIds = await this.getTournamentParticipantIds(tournament.id)

    await this.sendNotification({
      type: 'TOURNAMENT_PAUSED',
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      recipientIds: participantIds,
      title: 'Tournament Paused',
      message: `${tournament.name} has been paused${reason ? `: ${reason}` : '.'}`,
      data: {
        tournamentId: tournament.id,
        reason,
      },
    })
  }

  /**
   * Notify when tournament is resumed
   */
  async notifyTournamentResumed(tournament: Tournament): Promise<void> {
    const participantIds = await this.getTournamentParticipantIds(tournament.id)

    await this.sendNotification({
      type: 'TOURNAMENT_RESUMED',
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      recipientIds: participantIds,
      title: 'Tournament Resumed',
      message: `${tournament.name} has been resumed. Play will continue.`,
      data: {
        tournamentId: tournament.id,
      },
    })
  }

  /**
   * Notify when tournament is cancelled
   */
  async notifyTournamentCancelled(tournament: Tournament, reason: string): Promise<void> {
    const participantIds = await this.getTournamentParticipantIds(tournament.id)

    await this.sendNotification({
      type: 'TOURNAMENT_CANCELLED',
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      recipientIds: participantIds,
      title: 'Tournament Cancelled',
      message: `${tournament.name} has been cancelled: ${reason}`,
      data: {
        tournamentId: tournament.id,
        reason,
      },
    })
  }

  /**
   * Notify when tournament is completed
   */
  async notifyTournamentCompleted(tournament: Tournament): Promise<void> {
    const participantIds = await this.getTournamentParticipantIds(tournament.id)

    await this.sendNotification({
      type: 'TOURNAMENT_COMPLETED',
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      recipientIds: participantIds,
      title: 'Tournament Completed',
      message: `${tournament.name} has been completed! Check final standings and ratings.`,
      data: {
        tournamentId: tournament.id,
      },
    })
  }

  /**
   * Notify when player drops from tournament
   */
  async notifyPlayerDropped(
    tournament: Tournament,
    playerId: string,
    playerName: string
  ): Promise<void> {
    // Notify tournament organizer
    await this.sendNotification({
      type: 'PLAYER_DROPPED',
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      recipientIds: [tournament.organizerId],
      title: 'Player Dropped',
      message: `${playerName} has dropped from ${tournament.name}.`,
      data: {
        tournamentId: tournament.id,
        playerId,
      },
    })
  }
}

// Export singleton instance
export const notificationService = new TournamentNotificationService()
