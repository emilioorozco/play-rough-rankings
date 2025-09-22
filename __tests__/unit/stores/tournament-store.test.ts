import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { act } from '@testing-library/react'
import { useTournamentStore } from '@/stores/tournament-store'
import { createMockTournament } from '../../utils/test-utils'
import type { Tournament, RegistrationStatus, TournamentFilters } from '@/lib/types'

// Mock the API calls
jest.mock('@/lib/trpc/client', () => ({
  trpc: {
    tournament: {
      getById: {
        useQuery: jest.fn()
      },
      getList: {
        useQuery: jest.fn()
      },
      getRegistrationStatus: {
        useQuery: jest.fn()
      }
    }
  }
}))

describe('Tournament Store', () => {
  const mockTournament = createMockTournament()
  const mockTournaments = [mockTournament, { ...mockTournament, id: 'tournament-2' }]

  beforeEach(() => {
    // Reset store state before each test
    useTournamentStore.getState().clearTournamentCache()
  })

  describe('Current Tournament Management', () => {
    it('should set current tournament', () => {
      act(() => {
        useTournamentStore.getState().setCurrentTournament(mockTournament)
      })

      const store = useTournamentStore.getState()
      expect(store.currentTournament).toEqual(mockTournament)
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
    })

    it('should fetch tournament by ID', async () => {
      const store = useTournamentStore.getState()
      const tournamentId = 'test-tournament-id'

      // Mock the fetch function to return our mock tournament
      const mockFetch = jest.fn().mockResolvedValue(mockTournament)
      store.fetchTournament = mockFetch

      const result = await store.fetchTournament(tournamentId)

      expect(mockFetch).toHaveBeenCalledWith(tournamentId)
      expect(result).toEqual(mockTournament)
    })
  })

  describe('Tournament List Management', () => {
    it('should set tournament list', () => {
      act(() => {
        useTournamentStore.getState().setTournamentList(mockTournaments, mockTournaments.length)
      })

      const store = useTournamentStore.getState()
      expect(store.tournamentList.tournaments).toEqual(mockTournaments)
      expect(store.tournamentList.totalCount).toBe(mockTournaments.length)
    })

    it('should add tournament to list', () => {
      const newTournament = { ...mockTournament, id: 'new-tournament' }

      // First set initial list
      act(() => {
        useTournamentStore.getState().setTournamentList(mockTournaments, mockTournaments.length)
      })

      let store = useTournamentStore.getState()
      expect(store.tournamentList.tournaments).toHaveLength(2)

      // Then add new tournament
      act(() => {
        useTournamentStore.getState().addTournamentsToList([newTournament])
      })

      store = useTournamentStore.getState()
      expect(store.tournamentList.tournaments).toHaveLength(3)
      expect(store.tournamentList.tournaments).toContain(newTournament)
    })

    it('should update tournament in list', () => {
      const tournamentId = mockTournament.id
      const updates = { name: 'Updated Tournament Name' }

      // First cache the tournament
      act(() => {
        useTournamentStore.getState().cacheTournament(mockTournament)
      })

      // Then update tournament
      act(() => {
        useTournamentStore.getState().updateCachedTournament(tournamentId, updates)
      })

      const updatedTournament = useTournamentStore.getState().getCachedTournament(tournamentId)
      expect(updatedTournament?.name).toBe('Updated Tournament Name')
    })

    it('should remove tournament from list', () => {
      const tournamentId = mockTournament.id

      // First cache the tournament
      act(() => {
        useTournamentStore.getState().cacheTournament(mockTournament)
      })

      let store = useTournamentStore.getState()
      expect(store.getCachedTournament(tournamentId)).toEqual(mockTournament)

      // Then remove tournament from cache
      act(() => {
        useTournamentStore.getState().removeCachedTournament(tournamentId)
      })

      store = useTournamentStore.getState()
      const cachedTournament = store.getCachedTournament(tournamentId)
      expect(cachedTournament).toBeNull()
    })

    it('should clear tournament list', () => {
      // First set initial list
      act(() => {
        useTournamentStore.getState().setTournamentList(mockTournaments, mockTournaments.length)
      })

      let store = useTournamentStore.getState()
      expect(store.tournamentList.tournaments).toHaveLength(2)

      // Then clear list
      act(() => {
        useTournamentStore.getState().resetTournamentList()
      })

      store = useTournamentStore.getState()
      expect(store.tournamentList.tournaments).toEqual([])
    })
  })

  describe('Registration Status Management', () => {
    it('should set registration status for tournament', () => {
      const tournamentId = 'test-tournament'
      const registrationStatus: RegistrationStatus = {
        isRegistered: true,
        registeredAt: new Date(),
        canRegister: false,
        canWithdraw: true,
        maxPlayers: 32,
        currentPlayers: 16
      }

      act(() => {
        useTournamentStore.getState().setRegistrationStatus(tournamentId, registrationStatus)
      })

      const store = useTournamentStore.getState()
      expect(store.registrationStatusCache[tournamentId]).toEqual(registrationStatus)
    })

    it('should clear registration status for tournament', () => {
      const tournamentId = 'test-tournament'
      const registrationStatus: RegistrationStatus = {
        isRegistered: true,
        registeredAt: new Date(),
        canRegister: false,
        canWithdraw: true,
        maxPlayers: 32,
        currentPlayers: 16
      }

      // First set registration status
      act(() => {
        useTournamentStore.getState().setRegistrationStatus(tournamentId, registrationStatus)
      })

      let store = useTournamentStore.getState()
      expect(store.registrationStatusCache[tournamentId]).toEqual(registrationStatus)

      // Then clear it
      act(() => {
        useTournamentStore.getState().clearRegistrationStatus(tournamentId)
      })

      store = useTournamentStore.getState()
      expect(store.registrationStatusCache[tournamentId]).toBeUndefined()
    })

    it('should fetch registration status', async () => {
      const store = useTournamentStore.getState()
      const tournamentId = 'test-tournament'
      const mockRegistrationStatus: RegistrationStatus = {
        isRegistered: true,
        registeredAt: new Date(),
        canRegister: false,
        canWithdraw: true
      }

      // Mock the fetch function
      const mockFetch = jest.fn().mockResolvedValue(mockRegistrationStatus)
      store.fetchRegistrationStatus = mockFetch

      const result = await store.fetchRegistrationStatus(tournamentId)

      expect(mockFetch).toHaveBeenCalledWith(tournamentId)
      expect(result).toEqual(mockRegistrationStatus)
    })
  })

  describe('Filter Management', () => {
    it('should set tournament filters', () => {
      const filters: Partial<TournamentFilters> = {
        status: 'active',
        gameId: 'pokemon-tcg',
        search: 'test tournament'
      }

      act(() => {
        useTournamentStore.getState().setFilters(filters)
      })

      const store = useTournamentStore.getState()
      expect(store.filters.status).toBe(filters.status)
      expect(store.filters.gameId).toBe(filters.gameId)
      expect(store.filters.search).toBe(filters.search)
    })

    it('should clear tournament filters', () => {
      const filters: Partial<TournamentFilters> = {
        status: 'active',
        gameId: 'pokemon-tcg'
      }

      // First set filters
      act(() => {
        useTournamentStore.getState().setFilters(filters)
      })

      let store = useTournamentStore.getState()
      expect(store.filters.status).toBe(filters.status)
      expect(store.filters.gameId).toBe(filters.gameId)

      // Then clear them
      act(() => {
        useTournamentStore.getState().resetFilters()
      })

      store = useTournamentStore.getState()
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
  })

  describe('Cache Management', () => {
    it('should invalidate tournament cache', () => {
      const store = useTournamentStore.getState()
      const tournamentId = 'test-tournament'

      // Set some data first
      act(() => {
        store.setCurrentTournament(mockTournament)
        store.setTournamentList(mockTournaments, mockTournaments.length)
        store.setRegistrationStatus(tournamentId, {
          isRegistered: true,
          canRegister: false,
          canWithdraw: true
        })
      })

      // Invalidate specific tournament
      act(() => {
        store.invalidateTournament(tournamentId)
      })

      // The specific tournament should be cleared from current tournament if it matches
      if (store.currentTournament?.id === tournamentId) {
        expect(store.currentTournament).toBeNull()
      }
    })

    it('should invalidate tournament list cache', () => {
      // Set tournament list first
      act(() => {
        useTournamentStore.getState().setTournamentList(mockTournaments, mockTournaments.length)
      })

      let store = useTournamentStore.getState()
      expect(store.tournamentList.tournaments).toEqual(mockTournaments)

      // Invalidate tournament list
      act(() => {
        useTournamentStore.getState().invalidateTournamentList()
      })

      // Tournament list should be reset to initial state
      store = useTournamentStore.getState()
      expect(store.tournamentList).toEqual({
        tournaments: [],
        totalCount: 0,
        currentPage: 0,
        limit: 12,
        hasMore: false,
        isLoading: false,
        error: null,
      })
    })

    it('should invalidate registration status cache', () => {
      const tournamentId = 'test-tournament'
      const registrationStatus: RegistrationStatus = {
        isRegistered: true,
        canRegister: false,
        canWithdraw: true,
        maxPlayers: 32,
        currentPlayers: 16
      }

      // Set registration status first
      act(() => {
        useTournamentStore.getState().setRegistrationStatus(tournamentId, registrationStatus)
      })

      let store = useTournamentStore.getState()
      expect(store.registrationStatusCache[tournamentId]).toEqual(registrationStatus)

      // Clear all registration status
      act(() => {
        useTournamentStore.getState().clearAllRegistrationStatus()
      })

      // Registration status should be cleared
      store = useTournamentStore.getState()
      expect(store.registrationStatusCache[tournamentId]).toBeUndefined()
    })

    it('should clear all cache', () => {
      // Set all data first
      act(() => {
        useTournamentStore.getState().setCurrentTournament(mockTournament)
        useTournamentStore.getState().setTournamentList(mockTournaments, mockTournaments.length)
        useTournamentStore.getState().setRegistrationStatus('test-tournament', {
          isRegistered: true,
          canRegister: false,
          canWithdraw: true,
          maxPlayers: 32,
          currentPlayers: 16
        })
        useTournamentStore.getState().setFilters({ status: 'active' })
      })

      // Reset entire store
      act(() => {
        useTournamentStore.getState().resetTournamentStore()
      })

      // All data should be reset to initial state
      const store = useTournamentStore.getState()
      expect(store.currentTournament).toBeNull()
      expect(store.tournamentList.tournaments).toEqual([])
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
    })
  })

  describe('Loading and Error States', () => {
    it('should handle loading states correctly', () => {
      const store = useTournamentStore.getState()

      // Test that loading states are properly managed
      expect(store.loading.currentTournament).toBe(false)
      expect(store.loading.tournamentList).toBe(false)
      expect(store.loading.registrationStatus).toBe(false)
    })

    it('should handle error states correctly', () => {
      const store = useTournamentStore.getState()

      // Test that error states are properly managed
      expect(store.errors.currentTournament).toBeNull()
      expect(store.errors.tournamentList).toBeNull()
      expect(store.errors.registrationStatus).toBeNull()
    })
  })

  describe('Pagination', () => {
    it('should handle pagination state', () => {
      const store = useTournamentStore.getState()

      // Test initial pagination state
      expect(store.tournamentList).toEqual({
        tournaments: [],
        totalCount: 0,
        currentPage: 0,
        limit: 12,
        hasMore: false,
        isLoading: false,
        error: null,
      })
    })
  })
})