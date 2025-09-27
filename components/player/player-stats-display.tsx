'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import type { ApiGame } from '@/lib/types/api'

interface PlayerStatsDisplayProps {
  playerId: string
  games: ApiGame[]
}


export function PlayerStatsDisplay({ playerId, games }: PlayerStatsDisplayProps) {
  const [selectedGameId] = useState<string>(games[0]?.id || '')

  // Get game stats for the selected game
  trpc.players.getGameStats.useQuery(
    {
      playerId,
      gameId: selectedGameId,
    },
    {
      enabled: !!selectedGameId && !!playerId,
    }
  )


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