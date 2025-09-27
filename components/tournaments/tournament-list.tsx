'use client'

import { TournamentCard } from './tournament-card'
import { useMemo } from 'react'
import { Trophy } from 'lucide-react'
import { useTournamentData } from '@/hooks/stores/use-tournament-data'

interface TournamentListProps {
  filters: {
    gameId: string
    storeId: string
    status: "UPCOMING" | "ACTIVE" | "COMPLETED" | ""
    startDate: string
    endDate: string
    search: string
  }
}

export function TournamentList({ filters }: TournamentListProps) {
  // Use custom hook for data fetching and store management
  const {
    tournaments,
    isLoading,
    error,
  } = useTournamentData({ filters, limit: 12, offset: 0 })

  // Filter tournaments by search term on the client side
  const filteredTournaments = useMemo(() => {
    if (!tournaments) return []
    
    if (!filters.search) return tournaments

    const searchTerm = filters.search.toLowerCase()
    return tournaments.filter((tournament) =>
      tournament.name.toLowerCase().includes(searchTerm) ||
      tournament.store.name.toLowerCase().includes(searchTerm) ||
      tournament.game.name.toLowerCase().includes(searchTerm)
    )
  }, [tournaments, filters.search])


  if (isLoading && tournaments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading tournaments...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">Error loading tournaments: {error}</p>
        </div>
      </div>
    )
  }

  if (filteredTournaments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No tournaments found</h3>
          <p className="text-gray-500">
            {filters.search || filters.gameId || filters.storeId || filters.status
              ? 'Try adjusting your filters to see more results.'
              : 'No tournaments have been created yet.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-semibold text-secondary-500">
          {filteredTournaments.length} Tournament{filteredTournaments.length !== 1 ? 's' : ''}
          {filters.search && ` matching "${filters.search}"`}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {filteredTournaments.map((tournament) => (
          <TournamentCard key={tournament.id} tournament={tournament} />
        ))}
      </div>


      {isLoading && tournaments.length > 0 && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto mb-2"></div>
          <p className="text-gray-500">Loading more tournaments...</p>
        </div>
      )}
    </div>
  )
}
