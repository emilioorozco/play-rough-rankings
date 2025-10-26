import { useMemo, useCallback, useRef } from 'react'
import { useTournamentStore } from './tournament-store'

// Tournament data hooks
export const useCurrentTournament = () => {
  return useTournamentStore((state) => state.currentTournament)
}

export const useCurrentTournamentId = () => {
  return useTournamentStore((state) => state.currentTournamentId)
}

export const useTournamentById = (tournamentId: string) => {
  return useTournamentStore((state) => state.tournamentCache[tournamentId])
}

export const useTournamentLoading = (tournamentId: string) => {
  return useTournamentStore((state) => state.tournamentCache[tournamentId]?.isLoading || false)
}

export const useTournamentError = (tournamentId: string) => {
  return useTournamentStore((state) => state.tournamentCache[tournamentId]?.error || null)
}

export const useIsTournamentCached = (tournamentId: string) => {
  return useTournamentStore((state) => !!state.tournamentCache[tournamentId])
}

export const useTournamentLastUpdated = (tournamentId: string) => {
  return useTournamentStore((state) => state.tournamentCache[tournamentId]?.lastUpdated)
}

// Tournament list hooks
export const useTournamentListState = () => {
  return useTournamentStore((state) => state.tournamentList)
}

export const useTournaments = () => {
  return useTournamentStore((state) => state.tournamentList.tournaments)
}

export const useTournamentTotalCount = () => {
  return useTournamentStore((state) => state.tournamentList.totalCount)
}

export const useTournamentCurrentPage = () => {
  return useTournamentStore((state) => state.tournamentList.currentPage)
}

export const useTournamentLimit = () => {
  return useTournamentStore((state) => state.tournamentList.limit)
}

export const useTournamentHasMore = () => {
  return useTournamentStore((state) => state.tournamentList.hasMore)
}

export const useTournamentListLoading = () => {
  return useTournamentStore((state) => state.tournamentList.isLoading)
}

export const useTournamentListError = () => {
  return useTournamentStore((state) => state.tournamentList.error)
}

export const useTournamentPaginationInfo = () => {
  return useTournamentStore(
    useCallback((state) => ({
      currentPage: state.tournamentList.currentPage,
      totalCount: state.tournamentList.totalCount,
      limit: state.tournamentList.limit,
      hasMore: state.tournamentList.hasMore,
      totalPages: Math.ceil(state.tournamentList.totalCount / state.tournamentList.limit),
    }), [])
  )
}

// Registration status hooks
export const useRegistrationStatus = (tournamentId: string) => {
  return useTournamentStore((state) => state.registrationStatusCache[tournamentId])
}

export const useRegistrationStatusLoading = (tournamentId: string) => {
  return useTournamentStore((state) => state.tournamentCache[tournamentId]?.isLoading || false)
}

export const useRegistrationStatusError = (tournamentId: string) => {
  return useTournamentStore((state) => state.tournamentCache[tournamentId]?.error || null)
}

export const useIsRegistered = (tournamentId: string) => {
  return useTournamentStore((state) => state.registrationStatusCache[tournamentId]?.isRegistered || false)
}

export const useCanRegister = (tournamentId: string) => {
  return useTournamentStore((state) => state.registrationStatusCache[tournamentId]?.canRegister || false)
}

export const useCanWithdraw = (tournamentId: string) => {
  return useTournamentStore((state) => state.registrationStatusCache[tournamentId]?.canWithdraw || false)
}

export const useIsTournamentFull = (tournamentId: string) => {
  return useTournamentStore((state) => state.registrationStatusCache[tournamentId]?.isFull || false)
}

export const useParticipantCount = (tournamentId: string) => {
  return useTournamentStore((state) => state.registrationStatusCache[tournamentId]?.participantCount || 0)
}

export const useMaxPlayers = (tournamentId: string) => {
  return useTournamentStore((state) => state.registrationStatusCache[tournamentId]?.maxPlayers)
}

export const useRegistrationDeadline = (tournamentId: string) => {
  return useTournamentStore((state) => state.registrationStatusCache[tournamentId]?.registrationDeadline)
}

// Filter hooks
export const useTournamentFilters = () => {
  return useTournamentStore((state) => state.filters)
}

export const useTournamentFilterValue = (key: string) => {
  return useTournamentStore((state) => (state.filters as any)[key])
}

export const useHasActiveTournamentFilters = () => {
  return useTournamentStore(
    useCallback((state) => {
      const filters = state.filters
      return Object.values(filters).some(value => 
        value !== '' && value !== null && value !== undefined
      )
    }, [])
  )
}

export const useActiveTournamentFilterCount = () => {
  return useTournamentStore(
    useCallback((state) => {
      const filters = state.filters
      return Object.values(filters).filter(value => 
        value !== '' && value !== null && value !== undefined
      ).length
    }, [])
  )
}

export const useTournamentFilterSummary = () => {
  return useTournamentStore(
    useCallback((state) => {
      const filters = state.filters
      const activeFilters = Object.entries(filters)
        .filter(([, value]) => value !== '' && value !== null && value !== undefined)
        .map(([key, value]) => ({ key, value }))
      
      return {
        filters,
        activeFilters,
        activeCount: activeFilters.length,
        hasActive: activeFilters.length > 0,
      }
    }, [])
  )
}

// Action hooks - stable reference to prevent infinite loops
export const useTournamentActions = () => {
  const actionsRef = useRef<ReturnType<typeof useTournamentStore.getState> | null>(null)
  
  if (!actionsRef.current) {
    const state = useTournamentStore.getState()
    actionsRef.current = {
      // Tournament data actions
      cacheTournament: state.cacheTournament,
      setCurrentTournament: state.setCurrentTournament,
      clearTournamentCache: state.clearTournamentCache,
      // Tournament list actions
      setTournamentList: state.setTournamentList,
      setTournamentListPage: state.setTournamentListPage,
      setTournamentListLoading: state.setTournamentListLoading,
      setTournamentListError: state.setTournamentListError,
      // Registration status actions
      setRegistrationStatus: state.setRegistrationStatus,
      getRegistrationStatus: state.getRegistrationStatus,
      updateRegistrationStatus: state.updateRegistrationStatus,
      clearRegistrationStatus: state.clearRegistrationStatus,
      clearAllRegistrationStatus: state.clearAllRegistrationStatus,
      // Filter actions
      setFilters: state.setFilters,
      resetFilters: state.resetFilters,
      // Utility actions
      invalidateTournament: state.invalidateTournament,
      invalidateTournamentList: state.invalidateTournamentList,
      resetTournamentStore: state.resetTournamentStore,
    }
  }
  
  return actionsRef.current
}

// Combined hooks for common use cases
export const useTournamentState = (tournamentId: string) => {
  const tournament = useTournamentById(tournamentId)
  const isLoading = useTournamentLoading(tournamentId)
  const error = useTournamentError(tournamentId)
  const actions = useTournamentActions()

  return useMemo(() => ({
    tournament: tournament?.tournament || null,
    isLoading,
    error,
    lastUpdated: tournament?.lastUpdated,
    fetch: () => actions.cacheTournament({} as any),
    invalidate: () => actions.invalidateTournament(tournamentId),
  }), [tournament, isLoading, error, actions, tournamentId])
}

export const useRegistrationStatusState = (tournamentId: string) => {
  const status = useRegistrationStatus(tournamentId)
  const isLoading = useRegistrationStatusLoading(tournamentId)
  const error = useRegistrationStatusError(tournamentId)
  const actions = useTournamentActions()

  return useMemo(() => ({
    status: status || {
      isRegistered: false,
      canRegister: false,
      canWithdraw: false,
      isFull: false,
      participantCount: 0,
    },
    isLoading,
    error,
    updateStatus: (updates: Partial<typeof status>) => actions.updateRegistrationStatus(tournamentId, updates),
    clearStatus: () => actions.clearRegistrationStatus(tournamentId),
  }), [status, isLoading, error, actions, tournamentId])
}

export const useTournamentListFullState = () => {
  const tournaments = useTournaments()
  const totalCount = useTournamentTotalCount()
  const currentPage = useTournamentCurrentPage()
  const limit = useTournamentLimit()
  const hasMore = useTournamentHasMore()
  const isLoading = useTournamentListLoading()
  const error = useTournamentListError()
  const actions = useTournamentActions()

  return useMemo(() => ({
    tournaments,
    totalCount,
    currentPage,
    limit,
    hasMore,
    isLoading,
    error,
    totalPages: Math.ceil(totalCount / limit),
    fetch: () => actions.setTournamentList(tournaments, totalCount),
    setPage: (page: number) => actions.setTournamentListPage(page),
    invalidate: () => actions.invalidateTournamentList(),
  }), [tournaments, totalCount, currentPage, limit, hasMore, isLoading, error, actions])
}

export const useTournamentFilterState = () => {
  const filters = useTournamentFilters()
  const hasActiveFilters = useHasActiveTournamentFilters()
  const activeFilterCount = useActiveTournamentFilterCount()
  const actions = useTournamentActions()

  return useMemo(() => ({
    filters,
    hasActiveFilters,
    activeFilterCount,
    setFilters: actions.setFilters,
    resetFilters: actions.resetFilters,
  }), [filters, hasActiveFilters, activeFilterCount, actions])
}

// Performance-optimized hooks for rendering
export const useTournamentCardData = (tournamentId: string) => {
  return useTournamentStore(
    useCallback((state) => {
      const tournament = state.tournamentCache[tournamentId]?.tournament
      const registrationStatus = state.registrationStatusCache[tournamentId]
      
      return tournament ? {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        date: tournament.date,
        participantCount: registrationStatus?.participantCount || 0,
        maxPlayers: registrationStatus?.maxPlayers,
        isRegistered: registrationStatus?.isRegistered || false,
        canRegister: registrationStatus?.canRegister || false,
        isFull: registrationStatus?.isFull || false,
      } : null
    }, [tournamentId])
  )
}

export const useTournamentListRenderData = () => {
  return useTournamentStore(
    useCallback((state) => ({
      tournaments: state.tournamentList.tournaments.map(tournament => ({
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        date: tournament.date,
        game: tournament.game,
        store: tournament.store,
        organizer: tournament.organizer,
      })),
      isLoading: state.tournamentList.isLoading,
      hasMore: state.tournamentList.hasMore,
      totalCount: state.tournamentList.totalCount,
    }), [])
  )
}

export const useRegistrationButtonData = (tournamentId: string) => {
  return useTournamentStore(
    useCallback((state) => {
      const registrationStatus = state.registrationStatusCache[tournamentId]
      
      return {
        isRegistered: registrationStatus?.isRegistered || false,
        canRegister: registrationStatus?.canRegister || false,
        canWithdraw: registrationStatus?.canWithdraw || false,
        isFull: registrationStatus?.isFull || false,
        isLoading: state.tournamentCache[tournamentId]?.isLoading || false,
      }
    }, [tournamentId])
  )
}

export const useTournamentFilterRenderData = () => {
  return useTournamentStore(
    useCallback((state) => ({
      filters: state.filters,
      hasActiveFilters: Object.values(state.filters).some(value => 
        value !== '' && value !== null && value !== undefined
      ),
    }), [])
  )
}
