'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Medal, ChevronUp, ChevronDown } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Badge } from '../ui/badge'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { Button } from '../ui/button'
import Link from 'next/link'
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

  const tierColors = {
    bronze: 'bg-amber-100 text-amber-800 border-amber-200',
    silver: 'bg-gray-100 text-gray-800 border-gray-200',
    gold: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    platinum: 'bg-blue-100 text-blue-800 border-blue-200',
    diamond: 'bg-purple-100 text-purple-800 border-purple-200'
  }

  // Determine tier based on rating
  const getTier = (rating: number) => {
    if (rating >= 2000) return 'diamond'
    if (rating >= 1800) return 'platinum'
    if (rating >= 1600) return 'gold'
    if (rating >= 1400) return 'silver'
    return 'bronze'
  }

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return <Medal className="h-5 w-5 text-yellow-500 fill-current" />
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400 fill-current" />
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600 fill-current" />
    return <span className="font-semibold text-gray-500">#{rank}</span>
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      className="h-auto p-0 font-semibold hover:bg-transparent hover:text-primary-500"
      onClick={() => handleSort(column as SortField)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === column && (
          sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </Button>
  )

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
              viewMode === 'table' 
                ? 'bg-white text-primary-500 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setViewMode('table')}
            aria-label="Table view"
          >
            📊 Table
          </button>
          <button
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
              viewMode === 'cards' 
                ? 'bg-white text-primary-500 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setViewMode('cards')}
            aria-label="Card view"
          >
            🃏 Cards
          </button>
        </div>
        
        <div className="text-sm text-gray-500">
          Sorted by: <strong>{sortField}</strong> ({sortDirection})
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 hover:bg-gray-50">
                <TableHead className="w-16">
                  <SortableHeader column="rank">Rank</SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader column="player">Player</SortableHeader>
                </TableHead>
                <TableHead className="text-center">
                  <SortableHeader column="tier">Tier</SortableHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortableHeader column="rating">Rating</SortableHeader>
                </TableHead>
                <TableHead className="text-center">Change</TableHead>
                <TableHead className="text-right">
                  <SortableHeader column="games">Games</SortableHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortableHeader column="winRate">Win Rate</SortableHeader>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLeaderboard.map((entry) => {
                const tier = getTier(entry.currentRating)
                const winRate = Math.round(entry.performance.winRate * 100)
                const totalGames = (entry.seasonalStats?.wins || 0) + (entry.seasonalStats?.losses || 0)
                
                // Mock rating change for now (since it's not in the API yet)
                const ratingChange = Math.floor(Math.random() * 100) - 50

                return (
                  <TableRow 
                    key={entry.playerId} 
                    className={`
                      border-gray-200 hover:bg-gray-50 transition-colors duration-200 cursor-pointer
                      ${entry.rank <= 3 ? 'bg-primary-50' : ''}
                    `}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center justify-center">
                        {getRankDisplay(entry.rank)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary-500 text-white text-sm">
                            {getInitials(entry.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Link 
                            href={`/players/${entry.playerId}`}
                            className="font-medium text-secondary-500 hover:text-primary-500 transition-colors duration-200"
                            onClick={(e) => handlePlayerClick(entry.playerId, entry.displayName, e)}
                          >
                            {entry.displayName}
                          </Link>
                          <p className="text-sm text-gray-500">@{entry.displayName.toLowerCase().replace(/\s+/g, '')}</p>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <Badge 
                        variant="outline" 
                        className={`${tierColors[tier]} font-medium`}
                      >
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="text-right font-semibold text-lg">
                      {entry.currentRating}
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className={`flex items-center justify-center gap-1 ${
                        ratingChange >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {ratingChange >= 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        <span className="font-medium">
                          {ratingChange > 0 ? '+' : ''}{ratingChange}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right font-medium">
                      {totalGames}
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-medium">{winRate}%</span>
                        <div className={`w-2 h-2 rounded-full ${
                          winRate >= 70 ? 'bg-green-500' :
                          winRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedLeaderboard.map((player) => (
            <div key={player.playerId} className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary-500 text-white">
                    {getInitials(player.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Link 
                    href={`/players/${player.playerId}`}
                    className="font-medium text-secondary-500 hover:text-primary-500"
                    onClick={(e) => handlePlayerClick(player.playerId, player.displayName, e)}
                  >
                    {player.displayName}
                  </Link>
                  <p className="text-sm text-gray-500">#{player.rank}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Rating:</span>
                  <span className="font-medium">{player.currentRating}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Win Rate:</span>
                  <span className="font-medium">{Math.round(player.performance.winRate * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Games:</span>
                  <span className="font-medium">
                    {(player.seasonalStats?.wins || 0) + (player.seasonalStats?.losses || 0)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}