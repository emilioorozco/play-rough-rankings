import type { Tournament, Match, TournamentEntry } from '@prisma/client'

// Types for calculated fields
export interface TournamentCalculations {
  currentRound: string
  completionPercentage: number
  isLive: boolean
  participantCount: number
  registrationProgress: number
}

export interface ParticipantCalculations {
  wins: number
  losses: number
  status: 'active' | 'eliminated' | 'bye' | 'dropped'
  tier: 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze'
}

export interface MatchCalculations {
  isCompleted: boolean
  isInProgress: boolean
  isPending: boolean
  hasScores: boolean
}

/**
 * Calculate current round string from tournament data
 * Supports both elimination and Swiss tournament formats
 */
export function calculateCurrentRound(
  tournament: Tournament,
  matches: Match[]
): string {
  if (tournament.status === 'UPCOMING') {
    return 'Not Started'
  }

  if (tournament.status === 'COMPLETED') {
    return 'Completed'
  }

  // Get the highest round number from matches
  const maxRound = Math.max(...matches.map(m => m.round), 0)
  
  if (maxRound === 0) {
    return 'Round 1'
  }

  // For elimination tournaments, convert round numbers to descriptive names
  if (tournament.tournamentStructure === 'ELIMINATION') {
    return convertEliminationRound(maxRound, tournament.maxPlayers || 0)
  }

  // For Swiss tournaments, use round numbers
  if (tournament.tournamentStructure === 'SWISS') {
    const totalRounds = tournament.totalRounds || 0
    return `Round ${maxRound} of ${totalRounds}`
  }

  // Default fallback
  return `Round ${maxRound}`
}

/**
 * Convert elimination round number to descriptive name
 */
function convertEliminationRound(round: number, maxPlayers: number): string {
  // Calculate total rounds needed for elimination tournament
  const totalRounds = Math.ceil(Math.log2(maxPlayers))
  
  if (round === 1) return 'Round 1'
  if (round === 2) return 'Round 2'
  if (round === 3) return 'Round 3'
  
  // For larger tournaments, use more descriptive names
  if (round === totalRounds - 2) return 'Quarterfinals'
  if (round === totalRounds - 1) return 'Semifinals'
  if (round === totalRounds) return 'Finals'
  
  return `Round ${round}`
}

/**
 * Calculate tournament completion percentage
 */
export function calculateCompletionPercentage(matches: Match[]): number {
  if (matches.length === 0) return 0
  
  const completedMatches = matches.filter(m => m.status === 'COMPLETED').length
  return Math.round((completedMatches / matches.length) * 100)
}

/**
 * Determine if tournament is currently live
 */
export function calculateIsLive(tournament: Tournament): boolean {
  if (tournament.status !== 'ACTIVE') return false
  
  // Tournament is live if it's active and within reasonable time bounds
  const now = new Date()
  const tournamentDate = new Date(tournament.date)
  
  // Check if tournament is within 24 hours of start time
  const timeDiff = Math.abs(now.getTime() - tournamentDate.getTime())
  const hoursDiff = timeDiff / (1000 * 60 * 60)
  
  return hoursDiff <= 24
}

/**
 * Calculate participant count from tournament entries
 */
export function calculateParticipantCount(entries: TournamentEntry[]): number {
  return entries.length
}

/**
 * Calculate registration progress percentage
 */
export function calculateRegistrationProgress(
  entries: TournamentEntry[],
  maxPlayers: number | null
): number {
  if (!maxPlayers || maxPlayers === 0) return 0
  
  const currentCount = entries.length
  return Math.round((currentCount / maxPlayers) * 100)
}

/**
 * Calculate participant wins and losses from match data
 */
export function calculateParticipantRecord(
  playerId: string,
  matches: Match[]
): { wins: number; losses: number } {
  const playerMatches = matches.filter(
    m => m.player1Id === playerId || m.player2Id === playerId
  )
  
  let wins = 0
  let losses = 0
  
  for (const match of playerMatches) {
    if (match.status === 'COMPLETED' && match.winnerId) {
      if (match.winnerId === playerId) {
        wins++
      } else {
        losses++
      }
    }
  }
  
  return { wins, losses }
}

/**
 * Determine participant status based on tournament format and match results
 */
export function calculateParticipantStatus(
  playerId: string,
  tournament: Tournament,
  matches: Match[],
  entry: TournamentEntry
): 'active' | 'eliminated' | 'bye' | 'dropped' {
  // Check if player dropped out (Swiss tournaments)
  if (entry.dropped) {
    return 'dropped'
  }
  
  // For elimination tournaments, check if player is eliminated
  if (tournament.tournamentStructure === 'ELIMINATION') {
    const { losses } = calculateParticipantRecord(playerId, matches)
    return losses > 0 ? 'eliminated' : 'active'
  }
  
  // For Swiss tournaments, players are active unless they dropped
  if (tournament.tournamentStructure === 'SWISS') {
    return 'active'
  }
  
  // Default to active
  return 'active'
}

/**
 * Calculate participant tier based on rating
 */
export function calculateParticipantTier(rating: number): 'diamond' | 'platinum' | 'gold' | 'silver' | 'bronze' {
  if (rating >= 2400) return 'diamond'
  if (rating >= 2000) return 'platinum'
  if (rating >= 1600) return 'gold'
  if (rating >= 1200) return 'silver'
  return 'bronze'
}

/**
 * Calculate match status and properties
 */
export function calculateMatchProperties(match: Match): MatchCalculations {
  return {
    isCompleted: match.status === 'COMPLETED',
    isInProgress: match.status === 'ACTIVE',
    isPending: match.status === 'PENDING',
    hasScores: match.player1Score !== null && match.player2Score !== null
  }
}

/**
 * Get all calculated tournament data
 */
export function calculateTournamentData(
  tournament: Tournament,
  matches: Match[],
  entries: TournamentEntry[]
): TournamentCalculations {
  return {
    currentRound: calculateCurrentRound(tournament, matches),
    completionPercentage: calculateCompletionPercentage(matches),
    isLive: calculateIsLive(tournament),
    participantCount: calculateParticipantCount(entries),
    registrationProgress: calculateRegistrationProgress(entries, tournament.maxPlayers)
  }
}

/**
 * Get all calculated participant data
 */
export function calculateParticipantData(
  playerId: string,
  tournament: Tournament,
  matches: Match[],
  entry: TournamentEntry,
  rating: number
): ParticipantCalculations {
  const { wins, losses } = calculateParticipantRecord(playerId, matches)
  
  return {
    wins,
    losses,
    status: calculateParticipantStatus(playerId, tournament, matches, entry),
    tier: calculateParticipantTier(rating)
  }
}

/**
 * Format tournament date for display
 */
export function formatTournamentDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

/**
 * Format tournament time for display
 */
export function formatTournamentTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(date)
}

/**
 * Check if registration is still open
 */
export function isRegistrationOpen(tournament: Tournament): boolean {
  if (tournament.status !== 'UPCOMING') return false
  if (!tournament.registrationDeadline) return true
  
  const now = new Date()
  const deadline = new Date(tournament.registrationDeadline)
  
  return now < deadline
}

/**
 * Get time until registration deadline
 */
export function getTimeUntilDeadline(tournament: Tournament): string | null {
  if (!tournament.registrationDeadline) return null
  
  const now = new Date()
  const deadline = new Date(tournament.registrationDeadline)
  const timeDiff = deadline.getTime() - now.getTime()
  
  if (timeDiff <= 0) return 'Registration Closed'
  
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) return `${days}d ${hours}h remaining`
  if (hours > 0) return `${hours}h ${minutes}m remaining`
  return `${minutes}m remaining`
}
