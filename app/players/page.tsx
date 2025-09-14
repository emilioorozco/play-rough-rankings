'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
// import { PlayerSearch } from '@/components/leaderboards/player-search'
import { PlayerComparison } from '@/components/leaderboards/player-comparison'
import Link from 'next/link'

export default function PlayersPage() {
  const [selectedGameId, setSelectedGameId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'search' | 'compare'>('search')

  // Get available games
  const { data: games, isLoading: gamesLoading } = trpc.games.list.useQuery({
    includeInactive: false,
  })

  // Search for players
  const { data: searchResults, isLoading: searchLoading } = trpc.players.searchPlayers.useQuery(
    {
      query: searchQuery,
      gameId: selectedGameId || undefined,
      limit: 20,
    },
    {
      enabled: searchQuery.length >= 2,
      refetchOnWindowFocus: false,
    }
  )

  const getPlayerRating = (player: Record<string, unknown>, gameId?: string) => {
    if (!gameId) {
      // Return highest rating across all games
      const ratings = (player.gameStats as Array<Record<string, unknown>>)?.map((stat: Record<string, unknown>) => stat.currentRating as number) || [1200]
      return Math.max(...ratings)
    }
    
    const gameStats = (player.gameStats as Array<Record<string, unknown>>)?.find((stat: Record<string, unknown>) => stat.gameId === gameId)
    return (gameStats?.currentRating as number) || 1200
  }

  const getPlayerStats = (player: Record<string, unknown>, gameId?: string) => {
    if (!gameId) {
      // Aggregate stats across all games
      const allStats = (player.gameStats as Array<Record<string, unknown>>) || []
      return allStats.reduce((acc: Record<string, number>, stat: Record<string, unknown>) => {
        const seasonalStats = stat.seasonalStats as Record<string, unknown>
        return {
          wins: acc.wins + ((seasonalStats?.wins as number) || 0),
          losses: acc.losses + ((seasonalStats?.losses as number) || 0),
          tournaments: acc.tournaments + ((seasonalStats?.tournaments as number) || 0),
        }
      }, { wins: 0, losses: 0, tournaments: 0 })
    }
    
    const gameStats = (player.gameStats as Array<Record<string, unknown>>)?.find((stat: Record<string, unknown>) => stat.gameId === gameId)
    if (!gameStats) return null
    
    const stats = gameStats.seasonalStats as Record<string, unknown>
    return {
      wins: (stats?.wins as number) || 0,
      losses: (stats?.losses as number) || 0,
      tournaments: (stats?.tournaments as number) || 0,
    }
  }

  return (
    <div className="container">
      <div className="hero-section">
        <h1>Player Directory</h1>
        <p>Search for players, view profiles, and compare performance across games</p>
      </div>

      {/* Tab Navigation */}
      <div className="players-tabs">
        <div className="tab-list">
          <button
            className={`tab-button ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <span className="tab-icon">🔍</span>
            <span className="tab-label">Search Players</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'compare' ? 'active' : ''}`}
            onClick={() => setActiveTab('compare')}
          >
            <span className="tab-icon">⚖️</span>
            <span className="tab-label">Compare Players</span>
          </button>
        </div>
      </div>

      {/* Game Filter */}
      <div className="game-filter-section">
        <div className="filter-group">
          <label htmlFor="game-select">Filter by Game (Optional)</label>
          {gamesLoading ? (
            <select disabled>
              <option>Loading games...</option>
            </select>
          ) : (
            <select
              id="game-select"
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
            >
              <option value="">All Games</option>
              {games?.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name} ({game.playerCount} players)
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'search' && (
          <div className="search-tab">
            <div className="search-section">
              <h2>Search Players</h2>
              <div className="search-input-section">
                <input
                  type="text"
                  placeholder="Enter player name to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="main-search-input"
                />
                <small className="search-help">
                  Type at least 2 characters to search. Results will be filtered by the selected game if specified.
                </small>
              </div>

              {/* Search Results */}
              <div className="search-results-section">
                {searchQuery.length < 2 ? (
                  <div className="search-prompt">
                    <h3>Start Searching</h3>
                    <p>Enter a player name above to find players and view their profiles.</p>
                    <div className="search-features">
                      <h4>What you can do:</h4>
                      <ul>
                        <li>Search by player display name or username</li>
                        <li>Filter results by specific games</li>
                        <li>View detailed player profiles and statistics</li>
                        <li>See tournament history and performance metrics</li>
                      </ul>
                    </div>
                  </div>
                ) : searchLoading ? (
                  <div className="search-loading">
                    <div className="loading-spinner"></div>
                    <p>Searching for players...</p>
                  </div>
                ) : searchResults && searchResults.length > 0 ? (
                  <div className="player-results">
                    <div className="results-header">
                      <h3>Search Results ({searchResults.length})</h3>
                      <p>
                        Found {searchResults.length} player{searchResults.length !== 1 ? 's' : ''} 
                        {selectedGameId && games ? ` for ${games.find(g => g.id === selectedGameId)?.name}` : ''}
                      </p>
                    </div>
                    
                    <div className="player-grid">
                      {searchResults.map((player) => {
                        const rating = getPlayerRating(player, selectedGameId)
                        const stats = getPlayerStats(player, selectedGameId)
                        
                        return (
                          <div key={player.id} className="player-result-card">
                            <div className="player-header">
                              <Link 
                                href={{
                                  pathname: `/players/${player.id}`,
                                  query: selectedGameId ? { game: selectedGameId } : {}
                                }}
                                className="player-name-link"
                              >
                                {player.displayName || player.userName || 'Anonymous Player'}
                              </Link>
                              <div className="player-role">
                                <span className="role-badge">{player.role}</span>
                              </div>
                            </div>
                            
                            <div className="player-stats">
                              <div className="stat-item">
                                <span className="stat-label">Rating:</span>
                                <span className="stat-value">{rating}</span>
                              </div>
                              {stats && (
                                <>
                                  <div className="stat-item">
                                    <span className="stat-label">Record:</span>
                                    <span className="stat-value">
                                      {stats.wins}W-{stats.losses}L
                                    </span>
                                  </div>
                                  <div className="stat-item">
                                    <span className="stat-label">Tournaments:</span>
                                    <span className="stat-value">{stats.tournaments}</span>
                                  </div>
                                </>
                              )}
                            </div>
                            
                            <div className="player-games">
                              <span className="games-label">Active in:</span>
                              <div className="games-list">
                                {(player.gameStats as Array<Record<string, unknown>>)?.slice(0, 3).map((stat: Record<string, unknown>) => {
                                  const game = stat.game as Record<string, unknown>
                                  return (
                                    <span key={game.id as string} className="game-badge">
                                      {game.shortName as string}
                                    </span>
                                  )
                                }) || <span className="no-games">No games</span>}
                                {(player.gameStats as Array<Record<string, unknown>>)?.length > 3 && (
                                  <span className="more-games">+{(player.gameStats as Array<Record<string, unknown>>).length - 3} more</span>
                                )}
                              </div>
                            </div>
                            
                            <div className="player-actions">
                              <Link 
                                href={{
                                  pathname: `/players/${player.id}`,
                                  query: selectedGameId ? { game: selectedGameId } : {}
                                }}
                                className="view-profile-btn"
                              >
                                View Profile
                              </Link>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="no-results">
                    <h3>No Players Found</h3>
                    <p>
                      No players found matching &quot;{searchQuery}&quot;
                      {selectedGameId && games ? ` in ${games.find(g => g.id === selectedGameId)?.name}` : ''}.
                    </p>
                    <div className="no-results-suggestions">
                      <h4>Try:</h4>
                      <ul>
                        <li>Checking your spelling</li>
                        <li>Using a different search term</li>
                        <li>Removing the game filter to search all games</li>
                        <li>Searching for part of the player&apos;s name</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="compare-tab">
            {selectedGameId ? (
              <PlayerComparison gameId={selectedGameId} />
            ) : (
              <div className="comparison-prompt">
                <h2>Player Comparison</h2>
                <p>Select a game above to start comparing players.</p>
                <div className="comparison-features">
                  <h3>Comparison Features:</h3>
                  <ul>
                    <li>Compare up to 4 players side by side</li>
                    <li>View ratings, win rates, and tournament statistics</li>
                    <li>See rankings within your comparison group</li>
                    <li>Analyze performance differences</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}