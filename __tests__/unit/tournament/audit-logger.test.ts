/**
 * Unit tests for AuditLogger
 * 
 * Tests audit log creation, storage, retrieval, and filtering functionality.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { AuditLogger } from '@/lib/tournament/audit-logger'
import { TournamentAuditLog } from '@/lib/tournament/types'
import { createMockPrisma, type MockPrisma } from '@/__tests__/__mocks__/prisma'

let mockPrisma: MockPrisma

describe('AuditLogger', () => {
  let auditLogger: AuditLogger

  beforeEach(() => {
    mockPrisma = createMockPrisma()
    auditLogger = new AuditLogger(mockPrisma)
    jest.clearAllMocks()
  })

  describe('logAction', () => {
    it('should create and store a new audit log entry', async () => {
      const tournamentId = 'tournament-123'
      const log: TournamentAuditLog = {
        id: 'log-1',
        tournamentId,
        action: 'START',
        performedBy: 'user-123',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        details: {
          round: 1,
        },
      }

      // Mock tournament with no existing audit logs
      ;(mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        metadata: {},
      })
      ;(mockPrisma.tournament.update as jest.Mock).mockResolvedValue({})

      await auditLogger.logAction(log)

      // Verify findUnique was called
      expect(mockPrisma.tournament.findUnique).toHaveBeenCalledWith({
        where: { id: tournamentId },
        select: { metadata: true },
      })

      // Verify update was called with correct data
      expect(mockPrisma.tournament.update).toHaveBeenCalledWith({
        where: { id: tournamentId },
        data: {
          metadata: {
            auditLogs: [
              {
                ...log,
                timestamp: '2024-01-01T10:00:00.000Z',
              },
            ],
          },
        },
      })
    })

    it('should append to existing audit logs', async () => {
      const tournamentId = 'tournament-123'
      const existingLog = {
        id: 'log-1',
        tournamentId,
        action: 'START',
        performedBy: 'user-123',
        timestamp: '2024-01-01T10:00:00.000Z',
        details: {},
      }

      const newLog: TournamentAuditLog = {
        id: 'log-2',
        tournamentId,
        action: 'ADVANCE_ROUND',
        performedBy: 'user-123',
        timestamp: new Date('2024-01-01T11:00:00Z'),
        details: {
          round: 2,
        },
      }

      // Mock tournament with existing audit logs
      ;(mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        metadata: {
          auditLogs: [existingLog],
        },
      })
      ;(mockPrisma.tournament.update as jest.Mock).mockResolvedValue({})

      await auditLogger.logAction(newLog)

      // Verify update was called with both logs
      expect(mockPrisma.tournament.update).toHaveBeenCalledWith({
        where: { id: tournamentId },
        data: {
          metadata: {
            auditLogs: [
              existingLog,
              {
                ...newLog,
                timestamp: '2024-01-01T11:00:00.000Z',
              },
            ],
          },
        },
      })
    })

    it('should throw error if tournament not found', async () => {
      const log: TournamentAuditLog = {
        id: 'log-1',
        tournamentId: 'nonexistent',
        action: 'START',
        performedBy: 'user-123',
        timestamp: new Date(),
        details: {},
      }

      ;(mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(auditLogger.logAction(log)).rejects.toThrow(
        'Tournament not found: nonexistent'
      )
    })

    it('should handle null metadata gracefully', async () => {
      const tournamentId = 'tournament-123'
      const log: TournamentAuditLog = {
        id: 'log-1',
        tournamentId,
        action: 'START',
        performedBy: 'user-123',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        details: {},
      }

      // Mock tournament with null metadata
      ;(mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        metadata: null,
      })
      ;(mockPrisma.tournament.update as jest.Mock).mockResolvedValue({})

      await auditLogger.logAction(log)

      // Verify update was called with new audit logs array
      expect(mockPrisma.tournament.update).toHaveBeenCalledWith({
        where: { id: tournamentId },
        data: {
          metadata: {
            auditLogs: [
              {
                ...log,
                timestamp: '2024-01-01T10:00:00.000Z',
              },
            ],
          },
        },
      })
    })
  })

  describe('getAuditTrail', () => {
    it('should retrieve all audit logs for a tournament', async () => {
      const tournamentId = 'tournament-123'
      const logs = [
        {
          id: 'log-1',
          tournamentId,
          action: 'START',
          performedBy: 'user-123',
          timestamp: '2024-01-01T10:00:00.000Z',
          details: {},
        },
        {
          id: 'log-2',
          tournamentId,
          action: 'ADVANCE_ROUND',
          performedBy: 'user-123',
          timestamp: '2024-01-01T11:00:00.000Z',
          details: { round: 2 },
        },
      ]

      ;(mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        metadata: { auditLogs: logs },
      })

      const result = await auditLogger.getAuditTrail(tournamentId)

      expect(result).toHaveLength(2)
      expect(result[0].timestamp).toBeInstanceOf(Date)
      expect(result[0].action).toBe('ADVANCE_ROUND') // Most recent first
      expect(result[1].action).toBe('START')
    })

    it('should filter audit logs by action type', async () => {
      const tournamentId = 'tournament-123'
      const logs = [
        {
          id: 'log-1',
          tournamentId,
          action: 'START',
          performedBy: 'user-123',
          timestamp: '2024-01-01T10:00:00.000Z',
          details: {},
        },
        {
          id: 'log-2',
          tournamentId,
          action: 'SUBMIT_MATCH',
          performedBy: 'user-456',
          timestamp: '2024-01-01T11:00:00.000Z',
          details: { matchId: 'match-1' },
        },
        {
          id: 'log-3',
          tournamentId,
          action: 'SUBMIT_MATCH',
          performedBy: 'user-789',
          timestamp: '2024-01-01T12:00:00.000Z',
          details: { matchId: 'match-2' },
        },
      ]

      ;(mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        metadata: { auditLogs: logs },
      })

      const result = await auditLogger.getAuditTrail(tournamentId, {
        action: 'SUBMIT_MATCH',
      })

      expect(result).toHaveLength(2)
      expect(result.every(log => log.action === 'SUBMIT_MATCH')).toBe(true)
    })

    it('should filter audit logs by user', async () => {
      const tournamentId = 'tournament-123'
      const logs = [
        {
          id: 'log-1',
          tournamentId,
          action: 'START',
          performedBy: 'user-123',
          timestamp: '2024-01-01T10:00:00.000Z',
          details: {},
        },
        {
          id: 'log-2',
          tournamentId,
          action: 'SUBMIT_MATCH',
          performedBy: 'user-456',
          timestamp: '2024-01-01T11:00:00.000Z',
          details: { matchId: 'match-1' },
        },
      ]

      ;(mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        metadata: { auditLogs: logs },
      })

      const result = await auditLogger.getAuditTrail(tournamentId, {
        performedBy: 'user-123',
      })

      expect(result).toHaveLength(1)
      expect(result[0].performedBy).toBe('user-123')
    })

    it('should filter audit logs by date range', async () => {
      const tournamentId = 'tournament-123'
      const logs = [
        {
          id: 'log-1',
          tournamentId,
          action: 'START',
          performedBy: 'user-123',
          timestamp: '2024-01-01T10:00:00.000Z',
          details: {},
        },
        {
          id: 'log-2',
          tournamentId,
          action: 'SUBMIT_MATCH',
          performedBy: 'user-456',
          timestamp: '2024-01-02T11:00:00.000Z',
          details: { matchId: 'match-1' },
        },
        {
          id: 'log-3',
          tournamentId,
          action: 'COMPLETE',
          performedBy: 'user-123',
          timestamp: '2024-01-03T12:00:00.000Z',
          details: {},
        },
      ]

      ;(mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        metadata: { auditLogs: logs },
      })

      const result = await auditLogger.getAuditTrail(tournamentId, {
        startDate: new Date('2024-01-02T00:00:00.000Z'),
        endDate: new Date('2024-01-02T23:59:59.999Z'),
      })

      expect(result).toHaveLength(1)
      expect(result[0].action).toBe('SUBMIT_MATCH')
    })

    it('should return empty array if no audit logs exist', async () => {
      const tournamentId = 'tournament-123'

      ;(mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        metadata: {},
      })

      const result = await auditLogger.getAuditTrail(tournamentId)

      expect(result).toEqual([])
    })

    it('should throw error if tournament not found', async () => {
      ;(mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        auditLogger.getAuditTrail('nonexistent')
      ).rejects.toThrow('Tournament not found: nonexistent')
    })
  })

  describe('getMatchAuditTrail', () => {
    it('should retrieve audit logs for a specific match', async () => {
      const matchId = 'match-123'
      const tournamentId = 'tournament-123'
      const logs = [
        {
          id: 'log-1',
          tournamentId,
          action: 'START',
          performedBy: 'user-123',
          timestamp: '2024-01-01T10:00:00.000Z',
          details: {},
        },
        {
          id: 'log-2',
          tournamentId,
          action: 'SUBMIT_MATCH',
          performedBy: 'user-456',
          timestamp: '2024-01-01T11:00:00.000Z',
          details: { matchId: 'match-123' },
        },
        {
          id: 'log-3',
          tournamentId,
          action: 'SUBMIT_MATCH',
          performedBy: 'user-789',
          timestamp: '2024-01-01T12:00:00.000Z',
          details: { matchId: 'match-456' },
        },
      ]

      ;(mockPrisma.match.findUnique as jest.Mock).mockResolvedValue({
        tournamentId,
      })
      ;(mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        metadata: { auditLogs: logs },
      })

      const result = await auditLogger.getMatchAuditTrail(matchId)

      expect(result).toHaveLength(1)
      expect(result[0].details.matchId).toBe(matchId)
      expect(result[0].action).toBe('SUBMIT_MATCH')
    })

    it('should return empty array if no logs for match', async () => {
      const matchId = 'match-123'
      const tournamentId = 'tournament-123'
      const logs = [
        {
          id: 'log-1',
          tournamentId,
          action: 'START',
          performedBy: 'user-123',
          timestamp: '2024-01-01T10:00:00.000Z',
          details: {},
        },
      ]

      ;(mockPrisma.match.findUnique as jest.Mock).mockResolvedValue({
        tournamentId,
      })
      ;(mockPrisma.tournament.findUnique as jest.Mock).mockResolvedValue({
        metadata: { auditLogs: logs },
      })

      const result = await auditLogger.getMatchAuditTrail(matchId)

      expect(result).toEqual([])
    })

    it('should throw error if match not found', async () => {
      ;(mockPrisma.match.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(
        auditLogger.getMatchAuditTrail('nonexistent')
      ).rejects.toThrow('Match not found: nonexistent')
    })
  })
})
