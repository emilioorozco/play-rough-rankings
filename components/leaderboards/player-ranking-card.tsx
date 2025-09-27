'use client'
// Link temporarily removed until player route is implemented

import type { ApiLeaderboardEntry } from '@/lib/types/api'

interface PlayerRankingCardProps {
  player: ApiLeaderboardEntry
  gameId: string
  season?: string
}

export function PlayerRankingCard({ player }: PlayerRankingCardProps) {
  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return 'rank-badge gold'
    if (rank === 2) return 'rank-badge silver'
    if (rank === 3) return 'rank-badge bronze'
    if (rank <= 10) return 'rank-badge top-10'
    return 'rank-badge'
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    if (rank <= 10) return '🏆'
    return '🎯'
  }

  const getPerformanceColor = (winRate: number) => {
    if (winRate >= 0.7) return 'excellent'
    if (winRate >= 0.6) return 'good'
    if (winRate >= 0.5) return 'average'
    return 'below-average'
  }

  return (
    <div className="player-ranking-card">
      {/* Card Header */}
      <div className="card-header">
        <div className="rank-section">
          <span className={getRankBadgeClass(player.rank)}>
            {getRankIcon(player.rank)} #{player.rank}
          </span>
        </div>
        <div className="player-section">
          <span
            role="link"
            tabIndex={0}
            className="player-name cursor-pointer"
          >
            {player.displayName}
          </span>
          <div className="rating-display">
            <span className="rating-label">Rating:</span>
            <span className="rating-value">{player.currentRating}</span>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="card-body">
        {/* Performance Metrics */}
        <div className="performance-section">
          <div className="metric-group">
            <div className="primary-metric">
              <span className="metric-label">Win Rate</span>
              <span className={`metric-value win-rate ${getPerformanceColor(player.performance.winRate)}`}>
                {(player.performance.winRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="secondary-metric">
              <span className="metric-label">Record</span>
              <span className="metric-value record">
                {(player.seasonalStats?.wins || player.periodStats?.wins || 0)}W-{(player.seasonalStats?.losses || player.periodStats?.losses || 0)}L
              </span>
            </div>
          </div>
        </div>

        {/* Tournament Stats */}
        <div className="tournament-stats">
          <div className="stat-row">
            <div className="stat-item">
              <span className="stat-icon">🏟️</span>
              <div className="stat-content">
                <span className="stat-value">{player.seasonalStats?.tournaments || player.periodStats?.tournaments || 0}</span>
                <span className="stat-label">Tournaments</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">⭐</span>
              <div className="stat-content">
                <span className="stat-value">{player.seasonalStats?.points || 0}</span>
                <span className="stat-label">Points</span>
              </div>
            </div>
          </div>
          
          {player.bestFinish && (
            <div className="stat-row">
              <div className="stat-item">
                <span className="stat-icon">🎖️</span>
                <div className="stat-content">
                  <span className="stat-value">#{player.bestFinish}</span>
                  <span className="stat-label">Best Finish</span>
                </div>
              </div>
              {player.totalEarnings > 0 && (
                <div className="stat-item">
                  <span className="stat-icon">💰</span>
                  <div className="stat-content">
                    <span className="stat-value">${player.totalEarnings}</span>
                    <span className="stat-label">Earnings</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="card-footer">
        <div className="additional-stats">
          <div className="stat-chip">
            <span className="chip-label">Total Games:</span>
            <span className="chip-value">{player.performance.totalGames}</span>
          </div>
          {player.performance.winLossRatio !== Infinity && (
            <div className="stat-chip">
              <span className="chip-label">W/L Ratio:</span>
              <span className="chip-value">
                {player.performance.winLossRatio.toFixed(2)}
              </span>
            </div>
          )}
        </div>
        
        <div className="card-actions">
          <span
            role="link"
            tabIndex={0}
            className="view-profile-btn cursor-pointer"
          >
            View Profile
          </span>
        </div>
      </div>
    </div>
  )
}