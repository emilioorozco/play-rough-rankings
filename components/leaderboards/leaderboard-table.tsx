'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PlayerRankingCard } from './player-ranking-card'
import { useActivity } from '@/components/activity-provider'
import { useViewTransitions } from '@/hooks/use-view-transitions'

import type { ApiLeaderboardEntry } from '@/lib/types/api'

type LeaderboardEntry = ApiLeaderboardEntry

interface LeaderboardTableProps {
  leaderboard: LeaderboardEntry[]
  gameId: string
  season?: string
}

type SortField = 'rank' | 'rating' | 'winRate' | 'tournaments' | 'points'
type SortDirection = 'asc' | 'desc'

export function LeaderboardTable({
  leaderboard,
  gameId,
  season,
}: LeaderboardTableProps) {
  const { setViewing } = useActivity()
  const { transitionToPlayer } = useViewTransitions()
  const [sortField, setSortField] = useState<SortField>('rank')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  const handlePlayerClick = (playerId: string, playerName: string, e: React.MouseEvent) => {
    e.preventDefault()
    setViewing(`Player: ${playerName}`)
    transitionToPlayer(playerId)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection(field === 'rank' ? 'asc' : 'desc')
    }
  }

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    let aValue: number
    let bValue: number

    switch (sortField) {
      case 'rank':
        aValue = a.rank
        bValue = b.rank
        break
      case 'rating':
        aValue = a.currentRating
        bValue = b.currentRating
        break
      case 'winRate':
        aValue = a.performance.winRate
        bValue = b.performance.winRate
        break
      case 'tournaments':
        aValue = a.seasonalStats?.tournaments || a.periodStats?.tournaments || 0
        bValue = b.seasonalStats?.tournaments || b.periodStats?.tournaments || 0
        break
      case 'points':
        aValue = a.seasonalStats?.points || 0
        bValue = b.seasonalStats?.points || 0
        break
      default:
        aValue = a.rank
        bValue = b.rank
    }

    if (sortDirection === 'asc') {
      return aValue - bValue
    } else {
      return bValue - aValue
    }
  })

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return 'rank-badge gold'
    if (rank === 2) return 'rank-badge silver'
    if (rank === 3) return 'rank-badge bronze'
    if (rank <= 10) return 'rank-badge top-10'
    return 'rank-badge'
  }

  return (
    <div className="leaderboard-table-container">
      {/* View Mode Toggle */}
      <div className="table-controls">
        <div className="view-toggle">
          <button
            className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            aria-label="Table view"
          >
            📊 Table
          </button>
          <button
            className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
            onClick={() => setViewMode('cards')}
            aria-label="Card view"
          >
            🃏 Cards
          </button>
        </div>
        
        <div className="sort-info">
          Sorted by: <strong>{sortField}</strong> ({sortDirection})
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="table-wrapper">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th 
                  className={`sortable ${sortField === 'rank' ? 'active' : ''}`}
                  onClick={() => handleSort('rank')}
                >
                  Rank {getSortIcon('rank')}
                </th>
                <th>Player</th>
                <th 
                  className={`sortable ${sortField === 'rating' ? 'active' : ''}`}
                  onClick={() => handleSort('rating')}
                >
                  Rating {getSortIcon('rating')}
                </th>
                <th 
                  className={`sortable ${sortField === 'winRate' ? 'active' : ''}`}
                  onClick={() => handleSort('winRate')}
                >
                  Win Rate {getSortIcon('winRate')}
                </th>
                <th>Record</th>
                <th 
                  className={`sortable ${sortField === 'tournaments' ? 'active' : ''}`}
                  onClick={() => handleSort('tournaments')}
                >
                  Tournaments {getSortIcon('tournaments')}
                </th>
                <th 
                  className={`sortable ${sortField === 'points' ? 'active' : ''}`}
                  onClick={() => handleSort('points')}
                >
                  Points {getSortIcon('points')}
                </th>
                <th>Best Finish</th>
              </tr>
            </thead>
            <tbody>
              {sortedLeaderboard.map((player) => (
                <tr key={player.playerId} className="player-row">
                  <td>
                    <span className={getRankBadgeClass(player.rank)}>
                      #{player.rank}
                    </span>
                  </td>
                  <td>
                    <div className="player-info">
                      <Link 
                        href={`/players/${player.playerId}` as `/players/${string}`}
                        className="player-name-link"
                        onClick={(e) => handlePlayerClick(player.playerId, player.displayName, e)}
                      >
                        {player.displayName}
                      </Link>
                    </div>
                  </td>
                  <td>
                    <span className="rating-value">
                      {player.currentRating}
                    </span>
                  </td>
                  <td>
                    <span className="win-rate">
                      {(player.performance.winRate * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td>
                    <span className="record">
                      {(player.seasonalStats?.wins || player.periodStats?.wins || 0)}W-{(player.seasonalStats?.losses || player.periodStats?.losses || 0)}L
                    </span>
                  </td>
                  <td>
                    <span className="tournaments">
                      {player.seasonalStats?.tournaments || player.periodStats?.tournaments || 0}
                    </span>
                  </td>
                  <td>
                    <span className="points">
                      {player.seasonalStats?.points || 0}
                    </span>
                  </td>
                  <td>
                    <span className="best-finish">
                      {player.bestFinish ? `#${player.bestFinish}` : '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="leaderboard-cards">
          {sortedLeaderboard.map((player) => (
            <PlayerRankingCard
              key={player.playerId}
              player={player}
              gameId={gameId}
              season={season}
            />
          ))}
        </div>
      )}
    </div>
  )
}