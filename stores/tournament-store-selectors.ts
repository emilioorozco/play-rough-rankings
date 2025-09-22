import { useMemo, useCallback } from 'react'
import { useTournamentStore } from './tournament-store'

// Tournament data selectors
export const useTournamentDataSelectors = {
  // Get current tournament
  getCurrentTournament: () => {
    return useTournamentStore((state) => state.currentTournament)
  },

  // Get current tournament ID
  getCurrentTournamentId: () => {
    return useTournamentStore((state) => state.currentTournamentId)
  },

  // Get tournament by ID from cache
  getTournamentById: (tournamentId: string) => {
    return useTournamentStore((state) => state.tournamentCache[tournamentId])
  },

  // Get tournament loading state
  getTournamentLoading: (tournamentId: string) => {
    return useTournamentStore((state) => state.tournamentCache[tournamentId]?.isLoading || false)
  },

  // Get tournament error
  getTournamentError: (tournamentId: string) => {
    return useTournamentStore((state) => state.tournamentCache[tournamentId]?.error || null)
  },

  // Check if tournament is cached
  isTournamentCached: (tournamentId: string) => {
    return useTournamentStore((state) => !!state.tournamentCache[tournamentId])
  },

  // Get tournament last updated time
  getTournamentLastUpdated: (tournamentId: string) => {
    return useTournamentStore((state) => state.tournamentCache[tournamentId]?.lastUpdated)
  },
}

// Tournament list selectors
export const useTournamentListSelectors = {
  // Get tournament list state
  getTournamentListState: () => {
    return useTournamentStore((state) => state.tournamentList)
  },

  // Get tournaments array
  getTournaments: () => {
    return useTournamentStore((state) => state.tournamentList.tournaments)
  },

  // Get total count
  getTotalCount: () => {
    return useTournamentStore((state) => state.tournamentList.totalCount)
  },

  // Get current page
  getCurrentPage: () => {
    return useTournamentStore((state) => state.tournamentList.currentPage)
  },

  // Get limit
  getLimit: () => {
    return useTournamentStore((state) => state.tournamentList.limit)
  },

  // Check if has more
  hasMore: () => {
    return useTournamentStore((state) => state.tournamentList.hasMore)
  },

  // Get loading state
  isLoading: () => {
    return useTournamentStore((state) => state.tournamentList.isLoading)
  },

  // Get error
  getError: () => {
    return useTournamentStore((state) => state.tournamentList.error)
  },

  // Get pagination info - memoized to prevent infinite loops
  getPaginationInfo: () => {
    return useTournamentStore(
      useCallback((state) => ({
        currentPage: state.tournamentList.currentPage,
        totalCount: state.tournamentList.totalCount,
        limit: state.tournamentList.limit,
        hasMore: state.tournamentList.hasMore,
        totalPages: Math.ceil(state.tournamentList.totalCount / state.tournamentList.limit),
      }), [])
    )
  },
}

// Registration status selectors
export const useRegistrationStatusSelectors = {
  // Get registration status for tournament
  getRegistrationStatus: (tournamentId: string) => {
    return useTournamentStore((state) => state.registrationStatusCache[tournamentId])
  },

  // Get registration status loading
  getRegistrationStatusLoading: (tournamentId: string) => {
    return useTournamentStore((state) => state.tournamentCache[tournamentId]?.isLoading || false)
  },

  // Get registration status error
  getRegistrationStatusError: (tournamentId: string) => {
    return useTournamentStore((state) => state.tournamentCache[tournamentId]?.error || null)
  },

  // Check if user is registered
  isRegistered: (tournamentId: string) => {
    return useTournamentStore((state) => state.registrationStatusCache[tournamentId]?.isRegistered || false)
  },

  // Check if user can register
  canRegister: (tournamentId: string) => {
    return useTournamentStore((state) => state.registrationStatusCache[tournamentId]?.canRegister || false)
  },

  // Check if user can withdraw
  canWithdraw: (tournamentId: string) => {
    return useTournamentStore((state) => state.registrationStatusCache[tournamentId]?.canWithdraw || false)
  },

  // Check if tournament is full
  isTournamentFull: (tournamentId: string) => {
    return useTournamentStore((state) => state.registrationStatusCache[tournamentId]?.isFull || false)
  },

  // Get participant count
  getParticipantCount: (tournamentId: string) => {
    return useTournamentStore((state) => state.registrationStatusCache[tournamentId]?.participantCount || 0)
  },

  // Get max players
  getMaxPlayers: (tournamentId: string) => {
    return useTournamentStore((state) => state.registrationStatusCache[tournamentId]?.maxPlayers)
  },

  // Get registration deadline
  getRegistrationDeadline: (tournamentId: string) => {
    return useTournamentStore((state) => state.registrationStatusCache[tournamentId]?.registrationDeadline)
  },
}

// Filter selectors
export const useTournamentFilterSelectors = {
  // Get all filters
  getFilters: () => {
    return useTournamentStore((state) => state.filters)
  },

  // Get specific filter value
  getFilterValue: (key: string) => {
    return useTournamentStore((state) => (state.filters as any)[key])
  },

  // Check if filters are active - memoized to prevent infinite loops
  hasActiveFilters: () => {
    return useTournamentStore(
      useCallback((state) => {
        const filters = state.filters
        return Object.values(filters).some(value => 
          value !== '' && value !== null && value !== undefined
        )
      }, [])
    )
  },

  // Get active filter count - memoized to prevent infinite loops
  getActiveFilterCount: () => {
    return useTournamentStore(
      useCallback((state) => {
        const filters = state.filters
        return Object.values(filters).filter(value => 
          value !== '' && value !== null && value !== undefined
        ).length
      }, [])
    )
  },

  // Get filter summary - memoized to prevent infinite loops
  getFilterSummary: () => {
    return useTournamentStore(
      useCallback((state) => {
        const filters = state.filters
        const activeFilters = Object.entries(filters)
          .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
          .map(([key, value]) => ({ key, value }))
        
        return {
          filters,
          activeFilters,
          activeCount: activeFilters.length,
          hasActive: activeFilters.length > 0,
        }
      }, [])
    )
  },
}

// Action selectors
export const useTournamentActions = {
  // Tournament data actions
  cacheTournament: () => useTournamentStore((state) => state.cacheTournament),
  setCurrentTournament: () => useTournamentStore((state) => state.setCurrentTournament),
  clearTournamentCache: () => useTournamentStore((state) => state.clearTournamentCache),

  // Tournament list actions
  setTournamentList: () => useTournamentStore((state) => state.setTournamentList),
  setTournamentListPage: () => useTournamentStore((state) => state.setTournamentListPage),
  setTournamentListLoading: () => useTournamentStore((state) => state.setTournamentListLoading),
  setTournamentListError: () => useTournamentStore((state) => state.setTournamentListError),

  // Registration status actions
  setRegistrationStatus: () => useTournamentStore((state) => state.setRegistrationStatus),
  getRegistrationStatus: () => useTournamentStore((state) => state.getRegistrationStatus),
  updateRegistrationStatus: () => useTournamentStore((state) => state.updateRegistrationStatus),
  clearRegistrationStatus: () => useTournamentStore((state) => state.clearRegistrationStatus),
  clearAllRegistrationStatus: () => useTournamentStore((state) => state.clearAllRegistrationStatus),

  // Filter actions
  setFilters: () => useTournamentStore((state) => state.setFilters),
  resetFilters: () => useTournamentStore((state) => state.resetFilters),

  // Utility actions
  invalidateTournament: () => useTournamentStore((state) => state.invalidateTournament),
  invalidateTournamentList: () => useTournamentStore((state) => state.invalidateTournamentList),
  resetTournamentStore: () => useTournamentStore((state) => state.resetTournamentStore),
}

// Combined selectors for common use cases
export const useTournamentStoreSelectors = {
  // Get complete tournament state for a specific tournament
  getTournamentState: (tournamentId: string) => {
    const tournament = useTournamentDataSelectors.getTournamentById(tournamentId)
    const isLoading = useTournamentDataSelectors.getTournamentLoading(tournamentId)
    const error = useTournamentDataSelectors.getTournamentError(tournamentId)
    const cacheTournament = useTournamentActions.cacheTournament()
    const invalidateTournament = useTournamentActions.invalidateTournament()

    return useMemo(() => ({
      tournament: tournament?.tournament || null,
      isLoading,
      error,
      lastUpdated: tournament?.lastUpdated,
      fetch: () => cacheTournament({} as any),
      invalidate: () => invalidateTournament(tournamentId),
    }), [tournament, isLoading, error, cacheTournament, invalidateTournament, tournamentId])
  },

  // Get complete registration status for a specific tournament
  getRegistrationStatusState: (tournamentId: string) => {
    const status = useRegistrationStatusSelectors.getRegistrationStatus(tournamentId)
    const isLoading = useRegistrationStatusSelectors.getRegistrationStatusLoading(tournamentId)
    const error = useRegistrationStatusSelectors.getRegistrationStatusError(tournamentId)
    const updateRegistrationStatus = useTournamentActions.updateRegistrationStatus()
    const clearRegistrationStatus = useTournamentActions.clearRegistrationStatus()

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
      updateStatus: (updates: Partial<typeof status>) => updateRegistrationStatus(tournamentId, updates),
      clearStatus: () => clearRegistrationStatus(tournamentId),
    }), [status, isLoading, error, updateRegistrationStatus, clearRegistrationStatus, tournamentId])
  },

  // Get complete tournament list state
  getTournamentListState: () => {
    const tournaments = useTournamentListSelectors.getTournaments()
    const totalCount = useTournamentListSelectors.getTotalCount()
    const currentPage = useTournamentListSelectors.getCurrentPage()
    const limit = useTournamentListSelectors.getLimit()
    const hasMore = useTournamentListSelectors.hasMore()
    const isLoading = useTournamentListSelectors.isLoading()
    const error = useTournamentListSelectors.getError()
    const setTournamentList = useTournamentActions.setTournamentList()
    const setTournamentListPage = useTournamentActions.setTournamentListPage()
    const invalidateTournamentList = useTournamentActions.invalidateTournamentList()

    return useMemo(() => ({
      tournaments,
      totalCount,
      currentPage,
      limit,
      hasMore,
      isLoading,
      error,
      totalPages: Math.ceil(totalCount / limit),
      fetch: (filters?: any, page?: number) => setTournamentList(tournaments, totalCount),
      setPage: (page: number) => setTournamentListPage(page),
      invalidate: () => invalidateTournamentList(),
    }), [tournaments, totalCount, currentPage, limit, hasMore, isLoading, error, setTournamentList, setTournamentListPage, invalidateTournamentList])
  },

  // Get complete filter state
  getFilterState: () => {
    const filters = useTournamentFilterSelectors.getFilters()
    const hasActiveFilters = useTournamentFilterSelectors.hasActiveFilters()
    const activeFilterCount = useTournamentFilterSelectors.getActiveFilterCount()
    const setFilters = useTournamentActions.setFilters()
    const resetFilters = useTournamentActions.resetFilters()

    return useMemo(() => ({
      filters,
      hasActiveFilters,
      activeFilterCount,
      setFilters,
      resetFilters,
    }), [filters, hasActiveFilters, activeFilterCount, setFilters, resetFilters])
  },
}

// Performance-optimized selectors for specific use cases
export const useOptimizedTournamentSelectors = {
  // Get only the data needed for tournament card rendering - memoized to prevent infinite loops
  getTournamentCardData: (tournamentId: string) => {
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
  },

  // Get only the data needed for tournament list rendering - memoized to prevent infinite loops
  getTournamentListRenderData: () => {
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
  },

  // Get only the data needed for registration button rendering - memoized to prevent infinite loops
  getRegistrationButtonData: (tournamentId: string) => {
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
  },

  // Get only the data needed for filter rendering - memoized to prevent infinite loops
  getFilterRenderData: () => {
    return useTournamentStore(
      useCallback((state) => ({
        filters: state.filters,
        hasActiveFilters: Object.values(state.filters).some(value => 
          value !== '' && value !== null && value !== undefined
        ),
      }), [])
    )
  },
}
