'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { LeaderboardDisplay } from '@/components/leaderboards/leaderboard-display'
import { LeaderboardFilters } from '@/components/leaderboards/leaderboard-filters'

export default function LeaderboardsPage() {
  const [selectedGameId, setSelectedGameId] = useState<string>('')
  const [selectedFormat, setSelectedFormat] = useState<string>('')
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  const [limit, setLimit] = useState<number>(25)

  // Get available games
  const { data: games, isLoading: gamesLoading } = trpc.games.list.useQuery({
    includeInactive: false,
  })

  return (
    <div className="container">
      <div className="hero-section">
        <h1>Tournament Leaderboards</h1>
        <p>View seasonal rankings and top players across all supported games</p>
      </div>

      <div className="leaderboards-layout">
        <aside className="filters-sidebar">
          <LeaderboardFilters
            games={games || []}
            gamesLoading={gamesLoading}
            selectedGameId={selectedGameId}
            selectedFormat={selectedFormat}
            selectedSeason={selectedSeason}
            limit={limit}
            onGameChange={setSelectedGameId}
            onFormatChange={setSelectedFormat}
            onSeasonChange={setSelectedSeason}
            onLimitChange={setLimit}
          />
        </aside>

        <main className="leaderboards-content">
          <LeaderboardDisplay
            gameId={selectedGameId}
            format={selectedFormat}
            season={selectedSeason}
            limit={limit}
          />
        </main>
      </div>
    </div>
  )
}