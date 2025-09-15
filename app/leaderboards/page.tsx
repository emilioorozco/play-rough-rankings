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
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-secondary-500 mb-2">Tournament Leaderboards</h1>
        <p className="text-gray-500 text-sm sm:text-base px-2">View seasonal rankings and top players across all supported games</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
        <aside className="lg:col-span-1 order-2 lg:order-1">
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

        <main className="lg:col-span-3 order-1 lg:order-2">
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