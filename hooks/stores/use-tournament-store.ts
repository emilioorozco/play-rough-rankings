import { useCallback } from 'react'
import { useTournamentStore } from '@/stores/tournament-store'
import { 
  useCurrentTournament as useCurrentTournamentSelector,
  useCurrentTournamentId as useCurrentTournamentIdSelector,
  useTournaments,
  useTournamentTotalCount,
  useTournamentCurrentPage,
  useTournamentLimit,
  useTournamentHasMore,
  useTournamentListLoading,
  useTournamentListError,
  useTournamentListState,
  useRegistrationStatus,
  useRegistrationStatusLoading,
  useRegistrationStatusError,
  useTournamentFilters as useTournamentFiltersSelector,
  useHasActiveTournamentFilters,
  useActiveTournamentFilterCount,
  useTournamentActions,
  useTournamentCardData as useTournamentCardDataSelector,
  useTournamentListRenderData as useTournamentListRenderDataSelector,
  useRegistrationButtonData as useRegistrationButtonDataSelector,
  useTournamentFilterRenderData as useTournamentFilterRenderDataSelector
} from '@/stores/tournament-store-selectors'
import type { ApiTournament } from '@/lib/types/api'

// Current Tournament Management Hooks
export function useCurrentTournament() {
  const tournament = useCurrentTournamentSelector()
  const tournamentId = useCurrentTournamentIdSelector()
  const actions = useTournamentActions()

  const setTournament = useCallback((tournament: ApiTournament) => {
    actions.setCurrentTournament(tournament)
  }, [actions])

  const setTournamentId = useCallback((id: string | null) => {
    useTournamentStore.getState().setCurrentTournamentId(id)
  }, [])

  const clear = useCallback(() => {
    useTournamentStore.getState().clearCurrentTournament()
  }, [])

  return {
    tournament,
    tournamentId,
    setTournament,
    setTournamentId,
    clear,
  }
}

// Tournament List Management Hooks
export function useTournamentList() {
  const tournaments = useTournaments()
  const totalCount = useTournamentTotalCount()
  const currentPage = useTournamentCurrentPage()
  const limit = useTournamentLimit()
  const hasMore = useTournamentHasMore()
  const isLoading = useTournamentListLoading()
  const error = useTournamentListError()
  
  const actions = useTournamentActions()
  const addTournamentsToList = useTournamentStore((state) => state.addTournamentsToList)
  const resetTournamentList = useTournamentStore((state) => state.resetTournamentList)

  const setTournaments = useCallback((tournaments: ApiTournament[], totalCount: number) => {
    actions.setTournamentList(tournaments, totalCount)
  }, [actions])

  const addTournaments = useCallback((newTournaments: ApiTournament[]) => {
    addTournamentsToList(newTournaments)
  }, [addTournamentsToList])

  const setLoading = useCallback((isLoading: boolean) => {
    actions.setTournamentListLoading(isLoading)
  }, [actions])

  const setError = useCallback((error: string | null) => {
    actions.setTournamentListError(error)
  }, [actions])

  const setPage = useCallback((page: number) => {
    actions.setTournamentListPage(page)
  }, [actions])

  const reset = useCallback(() => {
    resetTournamentList()
  }, [resetTournamentList])

  return {
    tournaments,
    totalCount,
    currentPage,
    limit,
    hasMore,
    isLoading,
    error,
    setTournaments,
    addTournaments,
    setLoading,
    setError,
    setPage,
    reset,
  }
}

// Tournament Registration Status Management Hooks
export function useTournamentRegistrationStatus(tournamentId: string) {
  const status = useRegistrationStatus(tournamentId)
  const isLoading = useRegistrationStatusLoading(tournamentId)
  const error = useRegistrationStatusError(tournamentId)
  
  const actions = useTournamentActions()

  const setStatus = useCallback((newStatus: any) => {
    actions.setRegistrationStatus(tournamentId, newStatus)
  }, [tournamentId, actions])

  const updateStatus = useCallback((updates: any) => {
    actions.updateRegistrationStatus(tournamentId, updates)
  }, [tournamentId, actions])

  const clearStatus = useCallback(() => {
    actions.clearRegistrationStatus(tournamentId)
  }, [tournamentId, actions])

  return {
    status: status || {
      isRegistered: false,
      canRegister: false,
      canWithdraw: false,
      isFull: false,
      participantCount: 0,
    },
    isLoading,
    error,
    setStatus,
    updateStatus,
    clearStatus,
  }
}

// Tournament Filters Management Hooks
export function useTournamentFilters() {
  const filters = useTournamentFiltersSelector()
  const hasActiveFilters = useHasActiveTournamentFilters()
  const activeFilterCount = useActiveTournamentFilterCount()
  
  const actions = useTournamentActions()

  const setFilterValue = useCallback((key: keyof typeof filters, value: any) => {
    actions.setFilters({ [key]: value })
  }, [actions])

  const clear = useCallback(() => {
    actions.resetFilters()
  }, [actions])

  const reset = useCallback(() => {
    actions.resetFilters()
  }, [actions])

  return {
    filters,
    hasActiveFilters,
    activeFilterCount,
    setFilters: actions.setFilters,
    setFilter: setFilterValue,
    clear,
    reset,
  }
}

// Tournament Cache Management Hooks
export function useTournamentCache() {
  const cacheTournament = useTournamentStore((state) => state.cacheTournament)
  const getCachedTournament = useTournamentStore((state) => state.getCachedTournament)
  const updateCachedTournament = useTournamentStore((state) => state.updateCachedTournament)
  const removeCachedTournament = useTournamentStore((state) => state.removeCachedTournament)
  const clearTournamentCache = useTournamentStore((state) => state.clearTournamentCache)
  const tournamentCache = useTournamentStore((state) => state.tournamentCache)

  const cache = useCallback((tournament: ApiTournament) => {
    cacheTournament(tournament)
  }, [cacheTournament])

  const getCached = useCallback((tournamentId: string) => {
    return getCachedTournament(tournamentId)
  }, [getCachedTournament])

  const updateCached = useCallback((tournamentId: string, updates: Partial<ApiTournament>) => {
    updateCachedTournament(tournamentId, updates)
  }, [updateCachedTournament])

  const removeCached = useCallback((tournamentId: string) => {
    removeCachedTournament(tournamentId)
  }, [removeCachedTournament])

  const clear = useCallback(() => {
    clearTournamentCache()
  }, [clearTournamentCache])

  return {
    cache,
    getCachedTournament: getCached,
    updateCachedTournament: updateCached,
    removeCachedTournament: removeCached,
    clear,
    tournamentCache,
  }
}

// Bulk Operations Hooks
export function useTournamentStoreActions() {
  const actions = useTournamentActions()
  const setCurrentTournamentId = useTournamentStore((state) => state.setCurrentTournamentId)
  const clearCurrentTournament = useTournamentStore((state) => state.clearCurrentTournament)
  const addTournamentsToList = useTournamentStore((state) => state.addTournamentsToList)
  const resetTournamentList = useTournamentStore((state) => state.resetTournamentList)
  const cacheTournament = useTournamentStore((state) => state.cacheTournament)
  const getCachedTournament = useTournamentStore((state) => state.getCachedTournament)
  const updateCachedTournament = useTournamentStore((state) => state.updateCachedTournament)
  const removeCachedTournament = useTournamentStore((state) => state.removeCachedTournament)
  const clearTournamentCache = useTournamentStore((state) => state.clearTournamentCache)
  const clearAllRegistrationStatus = useTournamentStore((state) => state.clearAllRegistrationStatus)
  const invalidateTournament = useTournamentStore((state) => state.invalidateTournament)
  const invalidateTournamentList = useTournamentStore((state) => state.invalidateTournamentList)
  const refreshTournamentData = useTournamentStore((state) => state.refreshTournamentData)
  const resetTournamentStore = useTournamentStore((state) => state.resetTournamentStore)

  return {
    // Current tournament actions
    setCurrentTournament: actions.setCurrentTournament,
    setCurrentTournamentId,
    clearCurrentTournament,
    
    // Tournament list actions
    setTournamentList: actions.setTournamentList,
    addTournamentsToList,
    setTournamentListLoading: actions.setTournamentListLoading,
    setTournamentListError: actions.setTournamentListError,
    setTournamentListPage: actions.setTournamentListPage,
    resetTournamentList,
    
    // Tournament cache actions
    cacheTournament,
    getCachedTournament,
    updateCachedTournament,
    removeCachedTournament,
    clearTournamentCache,
    
    // Registration status actions
    setRegistrationStatus: actions.setRegistrationStatus,
    updateRegistrationStatus: actions.updateRegistrationStatus,
    clearRegistrationStatus: actions.clearRegistrationStatus,
    clearAllRegistrationStatus,
    
    // Filter actions
    setFilters: actions.setFilters,
    resetFilters: actions.resetFilters,
    
    // Utility actions
    invalidateTournament,
    invalidateTournamentList,
    refreshTournamentData,
    resetTournamentStore,
  }
}

// State Getters Hooks
export function useTournamentStoreState() {
  const currentTournament = useCurrentTournamentSelector()
  const currentTournamentId = useCurrentTournamentIdSelector()
  const tournamentList = useTournamentListState()
  const tournamentCache = useTournamentStore((state) => state.tournamentCache)
  const registrationStatusCache = useTournamentStore((state) => state.registrationStatusCache)
  const filters = useTournamentFiltersSelector()
  const loading = useTournamentStore((state) => state.loading)
  const errors = useTournamentStore((state) => state.errors)

  return {
    currentTournament,
    currentTournamentId,
    tournamentList,
    tournamentCache,
    registrationStatusCache,
    filters,
    loading,
    errors,
  }
}

// Additional convenience hooks for specific use cases
export function useTournamentCardData(tournamentId: string) {
  return useTournamentCardDataSelector(tournamentId)
}

export function useTournamentListRenderData() {
  return useTournamentListRenderDataSelector()
}

export function useRegistrationButtonData(tournamentId: string) {
  return useRegistrationButtonDataSelector(tournamentId)
}

export function useFilterRenderData() {
  return useTournamentFilterRenderDataSelector()
}

// Loading and Error Management Hooks
export function useTournamentLoading() {
  const loading = useTournamentStore((state) => state.loading)
  
  return {
    tournamentList: loading.tournamentList,
    currentTournament: loading.currentTournament,
    registrationStatus: loading.registrationStatus,
    isAnyLoading: Object.values(loading).some(Boolean),
  }
}

export function useTournamentErrors() {
  const errors = useTournamentStore((state) => state.errors)
  
  const setError = useTournamentStore((state) => state.setError)
  const clearError = useTournamentStore((state) => state.clearError)
  const clearAllErrors = useTournamentStore((state) => state.clearAllErrors)

  const setErrorCallback = useCallback((key: keyof typeof errors, error: string | null) => {
    setError(key, error)
  }, [setError])

  const clearErrorCallback = useCallback((key: keyof typeof errors) => {
    clearError(key)
  }, [clearError])

  const clearAllErrorsCallback = useCallback(() => {
    clearAllErrors()
  }, [clearAllErrors])

  return {
    tournamentList: errors.tournamentList,
    currentTournament: errors.currentTournament,
    registrationStatus: errors.registrationStatus,
    hasAnyError: Object.values(errors).some(Boolean),
    setError: setErrorCallback,
    clearError: clearErrorCallback,
    clearAllErrors: clearAllErrorsCallback,
  }
}

// Operations Hooks
export function useTournamentOperations() {
  const invalidateTournament = useTournamentStore((state) => state.invalidateTournament)
  const invalidateTournamentList = useTournamentStore((state) => state.invalidateTournamentList)
  const refreshTournamentData = useTournamentStore((state) => state.refreshTournamentData)
  const resetTournamentStore = useTournamentStore((state) => state.resetTournamentStore)

  const invalidateTournamentCallback = useCallback((tournamentId: string) => {
    invalidateTournament(tournamentId)
  }, [invalidateTournament])

  const invalidateTournamentListCallback = useCallback(() => {
    invalidateTournamentList()
  }, [invalidateTournamentList])

  const refreshTournamentDataCallback = useCallback((tournamentId: string) => {
    refreshTournamentData(tournamentId)
  }, [refreshTournamentData])

  const resetStoreCallback = useCallback(() => {
    resetTournamentStore()
  }, [resetTournamentStore])

  return {
    invalidateTournament: invalidateTournamentCallback,
    invalidateTournamentList: invalidateTournamentListCallback,
    refreshTournamentData: refreshTournamentDataCallback,
    resetStore: resetStoreCallback,
  }
}
