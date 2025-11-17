import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { 
  useTournamentStore,
  useCurrentTournament,
  useTournamentList,
  useTournamentCache,
  useRegistrationStatus,
  useTournamentFilters,
  useTournamentLoading,
  useTournamentErrors,
  useTournamentOperations,
  type RegistrationStatus 
} from '@/stores/tournament-store'
import { createMockTournament } from '../../utils/test-utils'

describe('Tournament Store', () => {
  const mockTournament = createMockTournament()
  const mockTournament2 = createMockTournament({ id: 'tournament-2', name: 'Tournament 2' })
  const mockTournaments = [mockTournament, mockTournament2]

  beforeEach(() => {
    // Reset entire store state before each test
    act(() => {
      useTournamentStore.getState().resetTournamentStore()
    })
  })

  describe('Current Tournament Management', () => {
    it('should set current tournament', () => {
      act(() => {
        useTournamentStore.getState().setCurrentTournament(mockTournament)
      })

      const store = useTournamentStore.getState()
      expect(store.currentTournament).toEqual(mockTournament)
      expect(store.currentTournamentId).toBe(mockTournament.id)
    })

    it('should cache tournament when setting current tournament', () => {
      act(() => {
        useTournamentStore.getState().setCurrentTournament(mockTournament)
      })

      const store = useTournamentStore.getState()
      const cached = store.tournamentCache[mockTournament.id]
      expect(cached).toBeDefined()
      expect(cached.tournament).toEqual(mockTournament)
      expect(cached.lastUpdated).toBeInstanceOf(Date)
    })

    it('should set current tournament by ID', () => {
      // First cache a tournament
      act(() => {
        useTournamentStore.getState().cacheTournament(mockTournament)
      })

      // Then set it as current by ID
      act(() => {
        useTournamentStore.getState().setCurrentTournamentId(mockTournament.id)
      })

      const store = useTournamentStore.getState()
      expect(store.currentTournamentId).toBe(mockTournament.id)
      expect(store.currentTournament).toEqual(mockTournament)
    })

    it('should clear current tournament when setting ID to null', () => {
      // First set a tournament
      act(() => {
        useTournamentStore.getState().setCurrentTournament(mockTournament)
      })

      // Then clear by setting ID to null
      act(() => {
        useTournamentStore.getState().setCurrentTournamentId(null)
      })

      const store = useTournamentStore.getState()
      expect(store.currentTournamentId).toBeNull()
      expect(store.currentTournament).toBeNull()
    })

    it('should clear current tournament', () => {
      // First set a tournament
      act(() => {
        useTournamentStore.getState().setCurrentTournament(mockTournament)
      })

      let store = useTournamentStore.getState()
      expect(store.currentTournament).toEqual(mockTournament)

      // Then clear it
      act(() => {
        useTournamentStore.getState().clearCurrentTournament()
      })

      store = useTournamentStore.getState()
      expect(store.currentTournament).toBeNull()
      expect(store.currentTournamentId).toBeNull()
    })
  })

  describe('Tournament List Management', () => {
    it('should set tournament list', () => {
      act(() => {
        useTournamentStore.getState().setTournamentList(mockTournaments, 10)
      })

      const store = useTournamentStore.getState()
      expect(store.tournamentList.tournaments).toEqual(mockTournaments)
      expect(store.tournamentList.totalCount).toBe(10)
      expect(store.tournamentList.hasMore).toBe(true) // 2 < 10
      expect(store.tournamentList.isLoading).toBe(false)
      expect(store.tournamentList.error).toBeNull()
    })

    it('should calculate hasMore correctly when all tournaments loaded', () => {
      act(() => {
        useTournamentStore.getState().setTournamentList(mockTournaments, 2)
      })

      const store = useTournamentStore.getState()
      expect(store.tournamentList.hasMore).toBe(false) // 2 === 2
    })

    it('should add tournaments to list', () => {
      const newTournament = createMockTournament({ id: 'new-tournament', name: 'New Tournament' })

      // First set initial list with totalCount
      act(() => {
        useTournamentStore.getState().setTournamentList(mockTournaments, 10)
      })

      let store = useTournamentStore.getState()
      expect(store.tournamentList.tournaments).toHaveLength(2)
      expect(store.tournamentList.hasMore).toBe(true)

      // Then add new tournament
      act(() => {
        useTournamentStore.getState().addTournamentsToList([newTournament])
      })

      store = useTournamentStore.getState()
      expect(store.tournamentList.tournaments).toHaveLength(3)
      expect(store.tournamentList.tournaments[2]).toEqual(newTournament)
      expect(store.tournamentList.hasMore).toBe(true) // 3 < 10
    })

    it('should update hasMore when adding tournaments reaches total', () => {
      // Set list with 2 tournaments, total 3
      act(() => {
        useTournamentStore.getState().setTournamentList(mockTournaments, 3)
      })

      let store = useTournamentStore.getState()
      expect(store.tournamentList.hasMore).toBe(true)

      // Add one more tournament to reach total
      const newTournament = createMockTournament({ id: 'new-tournament' })
      act(() => {
        useTournamentStore.getState().addTournamentsToList([newTournament])
      })

      store = useTournamentStore.getState()
      expect(store.tournamentList.tournaments).toHaveLength(3)
      expect(store.tournamentList.hasMore).toBe(false) // 3 === 3
    })

    it('should set tournament list loading state', () => {
      act(() => {
        useTournamentStore.getState().setTournamentListLoading(true)
      })

      let store = useTournamentStore.getState()
      expect(store.tournamentList.isLoading).toBe(true)
      expect(store.loading.tournamentList).toBe(true)

      act(() => {
        useTournamentStore.getState().setTournamentListLoading(false)
      })

      store = useTournamentStore.getState()
      expect(store.tournamentList.isLoading).toBe(false)
      expect(store.loading.tournamentList).toBe(false)
    })

    it('should set tournament list error', () => {
      const errorMessage = 'Failed to load tournaments'

      act(() => {
        useTournamentStore.getState().setTournamentListError(errorMessage)
      })

      const store = useTournamentStore.getState()
      expect(store.tournamentList.error).toBe(errorMessage)
      expect(store.errors.tournamentList).toBe(errorMessage)
      expect(store.tournamentList.isLoading).toBe(false)
    })

    it('should set tournament list page', () => {
      act(() => {
        useTournamentStore.getState().setTournamentListPage(2)
      })

      const store = useTournamentStore.getState()
      expect(store.tournamentList.currentPage).toBe(2)
    })

    it('should reset tournament list', () => {
      // First set some data
      act(() => {
        useTournamentStore.getState().setTournamentList(mockTournaments, 10)
        useTournamentStore.getState().setTournamentListPage(2)
        useTournamentStore.getState().setTournamentListError('Some error')
      })

      // Then reset
      act(() => {
        useTournamentStore.getState().resetTournamentList()
      })

      const store = useTournamentStore.getState()
      expect(store.tournamentList.tournaments).toEqual([])
      expect(store.tournamentList.totalCount).toBe(0)
      expect(store.tournamentList.currentPage).toBe(0)
      expect(store.tournamentList.hasMore).toBe(false)
      expect(store.tournamentList.isLoading).toBe(false)
      expect(store.tournamentList.error).toBeNull()
    })
  })

  describe('Tournament Cache Management', () => {
    it('should cache tournament', () => {
      act(() => {
        useTournamentStore.getState().cacheTournament(mockTournament)
      })

      const store = useTournamentStore.getState()
      const cached = store.tournamentCache[mockTournament.id]
      expect(cached).toBeDefined()
      expect(cached.tournament).toEqual(mockTournament)
      expect(cached.lastUpdated).toBeInstanceOf(Date)
      expect(cached.isLoading).toBe(false)
      expect(cached.error).toBeNull()
    })

    it('should get cached tournament', () => {
      act(() => {
        useTournamentStore.getState().cacheTournament(mockTournament)
      })

      const cached = useTournamentStore.getState().getCachedTournament(mockTournament.id)
      expect(cached).toEqual(mockTournament)
    })

    it('should return null for non-existent cached tournament', () => {
      const cached = useTournamentStore.getState().getCachedTournament('non-existent-id')
      expect(cached).toBeNull()
    })

    it('should update cached tournament', () => {
      const updates = { name: 'Updated Tournament Name', status: 'ACTIVE' as const }

      // First cache the tournament
      act(() => {
        useTournamentStore.getState().cacheTournament(mockTournament)
      })

      // Then update it
      act(() => {
        useTournamentStore.getState().updateCachedTournament(mockTournament.id, updates)
      })

      const cached = useTournamentStore.getState().getCachedTournament(mockTournament.id)
      expect(cached?.name).toBe('Updated Tournament Name')
      expect(cached?.status).toBe('ACTIVE')
    })

    it('should update current tournament when updating cached tournament', () => {
      // Set as current tournament
      act(() => {
        useTournamentStore.getState().setCurrentTournament(mockTournament)
      })

      // Update the cached tournament
      const updates = { name: 'Updated Name' }
      act(() => {
        useTournamentStore.getState().updateCachedTournament(mockTournament.id, updates)
      })

      const store = useTournamentStore.getState()
      expect(store.currentTournament?.name).toBe('Updated Name')
    })

    it('should not update if tournament not in cache', () => {
      const updates = { name: 'Updated Name' }

      act(() => {
        useTournamentStore.getState().updateCachedTournament('non-existent-id', updates)
      })

      const cached = useTournamentStore.getState().getCachedTournament('non-existent-id')
      expect(cached).toBeNull()
    })

    it('should remove cached tournament', () => {
      // First cache the tournament
      act(() => {
        useTournamentStore.getState().cacheTournament(mockTournament)
      })

      let cached = useTournamentStore.getState().getCachedTournament(mockTournament.id)
      expect(cached).toEqual(mockTournament)

      // Then remove it
      act(() => {
        useTournamentStore.getState().removeCachedTournament(mockTournament.id)
      })

      cached = useTournamentStore.getState().getCachedTournament(mockTournament.id)
      expect(cached).toBeNull()
    })

    it('should clear current tournament when removing cached current tournament', () => {
      // Set as current tournament
      act(() => {
        useTournamentStore.getState().setCurrentTournament(mockTournament)
      })

      // Remove from cache
      act(() => {
        useTournamentStore.getState().removeCachedTournament(mockTournament.id)
      })

      const store = useTournamentStore.getState()
      expect(store.currentTournament).toBeNull()
      expect(store.currentTournamentId).toBeNull()
    })

    it('should clear all tournament cache', () => {
      // Cache multiple tournaments
      act(() => {
        useTournamentStore.getState().cacheTournament(mockTournament)
        useTournamentStore.getState().cacheTournament(mockTournament2)
        useTournamentStore.getState().setCurrentTournament(mockTournament)
      })

      let store = useTournamentStore.getState()
      expect(Object.keys(store.tournamentCache)).toHaveLength(2)

      // Clear cache
      act(() => {
        useTournamentStore.getState().clearTournamentCache()
      })

      store = useTournamentStore.getState()
      expect(Object.keys(store.tournamentCache)).toHaveLength(0)
      expect(store.currentTournament).toBeNull()
      expect(store.currentTournamentId).toBeNull()
    })

    it('should invalidate tournament by marking as stale', () => {
      // Cache tournament
      act(() => {
        useTournamentStore.getState().cacheTournament(mockTournament)
      })

      const originalDate = useTournamentStore.getState().tournamentCache[mockTournament.id].lastUpdated

      // Invalidate tournament
      act(() => {
        useTournamentStore.getState().invalidateTournament(mockTournament.id)
      })

      const store = useTournamentStore.getState()
      const staleDate = store.tournamentCache[mockTournament.id].lastUpdated
      expect(staleDate.getTime()).toBe(0) // Marked as stale
      expect(staleDate.getTime()).toBeLessThan(originalDate.getTime())
    })

    it('should handle invalidating non-existent tournament', () => {
      act(() => {
        useTournamentStore.getState().invalidateTournament('non-existent-id')
      })

      // Should not throw error
      const store = useTournamentStore.getState()
      expect(store.tournamentCache['non-existent-id']).toBeUndefined()
    })
  })

  describe('Registration Status Management', () => {
    const mockRegistrationStatus: RegistrationStatus = {
      isRegistered: true,
      canRegister: false,
      canWithdraw: true,
      isFull: false,
      participantCount: 16,
      maxPlayers: 32,
      registrationDeadline: new Date(),
    }

    it('should set registration status for tournament', () => {
      const tournamentId = 'test-tournament'

      act(() => {
        useTournamentStore.getState().setRegistrationStatus(tournamentId, mockRegistrationStatus)
      })

      const store = useTournamentStore.getState()
      expect(store.registrationStatusCache[tournamentId]).toEqual(mockRegistrationStatus)
    })

    it('should update tournament cache when setting registration status', () => {
      const tournamentId = mockTournament.id

      // First cache the tournament
      act(() => {
        useTournamentStore.getState().cacheTournament(mockTournament)
      })

      // Then set registration status
      act(() => {
        useTournamentStore.getState().setRegistrationStatus(tournamentId, mockRegistrationStatus)
      })

      const store = useTournamentStore.getState()
      expect(store.tournamentCache[tournamentId].registrationStatus).toEqual(mockRegistrationStatus)
    })

    it('should get registration status', () => {
      const tournamentId = 'test-tournament'

      act(() => {
        useTournamentStore.getState().setRegistrationStatus(tournamentId, mockRegistrationStatus)
      })

      const status = useTournamentStore.getState().getRegistrationStatus(tournamentId)
      expect(status).toEqual(mockRegistrationStatus)
    })

    it('should return null for non-existent registration status', () => {
      const status = useTournamentStore.getState().getRegistrationStatus('non-existent-id')
      expect(status).toBeNull()
    })

    it('should update registration status', () => {
      const tournamentId = 'test-tournament'
      const updates = { participantCount: 20, isFull: false }

      // First set initial status
      act(() => {
        useTournamentStore.getState().setRegistrationStatus(tournamentId, mockRegistrationStatus)
      })

      // Then update it
      act(() => {
        useTournamentStore.getState().updateRegistrationStatus(tournamentId, updates)
      })

      const status = useTournamentStore.getState().getRegistrationStatus(tournamentId)
      expect(status?.participantCount).toBe(20)
      expect(status?.isFull).toBe(false)
      expect(status?.isRegistered).toBe(true) // Original value preserved
    })

    it('should update tournament cache when updating registration status', () => {
      const tournamentId = mockTournament.id

      // Cache tournament and set status
      act(() => {
        useTournamentStore.getState().cacheTournament(mockTournament)
        useTournamentStore.getState().setRegistrationStatus(tournamentId, mockRegistrationStatus)
      })

      // Update status
      const updates = { participantCount: 25 }
      act(() => {
        useTournamentStore.getState().updateRegistrationStatus(tournamentId, updates)
      })

      const store = useTournamentStore.getState()
      expect(store.tournamentCache[tournamentId].registrationStatus.participantCount).toBe(25)
    })

    it('should not update if registration status does not exist', () => {
      const updates = { participantCount: 20 }

      act(() => {
        useTournamentStore.getState().updateRegistrationStatus('non-existent-id', updates)
      })

      const status = useTournamentStore.getState().getRegistrationStatus('non-existent-id')
      expect(status).toBeNull()
    })

    it('should clear registration status for tournament', () => {
      const tournamentId = 'test-tournament'

      // First set registration status
      act(() => {
        useTournamentStore.getState().setRegistrationStatus(tournamentId, mockRegistrationStatus)
      })

      let status = useTournamentStore.getState().getRegistrationStatus(tournamentId)
      expect(status).toEqual(mockRegistrationStatus)

      // Then clear it
      act(() => {
        useTournamentStore.getState().clearRegistrationStatus(tournamentId)
      })

      status = useTournamentStore.getState().getRegistrationStatus(tournamentId)
      expect(status).toBeNull()
    })

    it('should reset tournament cache registration status when clearing', () => {
      const tournamentId = mockTournament.id

      // Cache tournament and set status
      act(() => {
        useTournamentStore.getState().cacheTournament(mockTournament)
        useTournamentStore.getState().setRegistrationStatus(tournamentId, mockRegistrationStatus)
      })

      // Clear status
      act(() => {
        useTournamentStore.getState().clearRegistrationStatus(tournamentId)
      })

      const store = useTournamentStore.getState()
      expect(store.tournamentCache[tournamentId].registrationStatus).toEqual({
        isRegistered: false,
        canRegister: false,
        canWithdraw: false,
        isFull: false,
        participantCount: 0,
      })
    })

    it('should clear all registration status', () => {
      // Set multiple registration statuses
      act(() => {
        useTournamentStore.getState().setRegistrationStatus('tournament-1', mockRegistrationStatus)
        useTournamentStore.getState().setRegistrationStatus('tournament-2', mockRegistrationStatus)
      })

      let store = useTournamentStore.getState()
      expect(Object.keys(store.registrationStatusCache)).toHaveLength(2)

      // Clear all
      act(() => {
        useTournamentStore.getState().clearAllRegistrationStatus()
      })

      store = useTournamentStore.getState()
      expect(Object.keys(store.registrationStatusCache)).toHaveLength(0)
    })
  })

  describe('Filter Management', () => {
    it('should set tournament filters', () => {
      const filters = {
        status: 'ACTIVE' as const,
        gameId: 'pokemon-tcg',
        search: 'test tournament',
      }

      act(() => {
        useTournamentStore.getState().setFilters(filters)
      })

      const store = useTournamentStore.getState()
      expect(store.filters.status).toBe('ACTIVE')
      expect(store.filters.gameId).toBe('pokemon-tcg')
      expect(store.filters.search).toBe('test tournament')
    })

    it('should merge filters with existing filters', () => {
      // Set initial filters
      act(() => {
        useTournamentStore.getState().setFilters({
          gameId: 'pokemon-tcg',
          status: 'UPCOMING' as const,
        })
      })

      // Update with partial filters
      act(() => {
        useTournamentStore.getState().setFilters({
          search: 'test',
        })
      })

      const store = useTournamentStore.getState()
      expect(store.filters.gameId).toBe('pokemon-tcg')
      expect(store.filters.status).toBe('UPCOMING')
      expect(store.filters.search).toBe('test')
    })

    it('should reset tournament list when filters change', () => {
      // Set tournament list
      act(() => {
        useTournamentStore.getState().setTournamentList(mockTournaments, 10)
      })

      let store = useTournamentStore.getState()
      expect(store.tournamentList.tournaments).toHaveLength(2)

      // Change filters
      act(() => {
        useTournamentStore.getState().setFilters({ gameId: 'new-game' })
      })

      store = useTournamentStore.getState()
      expect(store.tournamentList.tournaments).toEqual([])
      expect(store.tournamentList.totalCount).toBe(0)
    })

    it('should not reset tournament list when filters are the same', () => {
      // Set filters and tournament list
      act(() => {
        useTournamentStore.getState().setFilters({ gameId: 'pokemon-tcg' })
        useTournamentStore.getState().setTournamentList(mockTournaments, 10)
      })

      let store = useTournamentStore.getState()
      expect(store.tournamentList.tournaments).toHaveLength(2)

      // Set same filters again
      act(() => {
        useTournamentStore.getState().setFilters({ gameId: 'pokemon-tcg' })
      })

      store = useTournamentStore.getState()
      expect(store.tournamentList.tournaments).toHaveLength(2) // Not reset
    })

    it('should set all filter types', () => {
      const filters = {
        gameId: 'pokemon-tcg',
        storeId: 'store-123',
        status: 'ACTIVE' as const,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        search: 'championship',
        organizerId: 'organizer-123',
      }

      act(() => {
        useTournamentStore.getState().setFilters(filters)
      })

      const store = useTournamentStore.getState()
      expect(store.filters).toEqual(filters)
    })

    it('should reset filters to initial state', () => {
      // Set filters
      act(() => {
        useTournamentStore.getState().setFilters({
          gameId: 'pokemon-tcg',
          status: 'ACTIVE' as const,
          search: 'test',
        })
      })

      // Reset filters
      act(() => {
        useTournamentStore.getState().resetFilters()
      })

      const store = useTournamentStore.getState()
      expect(store.filters).toEqual({
        gameId: '',
        storeId: '',
        status: '',
        startDate: '',
        endDate: '',
        search: '',
        organizerId: undefined,
      })
    })

    it('should reset tournament list when resetting filters', () => {
      // Set filters and tournament list
      act(() => {
        useTournamentStore.getState().setFilters({ gameId: 'pokemon-tcg' })
        useTournamentStore.getState().setTournamentList(mockTournaments, 10)
      })

      // Reset filters
      act(() => {
        useTournamentStore.getState().resetFilters()
      })

      const store = useTournamentStore.getState()
      expect(store.tournamentList.tournaments).toEqual([])
      expect(store.tournamentList.totalCount).toBe(0)
    })
  })

  describe('Loading State Management', () => {
    it('should set loading state for tournament list', () => {
      act(() => {
        useTournamentStore.getState().setLoading('tournamentList', true)
      })

      let store = useTournamentStore.getState()
      expect(store.loading.tournamentList).toBe(true)

      act(() => {
        useTournamentStore.getState().setLoading('tournamentList', false)
      })

      store = useTournamentStore.getState()
      expect(store.loading.tournamentList).toBe(false)
    })

    it('should set loading state for current tournament', () => {
      act(() => {
        useTournamentStore.getState().setLoading('currentTournament', true)
      })

      const store = useTournamentStore.getState()
      expect(store.loading.currentTournament).toBe(true)
    })

    it('should set loading state for registration status', () => {
      act(() => {
        useTournamentStore.getState().setLoading('registrationStatus', true)
      })

      const store = useTournamentStore.getState()
      expect(store.loading.registrationStatus).toBe(true)
    })

    it('should handle query loading', () => {
      act(() => {
        useTournamentStore.getState().handleQueryLoading('tournamentList')
      })

      const store = useTournamentStore.getState()
      expect(store.loading.tournamentList).toBe(true)
      expect(store.errors.tournamentList).toBeNull()
    })

    it('should handle query success', () => {
      // First set loading
      act(() => {
        useTournamentStore.getState().handleQueryLoading('currentTournament')
      })

      // Then handle success
      act(() => {
        useTournamentStore.getState().handleQuerySuccess('currentTournament')
      })

      const store = useTournamentStore.getState()
      expect(store.loading.currentTournament).toBe(false)
      expect(store.errors.currentTournament).toBeNull()
    })
  })

  describe('Error State Management', () => {
    it('should set error for tournament list', () => {
      const errorMessage = 'Failed to load tournaments'

      act(() => {
        useTournamentStore.getState().setError('tournamentList', errorMessage)
      })

      const store = useTournamentStore.getState()
      expect(store.errors.tournamentList).toBe(errorMessage)
    })

    it('should set error for current tournament', () => {
      const errorMessage = 'Tournament not found'

      act(() => {
        useTournamentStore.getState().setError('currentTournament', errorMessage)
      })

      const store = useTournamentStore.getState()
      expect(store.errors.currentTournament).toBe(errorMessage)
    })

    it('should set error for registration status', () => {
      const errorMessage = 'Failed to load registration status'

      act(() => {
        useTournamentStore.getState().setError('registrationStatus', errorMessage)
      })

      const store = useTournamentStore.getState()
      expect(store.errors.registrationStatus).toBe(errorMessage)
    })

    it('should clear specific error', () => {
      // First set error
      act(() => {
        useTournamentStore.getState().setError('tournamentList', 'Some error')
      })

      let store = useTournamentStore.getState()
      expect(store.errors.tournamentList).toBe('Some error')

      // Then clear it
      act(() => {
        useTournamentStore.getState().clearError('tournamentList')
      })

      store = useTournamentStore.getState()
      expect(store.errors.tournamentList).toBeNull()
    })

    it('should clear all errors', () => {
      // Set multiple errors
      act(() => {
        useTournamentStore.getState().setError('tournamentList', 'Error 1')
        useTournamentStore.getState().setError('currentTournament', 'Error 2')
        useTournamentStore.getState().setError('registrationStatus', 'Error 3')
      })

      // Clear all
      act(() => {
        useTournamentStore.getState().clearAllErrors()
      })

      const store = useTournamentStore.getState()
      expect(store.errors.tournamentList).toBeNull()
      expect(store.errors.currentTournament).toBeNull()
      expect(store.errors.registrationStatus).toBeNull()
    })

    it('should handle query error', () => {
      const errorMessage = 'Query failed'

      act(() => {
        useTournamentStore.getState().handleQueryError('tournamentList', errorMessage)
      })

      const store = useTournamentStore.getState()
      expect(store.loading.tournamentList).toBe(false)
      expect(store.errors.tournamentList).toBe(errorMessage)
    })
  })

  describe('Pagination Management', () => {
    it('should initialize with correct pagination state', () => {
      const store = useTournamentStore.getState()

      expect(store.tournamentList.currentPage).toBe(0)
      expect(store.tournamentList.limit).toBe(12)
      expect(store.tournamentList.hasMore).toBe(false)
      expect(store.tournamentList.totalCount).toBe(0)
    })

    it('should update page number', () => {
      act(() => {
        useTournamentStore.getState().setTournamentListPage(3)
      })

      const store = useTournamentStore.getState()
      expect(store.tournamentList.currentPage).toBe(3)
    })

    it('should calculate hasMore correctly for pagination', () => {
      // Case 1: More tournaments available
      act(() => {
        useTournamentStore.getState().setTournamentList(mockTournaments, 20)
      })

      let store = useTournamentStore.getState()
      expect(store.tournamentList.hasMore).toBe(true)

      // Case 2: All tournaments loaded
      act(() => {
        useTournamentStore.getState().setTournamentList(mockTournaments, 2)
      })

      store = useTournamentStore.getState()
      expect(store.tournamentList.hasMore).toBe(false)
    })

    it('should handle pagination with addTournamentsToList', () => {
      // Set initial page
      act(() => {
        useTournamentStore.getState().setTournamentList(mockTournaments, 5)
        useTournamentStore.getState().setTournamentListPage(1)
      })

      let store = useTournamentStore.getState()
      expect(store.tournamentList.currentPage).toBe(1)
      expect(store.tournamentList.hasMore).toBe(true)

      // Add more tournaments (simulating next page)
      const moreTournaments = [
        createMockTournament({ id: 'tournament-3', name: 'Tournament 3' }),
      ]
      act(() => {
        useTournamentStore.getState().addTournamentsToList(moreTournaments)
        useTournamentStore.getState().setTournamentListPage(2)
      })

      store = useTournamentStore.getState()
      expect(store.tournamentList.tournaments).toHaveLength(3)
      expect(store.tournamentList.currentPage).toBe(2)
      expect(store.tournamentList.hasMore).toBe(true) // 3 < 5
    })
  })

  describe('Utility Actions', () => {
    it('should invalidate tournament list', () => {
      // Set tournament list
      act(() => {
        useTournamentStore.getState().setTournamentList(mockTournaments, 10)
      })

      // Invalidate
      act(() => {
        useTournamentStore.getState().invalidateTournamentList()
      })

      const store = useTournamentStore.getState()
      expect(store.tournamentList.tournaments).toEqual([])
      expect(store.tournamentList.totalCount).toBe(0)
    })

    it('should refresh tournament data', () => {
      // Cache tournament
      act(() => {
        useTournamentStore.getState().cacheTournament(mockTournament)
      })

      const originalDate = useTournamentStore.getState().tournamentCache[mockTournament.id].lastUpdated

      // Refresh (invalidates)
      act(() => {
        useTournamentStore.getState().refreshTournamentData(mockTournament.id)
      })

      const store = useTournamentStore.getState()
      const newDate = store.tournamentCache[mockTournament.id].lastUpdated
      expect(newDate.getTime()).toBe(0) // Marked as stale
    })

    it('should reset entire tournament store', () => {
      // Set all data
      act(() => {
        useTournamentStore.getState().setCurrentTournament(mockTournament)
        useTournamentStore.getState().setTournamentList(mockTournaments, 10)
        useTournamentStore.getState().setFilters({ gameId: 'pokemon-tcg' })
        useTournamentStore.getState().setRegistrationStatus('test-id', {
          isRegistered: true,
          canRegister: false,
          canWithdraw: true,
          isFull: false,
          participantCount: 10,
        })
        useTournamentStore.getState().setError('tournamentList', 'Some error')
        useTournamentStore.getState().setLoading('currentTournament', true)
      })

      // Reset
      act(() => {
        useTournamentStore.getState().resetTournamentStore()
      })

      const store = useTournamentStore.getState()
      expect(store.currentTournament).toBeNull()
      expect(store.currentTournamentId).toBeNull()
      expect(store.tournamentList.tournaments).toEqual([])
      expect(store.tournamentCache).toEqual({})
      expect(store.registrationStatusCache).toEqual({})
      expect(store.filters).toEqual({
        gameId: '',
        storeId: '',
        status: '',
        startDate: '',
        endDate: '',
        search: '',
        organizerId: undefined,
      })
      expect(store.loading).toEqual({
        tournamentList: false,
        currentTournament: false,
        registrationStatus: false,
      })
      expect(store.errors).toEqual({
        tournamentList: null,
        currentTournament: null,
        registrationStatus: null,
      })
    })
  })

  describe('tRPC Integration Helpers', () => {
    it('should handle query loading for all query types', () => {
      const queryTypes: Array<'tournamentList' | 'currentTournament' | 'registrationStatus'> = [
        'tournamentList',
        'currentTournament',
        'registrationStatus',
      ]

      queryTypes.forEach((queryType) => {
        act(() => {
          useTournamentStore.getState().handleQueryLoading(queryType)
        })

        const store = useTournamentStore.getState()
        expect(store.loading[queryType]).toBe(true)
        expect(store.errors[queryType]).toBeNull()
      })
    })

    it('should handle query success for all query types', () => {
      const queryTypes: Array<'tournamentList' | 'currentTournament' | 'registrationStatus'> = [
        'tournamentList',
        'currentTournament',
        'registrationStatus',
      ]

      queryTypes.forEach((queryType) => {
        // Set loading first
        act(() => {
          useTournamentStore.getState().handleQueryLoading(queryType)
        })

        // Handle success
        act(() => {
          useTournamentStore.getState().handleQuerySuccess(queryType, {})
        })

        const store = useTournamentStore.getState()
        expect(store.loading[queryType]).toBe(false)
        expect(store.errors[queryType]).toBeNull()
      })
    })

    it('should handle query error for all query types', () => {
      const queryTypes: Array<'tournamentList' | 'currentTournament' | 'registrationStatus'> = [
        'tournamentList',
        'currentTournament',
        'registrationStatus',
      ]

      queryTypes.forEach((queryType) => {
        const errorMessage = `Error loading ${queryType}`

        act(() => {
          useTournamentStore.getState().handleQueryError(queryType, errorMessage)
        })

        const store = useTournamentStore.getState()
        expect(store.loading[queryType]).toBe(false)
        expect(store.errors[queryType]).toBe(errorMessage)
      })
    })

    it('should clear error when starting new query', () => {
      // Set error first
      act(() => {
        useTournamentStore.getState().handleQueryError('tournamentList', 'Previous error')
      })

      let store = useTournamentStore.getState()
      expect(store.errors.tournamentList).toBe('Previous error')

      // Start new query
      act(() => {
        useTournamentStore.getState().handleQueryLoading('tournamentList')
      })

      store = useTournamentStore.getState()
      expect(store.errors.tournamentList).toBeNull()
      expect(store.loading.tournamentList).toBe(true)
    })
  })

  describe('Custom Hooks', () => {
    describe('useCurrentTournament', () => {
      it('should return current tournament data and actions', () => {
        const { result } = renderHook(() => useCurrentTournament())

        expect(result.current.tournament).toBeNull()
        expect(result.current.tournamentId).toBeNull()
        expect(typeof result.current.setTournament).toBe('function')
        expect(typeof result.current.setTournamentId).toBe('function')
        expect(typeof result.current.clearTournament).toBe('function')
      })

      it('should update when tournament changes', () => {
        const { result } = renderHook(() => useCurrentTournament())

        act(() => {
          useTournamentStore.getState().setCurrentTournament(mockTournament)
        })

        expect(result.current.tournament).toEqual(mockTournament)
        expect(result.current.tournamentId).toBe(mockTournament.id)
      })
    })

    describe('useTournamentList', () => {
      it('should return tournament list data and actions', () => {
        const { result } = renderHook(() => useTournamentList())

        expect(result.current.tournaments).toEqual([])
        expect(result.current.totalCount).toBe(0)
        expect(typeof result.current.setTournaments).toBe('function')
        expect(typeof result.current.addTournaments).toBe('function')
        expect(typeof result.current.setLoading).toBe('function')
        expect(typeof result.current.setError).toBe('function')
        expect(typeof result.current.setPage).toBe('function')
        expect(typeof result.current.reset).toBe('function')
        expect(typeof result.current.setFilters).toBe('function')
      })
    })

    describe('useTournamentCache', () => {
      it('should return cache data and actions', () => {
        const { result } = renderHook(() => useTournamentCache())

        expect(result.current.cache).toEqual({})
        expect(typeof result.current.cacheTournament).toBe('function')
        expect(typeof result.current.getCachedTournament).toBe('function')
        expect(typeof result.current.updateCachedTournament).toBe('function')
        expect(typeof result.current.removeCachedTournament).toBe('function')
        expect(typeof result.current.clearCache).toBe('function')
      })
    })

    describe('useRegistrationStatus', () => {
      it('should return registration status and actions', () => {
        const { result } = renderHook(() => useRegistrationStatus('test-tournament'))

        expect(result.current.status).toEqual({
          isRegistered: false,
          canRegister: false,
          canWithdraw: false,
          isFull: false,
          participantCount: 0,
        })
        expect(typeof result.current.setStatus).toBe('function')
        expect(typeof result.current.updateStatus).toBe('function')
        expect(typeof result.current.clearStatus).toBe('function')
      })
    })

    describe('useTournamentFilters', () => {
      it('should return filters and actions', () => {
        const { result } = renderHook(() => useTournamentFilters())

        expect(result.current.filters).toEqual({
          gameId: '',
          storeId: '',
          status: '',
          startDate: '',
          endDate: '',
          search: '',
          organizerId: undefined,
        })
        expect(typeof result.current.setFilters).toBe('function')
        expect(typeof result.current.resetFilters).toBe('function')
      })
    })

    describe('useTournamentLoading', () => {
      it('should return loading states and actions', () => {
        const { result } = renderHook(() => useTournamentLoading())

        expect(result.current.tournamentList).toBe(false)
        expect(result.current.currentTournament).toBe(false)
        expect(result.current.registrationStatus).toBe(false)
        expect(result.current.isAnyLoading).toBe(false)
        expect(typeof result.current.setLoading).toBe('function')
      })

      it('should calculate isAnyLoading correctly', () => {
        const { result } = renderHook(() => useTournamentLoading())

        act(() => {
          useTournamentStore.getState().setLoading('tournamentList', true)
        })

        expect(result.current.isAnyLoading).toBe(true)
      })
    })

    describe('useTournamentErrors', () => {
      it('should return error states and actions', () => {
        const { result } = renderHook(() => useTournamentErrors())

        expect(result.current.tournamentList).toBeNull()
        expect(result.current.currentTournament).toBeNull()
        expect(result.current.registrationStatus).toBeNull()
        expect(result.current.hasAnyError).toBe(false)
        expect(typeof result.current.setError).toBe('function')
        expect(typeof result.current.clearError).toBe('function')
        expect(typeof result.current.clearAllErrors).toBe('function')
      })

      it('should calculate hasAnyError correctly', () => {
        const { result } = renderHook(() => useTournamentErrors())

        act(() => {
          useTournamentStore.getState().setError('tournamentList', 'Some error')
        })

        expect(result.current.hasAnyError).toBe(true)
      })
    })

    describe('useTournamentOperations', () => {
      it('should return operation actions', () => {
        const { result } = renderHook(() => useTournamentOperations())

        expect(typeof result.current.invalidateTournament).toBe('function')
        expect(typeof result.current.invalidateTournamentList).toBe('function')
        expect(typeof result.current.refreshTournamentData).toBe('function')
        expect(typeof result.current.resetStore).toBe('function')
      })
    })
  })
})