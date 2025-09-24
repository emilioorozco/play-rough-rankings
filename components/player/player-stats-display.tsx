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

    </div>
  )
}