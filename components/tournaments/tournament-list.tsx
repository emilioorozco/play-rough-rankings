'use client'

import { trpc } from '@/lib/trpc/client'
import { TournamentCard } from './tournament-card'
import { useState, useMemo } from 'react'
import { Trophy } from 'lucide-react'

interface TournamentListProps {
  filters: {
    gameId: string
    storeId: string
    status: string
    startDate: string
    endDate: string
    search: string
  }
}

export function TournamentList({ filters }: TournamentListProps) {
  const [page, setPage] = useState(0)
  const limit = 12

  // Build query parameters from filters
  const queryParams = useMemo(() => {
    const params: Record<string, unknown> = {
      limit,
      offset: page * limit,
    }

    if (filters.gameId) params.gameId = filters.gameId
    if (filters.storeId) params.storeId = filters.storeId
    if (filters.status) params.status = filters.status
    if (filters.startDate) params.startDate = new Date(filters.startDate)
    if (filters.endDate) params.endDate = new Date(filters.endDate)

    return params
  }, [filters, page, limit])

  const tournamentsQuery = trpc.tournaments.list.useQuery(queryParams)

  // Filter tournaments by search term on the client side
  const filteredTournaments = useMemo(() => {
    if (!tournamentsQuery.data?.tournaments) return []
    
    if (!filters.search) return tournamentsQuery.data.tournaments

    const searchTerm = filters.search.toLowerCase()
    return tournamentsQuery.data.tournaments.filter((tournament) =>
      tournament.name.toLowerCase().includes(searchTerm) ||
      tournament.store.name.toLowerCase().includes(searchTerm) ||
      tournament.game.name.toLowerCase().includes(searchTerm)
    )
  }, [tournamentsQuery.data?.tournaments, filters.search])

  const handleLoadMore = () => {
    setPage(prev => prev + 1)
  }

  const handleReset = () => {
    setPage(0)
  }

  // Reset page when filters change
  useMemo(() => {
    handleReset()
  }, [filters])

  if (tournamentsQuery.isLoading && page === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading tournaments...</p>
        </div>
      </div>
    )
  }

  if (tournamentsQuery.error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 mb-4">Error loading tournaments: {tournamentsQuery.error.message}</p>
          <button 
            onClick={() => tournamentsQuery.refetch()}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors duration-200"
          >
            Try Again
          </button>
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

      {tournamentsQuery.data?.hasMore && (
        <div className="text-center pt-6">
          <button
            onClick={handleLoadMore}
            disabled={tournamentsQuery.isLoading}
            className="bg-secondary-500 text-white px-6 py-3 rounded-lg hover:bg-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {tournamentsQuery.isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {tournamentsQuery.isLoading && page > 0 && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mx-auto mb-2"></div>
          <p className="text-gray-500">Loading more tournaments...</p>
        </div>
      )}
    </div>
  )
}