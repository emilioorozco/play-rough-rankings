import { useEffect, useRef, useMemo } from 'react'
import { trpc } from '@/lib/trpc/client'
import { useTournamentList } from '@/stores/tournament-store'
import type { TournamentFilters } from '@/stores/tournament-store'

interface UseTournamentDataProps {
  filters: TournamentFilters
  limit?: number
  offset?: number
}

export function useTournamentData({ filters, limit = 12, offset = 0 }: UseTournamentDataProps) {
  const {
    tournaments,
    isLoading,
    error,
    totalCount,
    setTournaments,
    setLoading,
    setError,
    setFilters,
  } = useTournamentList()
  
  // Track previous filters to detect changes
  const previousFiltersRef = useRef<string>('')

  // Memoize filter string for comparison
  const filtersString = useMemo(() => JSON.stringify(filters), [filters])

  // Build query parameters from filters
  const queryParams = useMemo(() => {
    const validStatuses = ["UPCOMING", "ACTIVE", "COMPLETED"] as const
    const hasValidStatus = filters.status && validStatuses.includes(filters.status as any)
    
    return {
      limit,
      offset,
      ...(filters.gameId && { gameId: filters.gameId }),
      ...(filters.storeId && { storeId: filters.storeId }),
      ...(hasValidStatus && { status: filters.status as "UPCOMING" | "ACTIVE" | "COMPLETED" }),
      ...(filters.startDate && { startDate: new Date(filters.startDate) }),
      ...(filters.endDate && { endDate: new Date(filters.endDate) }),
      ...(filters.organizerId && { organizerId: filters.organizerId }),
    }
  }, [filters, limit, offset])

  const tournamentsQuery = trpc.tournaments.list.useQuery(queryParams, {
    enabled: true, // Always enabled, we'll handle loading states manually
  })

  // Update store when query results change
  useEffect(() => {
    if (tournamentsQuery.data) {
      setTournaments(tournamentsQuery.data.tournaments, tournamentsQuery.data.total)
      setLoading(false)
      setError(null)
    }
  }, [tournamentsQuery.data]) // Removed function references to prevent infinite loops

  // Update store when query is loading
  useEffect(() => {
    if (tournamentsQuery.isLoading) {
      setLoading(true)
      setError(null)
    }
  }, [tournamentsQuery.isLoading]) // Removed function references to prevent infinite loops

  // Update store when query has error
  useEffect(() => {
    if (tournamentsQuery.error) {
      setLoading(false)
      setError(tournamentsQuery.error.message)
    }
  }, [tournamentsQuery.error]) // Removed function references to prevent infinite loops

  // Update filters when they change, but only if they've actually changed
  useEffect(() => {
    if (filtersString !== previousFiltersRef.current) {
      setFilters(filters)
      previousFiltersRef.current = filtersString
    }
  }, [filters, filtersString]) // Removed setFilters to prevent infinite loops

  return {
    tournaments,
    isLoading,
    error,
    totalCount,
    refetch: tournamentsQuery.refetch,
  }
}
