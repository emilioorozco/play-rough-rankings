'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import type { ApiGame, SafeSeasonalStats, GameStatsMetadata } from '@/lib/types/api'

interface PlayerStatsDisplayProps {
  playerId: string
  games: ApiGame[]
}

// Helper function to safely access seasonal stats
const getSeasonalStats = (seasonalStats: unknown): SafeSeasonalStats => {
  if (!seasonalStats || typeof seasonalStats !== 'object') {
    return { wins: 0, losses: 0, tournaments: 0, points: 0 }
  }
  
  const stats = seasonalStats as Record<string, unknown>
  return {
    wins: (typeof stats.wins === 'number' ? stats.wins : 0),
    losses: (typeof stats.losses === 'number' ? stats.losses : 0),
    tournaments: (typeof stats.tournaments === 'number' ? stats.tournaments : 0),
    points: (typeof stats.points === 'number' ? stats.points : 0),
  }
}

export function PlayerStatsDisplay({ playerId, games }: PlayerStatsDisplayProps) {
  const [selectedGameId, setSelectedGameId] = useState<string>(games[0]?.id || '')
  const [selectedFormat, setSelectedFormat] = useState<string>('')

  // Get game stats for the selected game
  const { data: gameStats, isLoading: statsLoading } = trpc.players.getGameStats.useQuery(
    {
      playerId,
      gameId: selectedGameId,
    },
    {
      enabled: !!selectedGameId && !!playerId,
    }
  )

  // Get available formats for the selected game (placeholder for now)
  const availableFormats = ['Standard', 'Expanded', 'Legacy', 'Modern']

  const selectedGame = games.find(game => game.id === selectedGameId)

  if (games.length === 0) {
    return (
      <div className="stats-display">
        <h3>Game Statistics</h3>
        <div className="no-games-message">
          <p className="text-muted">No games are currently available.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="stats-display">
      <header className="stats-header mb-4">
        <h3>Game Statistics</h3>
        <p>View your performance across different games and formats.</p>
      </header>

      {/* Game and Format Selection */}
      <div className="stats-filters mb-4">
        <div className="grid">
          <div className="filter-group">
            <label htmlFor="game-select">Select Game</label>
            <select
              id="game-select"
              value={selectedGameId}
              onChange={(e) => {
                setSelectedGameId(e.target.value)
                setSelectedFormat('') // Reset format when game changes
              }}
            >
              <option value="">Choose a game...</option>
              {games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name.replace('_', ' ')} ({game.shortName})
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="format-select">Format (Optional)</label>
            <select
              id="format-select"
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              disabled={!selectedGameId}
            >
              <option value="">All Formats</option>
              {availableFormats.map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Content */}
      {!selectedGameId ? (
        <div className="select-game-prompt">
          <p className="text-muted">Please select a game to view your statistics.</p>
        </div>
      ) : statsLoading ? (
        <div className="loading-stats">
          <p>Loading statistics...</p>
        </div>
      ) : gameStats ? (
        <div className="game-stats-content">
          {(() => {
            const stats = getSeasonalStats(gameStats.seasonalStats)
            return (
              <>
                {/* Current Rating and Rank */}
                <div className="rating-section mb-4">
                  <div className="grid">
                    <div className="rating-card">
                      <h4>Current Rating</h4>
                      <p className="rating-number">{gameStats.currentRating}</p>
                      <small>ELO Rating</small>
                    </div>
                    <div className="rating-card">
                      <h4>Best Finish</h4>
                      <p className="rating-number">
                        {gameStats.bestFinish ? `#${gameStats.bestFinish}` : '--'}
                      </p>
                      <small>Tournament placement</small>
                    </div>
                    <div className="rating-card">
                      <h4>Total Earnings</h4>
                      <p className="rating-number">
                        ${gameStats.totalEarnings.toFixed(2)}
                      </p>
                      <small>Prize money</small>
                    </div>
                  </div>
                </div>

                {/* Seasonal Statistics */}
                <div className="seasonal-stats mb-4">
                  <h4>Current Season Performance</h4>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <label>Wins</label>
                      <span className="stat-value wins">{stats.wins}</span>
                    </div>
                    <div className="stat-item">
                      <label>Losses</label>
                      <span className="stat-value losses">{stats.losses}</span>
                    </div>
                    <div className="stat-item">
                      <label>Win Rate</label>
                      <span className="stat-value win-rate">
                        {stats.wins + stats.losses > 0
                          ? `${Math.round((stats.wins / (stats.wins + stats.losses)) * 100)}%`
                          : '0%'
                        }
                      </span>
                    </div>
                    <div className="stat-item">
                      <label>Tournaments</label>
                      <span className="stat-value tournaments">{stats.tournaments}</span>
                    </div>
                    <div className="stat-item">
                      <label>Points</label>
                      <span className="stat-value points">{stats.points}</span>
                    </div>
                    <div className="stat-item">
                      <label>Games Played</label>
                      <span className="stat-value games">
                        {stats.wins + stats.losses}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance Breakdown */}
                <div className="performance-breakdown">
                  <h4>Performance Analysis</h4>
                  <div className="breakdown-content">
                    {stats.tournaments > 0 ? (
                      <div className="performance-metrics">
                        <div className="metric">
                          <label>Average Games per Tournament</label>
                          <span>
                            {Math.round(
                              (stats.wins + stats.losses) / 
                              stats.tournaments * 10
                            ) / 10}
                          </span>
                        </div>
                        <div className="metric">
                          <label>Points per Tournament</label>
                          <span>
                            {Math.round(stats.points / stats.tournaments * 10) / 10}
                          </span>
                        </div>
                        <div className="metric">
                          <label>Win/Loss Ratio</label>
                          <span>
                            {stats.losses > 0
                              ? (stats.wins / stats.losses).toFixed(2)
                              : stats.wins > 0 ? '∞' : '0'
                            }
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="no-tournaments">
                        <p className="text-muted">
                          No tournament data available for {selectedGame?.name.replace('_', ' ')} 
                          {selectedFormat && ` in ${selectedFormat} format`}.
                        </p>
                        <p className="text-muted">
                          Participate in tournaments to see your performance statistics here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )
          })()}

          {/* Game-Specific Metadata */}
          {gameStats.metadata && typeof gameStats.metadata === 'object' && gameStats.metadata !== null && Object.keys(gameStats.metadata).length > 0 && (
            <div className="game-metadata mt-4">
              <h4>Additional Statistics</h4>
              <div className="metadata-grid">
                {Object.entries(gameStats.metadata as GameStatsMetadata).map(([key, value]) => (
                  <div key={key} className="metadata-item">
                    <label>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</label>
                    <span>{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="no-stats">
          <p className="text-muted">
            No statistics available for {selectedGame?.name.replace('_', ' ')}
            {selectedFormat && ` in ${selectedFormat} format`}.
          </p>
          <p className="text-muted">
            Start participating in tournaments to build your statistics!
          </p>
        </div>
      )}
    </div>
  )
}