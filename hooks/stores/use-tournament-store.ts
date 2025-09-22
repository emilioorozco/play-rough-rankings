import { useCallback } from 'react'
import { useTournamentStore } from '@/stores/tournament-store'
import { 
  useTournamentDataSelectors,
  useTournamentListSelectors,
  useRegistrationStatusSelectors,
  useTournamentFilterSelectors,
  useTournamentActions,
  useTournamentStoreSelectors,
  useOptimizedTournamentSelectors
} from '@/stores/tournament-store-selectors'
import type { ApiTournament } from '@/lib/types/api'

// Current Tournament Management Hooks
export function useCurrentTournament() {
  const tournament = useTournamentDataSelectors.getCurrentTournament()
  const tournamentId = useTournamentDataSelectors.getCurrentTournamentId()
  const setCurrentTournament = useTournamentActions.setCurrentTournament()
  const setCurrentTournamentId = useTournamentStore((state) => state.setCurrentTournamentId)
  const clearCurrentTournament = useTournamentStore((state) => state.clearCurrentTournament)

  const setTournament = useCallback((tournament: ApiTournament) => {
    setCurrentTournament(tournament)
  }, [setCurrentTournament])

  const setTournamentId = useCallback((id: string | null) => {
    setCurrentTournamentId(id)
  }, [setCurrentTournamentId])

  const clear = useCallback(() => {
    clearCurrentTournament()
  }, [clearCurrentTournament])

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
  const tournaments = useTournamentListSelectors.getTournaments()
  const totalCount = useTournamentListSelectors.getTotalCount()
  const currentPage = useTournamentListSelectors.getCurrentPage()
  const limit = useTournamentListSelectors.getLimit()
  const hasMore = useTournamentListSelectors.hasMore()
  const isLoading = useTournamentListSelectors.isLoading()
  const error = useTournamentListSelectors.getError()
  
  const setTournamentList = useTournamentActions.setTournamentList()
  const addTournamentsToList = useTournamentStore((state) => state.addTournamentsToList)
  const setTournamentListLoading = useTournamentActions.setTournamentListLoading()
  const setTournamentListError = useTournamentActions.setTournamentListError()
  const setTournamentListPage = useTournamentActions.setTournamentListPage()
  const resetTournamentList = useTournamentStore((state) => state.resetTournamentList)

  const setTournaments = useCallback((tournaments: ApiTournament[], totalCount: number) => {
    setTournamentList(tournaments, totalCount)
  }, [setTournamentList])

  const addTournaments = useCallback((newTournaments: ApiTournament[]) => {
    addTournamentsToList(newTournaments)
  }, [addTournamentsToList])

  const setLoading = useCallback((isLoading: boolean) => {
    setTournamentListLoading(isLoading)
  }, [setTournamentListLoading])

  const setError = useCallback((error: string | null) => {
    setTournamentListError(error)
  }, [setTournamentListError])

  const setPage = useCallback((page: number) => {
    setTournamentListPage(page)
  }, [setTournamentListPage])

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
  const status = useRegistrationStatusSelectors.getRegistrationStatus(tournamentId)
  const isLoading = useRegistrationStatusSelectors.getRegistrationStatusLoading(tournamentId)
  const error = useRegistrationStatusSelectors.getRegistrationStatusError(tournamentId)
  
  const setRegistrationStatus = useTournamentActions.setRegistrationStatus()
  const updateRegistrationStatus = useTournamentActions.updateRegistrationStatus()
  const clearRegistrationStatus = useTournamentActions.clearRegistrationStatus()

  const setStatus = useCallback((newStatus: any) => {
    setRegistrationStatus(tournamentId, newStatus)
  }, [tournamentId, setRegistrationStatus])

  const updateStatus = useCallback((updates: any) => {
    updateRegistrationStatus(tournamentId, updates)
  }, [tournamentId, updateRegistrationStatus])

  const clearStatus = useCallback(() => {
    clearRegistrationStatus(tournamentId)
  }, [tournamentId, clearRegistrationStatus])

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
  const filters = useTournamentFilterSelectors.getFilters()
  const hasActiveFilters = useTournamentFilterSelectors.hasActiveFilters()
  const activeFilterCount = useTournamentFilterSelectors.getActiveFilterCount()
  
  const setFilters = useTournamentActions.setFilters()
  const setFilter = useTournamentActions.setFilter()
  const clearFilters = useTournamentActions.clearFilters()
  const resetFilters = useTournamentActions.resetFilters()

  const setFilterValue = useCallback((key: keyof typeof filters, value: any) => {
    setFilter(key, value)
  }, [setFilter])

  const clear = useCallback(() => {
    clearFilters()
  }, [clearFilters])

  const reset = useCallback(() => {
    resetFilters()
  }, [resetFilters])

  return {
    filters,
    hasActiveFilters,
    activeFilterCount,
    setFilters,
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
  const setCurrentTournament = useTournamentActions.setCurrentTournament()
  const setCurrentTournamentId = useTournamentStore((state) => state.setCurrentTournamentId)
  const clearCurrentTournament = useTournamentStore((state) => state.clearCurrentTournament)
  const setTournamentList = useTournamentActions.setTournamentList()
  const addTournamentsToList = useTournamentStore((state) => state.addTournamentsToList)
  const setTournamentListLoading = useTournamentActions.setTournamentListLoading()
  const setTournamentListError = useTournamentActions.setTournamentListError()
  const setTournamentListPage = useTournamentActions.setTournamentListPage()
  const resetTournamentList = useTournamentStore((state) => state.resetTournamentList)
  const cacheTournament = useTournamentStore((state) => state.cacheTournament)
  const getCachedTournament = useTournamentStore((state) => state.getCachedTournament)
  const updateCachedTournament = useTournamentStore((state) => state.updateCachedTournament)
  const removeCachedTournament = useTournamentStore((state) => state.removeCachedTournament)
  const clearTournamentCache = useTournamentStore((state) => state.clearTournamentCache)
  const setRegistrationStatus = useTournamentActions.setRegistrationStatus()
  const updateRegistrationStatus = useTournamentActions.updateRegistrationStatus()
  const clearRegistrationStatus = useTournamentActions.clearRegistrationStatus()
  const clearAllRegistrationStatus = useTournamentStore((state) => state.clearAllRegistrationStatus)
  const setFilters = useTournamentActions.setFilters()
  const setFilter = useTournamentActions.setFilter()
  const clearFilters = useTournamentActions.clearFilters()
  const resetFilters = useTournamentActions.resetFilters()
  const invalidateTournament = useTournamentStore((state) => state.invalidateTournament)
  const invalidateTournamentList = useTournamentStore((state) => state.invalidateTournamentList)
  const refreshTournamentData = useTournamentStore((state) => state.refreshTournamentData)
  const resetTournamentStore = useTournamentStore((state) => state.resetTournamentStore)

  return {
    // Current tournament actions
    setCurrentTournament,
    setCurrentTournamentId,
    clearCurrentTournament,
    
    // Tournament list actions
    setTournamentList,
    addTournamentsToList,
    setTournamentListLoading,
    setTournamentListError,
    setTournamentListPage,
    resetTournamentList,
    
    // Tournament cache actions
    cacheTournament,
    getCachedTournament,
    updateCachedTournament,
    removeCachedTournament,
    clearTournamentCache,
    
    // Registration status actions
    setRegistrationStatus,
    updateRegistrationStatus,
    clearRegistrationStatus,
    clearAllRegistrationStatus,
    
    // Filter actions
    setFilters,
    setFilter,
    clearFilters,
    resetFilters,
    
    // Utility actions
    invalidateTournament,
    invalidateTournamentList,
    refreshTournamentData,
    resetTournamentStore,
  }
}

// State Getters Hooks
export function useTournamentStoreState() {
  const currentTournament = useTournamentDataSelectors.getCurrentTournament()
  const currentTournamentId = useTournamentDataSelectors.getCurrentTournamentId()
  const tournamentList = useTournamentListSelectors.getTournamentListState()
  const tournamentCache = useTournamentStore((state) => state.tournamentCache)
  const registrationStatusCache = useTournamentStore((state) => state.registrationStatusCache)
  const filters = useTournamentFilterSelectors.getFilters()
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
  return useOptimizedTournamentSelectors.getTournamentCardData(tournamentId)
}

export function useTournamentListRenderData() {
  return useOptimizedTournamentSelectors.getTournamentListRenderData()
}

export function useRegistrationButtonData(tournamentId: string) {
  return useOptimizedTournamentSelectors.getRegistrationButtonData(tournamentId)
}

export function useFilterRenderData() {
  return useOptimizedTournamentSelectors.getFilterRenderData()
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
