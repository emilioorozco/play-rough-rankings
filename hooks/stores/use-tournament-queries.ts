import { useMemo, useEffect } from 'react'
import { trpc } from '@/lib/trpc/client'
import { useTournamentList, useTournamentStore } from '@/stores/tournament-store'
import type { TournamentFilters } from '@/stores/tournament-store'

interface UseTournamentQueriesProps {
  filters: TournamentFilters
  limit?: number
  offset?: number
  enabled?: boolean
}

/**
 * Hook that integrates tRPC tournament queries directly with Zustand store
 * Replaces the old useTournamentData hook and eliminates useEffect bridges
 */
export function useTournamentQueries({ 
  filters, 
  limit = 12, 
  offset = 0, 
  enabled = true 
}: UseTournamentQueriesProps) {
  const {
    tournaments,
    totalCount,
    isLoading: storeLoading,
    error: storeError,
    setTournaments,
    setError,
  } = useTournamentList()

  const handleQueryLoading = useTournamentStore((state) => state.handleQueryLoading)
  const handleQuerySuccess = useTournamentStore((state) => state.handleQuerySuccess)
  const handleQueryError = useTournamentStore((state) => state.handleQueryError)

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

  // Use tRPC query
  const tournamentsQuery = trpc.tournaments.list.useQuery(queryParams, {
    enabled,
  })

  // Handle loading state changes
  useEffect(() => {
    if (tournamentsQuery.isLoading && !storeLoading) {
      handleQueryLoading('tournamentList')
    }
  }, [tournamentsQuery.isLoading, storeLoading, handleQueryLoading])

  // Handle success
  useEffect(() => {
    if (tournamentsQuery.data && !tournamentsQuery.isLoading) {
      setTournaments(tournamentsQuery.data.tournaments, tournamentsQuery.data.total)
      handleQuerySuccess('tournamentList', tournamentsQuery.data)
    }
  }, [tournamentsQuery.data, tournamentsQuery.isLoading, setTournaments, handleQuerySuccess])

  // Handle error
  useEffect(() => {
    if (tournamentsQuery.error) {
      setError(tournamentsQuery.error.message)
      handleQueryError('tournamentList', tournamentsQuery.error.message)
    }
  }, [tournamentsQuery.error, setError, handleQueryError])

  return {
    // Tournament data from Zustand store
    tournaments,
    totalCount,
    isLoading: tournamentsQuery.isLoading,
    error: tournamentsQuery.error?.message || storeError,
    
    // tRPC query methods
    refetch: tournamentsQuery.refetch,
    isFetching: tournamentsQuery.isFetching,
    isRefetching: tournamentsQuery.isRefetching,
    
    // Status flags
    hasData: tournaments.length > 0,
    hasMore: tournaments.length < totalCount,
    
    // For backward compatibility
    isStale: tournamentsQuery.isStale,
  }
}

/**
 * Hook for fetching a single tournament by ID
 */
export function useTournamentQuery(tournamentId: string, enabled = true) {
  const currentTournament = useTournamentStore((state) => state.currentTournament)
  const setCurrentTournament = useTournamentStore((state) => state.setCurrentTournament)
  const handleQueryLoading = useTournamentStore((state) => state.handleQueryLoading)
  const handleQuerySuccess = useTournamentStore((state) => state.handleQuerySuccess)
  const handleQueryError = useTournamentStore((state) => state.handleQueryError)

  const tournamentQuery = trpc.tournaments.getById.useQuery(
    { id: tournamentId },
    {
      enabled: enabled && !!tournamentId,
    }
  )

  // Handle loading state
  useEffect(() => {
    if (tournamentQuery.isLoading) {
      handleQueryLoading('currentTournament')
    }
  }, [tournamentQuery.isLoading, handleQueryLoading])

  // Handle success
  useEffect(() => {
    if (tournamentQuery.data && !tournamentQuery.isLoading) {
      setCurrentTournament(tournamentQuery.data as any)
      handleQuerySuccess('currentTournament', tournamentQuery.data)
    }
  }, [tournamentQuery.data, tournamentQuery.isLoading, setCurrentTournament, handleQuerySuccess])

  // Handle error
  useEffect(() => {
    if (tournamentQuery.error) {
      handleQueryError('currentTournament', tournamentQuery.error.message)
    }
  }, [tournamentQuery.error, handleQueryError])

  const tournament = tournamentQuery.data as any || currentTournament as any
  
  return {
    tournament,
    isLoading: tournamentQuery.isLoading,
    error: tournamentQuery.error?.message,
    refetch: tournamentQuery.refetch,
    isFetching: tournamentQuery.isFetching,
  }
}

/**
 * Hook for tournament registration status
 */
export function useTournamentRegistrationQuery(tournamentId: string, enabled = true) {
  const registrationStatus = useTournamentStore((state) => 
    state.registrationStatusCache[tournamentId]
  )
  const setRegistrationStatus = useTournamentStore((state) => state.setRegistrationStatus)
  const handleQueryLoading = useTournamentStore((state) => state.handleQueryLoading)
  const handleQuerySuccess = useTournamentStore((state) => state.handleQuerySuccess)
  const handleQueryError = useTournamentStore((state) => state.handleQueryError)

  const registrationQuery = trpc.tournaments.getRegistrationStatus.useQuery(
    { tournamentId },
    {
      enabled: enabled && !!tournamentId,
    }
  )

  // Handle loading state
  useEffect(() => {
    if (registrationQuery.isLoading) {
      handleQueryLoading('registrationStatus')
    }
  }, [registrationQuery.isLoading, handleQueryLoading])

  // Handle success
  useEffect(() => {
    if (registrationQuery.data && !registrationQuery.isLoading) {
      setRegistrationStatus(tournamentId, registrationQuery.data as any)
      handleQuerySuccess('registrationStatus', registrationQuery.data)
    }
  }, [registrationQuery.data, registrationQuery.isLoading, tournamentId, setRegistrationStatus, handleQuerySuccess])

  // Handle error
  useEffect(() => {
    if (registrationQuery.error) {
      handleQueryError('registrationStatus', registrationQuery.error.message)
    }
  }, [registrationQuery.error, handleQueryError])

  return {
    status: registrationQuery.data || registrationStatus || {
      isRegistered: false,
      canRegister: false,
      canWithdraw: false,
      isFull: false,
      participantCount: 0,
    },
    isLoading: registrationQuery.isLoading,
    error: registrationQuery.error?.message,
    refetch: registrationQuery.refetch,
  }
}

/**
 * Hook for tournament mutations (create, update, delete)
 */
export function useTournamentMutations() {
  const setTournamentListError = useTournamentStore((state) => state.setTournamentListError)
  const cacheTournament = useTournamentStore((state) => state.cacheTournament)
  const invalidateTournamentList = useTournamentStore((state) => state.invalidateTournamentList)

  const createTournament = trpc.tournaments.create.useMutation({
    onSuccess: (tournament) => {
      // Cache the new tournament
      cacheTournament(tournament as any)
      // Invalidate list to force refetch
      invalidateTournamentList()
    },
    onError: (error) => {
      setTournamentListError(error.message)
    },
  })

  const updateTournament = trpc.tournaments.update.useMutation({
    onSuccess: (tournament) => {
      // Update cached tournament
      cacheTournament(tournament as any)
    },
    onError: (error) => {
      setTournamentListError(error.message)
    },
  })

  return {
    createTournament,
    updateTournament,
  }
}