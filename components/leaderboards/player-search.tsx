'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'

interface PlayerSearchProps {
  gameId: string
  onPlayerSelect?: (playerId: string) => void
  selectedPlayers?: string[]
  maxSelections?: number
  placeholder?: string
}

export function PlayerSearch({ 
  gameId, 
  onPlayerSelect,
  selectedPlayers = [],
  maxSelections = Infinity,
  placeholder = "Search players..."
}: PlayerSearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Search for players
  const { data: searchResults, isLoading } = trpc.players.searchPlayers.useQuery(
    {
      query,
      gameId,
      limit: 10,
    },
    {
      enabled: query.length >= 2,
      refetchOnWindowFocus: false,
    }
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!searchResults || searchResults.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && searchResults[selectedIndex]) {
          const player = searchResults[selectedIndex]
          handleResultClick(player.id)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setIsOpen(value.length >= 2)
    setSelectedIndex(-1)
  }

  const handleResultClick = (playerId: string) => {
    if (onPlayerSelect) {
      onPlayerSelect(playerId)
      setQuery('')
      setSelectedIndex(-1)
      setIsOpen(false)
    } else {
      // Default behavior - navigate to player profile
      window.location.href = `/players/${playerId}?game=${gameId}`
    }
  }

  const getPlayerRating = (player: Record<string, unknown>) => {
    const gameStats = (player.gameStats as Array<Record<string, unknown>>)?.find((stat: Record<string, unknown>) => stat.gameId === gameId)
    return (gameStats?.currentRating as number) || 1200
  }

  const getPlayerStats = (player: Record<string, unknown>) => {
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
    <div className="player-search" ref={searchRef}>
      <div className="search-input-container">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="search-input"
          aria-label="Search for players"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="search-results"
          role="combobox"
        />
        <div className="search-icon">🔍</div>
      </div>

      {isOpen && (
        <div className="search-dropdown" role="listbox" id="search-results">
          {isLoading ? (
            <div className="search-loading">
              <div className="loading-item">
                <span>Searching players...</span>
              </div>
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="search-results">
              {searchResults.map((player, index) => {
                const rating = getPlayerRating(player)
                const stats = getPlayerStats(player)
                const isSelected = selectedPlayers.includes(player.id)
                const canSelect = !isSelected && selectedPlayers.length < maxSelections
                
                if (onPlayerSelect) {
                  // Comparison mode - clickable div
                  return (
                    <div
                      key={player.id}
                      className={`search-result-item ${
                        index === selectedIndex ? 'selected' : ''
                      } ${isSelected ? 'already-selected' : ''} ${
                        !canSelect && !isSelected ? 'disabled' : ''
                      }`}
                      onClick={() => canSelect || isSelected ? handleResultClick(player.id) : null}
                      role="option"
                      aria-selected={index === selectedIndex}
                    >
                      <div className="player-info">
                        <div className="player-name">
                          {player.displayName || player.userName || 'Anonymous Player'}
                          {isSelected && <span className="selected-badge">✓ Selected</span>}
                        </div>
                        <div className="player-meta">
                          <span className="player-rating">
                            Rating: {rating}
                          </span>
                          {stats && (
                            <span className="player-record">
                              {stats.wins}W-{stats.losses}L ({stats.tournaments} tournaments)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="result-arrow">
                        {isSelected ? '✓' : canSelect ? '+' : '→'}
                      </div>
                    </div>
                  )
                } else {
                  // Default mode - link to profile
                  return (
                    <Link
                      key={player.id}
                      href={`/players/${player.id}?game=${gameId}` as `/players/${string}?game=${string}`}
                      className={`search-result-item ${
                        index === selectedIndex ? 'selected' : ''
                      }`}
                      onClick={() => handleResultClick(player.id)}
                      role="option"
                      aria-selected={index === selectedIndex}
                    >
                      <div className="player-info">
                        <div className="player-name">
                          {player.displayName || player.userName || 'Anonymous Player'}
                        </div>
                        <div className="player-meta">
                          <span className="player-rating">
                            Rating: {rating}
                          </span>
                          {stats && (
                            <span className="player-record">
                              {stats.wins}W-{stats.losses}L ({stats.tournaments} tournaments)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="result-arrow">→</div>
                    </Link>
                  )
                }
              })}
            </div>
          ) : query.length >= 2 ? (
            <div className="search-empty">
              <div className="empty-item">
                <span>No players found for &quot;{query}&quot;</span>
                <small>Try a different search term</small>
              </div>
            </div>
          ) : null}

          {query.length >= 2 && (
            <div className="search-footer">
              <div className="search-tips">
                <small>
                  💡 Use ↑↓ to navigate, Enter to select, Esc to close
                </small>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Help */}
      {query.length === 1 && (
        <div className="search-help">
          <small>Type at least 2 characters to search</small>
        </div>
      )}
    </div>
  )
}