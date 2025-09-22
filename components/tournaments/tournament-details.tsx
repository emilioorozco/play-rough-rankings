'use client'

import Link from 'next/link'
import { formatDate, formatDateTime, getRelativeTimeString } from '@/lib/utils/date-formatting'

import type { ApiTournament } from '@/lib/types/api'

type Tournament = ApiTournament

interface TournamentDetailsProps {
  tournament: Tournament
}

export function TournamentDetails({ tournament }: TournamentDetailsProps) {
  const tournamentDate = new Date(tournament.date)
  const isUpcoming = tournament.status === 'UPCOMING'
  const isActive = tournament.status === 'ACTIVE'
  const isCompleted = tournament.status === 'COMPLETED'

  const getStatusColor = () => {
    switch (tournament.status) {
      case 'UPCOMING': return 'status-upcoming'
      case 'ACTIVE': return 'status-active'
      case 'COMPLETED': return 'status-completed'
      default: return ''
    }
  }

  const getLevelBadge = () => {
    if (!tournament.tournamentLevel) return null
    
    const levelColors = {
      'LOCAL': 'level-local',
      'REGIONAL': 'level-regional', 
      'NATIONAL': 'level-national',
      'INTERNATIONAL': 'level-international'
    }

    return (
      <span className={`tournament-level ${levelColors[tournament.tournamentLevel as keyof typeof levelColors] || 'level-local'}`}>
        {tournament.tournamentLevel}
      </span>
    )
  }

  // Group matches by round
  const matchesByRound = tournament.matches?.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = []
    }
    acc[match.round].push(match)
    return acc
  }, {} as Record<number, typeof tournament.matches>) || {}

  const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b)

  return (
    <div className="tournament-details">
      {/* Tournament Header */}
      <header className="tournament-header">
        <div className="tournament-title-section">
          <h1 className="tournament-name">{tournament.name}</h1>
          <div className="tournament-badges">
            <span className={`tournament-status ${getStatusColor()}`}>
              {tournament.status}
            </span>
            {getLevelBadge()}
          </div>
        </div>
        
        <div className="tournament-meta-info">
          <div className="meta-item">
            <span className="meta-label">Game:</span>
            <span className="meta-value">
              {tournament.game.name} ({tournament.format})
            </span>
          </div>
          
          <div className="meta-item">
            <span className="meta-label">Date:</span>
            <span className="meta-value">
              {formatDate(tournamentDate)}
              {(isUpcoming || isActive) && (
                <span className="relative-time">
                  {' '}({getRelativeTimeString(tournamentDate)})
                </span>
              )}
            </span>
          </div>
          
          {(isUpcoming || isActive) && (
            <div className="meta-item">
              <span className="meta-label">Time:</span>
              <span className="meta-value">{formatDateTime(tournamentDate)}</span>
            </div>
          )}
        </div>
      </header>

      {/* Tournament Information */}
      <section className="tournament-info-section">
        <h2>Tournament Information</h2>
        
        <div className="info-grid">
          <div className="info-card">
            <h3>Venue</h3>
            <div className="venue-info">
              <h4>{tournament.store.name}</h4>
              <p className="venue-address">{tournament.store.address}</p>
              <p className="venue-location">
                {tournament.store.city}, {tournament.store.state}
              </p>
              {tournament.store.website && (
                <p className="venue-website">
                  <a href={tournament.store.website} target="_blank" rel="noopener noreferrer">
                    Visit Website
                  </a>
                </p>
              )}
              {tournament.store.contactEmail && (
                <p className="venue-contact">
                  <a href={`mailto:${tournament.store.contactEmail}`}>
                    Contact Store
                  </a>
                </p>
              )}
            </div>
          </div>

          <div className="info-card">
            <h3>Details</h3>
            <div className="tournament-details-info">
              {tournament.maxPlayers && (
                <div className="detail-row">
                  <span className="detail-label">Max Players:</span>
                  <span className="detail-value">{tournament.maxPlayers}</span>
                </div>
              )}
              
              {tournament.entryFee && (
                <div className="detail-row">
                  <span className="detail-label">Entry Fee:</span>
                  <span className="detail-value">${tournament.entryFee}</span>
                </div>
              )}
              
              {tournament.prizePool && (
                <div className="detail-row">
                  <span className="detail-label">Prize Pool:</span>
                  <span className="detail-value">{tournament.prizePool}</span>
                </div>
              )}

              <div className="detail-row">
                <span className="detail-label">Matches:</span>
                <span className="detail-value">{tournament.matchCount}</span>
              </div>

              {tournament.organizer.name && (
                <div className="detail-row">
                  <span className="detail-label">Organizer:</span>
                  <span className="detail-value">{tournament.organizer.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Participants */}
      {tournament.participants && tournament.participants.length > 0 && (
        <section className="participants-section">
          <h2>Participants ({tournament.participants.length})</h2>
          
          <div className="participants-grid">
            {tournament.participants.map((participant) => (
              <div key={participant.id} className="participant-card">
                <div className="participant-info">
                  <h4 className="participant-name">
                    {participant.isPublic ? (
                      <Link href={`/players/${participant.id}` as `/players/${string}`}>
                        {participant.displayName}
                      </Link>
                    ) : (
                      participant.displayName
                    )}
                  </h4>
                  
                  {participant.gameStats && participant.isPublic && (
                    <div className="participant-stats">
                      <div className="stat-item">
                        <span className="stat-label">Rating:</span>
                        <span className="stat-value">
                          {participant.gameStats && typeof participant.gameStats === 'object' 
                            ? (participant.gameStats as Record<string, unknown>).currentRating || 'N/A'
                            : 'N/A'
                          }
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Record:</span>
                        <span className="stat-value">
                          {participant.gameStats && typeof participant.gameStats === 'object'
                            ? (() => {
                                const stats = participant.gameStats as Record<string, unknown>
                                const seasonalStats = stats.seasonalStats as Record<string, unknown> | undefined
                                const wins = seasonalStats?.wins || 0
                                const losses = seasonalStats?.losses || 0
                                return `${wins}W-${losses}L`
                              })()
                            : '0W-0L'
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Matches */}
      {tournament.matches && tournament.matches.length > 0 && (
        <section className="matches-section">
          <h2>Matches</h2>
          
          <div className="rounds-container">
            {rounds.map((roundNumber) => (
              <div key={roundNumber} className="round-section">
                <h3 className="round-title">Round {roundNumber}</h3>
                
                <div className="matches-grid">
                  {matchesByRound[roundNumber].map((match) => (
                    <div key={match.id} className={`match-card ${match.status.toLowerCase()}`}>
                      <div className="match-header">
                        {match.table && (
                          <span className="table-number">Table {match.table}</span>
                        )}
                        <span className={`match-status ${match.status.toLowerCase()}`}>
                          {match.status}
                        </span>
                      </div>
                      
                      <div className="match-players">
                        <div className={`player ${match.winner?.id === match.player1.id ? 'winner' : ''}`}>
                          <span className="player-name">{match.player1.displayName}</span>
                          {match.winner?.id === match.player1.id && (
                            <span className="winner-indicator">W</span>
                          )}
                        </div>
                        
                        <div className="vs-divider">vs</div>
                        
                        <div className={`player ${match.winner?.id === match.player2.id ? 'winner' : ''}`}>
                          <span className="player-name">{match.player2.displayName}</span>
                          {match.winner?.id === match.player2.id && (
                            <span className="winner-indicator">W</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty States */}
      {(!tournament.participants || tournament.participants.length === 0) && (
        <section className="empty-participants">
          <h2>Participants</h2>
          <p>No participants registered yet.</p>
        </section>
      )}

      {(!tournament.matches || tournament.matches.length === 0) && (
        <section className="empty-matches">
          <h2>Matches</h2>
          <p>No matches scheduled yet.</p>
        </section>
      )}
    </div>
  )
}