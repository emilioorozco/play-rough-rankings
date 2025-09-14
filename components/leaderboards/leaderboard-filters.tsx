'use client'

import { useEffect } from 'react'
import { trpc } from '@/lib/trpc/client'

interface LeaderboardFiltersProps {
  games: Array<{
    id: string
    name: string
    shortName: string
    isActive: boolean
    tournamentCount: number
    playerCount: number
  }>
  gamesLoading: boolean
  selectedGameId: string
  selectedFormat: string
  selectedSeason: string
  limit: number
  onGameChange: (gameId: string) => void
  onFormatChange: (format: string) => void
  onSeasonChange: (season: string) => void
  onLimitChange: (limit: number) => void
}

export function LeaderboardFilters({
  games,
  gamesLoading,
  selectedGameId,
  selectedFormat,
  selectedSeason,
  limit,
  onGameChange,
  onFormatChange,
  onSeasonChange,
  onLimitChange,
}: LeaderboardFiltersProps) {
  // Get available seasons for selected game
  const { data: seasonsData } = trpc.leaderboards.getAvailableSeasons.useQuery(
    { gameId: selectedGameId },
    { enabled: !!selectedGameId }
  )

  // Clear dependent filters when game changes
  useEffect(() => {
    if (selectedGameId) {
      onFormatChange('')
      onSeasonChange('')
    }
  }, [selectedGameId, onFormatChange, onSeasonChange])

  const handleClearFilters = () => {
    onGameChange('')
    onFormatChange('')
    onSeasonChange('')
    onLimitChange(25)
  }

  const hasActiveFilters = selectedGameId || selectedFormat || selectedSeason || limit !== 25

  return (
    <div className="leaderboard-filters">
      <div className="filter-header">
        <h3>Filters</h3>
        {hasActiveFilters && (
          <button
            type="button"
            className="clear-filters-btn"
            onClick={handleClearFilters}
          >
            Clear All
          </button>
        )}
      </div>

      <div className="filter-groups">
        {/* Game Selection */}
        <div className="filter-group">
          <label htmlFor="game-select">Game</label>
          {gamesLoading ? (
            <select disabled>
              <option>Loading games...</option>
            </select>
          ) : (
            <select
              id="game-select"
              value={selectedGameId}
              onChange={(e) => onGameChange(e.target.value)}
            >
              <option value="">Select a game</option>
              {games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name} ({game.playerCount} players)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Season Selection */}
        {selectedGameId && (
          <div className="filter-group">
            <label htmlFor="season-select">Season</label>
            <select
              id="season-select"
              value={selectedSeason}
              onChange={(e) => onSeasonChange(e.target.value)}
            >
              <option value="">Current Season</option>
              {seasonsData?.seasons.map((season) => (
                <option key={season} value={season}>
                  {season}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Format Filter */}
        {selectedGameId && (
          <div className="filter-group">
            <label htmlFor="format-input">Format</label>
            <input
              id="format-input"
              type="text"
              placeholder="e.g., Standard, Expanded"
              value={selectedFormat}
              onChange={(e) => onFormatChange(e.target.value)}
            />
            <small className="text-muted">
              Filter by tournament format (optional)
            </small>
          </div>
        )}

        {/* Results Limit */}
        <div className="filter-group">
          <label htmlFor="limit-select">Show Top</label>
          <select
            id="limit-select"
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
          >
            <option value={10}>Top 10</option>
            <option value={25}>Top 25</option>
            <option value={50}>Top 50</option>
          </select>
        </div>
      </div>

      {/* Filter Summary */}
      {selectedGameId && (
        <div className="filter-summary">
          <h4>Current Selection</h4>
          <div className="summary-items">
            <div className="summary-item">
              <span className="label">Game:</span>
              <span className="value">
                {games.find(g => g.id === selectedGameId)?.name || 'Unknown'}
              </span>
            </div>
            {selectedSeason && (
              <div className="summary-item">
                <span className="label">Season:</span>
                <span className="value">{selectedSeason}</span>
              </div>
            )}
            {selectedFormat && (
              <div className="summary-item">
                <span className="label">Format:</span>
                <span className="value">{selectedFormat}</span>
              </div>
            )}
            <div className="summary-item">
              <span className="label">Showing:</span>
              <span className="value">Top {limit} players</span>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="filter-help">
        <h4>How to Use</h4>
        <ul>
          <li>Start by selecting a game to view its leaderboard</li>
          <li>Choose a specific season or view current rankings</li>
          <li>Filter by format to see format-specific rankings</li>
          <li>Adjust the limit to see more or fewer players</li>
        </ul>
      </div>
    </div>
  )
}