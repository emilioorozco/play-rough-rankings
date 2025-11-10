/**
 * Tournament Audit Logger
 * 
 * Provides comprehensive audit logging for all tournament actions.
 * Logs are stored in the Tournament.metadata JSON field for immutability
 * and easy retrieval.
 */

import { PrismaClient } from '@prisma/client'
import { TournamentAuditLog, TournamentAction } from './types'

/**
 * Filter options for retrieving audit trail
 */
export interface AuditTrailFilters {
  /** Filter by specific action type */
  action?: TournamentAction
  /** Filter by user who performed the action */
  performedBy?: string
  /** Filter by actions after this date */
  startDate?: Date
  /** Filter by actions before this date */
  endDate?: Date
}

/**
 * AuditLogger class for managing tournament audit logs
 * 
 * Stores audit logs in Tournament.metadata JSON field under 'auditLogs' key.
 * Provides methods for logging actions and retrieving audit trails with filtering.
 */
export class AuditLogger {
  constructor(private prisma: PrismaClient) {}

  /**
   * Log a tournament action to the audit trail
   * 
   * @param log - The audit log entry to store
   * @throws Error if tournament not found or database operation fails
   */
  async logAction(log: TournamentAuditLog): Promise<void> {
    try {
      // Fetch current tournament metadata
      const tournament = await this.prisma.tournament.findUnique({
        where: { id: log.tournamentId },
        select: { metadata: true }
      })

      if (!tournament) {
        throw new Error(`Tournament not found: ${log.tournamentId}`)
      }

      // Parse existing metadata or initialize empty object
      const metadata = (tournament.metadata as any) || {}
      const auditLogs = Array.isArray(metadata.auditLogs) ? metadata.auditLogs : []

      // Add new log entry
      auditLogs.push({
        ...log,
        timestamp: log.timestamp.toISOString() // Store as ISO string for JSON compatibility
      })

      // Update tournament metadata with new audit log
      await this.prisma.tournament.update({
        where: { id: log.tournamentId },
        data: {
          metadata: {
            ...metadata,
            auditLogs
          }
        }
      })
    } catch (error) {
      console.error('Error logging tournament action:', error)
      throw error
    }
  }

  /**
   * Retrieve audit trail for a tournament with optional filtering
   * 
   * @param tournamentId - ID of the tournament
   * @param filters - Optional filters to apply to the audit trail
   * @returns Array of audit log entries matching the filters
   * @throws Error if tournament not found
   */
  async getAuditTrail(
    tournamentId: string,
    filters?: AuditTrailFilters
  ): Promise<TournamentAuditLog[]> {
    try {
      // Fetch tournament metadata
      const tournament = await this.prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { metadata: true }
      })

      if (!tournament) {
        throw new Error(`Tournament not found: ${tournamentId}`)
      }

      // Parse metadata and extract audit logs
      const metadata = (tournament.metadata as any) || {}
      let auditLogs: any[] = Array.isArray(metadata.auditLogs) ? metadata.auditLogs : []

      // Convert ISO string timestamps back to Date objects
      auditLogs = auditLogs.map(log => ({
        ...log,
        timestamp: new Date(log.timestamp)
      }))

      // Apply filters if provided
      if (filters) {
        auditLogs = this.applyFilters(auditLogs, filters)
      }

      // Sort by timestamp (most recent first)
      auditLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

      return auditLogs as TournamentAuditLog[]
    } catch (error) {
      console.error('Error retrieving audit trail:', error)
      throw error
    }
  }

  /**
   * Retrieve audit trail for a specific match
   * 
   * @param matchId - ID of the match
   * @returns Array of audit log entries related to the match
   * @throws Error if match not found
   */
  async getMatchAuditTrail(matchId: string): Promise<TournamentAuditLog[]> {
    try {
      // Fetch match to get tournament ID
      const match = await this.prisma.match.findUnique({
        where: { id: matchId },
        select: { tournamentId: true }
      })

      if (!match) {
        throw new Error(`Match not found: ${matchId}`)
      }

      // Get full audit trail for the tournament
      const fullAuditTrail = await this.getAuditTrail(match.tournamentId)

      // Filter for logs related to this specific match
      const matchAuditTrail = fullAuditTrail.filter(log => 
        log.details.matchId === matchId
      )

      return matchAuditTrail
    } catch (error) {
      console.error('Error retrieving match audit trail:', error)
      throw error
    }
  }

  /**
   * Apply filters to audit log array
   * 
   * @param logs - Array of audit logs to filter
   * @param filters - Filters to apply
   * @returns Filtered array of audit logs
   */
  private applyFilters(
    logs: TournamentAuditLog[],
    filters: AuditTrailFilters
  ): TournamentAuditLog[] {
    let filtered = logs

    // Filter by action type
    if (filters.action) {
      filtered = filtered.filter(log => log.action === filters.action)
    }

    // Filter by user
    if (filters.performedBy) {
      filtered = filtered.filter(log => log.performedBy === filters.performedBy)
    }

    // Filter by start date
    if (filters.startDate) {
      filtered = filtered.filter(log => 
        log.timestamp.getTime() >= filters.startDate!.getTime()
      )
    }

    // Filter by end date
    if (filters.endDate) {
      filtered = filtered.filter(log => 
        log.timestamp.getTime() <= filters.endDate!.getTime()
      )
    }

    return filtered
  }
}
