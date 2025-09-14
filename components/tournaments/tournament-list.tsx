'use client'

import { trpc } from '@/lib/trpc/client'
import { TournamentCard } from './tournament-card'
import { useState, useMemo } from 'react'

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
      <div className="tournament-list">
        <div className="loading-state">
          <p>Loading tournaments...</p>
        </div>
      </div>
    )
  }

  if (tournamentsQuery.error) {
    return (
      <div className="tournament-list">
        <div className="error-state">
          <p>Error loading tournaments: {tournamentsQuery.error.message}</p>
          <button onClick={() => tournamentsQuery.refetch()}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (filteredTournaments.length === 0) {
    return (
      <div className="tournament-list">
        <div className="empty-state">
          <h3>No tournaments found</h3>
          <p>
            {filters.search || filters.gameId || filters.storeId || filters.status
              ? 'Try adjusting your filters to see more results.'
              : 'No tournaments have been created yet.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="tournament-list">
      <div className="tournament-list-header">
        <h2>
          {filteredTournaments.length} Tournament{filteredTournaments.length !== 1 ? 's' : ''}
          {filters.search && ` matching "${filters.search}"`}
        </h2>
      </div>

      <div className="tournament-grid">
        {filteredTournaments.map((tournament) => (
          <TournamentCard key={tournament.id} tournament={tournament} />
        ))}
      </div>

      {tournamentsQuery.data?.hasMore && (
        <div className="load-more-section">
          <button
            onClick={handleLoadMore}
            disabled={tournamentsQuery.isLoading}
            className="load-more-btn"
          >
            {tournamentsQuery.isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {tournamentsQuery.isLoading && page > 0 && (
        <div className="loading-more">
          <p>Loading more tournaments...</p>
        </div>
      )}
    </div>
  )
}