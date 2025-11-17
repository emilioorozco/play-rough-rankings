/**
 * Batch Audit Logger
 * 
 * Optimized audit logging system that batches multiple log entries
 * and writes them in a single database operation to improve performance.
 */

import { PrismaClient } from '@prisma/client'
import { TournamentAuditLog } from './types'

/**
 * Batch configuration
 */
interface BatchConfig {
  /** Maximum batch size before auto-flush */
  maxBatchSize: number
  /** Maximum time to wait before auto-flush (milliseconds) */
  maxWaitTime: number
  /** Enable auto-flush on timer */
  autoFlush: boolean
}

/**
 * Default batch configuration
 */
const DEFAULT_BATCH_CONFIG: BatchConfig = {
  maxBatchSize: 10,
  maxWaitTime: 5000, // 5 seconds
  autoFlush: true
}

/**
 * BatchAuditLogger class for optimized audit logging
 */
export class BatchAuditLogger {
  private prisma: PrismaClient
  private config: BatchConfig
  private batch: Map<string, TournamentAuditLog[]> = new Map()
  private flushTimer: NodeJS.Timeout | null = null
  private isFlushing = false

  constructor(prisma: PrismaClient, config?: Partial<BatchConfig>) {
    this.prisma = prisma
    this.config = {
      ...DEFAULT_BATCH_CONFIG,
      ...config
    }

    // Start auto-flush timer if enabled
    if (this.config.autoFlush) {
      this.startFlushTimer()
    }
  }

  /**
   * Add a log entry to the batch
   * 
   * @param log - Audit log entry to add
   * @returns Promise that resolves when log is added (not necessarily written)
   */
  async logAction(log: TournamentAuditLog): Promise<void> {
    const tournamentId = log.tournamentId

    // Get or create batch for this tournament
    if (!this.batch.has(tournamentId)) {
      this.batch.set(tournamentId, [])
    }

    const tournamentBatch = this.batch.get(tournamentId)!
    tournamentBatch.push(log)

    // Check if we should flush based on batch size
    const totalBatchSize = Array.from(this.batch.values()).reduce(
      (sum, logs) => sum + logs.length,
      0
    )

    if (totalBatchSize >= this.config.maxBatchSize) {
      await this.flush()
    }
  }

  /**
   * Flush all pending log entries to the database
   * 
   * @returns Promise that resolves when all logs are written
   */
  async flush(): Promise<void> {
    // Prevent concurrent flushes
    if (this.isFlushing) {
      return
    }

    if (this.batch.size === 0) {
      return
    }

    this.isFlushing = true

    try {
      // Process each tournament's batch
      const flushPromises: Promise<void>[] = []

      for (const [tournamentId, logs] of this.batch.entries()) {
        if (logs.length === 0) {
          continue
        }

        // Create a promise for this tournament's batch
        const flushPromise = this.flushTournamentBatch(tournamentId, logs)
        flushPromises.push(flushPromise)
      }

      // Wait for all batches to be written
      await Promise.all(flushPromises)

      // Clear the batch after successful flush
      this.batch.clear()

      // Reset flush timer
      if (this.config.autoFlush) {
        this.resetFlushTimer()
      }
    } catch (error) {
      console.error('Error flushing audit log batch:', error)
      throw error
    } finally {
      this.isFlushing = false
    }
  }

  /**
   * Flush logs for a specific tournament
   * 
   * @param tournamentId - ID of the tournament
   * @param logs - Array of log entries to write
   */
  private async flushTournamentBatch(
    tournamentId: string,
    logs: TournamentAuditLog[]
  ): Promise<void> {
    try {
      // Fetch current tournament metadata
      const tournament = await this.prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { metadata: true }
      })

      if (!tournament) {
        console.error(`Tournament not found during batch flush: ${tournamentId}`)
        return
      }

      // Parse existing metadata or initialize empty object
      const metadata = (tournament.metadata as any) || {}
      const existingLogs = Array.isArray(metadata.auditLogs) ? metadata.auditLogs : []

      // Convert timestamps to ISO strings for JSON compatibility
      const serializedLogs = logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString()
      }))

      // Append new logs to existing logs
      const updatedLogs = [...existingLogs, ...serializedLogs]

      // Update tournament metadata with batched audit logs
      await this.prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          metadata: {
            ...metadata,
            auditLogs: updatedLogs
          }
        }
      })
    } catch (error) {
      console.error(`Error flushing batch for tournament ${tournamentId}:`, error)
      throw error
    }
  }

  /**
   * Start the auto-flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        console.error('Error in auto-flush:', error)
      })
    }, this.config.maxWaitTime)
  }

  /**
   * Reset the flush timer
   */
  private resetFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }

    if (this.config.autoFlush) {
      this.startFlushTimer()
    }
  }

  /**
   * Stop the auto-flush timer and flush remaining logs
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }

    // Flush any remaining logs
    await this.flush()
  }

  /**
   * Get batch statistics
   * 
   * @returns Batch statistics for monitoring
   */
  getStats(): {
    pendingLogs: number
    tournaments: number
    maxBatchSize: number
    autoFlush: boolean
  } {
    const pendingLogs = Array.from(this.batch.values()).reduce(
      (sum, logs) => sum + logs.length,
      0
    )

    return {
      pendingLogs,
      tournaments: this.batch.size,
      maxBatchSize: this.config.maxBatchSize,
      autoFlush: this.config.autoFlush
    }
  }
}
