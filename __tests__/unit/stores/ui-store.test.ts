import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUIStore, useModal, useConfirmationModal, useTab, useFilters, useInteractions, useDropdown, useModals } from '@/stores/ui-store'
import type { ConfirmationConfig } from '@/stores/ui-store'

// Mock sessionStorage for testing
const mockStorage = new Map<string, string>()
const sessionStorageMock = {
  getItem: (key: string) => mockStorage.get(key) || null,
  setItem: (key: string, value: string) => mockStorage.set(key, value),
  removeItem: (key: string) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
}

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
})

describe('UI Store', () => {
  beforeEach(() => {
    // Reset store state and storage before each test
    mockStorage.clear()
    act(() => {
      useUIStore.getState().resetUI()
    })
  })

  describe('Modal Management', () => {
    it('should open a modal without data', () => {
      act(() => {
        useUIStore.getState().openModal('tournamentRegistration')
      })

      const state = useUIStore.getState()
      expect(state.modals.tournamentRegistration.isOpen).toBe(true)
      expect(state.modals.tournamentRegistration.data).toBeUndefined()
    })

    it('should open a modal with data', () => {
      const data = { tournamentId: 'test-123', playerId: 'player-456' }

      act(() => {
        useUIStore.getState().openModal('tournamentRegistration', data)
      })

      const state = useUIStore.getState()
      expect(state.modals.tournamentRegistration.isOpen).toBe(true)
      expect(state.modals.tournamentRegistration.data).toEqual(data)
    })

    it('should open all modal types', () => {
      const modalTypes = [
        'tournamentRegistration',
        'tournamentManagement',
        'tournamentCreate',
        'userPreferences',
        'login',
        'storeCreate',
      ] as const

      modalTypes.forEach((modalType) => {
        act(() => {
          useUIStore.getState().openModal(modalType, { test: modalType })
        })

        const state = useUIStore.getState()
        expect(state.modals[modalType].isOpen).toBe(true)
        expect(state.modals[modalType].data).toEqual({ test: modalType })
      })
    })

    it('should close a modal and clear its data', () => {
      act(() => {
        useUIStore.getState().openModal('tournamentManagement', { id: '123' })
      })

      let state = useUIStore.getState()
      expect(state.modals.tournamentManagement.isOpen).toBe(true)
      expect(state.modals.tournamentManagement.data).toEqual({ id: '123' })

      act(() => {
        useUIStore.getState().closeModal('tournamentManagement')
      })

      state = useUIStore.getState()
      expect(state.modals.tournamentManagement.isOpen).toBe(false)
      expect(state.modals.tournamentManagement.data).toBeUndefined()
    })

    it('should toggle modal open and closed', () => {
      act(() => {
        useUIStore.getState().toggleModal('tournamentCreate')
      })

      let state = useUIStore.getState()
      expect(state.modals.tournamentCreate.isOpen).toBe(true)

      act(() => {
        useUIStore.getState().toggleModal('tournamentCreate')
      })

      state = useUIStore.getState()
      expect(state.modals.tournamentCreate.isOpen).toBe(false)
    })

    it('should close all modals at once', () => {
      act(() => {
        useUIStore.getState().openModal('tournamentRegistration', { id: '1' })
        useUIStore.getState().openModal('tournamentManagement', { id: '2' })
        useUIStore.getState().openModal('userPreferences', { id: '3' })
      })

      let state = useUIStore.getState()
      expect(state.modals.tournamentRegistration.isOpen).toBe(true)
      expect(state.modals.tournamentManagement.isOpen).toBe(true)
      expect(state.modals.userPreferences.isOpen).toBe(true)

      act(() => {
        useUIStore.getState().closeAllModals()
      })

      state = useUIStore.getState()
      expect(state.modals.tournamentRegistration.isOpen).toBe(false)
      expect(state.modals.tournamentManagement.isOpen).toBe(false)
      expect(state.modals.userPreferences.isOpen).toBe(false)
      expect(state.modals.tournamentRegistration.data).toBeUndefined()
      expect(state.modals.tournamentManagement.data).toBeUndefined()
      expect(state.modals.userPreferences.data).toBeUndefined()
    })
  })

  describe('Confirmation Modal', () => {
    it('should open confirmation modal with basic config', () => {
      const config: ConfirmationConfig = {
        title: 'Confirm Action',
        message: 'Are you sure you want to proceed?',
      }

      act(() => {
        useUIStore.getState().openConfirmation(config)
      })

      const state = useUIStore.getState()
      expect(state.modals.confirmation.isOpen).toBe(true)
      expect(state.modals.confirmation.config).toEqual(config)
    })

    it('should open confirmation modal with full config', () => {
      const onConfirm = vi.fn()
      const onCancel = vi.fn()
      const config: ConfirmationConfig = {
        title: 'Delete Tournament',
        message: 'This action cannot be undone',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        variant: 'destructive',
        onConfirm,
        onCancel,
        isLoading: false,
        error: undefined,
        success: undefined,
      }

      act(() => {
        useUIStore.getState().openConfirmation(config)
      })

      const state = useUIStore.getState()
      expect(state.modals.confirmation.isOpen).toBe(true)
      expect(state.modals.confirmation.config).toEqual(config)
    })

    it('should close confirmation modal and clear config', () => {
      const config: ConfirmationConfig = {
        title: 'Test',
        message: 'Test message',
        onConfirm: vi.fn(),
      }

      act(() => {
        useUIStore.getState().openConfirmation(config)
      })

      let state = useUIStore.getState()
      expect(state.modals.confirmation.isOpen).toBe(true)

      act(() => {
        useUIStore.getState().closeConfirmation()
      })

      state = useUIStore.getState()
      expect(state.modals.confirmation.isOpen).toBe(false)
      expect(state.modals.confirmation.config).toBeUndefined()
    })

    it('should reset withdraw success when closing confirmation', () => {
      act(() => {
        useUIStore.getState().setInteraction('withdrawSuccess', true)
        useUIStore.getState().openConfirmation({
          title: 'Test',
          message: 'Test',
        })
      })

      let state = useUIStore.getState()
      expect(state.interactions.withdrawSuccess).toBe(true)

      act(() => {
        useUIStore.getState().closeConfirmation()
      })

      state = useUIStore.getState()
      expect(state.interactions.withdrawSuccess).toBe(false)
    })

    it('should open withdraw confirmation and reset withdraw success', () => {
      act(() => {
        useUIStore.getState().setInteraction('withdrawSuccess', true)
      })

      let state = useUIStore.getState()
      expect(state.interactions.withdrawSuccess).toBe(true)

      act(() => {
        useUIStore.getState().openWithdrawConfirmation({
          title: 'Withdraw from Tournament',
          message: 'Are you sure?',
        })
      })

      state = useUIStore.getState()
      expect(state.modals.confirmation.isOpen).toBe(true)
      expect(state.interactions.withdrawSuccess).toBe(false)
    })
  })

  describe('Tab Management', () => {
    it('should set active tab for tournament details', () => {
      act(() => {
        useUIStore.getState().setActiveTab('tournamentDetails', 'overview')
      })

      const state = useUIStore.getState()
      expect(state.tabs.tournamentDetails.activeTab).toBe('overview')
    })

    it('should initialize available tabs for tournamentDetails', () => {
      act(() => {
        useUIStore.getState().setActiveTab('tournamentDetails', 'brackets')
      })

      const state = useUIStore.getState()
      expect(state.tabs.tournamentDetails.activeTab).toBe('brackets')
      expect(state.tabs.tournamentDetails.availableTabs).toEqual([
        'overview',
        'brackets',
        'participants',
        'results',
        'discussion',
      ])
    })

    it('should not reinitialize available tabs if already set', () => {
      act(() => {
        useUIStore.getState().setAvailableTabs('tournamentDetails', ['custom1', 'custom2'])
        useUIStore.getState().setActiveTab('tournamentDetails', 'custom1')
      })

      const state = useUIStore.getState()
      expect(state.tabs.tournamentDetails.availableTabs).toEqual(['custom1', 'custom2'])
    })

    it('should set active tab for all tab groups', () => {
      const tabGroups = [
        { group: 'tournamentDetails' as const, tab: 'overview' },
        { group: 'tournamentManage' as const, tab: 'settings' },
        { group: 'leaderboard-view' as const, tab: 'rankings' },
      ]

      tabGroups.forEach(({ group, tab }) => {
        act(() => {
          useUIStore.getState().setActiveTab(group, tab)
        })

        const state = useUIStore.getState()
        expect(state.tabs[group].activeTab).toBe(tab)
      })
    })

    it('should set available tabs for a tab group', () => {
      const tabs = ['tab1', 'tab2', 'tab3']

      act(() => {
        useUIStore.getState().setAvailableTabs('tournamentManage', tabs)
      })

      const state = useUIStore.getState()
      expect(state.tabs.tournamentManage.availableTabs).toEqual(tabs)
    })

    it('should update active tab multiple times', () => {
      act(() => {
        useUIStore.getState().setActiveTab('tournamentDetails', 'overview')
      })

      let state = useUIStore.getState()
      expect(state.tabs.tournamentDetails.activeTab).toBe('overview')

      act(() => {
        useUIStore.getState().setActiveTab('tournamentDetails', 'brackets')
      })

      state = useUIStore.getState()
      expect(state.tabs.tournamentDetails.activeTab).toBe('brackets')

      act(() => {
        useUIStore.getState().setActiveTab('tournamentDetails', 'results')
      })

      state = useUIStore.getState()
      expect(state.tabs.tournamentDetails.activeTab).toBe('results')
    })
  })

  describe('Filter Management', () => {
    it('should set partial filters', () => {
      act(() => {
        useUIStore.getState().setFilters('tournaments', { gameId: 'pokemon-tcg' })
      })

      const state = useUIStore.getState()
      expect(state.filters.tournaments.gameId).toBe('pokemon-tcg')
      expect(state.filters.tournaments.status).toBe('')
    })

    it('should set multiple filters at once', () => {
      act(() => {
        useUIStore.getState().setFilters('tournaments', {
          gameId: 'pokemon-tcg',
          storeId: 'store-123',
          status: 'ACTIVE',
          search: 'championship',
        })
      })

      const state = useUIStore.getState()
      expect(state.filters.tournaments.gameId).toBe('pokemon-tcg')
      expect(state.filters.tournaments.storeId).toBe('store-123')
      expect(state.filters.tournaments.status).toBe('ACTIVE')
      expect(state.filters.tournaments.search).toBe('championship')
    })

    it('should set filters for all filter groups', () => {
      act(() => {
        useUIStore.getState().setFilters('tournaments', { gameId: 'game1' })
        useUIStore.getState().setFilters('tournament-list', { status: 'UPCOMING' })
        useUIStore.getState().setFilters('tournament-participants', { status: 'active' })
      })

      const state = useUIStore.getState()
      expect(state.filters.tournaments.gameId).toBe('game1')
      expect(state.filters['tournament-list'].status).toBe('UPCOMING')
      expect(state.filters['tournament-participants'].status).toBe('active')
    })

    it('should reset filters to initial state', () => {
      act(() => {
        useUIStore.getState().setFilters('tournaments', {
          gameId: 'pokemon-tcg',
          storeId: 'store-123',
          status: 'ACTIVE',
          search: 'test',
        })
      })

      let state = useUIStore.getState()
      expect(state.filters.tournaments.gameId).toBe('pokemon-tcg')

      act(() => {
        useUIStore.getState().resetFilters('tournaments')
      })

      state = useUIStore.getState()
      expect(state.filters.tournaments.gameId).toBe('')
      expect(state.filters.tournaments.storeId).toBe('')
      expect(state.filters.tournaments.status).toBe('')
      expect(state.filters.tournaments.search).toBe('')
    })

    it('should update filters incrementally', () => {
      act(() => {
        useUIStore.getState().setFilters('tournaments', { gameId: 'game1' })
      })

      let state = useUIStore.getState()
      expect(state.filters.tournaments.gameId).toBe('game1')

      act(() => {
        useUIStore.getState().setFilters('tournaments', { status: 'ACTIVE' })
      })

      state = useUIStore.getState()
      expect(state.filters.tournaments.gameId).toBe('game1')
      expect(state.filters.tournaments.status).toBe('ACTIVE')
    })
  })

  describe('Interaction Management', () => {
    it('should set interaction state', () => {
      act(() => {
        useUIStore.getState().setInteraction('isWithdrawing', true)
      })

      const state = useUIStore.getState()
      expect(state.interactions.isWithdrawing).toBe(true)
    })

    it('should set all interaction types', () => {
      act(() => {
        useUIStore.getState().setInteraction('isWithdrawing', true)
        useUIStore.getState().setInteraction('withdrawSuccess', true)
        useUIStore.getState().setInteraction('userMenu', true)
      })

      const state = useUIStore.getState()
      expect(state.interactions.isWithdrawing).toBe(true)
      expect(state.interactions.withdrawSuccess).toBe(true)
      expect(state.interactions.userMenu).toBe(true)
    })

    it('should toggle interaction state', () => {
      act(() => {
        useUIStore.getState().setInteraction('isWithdrawing', true)
      })

      let state = useUIStore.getState()
      expect(state.interactions.isWithdrawing).toBe(true)

      act(() => {
        useUIStore.getState().setInteraction('isWithdrawing', false)
      })

      state = useUIStore.getState()
      expect(state.interactions.isWithdrawing).toBe(false)
    })

    it('should reset all interactions', () => {
      act(() => {
        useUIStore.getState().setInteraction('isWithdrawing', true)
        useUIStore.getState().setInteraction('withdrawSuccess', true)
        useUIStore.getState().setInteraction('userMenu', true)
      })

      let state = useUIStore.getState()
      expect(state.interactions.isWithdrawing).toBe(true)
      expect(state.interactions.withdrawSuccess).toBe(true)
      expect(state.interactions.userMenu).toBe(true)

      act(() => {
        useUIStore.getState().resetInteractions()
      })

      state = useUIStore.getState()
      expect(state.interactions.isWithdrawing).toBe(false)
      expect(state.interactions.withdrawSuccess).toBe(false)
      expect(state.interactions.userMenu).toBe(false)
    })
  })

  describe('Dropdown Management', () => {
    it('should open a dropdown', () => {
      act(() => {
        useUIStore.getState().setDropdownOpen('user-menu', true)
      })

      const state = useUIStore.getState()
      expect(state.dropdowns['user-menu']?.isOpen).toBe(true)
    })

    it('should close a dropdown', () => {
      act(() => {
        useUIStore.getState().setDropdownOpen('user-menu', true)
      })

      let state = useUIStore.getState()
      expect(state.dropdowns['user-menu']?.isOpen).toBe(true)

      act(() => {
        useUIStore.getState().setDropdownOpen('user-menu', false)
      })

      state = useUIStore.getState()
      expect(state.dropdowns['user-menu']?.isOpen).toBe(false)
    })

    it('should close all other dropdowns when opening one', () => {
      act(() => {
        useUIStore.getState().setDropdownOpen('dropdown1', true)
        useUIStore.getState().setDropdownOpen('dropdown2', true)
      })

      const state = useUIStore.getState()
      expect(state.dropdowns['dropdown1']?.isOpen).toBe(false)
      expect(state.dropdowns['dropdown2']?.isOpen).toBe(true)
    })

    it('should toggle dropdown state', () => {
      act(() => {
        useUIStore.getState().toggleDropdown('settings-menu')
      })

      let state = useUIStore.getState()
      expect(state.dropdowns['settings-menu']?.isOpen).toBe(true)

      act(() => {
        useUIStore.getState().toggleDropdown('settings-menu')
      })

      state = useUIStore.getState()
      expect(state.dropdowns['settings-menu']?.isOpen).toBe(false)
    })

    it('should close all other dropdowns when toggling one open', () => {
      act(() => {
        useUIStore.getState().setDropdownOpen('dropdown1', true)
        useUIStore.getState().toggleDropdown('dropdown2')
      })

      const state = useUIStore.getState()
      expect(state.dropdowns['dropdown1']?.isOpen).toBe(false)
      expect(state.dropdowns['dropdown2']?.isOpen).toBe(true)
    })

    it('should close all dropdowns', () => {
      act(() => {
        useUIStore.getState().setDropdownOpen('dropdown1', true)
        useUIStore.getState().setDropdownOpen('dropdown2', true)
        useUIStore.getState().setDropdownOpen('dropdown3', true)
      })

      act(() => {
        useUIStore.getState().closeAllDropdowns()
      })

      const state = useUIStore.getState()
      expect(state.dropdowns['dropdown1']?.isOpen).toBe(false)
      expect(state.dropdowns['dropdown2']?.isOpen).toBe(false)
      expect(state.dropdowns['dropdown3']?.isOpen).toBe(false)
    })
  })

  describe('Store Reset', () => {
    it('should reset all UI state to initial values', () => {
      act(() => {
        useUIStore.getState().openModal('tournamentRegistration', { id: '123' })
        useUIStore.getState().openConfirmation({ title: 'Test', message: 'Test' })
        useUIStore.getState().setActiveTab('tournamentDetails', 'brackets')
        useUIStore.getState().setFilters('tournaments', { gameId: 'pokemon-tcg' })
        useUIStore.getState().setInteraction('isWithdrawing', true)
        useUIStore.getState().setDropdownOpen('user-menu', true)
      })

      let state = useUIStore.getState()
      expect(state.modals.tournamentRegistration.isOpen).toBe(true)
      expect(state.modals.confirmation.isOpen).toBe(true)
      expect(state.tabs.tournamentDetails.activeTab).toBe('brackets')
      expect(state.filters.tournaments.gameId).toBe('pokemon-tcg')
      expect(state.interactions.isWithdrawing).toBe(true)
      expect(state.dropdowns['user-menu']?.isOpen).toBe(true)

      act(() => {
        useUIStore.getState().resetUI()
      })

      state = useUIStore.getState()
      expect(state.modals.tournamentRegistration.isOpen).toBe(false)
      expect(state.modals.confirmation.isOpen).toBe(false)
      expect(state.tabs.tournamentDetails.activeTab).toBe('')
      expect(state.filters.tournaments.gameId).toBe('')
      expect(state.interactions.isWithdrawing).toBe(false)
      expect(Object.keys(state.dropdowns)).toHaveLength(0)
    })
  })

  describe('Custom Hooks', () => {
    it('useModal should provide modal state and actions', () => {
      const { result } = renderHook(() => useModal('tournamentCreate'))

      expect(result.current.isOpen).toBe(false)
      expect(result.current.data).toBeUndefined()

      act(() => {
        result.current.open({ tournamentId: '123' })
      })

      expect(result.current.isOpen).toBe(true)
      expect(result.current.data).toEqual({ tournamentId: '123' })

      act(() => {
        result.current.close()
      })

      expect(result.current.isOpen).toBe(false)
    })

    it('useConfirmationModal should provide confirmation state and actions', () => {
      const { result } = renderHook(() => useConfirmationModal())

      expect(result.current.isOpen).toBe(false)

      const config: ConfirmationConfig = {
        title: 'Confirm',
        message: 'Are you sure?',
      }

      act(() => {
        result.current.open(config)
      })

      expect(result.current.isOpen).toBe(true)
      expect(result.current.config).toEqual(config)

      act(() => {
        result.current.close()
      })

      expect(result.current.isOpen).toBe(false)
    })

    it('useTab should provide tab state and actions', () => {
      const { result } = renderHook(() => useTab('tournamentManage'))

      expect(result.current.activeTab).toBe('')
      expect(result.current.availableTabs).toEqual([])

      act(() => {
        result.current.setAvailableTabs(['settings', 'participants', 'results'])
        result.current.setActiveTab('settings')
      })

      expect(result.current.activeTab).toBe('settings')
      expect(result.current.availableTabs).toEqual(['settings', 'participants', 'results'])
    })

    it('useFilters should provide filter state and actions', () => {
      const { result } = renderHook(() => useFilters('tournaments'))

      expect(result.current.filters.gameId).toBe('')

      act(() => {
        result.current.setFilters({ gameId: 'pokemon-tcg', status: 'ACTIVE' })
      })

      expect(result.current.filters.gameId).toBe('pokemon-tcg')
      expect(result.current.filters.status).toBe('ACTIVE')

      act(() => {
        result.current.resetFilters()
      })

      expect(result.current.filters.gameId).toBe('')
      expect(result.current.filters.status).toBe('')
    })

    it('useInteractions should provide interaction state and actions', () => {
      const { result } = renderHook(() => useInteractions())

      expect(result.current.isWithdrawing).toBe(false)

      act(() => {
        result.current.setInteraction('isWithdrawing', true)
      })

      expect(result.current.isWithdrawing).toBe(true)

      act(() => {
        result.current.resetInteractions()
      })

      expect(result.current.isWithdrawing).toBe(false)
    })

    it('useDropdown should provide dropdown state and actions', () => {
      const { result } = renderHook(() => useDropdown('test-dropdown'))

      expect(result.current.isOpen).toBe(false)

      act(() => {
        result.current.open()
      })

      expect(result.current.isOpen).toBe(true)

      act(() => {
        result.current.close()
      })

      expect(result.current.isOpen).toBe(false)

      act(() => {
        result.current.toggle()
      })

      expect(result.current.isOpen).toBe(true)
    })

    it('useModals should provide all modals state and actions', () => {
      const { result } = renderHook(() => useModals())

      expect(result.current.isAnyModalOpen).toBe(false)

      act(() => {
        useUIStore.getState().openModal('tournamentRegistration')
      })

      expect(result.current.isAnyModalOpen).toBe(true)

      act(() => {
        result.current.closeAllModals()
      })

      expect(result.current.isAnyModalOpen).toBe(false)
    })
  })
})
