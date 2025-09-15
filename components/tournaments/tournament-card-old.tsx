'use client'

import Link from 'next/link'
import { formatDate, formatDateTime } from '@/lib/utils/date-formatting'
import { useActivity } from '@/components/activity-provider'
import { useViewTransitions } from '@/hooks/use-view-transitions'
import { useState, useEffect } from 'react'

import type { ApiTournament } from '@/lib/types/api'

type Tournament = ApiTournament

interface TournamentCardProps {
  tournament: Tournament
}

export function TournamentCard({ tournament }: TournamentCardProps) {
  const { setViewing } = useActivity()
  const { transitionToTournament } = useViewTransitions()
  const [isHovered, setIsHovered] = useState(false)
  const [viewerCount, setViewerCount] = useState(1) // Initialize with stable value
  const [mounted, setMounted] = useState(false)
  
  // Set random viewer count after component mounts to prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
    setViewerCount(Math.floor(Math.random() * 5) + 1)
  }, [])
  
  const tournamentDate = new Date(tournament.date)
  const isUpcoming = tournament.status === 'UPCOMING'
  const isActive = tournament.status === 'ACTIVE'
  const isCompleted = tournament.status === 'COMPLETED'

  const handleMouseEnter = () => {
    setIsHovered(true)
    setViewing(`Tournament: ${tournament.name}`)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    setViewing()
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    transitionToTournament(tournament.id)
  }

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

  return (
    <article 
      className={`tournament-card ${mounted && isActive && viewerCount > 2 ? 'has-viewers' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="tournament-card-header">
        <div className="tournament-title-section">
          <h3 className="tournament-name">
            <Link href={`/tournaments/${tournament.id}`} onClick={handleClick}>
              {tournament.name}
            </Link>
          </h3>
          <div className="tournament-badges">
            <span className={`tournament-status ${getStatusColor()}`}>
              {tournament.status}
            </span>
            {getLevelBadge()}
          </div>
        </div>
      </div>

      <div className="tournament-card-body">
        <div className="tournament-meta">
          <div className="tournament-game">
            <strong>{tournament.game.name}</strong>
            <span className="game-format">({tournament.format})</span>
          </div>
          
          <div className="tournament-venue">
            <span className="store-name">{tournament.store.name}</span>
            <span className="store-location">
              {tournament.store.city}, {tournament.store.state}
            </span>
          </div>

          <div className="tournament-datetime">
            <time dateTime={tournamentDate.toISOString()}>
              {isUpcoming || isActive ? (
                <>
                  <span className="date">{formatDate(tournamentDate)}</span>
                  <span className="time">{formatDateTime(tournamentDate)}</span>
                </>
              ) : (
                <span className="date">{formatDate(tournamentDate)}</span>
              )}
            </time>
          </div>
        </div>

        <div className="tournament-details">
          {tournament.maxPlayers && (
            <div className="detail-item">
              <span className="detail-label">Max Players:</span>
              <span className="detail-value">{tournament.maxPlayers}</span>
            </div>
          )}
          
          {tournament.entryFee && (
            <div className="detail-item">
              <span className="detail-label">Entry Fee:</span>
              <span className="detail-value">${tournament.entryFee}</span>
            </div>
          )}
          
          {tournament.prizePool && (
            <div className="detail-item">
              <span className="detail-label">Prize Pool:</span>
              <span className="detail-value">{tournament.prizePool}</span>
            </div>
          )}

          {tournament.matchCount > 0 && (
            <div className="detail-item">
              <span className="detail-label">Matches:</span>
              <span className="detail-value">{tournament.matchCount}</span>
            </div>
          )}
        </div>

        {tournament.organizer.displayName && (
          <div className="tournament-organizer">
            <span className="organizer-label">Organized by:</span>
            <span className="organizer-name">{tournament.organizer.displayName}</span>
          </div>
        )}
      </div>

      {/* Show live activity indicators for active tournaments */}
      {mounted && isActive && isHovered && (
        <div className="tournament-viewers">
          <div className="viewer-count">
            <span className="viewer-icon">👁</span>
            <span>{viewerCount} viewing</span>
          </div>
          <div className="live-indicator">
            <div className="pulse-dot"></div>
            <span>LIVE</span>
          </div>
        </div>
      )}

      <div className="tournament-card-footer">
        <Link 
          href={`/tournaments/${tournament.id}`}
          className="view-details-btn"
          onClick={handleClick}
        >
          View Details
        </Link>
      </div>
    </article>
  )
}