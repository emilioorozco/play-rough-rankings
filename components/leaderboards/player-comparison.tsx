'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { PlayerSearch } from './player-search'
import type { TRPCQueryResult, ApiPlayerGameStats } from '@/lib/types/api'

interface ComparisonPlayer {
  playerId: string
  displayName: string
  currentRating: number
  seasonalStats: {
    wins: number
    losses: number
    tournaments: number
    points: number
  }
  performance: {
    winRate: number
    totalGames: number
    winLossRatio: number
  }
  bestFinish?: number
  totalEarnings: number
}

interface PlayerComparisonProps {
  gameId: string
}

export function PlayerComparison({ gameId }: PlayerComparisonProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [comparisonData, setComparisonData] = useState<ComparisonPlayer[]>([])

  // Get player stats for comparison
  const playerQueries: TRPCQueryResult<ApiPlayerGameStats>[] = selectedPlayers.map(playerId => 
    trpc.players.getGameStats.useQuery(
      { playerId, gameId },
      { enabled: !!playerId }
    )
  )

  const handlePlayerSelect = (playerId: string) => {
    if (selectedPlayers.includes(playerId)) {
      setSelectedPlayers(prev => prev.filter(id => id !== playerId))
    } else if (selectedPlayers.length < 4) {
      setSelectedPlayers(prev => [...prev, playerId])
    }
  }

  const handleClearComparison = () => {
    setSelectedPlayers([])
    setComparisonData([])
  }

  const getComparisonMetrics = () => {
    if (comparisonData.length < 2) return null

    const metrics = {
      highestRating: Math.max(...comparisonData.map(p => p.currentRating)),
      lowestRating: Math.min(...comparisonData.map(p => p.currentRating)),
      bestWinRate: Math.max(...comparisonData.map(p => p.performance.winRate)),
      worstWinRate: Math.min(...comparisonData.map(p => p.performance.winRate)),
      mostTournaments: Math.max(...comparisonData.map(p => p.seasonalStats.tournaments)),
      mostPoints: Math.max(...comparisonData.map(p => p.seasonalStats.points)),
    }

    return metrics
  }

  const getPlayerRank = (playerData: Record<string, unknown>, metric: string) => {
    // Create a simplified comparison based on the current queries
    const currentPlayers = playerQueries
      .map((query, index) => ({
        playerId: selectedPlayers[index],
        data: query.data
      }))
      .filter(p => p.data)

    const sortedPlayers = [...currentPlayers].sort((a, b) => {
      const aData = a.data!
      const bData = b.data!
      
      switch (metric) {
        case 'currentRating':
          return (bData.currentRating as number) - (aData.currentRating as number)
        case 'winRate': {
          const aWins = ((aData.seasonalStats as Record<string, unknown>)?.wins as number) || 0
          const aLosses = ((aData.seasonalStats as Record<string, unknown>)?.losses as number) || 0
          const bWins = ((bData.seasonalStats as Record<string, unknown>)?.wins as number) || 0
          const bLosses = ((bData.seasonalStats as Record<string, unknown>)?.losses as number) || 0
          const aWinRate = aWins / Math.max(1, aWins + aLosses)
          const bWinRate = bWins / Math.max(1, bWins + bLosses)
          return bWinRate - aWinRate
        }
        case 'tournaments':
          return ((bData.seasonalStats as Record<string, unknown>)?.tournaments as number || 0) - 
                 ((aData.seasonalStats as Record<string, unknown>)?.tournaments as number || 0)
        case 'points':
          return ((bData.seasonalStats as Record<string, unknown>)?.points as number || 0) - 
                 ((aData.seasonalStats as Record<string, unknown>)?.points as number || 0)
        default:
          return 0
      }
    })
    
    return sortedPlayers.findIndex(p => p.data === playerData) + 1
  }

  const metrics = getComparisonMetrics()

  return (
    <div className="player-comparison">
      <div className="comparison-header">
        <h3>Player Comparison</h3>
        <p>Compare up to 4 players side by side</p>
      </div>

      {/* Player Selection */}
      <div className="player-selection">
        <div className="selection-header">
          <h4>Select Players to Compare</h4>
          {selectedPlayers.length > 0 && (
            <button
              onClick={handleClearComparison}
              className="clear-comparison-btn"
            >
              Clear All ({selectedPlayers.length})
            </button>
          )}
        </div>

        <div className="search-section">
          <PlayerSearch 
            gameId={gameId}
            onPlayerSelect={handlePlayerSelect}
            selectedPlayers={selectedPlayers}
            maxSelections={4}
          />
        </div>

        {selectedPlayers.length > 0 && (
          <div className="selected-players">
            <h5>Selected Players ({selectedPlayers.length}/4)</h5>
            <div className="selected-list">
              {selectedPlayers.map((playerId, index) => {
                const query = playerQueries[index]
                const playerData = query.data

                return (
                  <div key={playerId} className="selected-player">
                    <div className="player-info">
                      <span className="player-name">
                        {(playerData as ApiPlayerGameStats)?.player?.displayName || 'Loading...'}
                      </span>
                      {playerData && (
                        <span className="player-rating">
                          Rating: {playerData.currentRating as number}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handlePlayerSelect(playerId)}
                      className="remove-player-btn"
                      aria-label="Remove player"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Comparison Results */}
      {selectedPlayers.length >= 2 && (
        <div className="comparison-results">
          <div className="results-header">
            <h4>Comparison Results</h4>
            <p>Comparing {selectedPlayers.length} players</p>
          </div>

          {/* Comparison Table */}
          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  {playerQueries.map((query, index) => (
                    <th key={selectedPlayers[index]}>
                      {query.data?.player?.displayName || 'Loading...'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="metric-label">Rating</td>
                  {playerQueries.map((query, index) => (
                    <td key={selectedPlayers[index]} className="metric-value">
                      {query.data ? (
                        <div className="value-with-rank">
                          <span className="value">{query.data.currentRating as number}</span>
                          <span className="rank">#{getPlayerRank(query.data, 'currentRating')}</span>
                        </div>
                      ) : (
                        'Loading...'
                      )}
                    </td>
                  ))}
                </tr>
                
                <tr>
                  <td className="metric-label">Win Rate</td>
                  {playerQueries.map((query, index) => (
                    <td key={selectedPlayers[index]} className="metric-value">
                      {query.data ? (
                        <div className="value-with-rank">
                          <span className="value">
                            {(((query.data.seasonalStats as Record<string, unknown>)?.wins as number || 0) / 
                              Math.max(1, ((query.data.seasonalStats as Record<string, unknown>)?.wins as number || 0) + 
                              ((query.data.seasonalStats as Record<string, unknown>)?.losses as number || 0)) * 100).toFixed(1)}%
                          </span>
                          <span className="rank">#{getPlayerRank(query.data, 'winRate')}</span>
                        </div>
                      ) : (
                        'Loading...'
                      )}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="metric-label">Record</td>
                  {playerQueries.map((query, index) => (
                    <td key={selectedPlayers[index]} className="metric-value">
                      {query.data ? (
                        <span className="record-value">
                          {(query.data.seasonalStats as Record<string, unknown>)?.wins as number || 0}W-
                          {(query.data.seasonalStats as Record<string, unknown>)?.losses as number || 0}L
                        </span>
                      ) : (
                        'Loading...'
                      )}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="metric-label">Tournaments</td>
                  {playerQueries.map((query, index) => (
                    <td key={selectedPlayers[index]} className="metric-value">
                      {query.data ? (
                        <div className="value-with-rank">
                          <span className="value">
                            {(query.data.seasonalStats as Record<string, unknown>)?.tournaments as number || 0}
                          </span>
                          <span className="rank">#{getPlayerRank(query.data, 'tournaments')}</span>
                        </div>
                      ) : (
                        'Loading...'
                      )}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="metric-label">Points</td>
                  {playerQueries.map((query, index) => (
                    <td key={selectedPlayers[index]} className="metric-value">
                      {query.data ? (
                        <div className="value-with-rank">
                          <span className="value">
                            {(query.data.seasonalStats as Record<string, unknown>)?.points as number || 0}
                          </span>
                          <span className="rank">#{getPlayerRank(query.data, 'points')}</span>
                        </div>
                      ) : (
                        'Loading...'
                      )}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="metric-label">Best Finish</td>
                  {playerQueries.map((query, index) => (
                    <td key={selectedPlayers[index]} className="metric-value">
                      {query.data ? (
                        <span className="value">
                          {(query.data.bestFinish as number) ? `#${query.data.bestFinish}` : '-'}
                        </span>
                      ) : (
                        'Loading...'
                      )}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="metric-label">Total Earnings</td>
                  {playerQueries.map((query, index) => (
                    <td key={selectedPlayers[index]} className="metric-value">
                      {query.data ? (
                        <span className="value">
                          ${(query.data.totalEarnings as number) || 0}
                        </span>
                      ) : (
                        'Loading...'
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Comparison Summary */}
          {metrics && (
            <div className="comparison-summary">
              <h5>Comparison Highlights</h5>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="label">Rating Range:</span>
                  <span className="value">
                    {metrics.lowestRating} - {metrics.highestRating}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="label">Win Rate Range:</span>
                  <span className="value">
                    {(metrics.worstWinRate * 100).toFixed(1)}% - {(metrics.bestWinRate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="summary-item">
                  <span className="label">Most Active:</span>
                  <span className="value">
                    {metrics.mostTournaments} tournaments
                  </span>
                </div>
                <div className="summary-item">
                  <span className="label">Highest Points:</span>
                  <span className="value">
                    {metrics.mostPoints} points
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="comparison-help">
        <h5>How to Use Player Comparison</h5>
        <ul>
          <li>Search for players using the search box above</li>
          <li>Click on a player from search results to add them to comparison</li>
          <li>Compare up to 4 players at once</li>
          <li>Rankings show how each player compares within your selection</li>
          <li>Click the ✕ button to remove a player from comparison</li>
        </ul>
      </div>
    </div>
  )
}