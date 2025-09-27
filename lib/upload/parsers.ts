import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import csv from 'csv-parser'
import { Readable } from 'stream'
import { TournamentSchema } from '@/lib/schemas'
import type {
  CSVRowData,
  TournamentFileMetadata
} from '@/lib/types/backend'

// Import tournament level enum from existing schema
const TournamentLevelEnum = TournamentSchema.shape.tournamentLevel
type TournamentLevel = z.infer<typeof TournamentLevelEnum>

// Normalize and validate tournament level strings from files
const parseTournamentLevel = (raw?: string): TournamentLevel | undefined => {
  if (!raw) return undefined
  const value = raw.toString().trim().toUpperCase()
  switch (value) {
    case 'LOCAL':
    case 'REGIONAL':
    case 'NATIONAL':
    case 'INTERNATIONAL':
      return value as TournamentLevel
    default:
      return undefined
  }
}

// External tournament data schemas for file uploads
export const TournamentPlayerSchema = z.object({
  playerId: z.string().uuid().optional(), // Internal player ID (if known)
  externalPlayerId: z.string().min(1).max(50), // External ID (e.g., Pokemon TCG ID)
  playerName: z.string().min(1).max(100),
  email: z.string().email().optional(),
})

export const TournamentMatchSchema = z.object({
  round: z.number().int().min(1),
  table: z.number().int().min(1).optional(),
  player1ExternalId: z.string().min(1).max(50),
  player2ExternalId: z.string().min(1).max(50),
  winnerExternalId: z.string().min(1).max(50).optional(),
  status: z.enum(['PENDING', 'ACTIVE', 'COMPLETED']).default('COMPLETED'),
})

export const TournamentDataSchema = z.object({
  tournament: z.object({
    name: z.string().min(1).max(255),
    date: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)), // ISO date or YYYY-MM-DD
    format: z.string().min(1).max(100),
    maxPlayers: z.number().int().min(1).optional(),
    entryFee: z.number().min(0).optional(),
    prizePool: z.string().max(500).optional(),
    tournamentLevel: TournamentLevelEnum.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),
  players: z.array(TournamentPlayerSchema),
  matches: z.array(TournamentMatchSchema),
})

export type TournamentData = z.infer<typeof TournamentDataSchema>
export type TournamentPlayer = z.infer<typeof TournamentPlayerSchema>
export type TournamentMatch = z.infer<typeof TournamentMatchSchema>

// Parse CSV tournament data
export const parseCSVTournamentData = async (buffer: Buffer): Promise<TournamentData> => {
  return new Promise((resolve, reject) => {
    const results: CSVRowData[] = []
    const stream = Readable.from(buffer.toString())

    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        try {
          const parsedData = processCSVData(results)
          resolve(parsedData)
        } catch (error) {
          reject(error)
        }
      })
      .on('error', (error) => {
        reject(new TRPCError({
          code: 'BAD_REQUEST',
          message: `CSV parsing error: ${error.message}`
        }))
      })
  })
}

// Process CSV data into tournament format
const processCSVData = (rows: CSVRowData[]): TournamentData => {
  if (rows.length === 0) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'CSV file is empty'
    })
  }

  // Detect CSV format based on headers
  const headers = Object.keys(rows[0]).map(h => h.toLowerCase().trim())
  
  if (headers.includes('round') && headers.includes('player1') && headers.includes('player2')) {
    // Match results format
    return parseMatchResultsCSV(rows)
  } else if (headers.includes('player') || headers.includes('name')) {
    // Player list format
    return parsePlayerListCSV(rows)
  } else {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Unrecognized CSV format. Expected match results or player list format.'
    })
  }
}

// Parse match results CSV format
const parseMatchResultsCSV = (rows: CSVRowData[]): TournamentData => {
  const players = new Map<string, TournamentPlayer>()
  const matches: TournamentMatch[] = []
  
  // Extract tournament info from first row or use defaults
  const firstRow = rows[0]
  const tournament: TournamentFileMetadata = {
    name: (firstRow.tournament_name as string) || (firstRow.tournamentName as string) || 'Imported Tournament',
    date: (firstRow.tournament_date as string) || (firstRow.tournamentDate as string) || new Date().toISOString().split('T')[0],
    format: (firstRow.format as string) || (firstRow.tournament_format as string) || 'Standard',
    maxPlayers: firstRow.max_players ? parseInt(firstRow.max_players as string) : undefined,
    entryFee: firstRow.entry_fee ? parseFloat(firstRow.entry_fee as string) : undefined,
    prizePool: (firstRow.prize_pool as string) || (firstRow.prizePool as string) || undefined,
    tournamentLevel:
      parseTournamentLevel((firstRow.tournament_level as string) || (firstRow.tournamentLevel as string)) || 'LOCAL',
  }

  // Process each match
  for (const row of rows) {
    try {
      const rowData = row
      const round = parseInt(rowData.round as string)
      const table = rowData.table ? parseInt(rowData.table as string) : undefined
      const player1ExternalId = (rowData.player1 || rowData.player1_id || rowData.player1Id || '').toString().trim()
      const player2ExternalId = (rowData.player2 || rowData.player2_id || rowData.player2Id || '').toString().trim()
      const winnerExternalId = (rowData.winner || rowData.winner_id || rowData.winnerId || '').toString().trim()

      if (!player1ExternalId || !player2ExternalId) {
        continue // Skip invalid rows
      }

      // Add players to the set
      if (!players.has(player1ExternalId)) {
        players.set(player1ExternalId, {
          externalPlayerId: player1ExternalId,
          playerName: (rowData.player1_name as string) || (rowData.player1Name as string) || player1ExternalId,
          email: (rowData.player1_email as string) || (rowData.player1Email as string) || undefined,
        })
      }

      if (!players.has(player2ExternalId)) {
        players.set(player2ExternalId, {
          externalPlayerId: player2ExternalId,
          playerName: (rowData.player2_name as string) || (rowData.player2Name as string) || player2ExternalId,
          email: (rowData.player2_email as string) || (rowData.player2Email as string) || undefined,
        })
      }

      // Add match
      matches.push({
        round,
        table,
        player1ExternalId,
        player2ExternalId,
        winnerExternalId: winnerExternalId || undefined,
        status: 'COMPLETED',
      })
    } catch (error) {
      // Skip invalid rows but continue processing
      console.warn(`Skipping invalid row:`, row, error)
    }
  }

  return {
    tournament,
    players: Array.from(players.values()),
    matches,
  }
}

// Parse player list CSV format
const parsePlayerListCSV = (rows: CSVRowData[]): TournamentData => {
  const players: TournamentPlayer[] = []
  
  // Extract tournament info from first row or use defaults
  const firstRow = rows[0]
  const tournament: TournamentFileMetadata = {
    name: (firstRow.tournament_name as string) || (firstRow.tournamentName as string) || 'Imported Tournament',
    date: (firstRow.tournament_date as string) || (firstRow.tournamentDate as string) || new Date().toISOString().split('T')[0],
    format: (firstRow.format as string) || (firstRow.tournament_format as string) || 'Standard',
    maxPlayers: rows.length,
  }

  // Process each player
  for (const row of rows) {
    try {
      const rowData = row
      const externalPlayerId = (rowData.player_id || rowData.playerId || rowData.id || '').toString().trim()
      const playerName = (rowData.player_name || rowData.playerName || rowData.name || rowData.player || '').toString().trim()
      const email = (rowData.email || '').toString().trim()

      if (!externalPlayerId || !playerName) {
        continue // Skip invalid rows
      }

      players.push({
        externalPlayerId,
        playerName,
        email: email || undefined,
      })
    } catch (error) {
      // Skip invalid rows but continue processing
      console.warn(`Skipping invalid player row:`, row, error)
    }
  }

  return {
    tournament,
    players,
    matches: [], // No matches in player list format
  }
}

// Parse JSON tournament data
export const parseJSONTournamentData = async (buffer: Buffer): Promise<TournamentData> => {
  try {
    const jsonString = buffer.toString('utf8')
    const rawData = JSON.parse(jsonString)
    
    // Validate the JSON structure
    const validatedData = TournamentDataSchema.parse(rawData)
    
    return validatedData
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Invalid JSON structure: ${error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      })
    }
    
    if (error instanceof SyntaxError) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Invalid JSON format: ${error.message}`
      })
    }
    
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `JSON parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
}

// Parse TDF (Tournament Data Format) files
export const parseTDFTournamentData = async (buffer: Buffer): Promise<TournamentData> => {
  try {
    const content = buffer.toString('utf8')
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    if (lines.length === 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'TDF file is empty'
      })
    }

    // TDF format parsing - assuming it's a structured text format
    // This is a flexible parser that can handle various TDF formats
    const tournament = {
      name: 'TDF Tournament Import',
      date: new Date().toISOString().split('T')[0],
      format: 'Standard',
    }
    
    const players: TournamentPlayer[] = []
    const matches: TournamentMatch[] = []
    
    let currentSection = 'header'
    let roundNumber = 1
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Skip comments and empty lines
      if (line.startsWith('#') || line.startsWith('//') || line.length === 0) {
        continue
      }
      
      // Detect sections
      if (line.toLowerCase().includes('tournament') && line.includes(':')) {
        currentSection = 'tournament'
        const [, value] = line.split(':').map(s => s.trim())
        if (value) tournament.name = value
        continue
      }
      
      if (line.toLowerCase().includes('date') && line.includes(':')) {
        const [, value] = line.split(':').map(s => s.trim())
        if (value) tournament.date = value
        continue
      }
      
      if (line.toLowerCase().includes('format') && line.includes(':')) {
        const [, value] = line.split(':').map(s => s.trim())
        if (value) tournament.format = value
        continue
      }
      
      if (line.toLowerCase().includes('players') || line.toLowerCase().includes('participants')) {
        currentSection = 'players'
        continue
      }
      
      if (line.toLowerCase().includes('matches') || line.toLowerCase().includes('results')) {
        currentSection = 'matches'
        continue
      }
      
      if (line.toLowerCase().includes('round')) {
        const roundMatch = line.match(/round\s*(\d+)/i)
        if (roundMatch) {
          roundNumber = parseInt(roundMatch[1])
        }
        continue
      }
      
      // Parse content based on current section
      if (currentSection === 'players') {
        // Parse player line - flexible format
        // Supports: "ID Name" or "ID,Name" or "ID|Name" or "ID:Name"
        const playerMatch = line.match(/^([^\s,|:]+)[\s,|:]+(.+)$/)
        if (playerMatch) {
          const [, externalPlayerId, playerName] = playerMatch
          players.push({
            externalPlayerId: externalPlayerId.trim(),
            playerName: playerName.trim(),
          })
        } else if (line.includes('\t')) {
          // Tab-separated format
          const parts = line.split('\t').map(s => s.trim())
          if (parts.length >= 2) {
            players.push({
              externalPlayerId: parts[0],
              playerName: parts[1],
              email: parts[2] || undefined,
            })
          }
        }
      } else if (currentSection === 'matches') {
        // Parse match line - flexible format
        // Supports various formats like "Player1 vs Player2 - Winner" or "Player1,Player2,Winner"
        let matchData: Record<string, unknown> | null = null
        
        // Format: "Player1 vs Player2 - Winner"
        const vsMatch = line.match(/^([^\s]+)\s+vs\s+([^\s]+)(?:\s*-\s*([^\s]+))?/i)
        if (vsMatch) {
          matchData = {
            player1: vsMatch[1],
            player2: vsMatch[2],
            winner: vsMatch[3] || undefined,
          }
        }
        
        // Format: "Player1,Player2,Winner" or "Player1,Player2"
        if (!matchData && line.includes(',')) {
          const parts = line.split(',').map(s => s.trim())
          if (parts.length >= 2) {
            matchData = {
              player1: parts[0],
              player2: parts[1],
              winner: parts[2] || undefined,
            }
          }
        }
        
        // Format: "Player1|Player2|Winner" or "Player1|Player2"
        if (!matchData && line.includes('|')) {
          const parts = line.split('|').map(s => s.trim())
          if (parts.length >= 2) {
            matchData = {
              player1: parts[0],
              player2: parts[1],
              winner: parts[2] || undefined,
            }
          }
        }
        
        // Format: Tab-separated
        if (!matchData && line.includes('\t')) {
          const parts = line.split('\t').map(s => s.trim())
          if (parts.length >= 2) {
            matchData = {
              player1: parts[0],
              player2: parts[1],
              winner: parts[2] || undefined,
            }
          }
        }
        
        if (matchData) {
          matches.push({
            round: roundNumber,
            player1ExternalId: matchData.player1 as string,
            player2ExternalId: matchData.player2 as string,
            winnerExternalId: matchData.winner as string | undefined,
            status: 'COMPLETED' as const,
          })
        }
      }
    }
    
    // If no players were explicitly listed, extract them from matches
    if (players.length === 0 && matches.length > 0) {
      const playerSet = new Set<string>()
      matches.forEach(match => {
        playerSet.add(match.player1ExternalId)
        playerSet.add(match.player2ExternalId)
      })
      
      playerSet.forEach(playerId => {
        players.push({
          externalPlayerId: playerId,
          playerName: playerId, // Use ID as name if no name provided
        })
      })
    }
    
    return {
      tournament,
      players,
      matches,
    }
  } catch (error) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `TDF parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
  }
}

// Main parser function
export const parseTournamentFile = async (
  buffer: Buffer, 
  filename: string
): Promise<TournamentData> => {
  const ext = filename.toLowerCase().split('.').pop()
  
  switch (ext) {
    case 'csv':
    case 'txt':
      return parseCSVTournamentData(buffer)
    case 'json':
      return parseJSONTournamentData(buffer)
    case 'tdf':
      return parseTDFTournamentData(buffer)
    default:
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Unsupported file format'
      })
  }
}

// Validate tournament data
export const validateTournamentData = (data: TournamentData): void => {
  // Check for duplicate external player IDs
  const externalIds = new Set<string>()
  for (const player of data.players) {
    if (externalIds.has(player.externalPlayerId)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Duplicate external player ID: ${player.externalPlayerId}`
      })
    }
    externalIds.add(player.externalPlayerId)
  }

  // Validate that all match players exist in the player list
  for (const match of data.matches) {
    if (!externalIds.has(match.player1ExternalId)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Match references unknown player: ${match.player1ExternalId}`
      })
    }
    if (!externalIds.has(match.player2ExternalId)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Match references unknown player: ${match.player2ExternalId}`
      })
    }
    if (match.winnerExternalId && !externalIds.has(match.winnerExternalId)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Match references unknown winner: ${match.winnerExternalId}`
      })
    }
  }

  // Validate tournament date
  try {
    new Date(data.tournament.date)
  } catch {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid tournament date format'
    })
  }
}