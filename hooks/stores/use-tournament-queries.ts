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
  }) as any

  // Handle loading state changes
  useEffect(() => {
    if (tournamentsQuery.isLoading && !storeLoading) {
      handleQueryLoading('tournamentList')
    }
    // Zustand store functions are stable and don't need to be in dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentsQuery.isLoading, storeLoading])

  // Handle success
  useEffect(() => {
    if (tournamentsQuery.data && !tournamentsQuery.isLoading) {
      setTournaments(tournamentsQuery.data.tournaments, tournamentsQuery.data.total)
      handleQuerySuccess('tournamentList', tournamentsQuery.data)
    }
    // Zustand store functions are stable and don't need to be in dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentsQuery.data, tournamentsQuery.isLoading])

  // Handle error
  useEffect(() => {
    if (tournamentsQuery.error) {
      setError(tournamentsQuery.error.message)
      handleQueryError('tournamentList', tournamentsQuery.error.message)
    }
    // Zustand store functions are stable and don't need to be in dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentsQuery.error])

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
export function useTournamentQuery(tournamentId: string, enabled = true): {
  tournament: any
  isLoading: boolean
  error: string | undefined
  refetch: () => void
  isFetching: boolean
} {
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
  ) as any

  // Handle loading state
  useEffect(() => {
    if (tournamentQuery.isLoading) {
      handleQueryLoading('currentTournament')
    }
    // Zustand store functions are stable and don't need to be in dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentQuery.isLoading])

  // Handle success
  useEffect(() => {
    if (tournamentQuery.data && !tournamentQuery.isLoading) {
      setCurrentTournament(tournamentQuery.data as any)
      handleQuerySuccess('currentTournament', tournamentQuery.data)
    }
    // Zustand store functions are stable and don't need to be in dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentQuery.data, tournamentQuery.isLoading])

  // Handle error
  useEffect(() => {
    if (tournamentQuery.error) {
      handleQueryError('currentTournament', tournamentQuery.error.message)
    }
    // Zustand store functions are stable and don't need to be in dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentQuery.error])

  const tournament = (tournamentQuery.data || currentTournament) as any
  const refetch = tournamentQuery.refetch
  const isFetching = tournamentQuery.isFetching
  const isLoading = tournamentQuery.isLoading
  const error = tournamentQuery.error?.message
  
  return {
    tournament,
    isLoading,
    error,
    refetch: refetch as any,
    isFetching,
  }
}

/**
 * Hook for tournament registration status
 */
export function useTournamentRegistrationQuery(tournamentId: string, enabled = false) {
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
  ) as any

  // Handle loading state
  useEffect(() => {
    if (registrationQuery.isLoading) {
      handleQueryLoading('registrationStatus')
    }
    // Zustand store functions are stable and don't need to be in dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrationQuery.isLoading])

  // Handle success
  useEffect(() => {
    if (registrationQuery.data && !registrationQuery.isLoading) {
      setRegistrationStatus(tournamentId, registrationQuery.data as any)
      handleQuerySuccess('registrationStatus', registrationQuery.data)
    }
    // Zustand store functions are stable and don't need to be in dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrationQuery.data, registrationQuery.isLoading, tournamentId])

  // Handle error
  useEffect(() => {
    if (registrationQuery.error) {
      handleQueryError('registrationStatus', registrationQuery.error.message)
    }
    // Zustand store functions are stable and don't need to be in dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registrationQuery.error])

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
  const store = useTournamentStore() as any
  const setTournamentListError = store.setTournamentListError
  const cacheTournament = store.cacheTournament
  const invalidateTournamentList = store.invalidateTournamentList

  const createTournament = (trpc.tournaments.create as any).useMutation({
    onSuccess: (tournament: any) => {
      // Cache the new tournament
      cacheTournament(tournament)
      // Invalidate list to force refetch
      invalidateTournamentList()
    },
    onError: (error: any) => {
      setTournamentListError(error.message)
    },
  })

  const updateTournament = (trpc.tournaments.update as any).useMutation({
    onSuccess: (tournament: any) => {
      // Update cached tournament
      cacheTournament(tournament)
    },
    onError: (error: any) => {
      setTournamentListError(error.message)
    },
  })

  return {
    createTournament,
    updateTournament,
  }
}