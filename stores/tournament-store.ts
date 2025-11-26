import { create } from 'zustand'
import { useMemo } from 'react'
import type { ApiTournament } from '@/lib/types/api'

// Types for tournament store
interface TournamentFilters {
  gameId: string
  storeId: string
  status: "UPCOMING" | "ACTIVE" | "COMPLETED" | ""
  startDate: string
  endDate: string
  search: string
  organizerId?: string
}

interface TournamentListState {
  tournaments: ApiTournament[]
  totalCount: number
  currentPage: number
  limit: number
  hasMore: boolean
  isLoading: boolean
  error: string | null
}

interface RegistrationStatus {
  isRegistered: boolean
  canRegister: boolean
  canWithdraw: boolean
  registrationDeadline?: Date
  isFull: boolean
  participantCount: number
  maxPlayers?: number
}

interface TournamentCache {
  [tournamentId: string]: {
    tournament: ApiTournament
    registrationStatus: RegistrationStatus
    lastUpdated: Date
    isLoading: boolean
    error: string | null
  }
}

interface TournamentState {
  // Current tournament context
  currentTournament: ApiTournament | null
  currentTournamentId: string | null
  
  // Tournament list state
  tournamentList: TournamentListState
  
  // Tournament cache for individual tournaments
  tournamentCache: TournamentCache
  
  // Registration status cache
  registrationStatusCache: Record<string, RegistrationStatus>
  
  // Selected round per tournament (for bracket view)
  selectedRoundCache: Record<string, number>
  
  // Filters
  filters: TournamentFilters
  
  // Loading states
  loading: {
    tournamentList: boolean
    currentTournament: boolean
    registrationStatus: boolean
  }
  
  // Error states
  errors: {
    tournamentList: string | null
    currentTournament: string | null
    registrationStatus: string | null
  }
  
  // Actions for current tournament
  setCurrentTournament: (tournament: ApiTournament) => void
  setCurrentTournamentId: (tournamentId: string | null) => void
  clearCurrentTournament: () => void
  
  // Actions for tournament list
  setTournamentList: (tournaments: ApiTournament[], totalCount: number) => void
  addTournamentsToList: (tournaments: ApiTournament[]) => void
  setTournamentListLoading: (isLoading: boolean) => void
  setTournamentListError: (error: string | null) => void
  setTournamentListPage: (page: number) => void
  resetTournamentList: () => void
  
  // Actions for tournament cache
  cacheTournament: (tournament: ApiTournament) => void
  getCachedTournament: (tournamentId: string) => ApiTournament | null
  updateCachedTournament: (tournamentId: string, updates: Partial<ApiTournament>) => void
  removeCachedTournament: (tournamentId: string) => void
  clearTournamentCache: () => void
  
  // Actions for registration status
  setRegistrationStatus: (tournamentId: string, status: RegistrationStatus) => void
  getRegistrationStatus: (tournamentId: string) => RegistrationStatus | null
  updateRegistrationStatus: (tournamentId: string, updates: Partial<RegistrationStatus>) => void
  clearRegistrationStatus: (tournamentId: string) => void
  clearAllRegistrationStatus: () => void
  
  // Actions for selected round
  setSelectedRound: (tournamentId: string, round: number) => void
  getSelectedRound: (tournamentId: string) => number | null
  clearSelectedRound: (tournamentId: string) => void
  
  // Actions for filters
  setFilters: (filters: Partial<TournamentFilters>) => void
  resetFilters: () => void
  
  // Actions for loading states
  setLoading: (key: keyof TournamentState['loading'], isLoading: boolean) => void
  
  // Actions for error states
  setError: (key: keyof TournamentState['errors'], error: string | null) => void
  clearError: (key: keyof TournamentState['errors']) => void
  clearAllErrors: () => void
  
  // Utility actions
  invalidateTournament: (tournamentId: string) => void
  invalidateTournamentList: () => void
  refreshTournamentData: (tournamentId: string) => void
  resetTournamentStore: () => void
  
  // tRPC integration helpers
  handleQueryLoading: (queryType: 'tournamentList' | 'currentTournament' | 'registrationStatus') => void
  handleQuerySuccess: (queryType: 'tournamentList' | 'currentTournament' | 'registrationStatus', data?: any) => void
  handleQueryError: (queryType: 'tournamentList' | 'currentTournament' | 'registrationStatus', error: string) => void
}

// Initial state
const initialFilters: TournamentFilters = {
  gameId: '',
  storeId: '',
  status: '',
  startDate: '',
  endDate: '',
  search: '',
  organizerId: undefined,
}

const initialTournamentList: TournamentListState = {
  tournaments: [],
  totalCount: 0,
  currentPage: 0,
  limit: 12,
  hasMore: false,
  isLoading: false,
  error: null,
}

const initialLoading = {
  tournamentList: false,
  currentTournament: false,
  registrationStatus: false,
}

const initialErrors = {
  tournamentList: null,
  currentTournament: null,
  registrationStatus: null,
}

export const useTournamentStore = create<TournamentState>((set, get) => ({
  // Initial state
  currentTournament: null,
  currentTournamentId: null,
  tournamentList: { ...initialTournamentList },
  tournamentCache: {},
  registrationStatusCache: {},
  selectedRoundCache: {},
  filters: { ...initialFilters },
  loading: { ...initialLoading },
  errors: { ...initialErrors },
  
  // Current tournament actions
  setCurrentTournament: (tournament) => {
    set((state) => ({
      currentTournament: tournament,
      currentTournamentId: tournament.id,
      tournamentCache: {
        ...state.tournamentCache,
        [tournament.id]: {
          tournament,
          registrationStatus: state.registrationStatusCache[tournament.id] || {
            isRegistered: false,
            canRegister: false,
            canWithdraw: false,
            isFull: false,
            participantCount: 0,
          },
          lastUpdated: new Date(),
          isLoading: false,
          error: null,
        },
      },
    }))
  },
  
  setCurrentTournamentId: (tournamentId) => {
    set((state) => ({
      currentTournamentId: tournamentId,
      currentTournament: tournamentId ? state.tournamentCache[tournamentId]?.tournament || null : null,
    }))
  },
  
  clearCurrentTournament: () => {
    set({
      currentTournament: null,
      currentTournamentId: null,
    })
  },
  
  // Tournament list actions
  setTournamentList: (tournaments, totalCount) => {
    set((state) => ({
      tournamentList: {
        ...state.tournamentList,
        tournaments,
        totalCount,
        hasMore: tournaments.length < totalCount,
        isLoading: false,
        error: null,
      },
    }))
  },
  
  addTournamentsToList: (tournaments) => {
    set((state) => ({
      tournamentList: {
        ...state.tournamentList,
        tournaments: [...state.tournamentList.tournaments, ...tournaments],
        hasMore: state.tournamentList.tournaments.length + tournaments.length < state.tournamentList.totalCount,
      },
    }))
  },
  
  setTournamentListLoading: (isLoading) => {
    set((state) => ({
      tournamentList: {
        ...state.tournamentList,
        isLoading,
      },
      loading: {
        ...state.loading,
        tournamentList: isLoading,
      },
    }))
  },
  
  setTournamentListError: (error) => {
    set((state) => ({
      tournamentList: {
        ...state.tournamentList,
        error,
        isLoading: false,
      },
      errors: {
        ...state.errors,
        tournamentList: error,
      },
    }))
  },
  
  setTournamentListPage: (page) => {
    set((state) => ({
      tournamentList: {
        ...state.tournamentList,
        currentPage: page,
      },
    }))
  },
  
  resetTournamentList: () => {
    set({
      tournamentList: { ...initialTournamentList },
    })
  },
  
  // Tournament cache actions
  cacheTournament: (tournament) => {
    set((state) => ({
      tournamentCache: {
        ...state.tournamentCache,
        [tournament.id]: {
          tournament,
          registrationStatus: state.registrationStatusCache[tournament.id] || {
            isRegistered: false,
            canRegister: false,
            canWithdraw: false,
            isFull: false,
            participantCount: 0,
          },
          lastUpdated: new Date(),
          isLoading: false,
          error: null,
        },
      },
    }))
  },
  
  getCachedTournament: (tournamentId) => {
    const state = get()
    return state.tournamentCache[tournamentId]?.tournament || null
  },
  
  updateCachedTournament: (tournamentId, updates) => {
    set((state) => {
      const cached = state.tournamentCache[tournamentId]
      if (!cached) return state
      
      return {
        tournamentCache: {
          ...state.tournamentCache,
          [tournamentId]: {
            ...cached,
            tournament: { ...cached.tournament, ...updates },
            lastUpdated: new Date(),
          },
        },
        // Update current tournament if it's the same
        currentTournament: state.currentTournamentId === tournamentId 
          ? { ...cached.tournament, ...updates }
          : state.currentTournament,
      }
    })
  },
  
  removeCachedTournament: (tournamentId) => {
    set((state) => {
      const newCache = { ...state.tournamentCache }
      delete newCache[tournamentId]
      
      return {
        tournamentCache: newCache,
        // Clear current tournament if it's the same
        currentTournament: state.currentTournamentId === tournamentId ? null : state.currentTournament,
        currentTournamentId: state.currentTournamentId === tournamentId ? null : state.currentTournamentId,
      }
    })
  },
  
  clearTournamentCache: () => {
    set({
      tournamentCache: {},
      currentTournament: null,
      currentTournamentId: null,
    })
  },
  
  // Registration status actions
  setRegistrationStatus: (tournamentId, status) => {
    set((state) => ({
      registrationStatusCache: {
        ...state.registrationStatusCache,
        [tournamentId]: status,
      },
      // Update cache if tournament is cached
      tournamentCache: state.tournamentCache[tournamentId] ? {
        ...state.tournamentCache,
        [tournamentId]: {
          ...state.tournamentCache[tournamentId],
          registrationStatus: status,
        },
      } : state.tournamentCache,
    }))
  },
  
  getRegistrationStatus: (tournamentId) => {
    const state = get()
    return state.registrationStatusCache[tournamentId] || null
  },
  
  updateRegistrationStatus: (tournamentId, updates) => {
    set((state) => {
      const currentStatus = state.registrationStatusCache[tournamentId]
      if (!currentStatus) return state
      
      const newStatus = { ...currentStatus, ...updates }
      
      return {
        registrationStatusCache: {
          ...state.registrationStatusCache,
          [tournamentId]: newStatus,
        },
        // Update cache if tournament is cached
        tournamentCache: state.tournamentCache[tournamentId] ? {
          ...state.tournamentCache,
          [tournamentId]: {
            ...state.tournamentCache[tournamentId],
            registrationStatus: newStatus,
          },
        } : state.tournamentCache,
      }
    })
  },
  
  clearRegistrationStatus: (tournamentId) => {
    set((state) => {
      const newCache = { ...state.registrationStatusCache }
      delete newCache[tournamentId]
      
      return {
        registrationStatusCache: newCache,
        // Update cache if tournament is cached
        tournamentCache: state.tournamentCache[tournamentId] ? {
          ...state.tournamentCache,
          [tournamentId]: {
            ...state.tournamentCache[tournamentId],
            registrationStatus: {
              isRegistered: false,
              canRegister: false,
              canWithdraw: false,
              isFull: false,
              participantCount: 0,
            },
          },
        } : state.tournamentCache,
      }
    })
  },
  
  clearAllRegistrationStatus: () => {
    set({
      registrationStatusCache: {},
    })
  },
  
  // Selected round actions
  setSelectedRound: (tournamentId, round) => {
    set((state) => ({
      selectedRoundCache: {
        ...state.selectedRoundCache,
        [tournamentId]: round,
      },
    }))
  },
  
  getSelectedRound: (tournamentId) => {
    const state = get()
    return state.selectedRoundCache[tournamentId] || null
  },
  
  clearSelectedRound: (tournamentId) => {
    set((state) => {
      const newCache = { ...state.selectedRoundCache }
      delete newCache[tournamentId]
      return {
        selectedRoundCache: newCache,
      }
    })
  },
  
  // Filter actions
  setFilters: (filters) => {
    set((state) => {
      const newFilters = { ...state.filters, ...filters }
      const filtersChanged = JSON.stringify(newFilters) !== JSON.stringify(state.filters)
      
      return {
        filters: newFilters,
        // Only reset tournament list when filters actually change
        tournamentList: filtersChanged ? { ...initialTournamentList } : state.tournamentList,
      }
    })
  },
  
  resetFilters: () => {
    set({
      filters: { ...initialFilters },
      tournamentList: { ...initialTournamentList },
    })
  },
  
  // Loading actions
  setLoading: (key, isLoading) => {
    set((state) => ({
      loading: {
        ...state.loading,
        [key]: isLoading,
      },
    }))
  },
  
  // Error actions
  setError: (key, error) => {
    set((state) => ({
      errors: {
        ...state.errors,
        [key]: error,
      },
    }))
  },
  
  clearError: (key) => {
    set((state) => ({
      errors: {
        ...state.errors,
        [key]: null,
      },
    }))
  },
  
  clearAllErrors: () => {
    set({
      errors: { ...initialErrors },
    })
  },
  
  // Utility actions
  invalidateTournament: (tournamentId) => {
    set((state) => {
      const newCache = { ...state.tournamentCache }
      if (newCache[tournamentId]) {
        newCache[tournamentId] = {
          ...newCache[tournamentId],
          lastUpdated: new Date(0), // Mark as stale
        }
      }
      
      return {
        tournamentCache: newCache,
      }
    })
  },
  
  invalidateTournamentList: () => {
    set((_state) => ({
      tournamentList: { ...initialTournamentList },
    }))
  },
  
  refreshTournamentData: (tournamentId) => {
    const state = get()
    // This would typically trigger a refetch in the component
    // The actual refetch logic would be handled by the component using the store
    state.invalidateTournament(tournamentId)
  },
  
  resetTournamentStore: () => {
    set({
      currentTournament: null,
      currentTournamentId: null,
      tournamentList: { ...initialTournamentList },
      tournamentCache: {},
      registrationStatusCache: {},
      selectedRoundCache: {},
      filters: { ...initialFilters },
      loading: { ...initialLoading },
      errors: { ...initialErrors },
    })
  },
  
  // tRPC integration helpers
  handleQueryLoading: (queryType) => {
    set((state) => ({
      loading: {
        ...state.loading,
        [queryType]: true,
      },
      errors: {
        ...state.errors,
        [queryType]: null,
      },
    }))
  },
  
  handleQuerySuccess: (queryType, _data) => {
    set((state) => ({
      loading: {
        ...state.loading,
        [queryType]: false,
      },
      errors: {
        ...state.errors,
        [queryType]: null,
      },
    }))
  },
  
  handleQueryError: (queryType, error) => {
    set((state) => ({
      loading: {
        ...state.loading,
        [queryType]: false,
      },
      errors: {
        ...state.errors,
        [queryType]: error,
      },
    }))
  },
}))

// Memoized selectors for better performance
export const useCurrentTournament = () => {
  const currentTournament = useTournamentStore((state) => state.currentTournament)
  const currentTournamentId = useTournamentStore((state) => state.currentTournamentId)
  const setCurrentTournament = useTournamentStore((state) => state.setCurrentTournament)
  const setCurrentTournamentId = useTournamentStore((state) => state.setCurrentTournamentId)
  const clearCurrentTournament = useTournamentStore((state) => state.clearCurrentTournament)
  
  return useMemo(() => ({
    tournament: currentTournament,
    tournamentId: currentTournamentId,
    setTournament: setCurrentTournament,
    setTournamentId: setCurrentTournamentId,
    clearTournament: clearCurrentTournament,
  }), [currentTournament, currentTournamentId, setCurrentTournament, setCurrentTournamentId, clearCurrentTournament])
}

export const useTournamentList = () => {
  const tournamentList = useTournamentStore((state) => state.tournamentList)
  const setTournamentList = useTournamentStore((state) => state.setTournamentList)
  const addTournamentsToList = useTournamentStore((state) => state.addTournamentsToList)
  const setTournamentListLoading = useTournamentStore((state) => state.setTournamentListLoading)
  const setTournamentListError = useTournamentStore((state) => state.setTournamentListError)
  const setTournamentListPage = useTournamentStore((state) => state.setTournamentListPage)
  const resetTournamentList = useTournamentStore((state) => state.resetTournamentList)
  const setFilters = useTournamentStore((state) => state.setFilters)
  
  return useMemo(() => ({
    ...tournamentList,
    setTournaments: setTournamentList,
    addTournaments: addTournamentsToList,
    setLoading: setTournamentListLoading,
    setError: setTournamentListError,
    setPage: setTournamentListPage,
    reset: resetTournamentList,
    setFilters,
  }), [tournamentList, setTournamentList, addTournamentsToList, setTournamentListLoading, setTournamentListError, setTournamentListPage, resetTournamentList, setFilters])
}

export const useTournamentCache = () => {
  const tournamentCache = useTournamentStore((state) => state.tournamentCache)
  const cacheTournament = useTournamentStore((state) => state.cacheTournament)
  const getCachedTournament = useTournamentStore((state) => state.getCachedTournament)
  const updateCachedTournament = useTournamentStore((state) => state.updateCachedTournament)
  const removeCachedTournament = useTournamentStore((state) => state.removeCachedTournament)
  const clearTournamentCache = useTournamentStore((state) => state.clearTournamentCache)
  
  return useMemo(() => ({
    cache: tournamentCache,
    cacheTournament,
    getCachedTournament,
    updateCachedTournament,
    removeCachedTournament,
    clearCache: clearTournamentCache,
  }), [tournamentCache, cacheTournament, getCachedTournament, updateCachedTournament, removeCachedTournament, clearTournamentCache])
}

export const useRegistrationStatus = (tournamentId: string) => {
  const registrationStatus = useTournamentStore((state) => state.registrationStatusCache[tournamentId])
  const setRegistrationStatus = useTournamentStore((state) => state.setRegistrationStatus)
  const updateRegistrationStatus = useTournamentStore((state) => state.updateRegistrationStatus)
  const clearRegistrationStatus = useTournamentStore((state) => state.clearRegistrationStatus)
  
  return useMemo(() => ({
    status: registrationStatus || {
      isRegistered: false,
      canRegister: false,
      canWithdraw: false,
      isFull: false,
      participantCount: 0,
    },
    setStatus: (status: RegistrationStatus) => setRegistrationStatus(tournamentId, status),
    updateStatus: (updates: Partial<RegistrationStatus>) => updateRegistrationStatus(tournamentId, updates),
    clearStatus: () => clearRegistrationStatus(tournamentId),
  }), [tournamentId, registrationStatus, setRegistrationStatus, updateRegistrationStatus, clearRegistrationStatus])
}

export const useTournamentFilters = () => {
  const filters = useTournamentStore((state) => state.filters)
  const setFilters = useTournamentStore((state) => state.setFilters)
  const resetFilters = useTournamentStore((state) => state.resetFilters)
  
  return useMemo(() => ({
    filters,
    setFilters,
    resetFilters,
  }), [filters, setFilters, resetFilters])
}

export const useTournamentLoading = () => {
  const loading = useTournamentStore((state) => state.loading)
  const setLoading = useTournamentStore((state) => state.setLoading)
  
  return useMemo(() => ({
    ...loading,
    setLoading,
    isAnyLoading: Object.values(loading).some(Boolean),
  }), [loading, setLoading])
}

export const useTournamentErrors = () => {
  const errors = useTournamentStore((state) => state.errors)
  const setError = useTournamentStore((state) => state.setError)
  const clearError = useTournamentStore((state) => state.clearError)
  const clearAllErrors = useTournamentStore((state) => state.clearAllErrors)
  
  return useMemo(() => ({
    ...errors,
    setError,
    clearError,
    clearAllErrors,
    hasAnyError: Object.values(errors).some(Boolean),
  }), [errors, setError, clearError, clearAllErrors])
}

// Utility hook for tournament operations
export const useTournamentOperations = () => {
  const invalidateTournament = useTournamentStore((state) => state.invalidateTournament)
  const invalidateTournamentList = useTournamentStore((state) => state.invalidateTournamentList)
  const refreshTournamentData = useTournamentStore((state) => state.refreshTournamentData)
  const resetTournamentStore = useTournamentStore((state) => state.resetTournamentStore)
  
  return useMemo(() => ({
    invalidateTournament,
    invalidateTournamentList,
    refreshTournamentData,
    resetStore: resetTournamentStore,
  }), [invalidateTournament, invalidateTournamentList, refreshTournamentData, resetTournamentStore])
}

// Export types for use in components
export type { TournamentFilters, TournamentListState, RegistrationStatus, TournamentCache }
