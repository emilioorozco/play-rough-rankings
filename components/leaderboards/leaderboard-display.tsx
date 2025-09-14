'use client'

import { trpc } from '@/lib/trpc/client'
import { LeaderboardTable } from './leaderboard-table'
import { PlayerSearch } from './player-search'
import type { ApiLeaderboardData } from '@/lib/types/api'

interface LeaderboardDisplayProps {
  gameId: string
  format?: string
  season?: string
  limit: number
}

export function LeaderboardDisplay({
  gameId,
  format,
  season,
  limit,
}: LeaderboardDisplayProps) {
  // Get leaderboard data
  const { 
    data: leaderboardData, 
    isLoading, 
    error 
  } = trpc.leaderboards.getSeasonal.useQuery(
    {
      gameId,
      season,
      limit,
    },
    { 
      enabled: !!gameId,
      refetchOnWindowFocus: false,
    }
  )

  // Get filtered leaderboard if format is specified
  const { 
    data: filteredData, 
    isLoading: filteredLoading 
  } = trpc.leaderboards.getFiltered.useQuery(
    {
      gameId,
      format: format || undefined,
      limit,
      minTournaments: 1,
    },
    { 
      enabled: !!gameId && !!format,
      refetchOnWindowFocus: false,
    }
  )

  // Use filtered data if format is specified, otherwise use seasonal data
  const displayData = format ? filteredData : leaderboardData
  const displayLoading = format ? filteredLoading : isLoading

  if (!gameId) {
    return (
      <div className="leaderboard-placeholder">
        <div className="placeholder-content">
          <h2>Select a Game</h2>
          <p>Choose a game from the filters to view its leaderboard and rankings.</p>
          <div className="placeholder-features">
            <h3>Available Features:</h3>
            <ul>
              <li>Seasonal rankings with top 10-50 players</li>
              <li>Game and format filtering</li>
              <li>Player statistics and performance metrics</li>
              <li>Historical season data</li>
              <li>Player search and comparison</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  if (displayLoading) {
    return (
      <div className="leaderboard-loading">
        <div className="loading-content">
          <h2>Loading Leaderboard...</h2>
          <p>Fetching the latest rankings and player statistics.</p>
          <div className="loading-spinner" aria-label="Loading"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="leaderboard-error">
        <div className="error-content">
          <h2>Error Loading Leaderboard</h2>
          <p>We encountered an issue while loading the leaderboard data.</p>
          <details>
            <summary>Error Details</summary>
            <pre>{error.message}</pre>
          </details>
          <button 
            onClick={() => window.location.reload()}
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!displayData || displayData.leaderboard.length === 0) {
    return (
      <div className="leaderboard-empty">
        <div className="empty-content">
          <h2>No Rankings Available</h2>
          <p>
            {format 
              ? `No players found for the "${format}" format with the current filters.`
              : 'No players have participated in tournaments for this game yet.'
            }
          </p>
          <div className="empty-suggestions">
            <h3>Suggestions:</h3>
            <ul>
              <li>Try removing the format filter</li>
              <li>Select a different season</li>
              <li>Check back after more tournaments are completed</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="leaderboard-display">
      {/* Header */}
      <div className="leaderboard-header">
        <div className="header-content">
          <h2>
            {displayData.game.name} Leaderboard
            {format && <span className="format-badge">{format}</span>}
          </h2>
          <div className="header-meta">
            <span className="season-info">
              Season: {(displayData as ApiLeaderboardData)?.season || season || 'Current'}
            </span>
            <span className="player-count">
              {displayData.totalPlayers} players ranked
            </span>
          </div>
        </div>
        
        {/* Player Search */}
        <div className="header-actions">
          <PlayerSearch gameId={gameId} />
        </div>
      </div>

      {/* Season Info */}
      {(displayData as ApiLeaderboardData)?.seasonStart && (displayData as ApiLeaderboardData)?.seasonEnd && (
        <div className="season-info-card">
          <h3>Season Information</h3>
          <div className="season-details">
            <div className="season-period">
              <span className="label">Period:</span>
              <span className="value">
                {new Date((displayData as ApiLeaderboardData)?.seasonStart || '').toLocaleDateString()} - {' '}
                {new Date((displayData as ApiLeaderboardData)?.seasonEnd || '').toLocaleDateString()}
              </span>
            </div>
            {format && (
              <div className="format-info">
                <span className="label">Format:</span>
                <span className="value">{format}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <LeaderboardTable
        leaderboard={displayData.leaderboard}
        gameId={gameId}
        season={(displayData as ApiLeaderboardData)?.season || season}
      />

      {/* Footer Info */}
      <div className="leaderboard-footer">
        <div className="footer-stats">
          <div className="stat-item">
            <span className="label">Total Players:</span>
            <span className="value">{displayData.totalPlayers}</span>
          </div>
          <div className="stat-item">
            <span className="label">Showing:</span>
            <span className="value">Top {displayData.leaderboard.length}</span>
          </div>
          {(displayData as ApiLeaderboardData)?.cached && (
            <div className="stat-item">
              <span className="label">Data:</span>
              <span className="value cached">Cached</span>
            </div>
          )}
        </div>
        
        <div className="footer-note">
          <p>
            Rankings are updated after each tournament completion. 
            Players must have participated in at least one tournament to appear on the leaderboard.
          </p>
        </div>
      </div>
    </div>
  )
}