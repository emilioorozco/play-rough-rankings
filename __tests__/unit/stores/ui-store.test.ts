import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'
import { create } from 'zustand'
import type { ModalConfig, ConfirmationConfig } from '@/lib/types'

// Create a test store without persistence
const createTestUIStore = () => {
  // Types for modal configurations
  interface ModalConfig {
    isOpen: boolean
    data?: Record<string, any>
  }

  interface ConfirmationConfig {
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
    onConfirm?: () => void | Promise<void>
    onCancel?: () => void
    isLoading?: boolean
  }

  interface TabState {
    activeTab: string
    availableTabs: string[]
  }

  interface FilterState {
    gameId: string
    storeId: string
    status: string
    startDate: string
    endDate: string
    search: string
  }

  interface InteractionState {
    isWithdrawing: boolean
    withdrawSuccess: boolean
  }

  interface UIState {
    // Modal states
    modals: {
      tournamentRegistration: ModalConfig
      tournamentManagement: ModalConfig
      tournamentCreate: ModalConfig
      userPreferences: ModalConfig
      login: ModalConfig
      confirmation: ModalConfig & { config?: ConfirmationConfig }
    }
    
    // Tab states
    tabs: {
      tournamentDetails: TabState
      tournamentManage: TabState
    }
    
    // Filter states
    filters: {
      tournaments: FilterState
    }
    
    // Interaction states
    interactions: InteractionState
    
    // Modal actions
    openModal: (modalName: keyof UIState['modals'], data?: Record<string, any>) => void
    closeModal: (modalName: keyof UIState['modals']) => void
    closeAllModals: () => void
    toggleModal: (modalName: keyof UIState['modals'], data?: Record<string, any>) => void
    openConfirmation: (config: ConfirmationConfig) => void
    closeConfirmation: () => void
    
    // Tab actions
    setActiveTab: (tabGroup: keyof UIState['tabs'], tab: string) => void
    setAvailableTabs: (tabGroup: keyof UIState['tabs'], tabs: string[]) => void
    
    // Filter actions
    setFilters: (filterGroup: keyof UIState['filters'], filters: Partial<FilterState>) => void
    resetFilters: (filterGroup: keyof UIState['filters']) => void
    
    // Interaction actions
    setInteraction: (interactionName: keyof InteractionState, isActive: boolean) => void
    resetInteractions: () => void
    
    // Reset action
    resetUI: () => void
  }

  const initialModalState: ModalConfig = {
    isOpen: false,
    data: undefined
  }

  const initialTabState: TabState = {
    activeTab: '',
    availableTabs: []
  }

  const initialFilterState: FilterState = {
    gameId: '',
    storeId: '',
    status: '',
    startDate: '',
    endDate: '',
    search: ''
  }

  const initialInteractionState: InteractionState = {
    isWithdrawing: false,
    withdrawSuccess: false
  }

  return create<UIState>()((set, get) => ({
    // Initial state
    modals: {
      tournamentRegistration: { ...initialModalState },
      tournamentManagement: { ...initialModalState },
      tournamentCreate: { ...initialModalState },
      userPreferences: { ...initialModalState },
      login: { ...initialModalState },
      confirmation: { ...initialModalState, config: undefined },
    },
    
    tabs: {
      tournamentDetails: { ...initialTabState },
      tournamentManage: { ...initialTabState },
    },
    
    filters: {
      tournaments: { ...initialFilterState },
    },
    
    interactions: { ...initialInteractionState },
    
    // Modal actions
    openModal: (modalName, data) => set((state) => ({
      modals: {
        ...state.modals,
        [modalName]: {
          isOpen: true,
          data: data || undefined
        }
      }
    })),
    
    closeModal: (modalName) => set((state) => ({
      modals: {
        ...state.modals,
        [modalName]: {
          ...state.modals[modalName],
          isOpen: false,
          data: undefined
        }
      }
    })),
    
    closeAllModals: () => set((state) => ({
      modals: Object.keys(state.modals).reduce((acc, key) => {
        acc[key as keyof UIState['modals']] = {
          ...state.modals[key as keyof UIState['modals']],
          isOpen: false,
          data: undefined
        }
        return acc
      }, {} as UIState['modals'])
    })),
    
    toggleModal: (modalName, data) => set((state) => ({
      modals: {
        ...state.modals,
        [modalName]: {
          isOpen: !state.modals[modalName].isOpen,
          data: state.modals[modalName].isOpen ? undefined : (data || undefined)
        }
      }
    })),
    
    openConfirmation: (config) => set((state) => ({
      modals: {
        ...state.modals,
        confirmation: {
          isOpen: true,
          config
        }
      }
    })),
    
    closeConfirmation: () => set((state) => ({
      modals: {
        ...state.modals,
        confirmation: {
          ...state.modals.confirmation,
          isOpen: false,
          config: undefined
        }
      }
    })),
    
    // Tab actions
    setActiveTab: (tabGroup, tab) => set((state) => ({
      tabs: {
        ...state.tabs,
        [tabGroup]: {
          ...state.tabs[tabGroup],
          activeTab: tab
        }
      }
    })),
    
    setAvailableTabs: (tabGroup, tabs) => set((state) => ({
      tabs: {
        ...state.tabs,
        [tabGroup]: {
          ...state.tabs[tabGroup],
          availableTabs: tabs
        }
      }
    })),
    
    // Filter actions
    setFilters: (filterGroup, filters) => set((state) => ({
      filters: {
        ...state.filters,
        [filterGroup]: {
          ...state.filters[filterGroup],
          ...filters
        }
      }
    })),
    
    resetFilters: (filterGroup) => set((state) => ({
      filters: {
        ...state.filters,
        [filterGroup]: { ...initialFilterState }
      }
    })),
    
    // Interaction actions
    setInteraction: (interactionName, isActive) => set((state) => ({
      interactions: {
        ...state.interactions,
        [interactionName]: isActive
      }
    })),
    
    resetInteractions: () => set(() => ({
      interactions: { ...initialInteractionState }
    })),
    
    // Reset action
    resetUI: () => set(() => ({
      modals: {
        tournamentRegistration: { ...initialModalState },
        tournamentManagement: { ...initialModalState },
        tournamentCreate: { ...initialModalState },
        userPreferences: { ...initialModalState },
        login: { ...initialModalState },
        confirmation: { ...initialModalState, config: undefined },
      },
      tabs: {
        tournamentDetails: { ...initialTabState },
        tournamentManage: { ...initialTabState },
      },
      filters: {
        tournaments: { ...initialFilterState },
      },
      interactions: { ...initialInteractionState },
    }))
  }))
}

// Create test store instance
const useTestUIStore = createTestUIStore()

describe('UI Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTestUIStore.getState().resetUI()
  })

  describe('Modal Management', () => {
    it('should open a modal with configuration', () => {
      const store = useTestUIStore.getState()
      const modalName = 'tournamentRegistration'
      const data = { tournamentId: 'test-tournament' }

      act(() => {
        store.openModal(modalName, data)
      })

      const updatedStore = useTestUIStore.getState()
      const modalState = updatedStore.modals[modalName]
      expect(modalState.isOpen).toBe(true)
      expect(modalState.data).toEqual(data)
    })

    it('should close a modal', () => {
      const store = useTestUIStore.getState()
      const modalName = 'tournamentRegistration'

      // First open the modal
      act(() => {
        store.openModal(modalName, { tournamentId: 'test' })
      })

      let updatedStore = useTestUIStore.getState()
      expect(updatedStore.modals[modalName].isOpen).toBe(true)

      // Then close it
      act(() => {
        store.closeModal(modalName)
      })

      updatedStore = useTestUIStore.getState()
      expect(updatedStore.modals[modalName].isOpen).toBe(false)
    })

    it('should close all modals', () => {
      const store = useTestUIStore.getState()

      // Open multiple modals
      act(() => {
        store.openModal('tournamentRegistration', {})
        store.openModal('tournamentManagement', {})
        store.openModal('userPreferences', {})
      })

      let updatedStore = useTestUIStore.getState()
      expect(updatedStore.modals['tournamentRegistration'].isOpen).toBe(true)
      expect(updatedStore.modals['tournamentManagement'].isOpen).toBe(true)
      expect(updatedStore.modals['userPreferences'].isOpen).toBe(true)

      // Close all modals
      act(() => {
        store.closeAllModals()
      })

      updatedStore = useTestUIStore.getState()
      expect(updatedStore.modals['tournamentRegistration'].isOpen).toBe(false)
      expect(updatedStore.modals['tournamentManagement'].isOpen).toBe(false)
      expect(updatedStore.modals['userPreferences'].isOpen).toBe(false)
    })
  })

  describe('Confirmation Modal', () => {
    it('should open confirmation modal with configuration', () => {
      const store = useTestUIStore.getState()
      const config: ConfirmationConfig = {
        title: 'Confirm Action',
        message: 'Are you sure?',
        onConfirm: vi.fn(),
        onCancel: vi.fn()
      }

      act(() => {
        store.openConfirmation(config)
      })

      const updatedStore = useTestUIStore.getState()
      expect(updatedStore.modals.confirmation.isOpen).toBe(true)
      expect(updatedStore.modals.confirmation.config).toEqual(config)
    })

    it('should close confirmation modal', () => {
      const store = useTestUIStore.getState()
      const config: ConfirmationConfig = {
        title: 'Confirm Action',
        message: 'Are you sure?',
        onConfirm: vi.fn()
      }

      // First open the confirmation modal
      act(() => {
        store.openConfirmation(config)
      })

      let updatedStore = useTestUIStore.getState()
      expect(updatedStore.modals.confirmation.isOpen).toBe(true)

      // Then close it
      act(() => {
        store.closeConfirmation()
      })

      updatedStore = useTestUIStore.getState()
      expect(updatedStore.modals.confirmation.isOpen).toBe(false)
    })
  })

  describe('Tab Management', () => {
    it('should set active tab for a tab group', () => {
      const store = useTestUIStore.getState()
      const tabGroup = 'tournamentDetails'
      const tab = 'details'

      act(() => {
        store.setActiveTab(tabGroup, tab)
      })

      const updatedStore = useTestUIStore.getState()
      expect(updatedStore.tabs[tabGroup].activeTab).toBe(tab)
    })

    it('should update active tab for existing tab group', () => {
      const store = useTestUIStore.getState()
      const tabGroup = 'tournamentDetails'

      // Set initial tab
      act(() => {
        store.setActiveTab(tabGroup, 'details')
      })

      let updatedStore = useTestUIStore.getState()
      expect(updatedStore.tabs[tabGroup].activeTab).toBe('details')

      // Update to different tab
      act(() => {
        store.setActiveTab(tabGroup, 'players')
      })

      updatedStore = useTestUIStore.getState()
      expect(updatedStore.tabs[tabGroup].activeTab).toBe('players')
    })
  })

  describe('Filter Management', () => {
    it('should set filters for a filter group', () => {
      const store = useTestUIStore.getState()
      const filterGroup = 'tournaments'
      const filters = {
        gameId: 'pokemon-tcg',
        storeId: 'store-1',
        status: 'active',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        search: 'test'
      }

      act(() => {
        store.setFilters(filterGroup, filters)
      })

      const updatedStore = useTestUIStore.getState()
      expect(updatedStore.filters[filterGroup]).toEqual(filters)
    })

    it('should clear filters for a filter group', () => {
      const store = useTestUIStore.getState()
      const filterGroup = 'tournaments'
      const filters = {
        gameId: 'pokemon-tcg',
        storeId: 'store-1',
        status: 'active',
        startDate: '',
        endDate: '',
        search: ''
      }

      // First set filters
      act(() => {
        store.setFilters(filterGroup, filters)
      })

      const updatedStore = useTestUIStore.getState()
      expect(updatedStore.filters[filterGroup]).toEqual(filters)

      // Then clear them
      act(() => {
        store.resetFilters(filterGroup)
      })

      // Should reset to default filter state
      expect(store.filters[filterGroup].gameId).toBe('')
      expect(store.filters[filterGroup].status).toBe('')
      expect(store.filters[filterGroup].search).toBe('')
    })
  })

  describe('Interaction Management', () => {
    it('should set interaction state', () => {
      const store = useTestUIStore.getState()
      const interactionName = 'isWithdrawing'
      const isActive = true

      act(() => {
        store.setInteraction(interactionName, isActive)
      })

      const updatedStore = useTestUIStore.getState()
      expect(updatedStore.interactions[interactionName]).toBe(isActive)
    })

    it('should toggle interaction state', () => {
      const store = useTestUIStore.getState()
      const interactionName = 'isWithdrawing'

      // Set to true
      act(() => {
        store.setInteraction(interactionName, true)
      })

      let updatedStore = useTestUIStore.getState()
      expect(updatedStore.interactions[interactionName]).toBe(true)

      // Set to false
      act(() => {
        store.setInteraction(interactionName, false)
      })

      updatedStore = useTestUIStore.getState()
      expect(updatedStore.interactions[interactionName]).toBe(false)
    })
  })

  describe('Store Reset', () => {
    it('should reset all UI state to initial values', () => {
      const store = useTestUIStore.getState()

      // Set some state
      act(() => {
        store.openModal('tournamentRegistration', {})
        store.openConfirmation({
          title: 'Confirm',
          message: 'Test',
          onConfirm: vi.fn()
        })
        store.setActiveTab('tournamentDetails', 'active')
        store.setFilters('tournaments', { gameId: 'pokemon-tcg', status: 'active', storeId: '', startDate: '', endDate: '', search: '' })
        store.setInteraction('isWithdrawing', true)
      })

      // Verify state is set
      let updatedStore = useTestUIStore.getState()
      expect(updatedStore.modals['tournamentRegistration'].isOpen).toBe(true)
      expect(updatedStore.modals.confirmation.isOpen).toBe(true)
      expect(updatedStore.tabs['tournamentDetails'].activeTab).toBe('active')
      expect(updatedStore.filters['tournaments'].gameId).toBe('pokemon-tcg')
      expect(updatedStore.interactions['isWithdrawing']).toBe(true)

      // Reset
      act(() => {
        store.resetUI()
      })

      // Verify state is reset
      updatedStore = useTestUIStore.getState()
      expect(updatedStore.modals['tournamentRegistration'].isOpen).toBe(false)
      expect(updatedStore.modals.confirmation.isOpen).toBe(false)
      expect(updatedStore.tabs['tournamentDetails'].activeTab).toBe('')
      expect(updatedStore.filters['tournaments'].gameId).toBe('')
      expect(updatedStore.interactions['isWithdrawing']).toBe(false)
    })
  })

  describe('State Persistence', () => {
    it('should maintain tab state across operations', () => {
      const store = useTestUIStore.getState()
      const tabGroup = 'tournamentDetails'
      const tab = 'details'

      act(() => {
        store.setActiveTab(tabGroup, tab)
      })

      let updatedStore = useTestUIStore.getState()
      expect(updatedStore.tabs[tabGroup].activeTab).toBe(tab)

      // Perform other operations
      act(() => {
        store.openModal('tournamentRegistration', {})
        store.setFilters('tournaments', { gameId: 'pokemon-tcg', status: 'active', storeId: '', startDate: '', endDate: '', search: '' })
      })

      // Tab state should still be maintained
      updatedStore = useTestUIStore.getState()
      expect(updatedStore.tabs[tabGroup].activeTab).toBe(tab)
    })

    it('should maintain filter state across operations', () => {
      const store = useTestUIStore.getState()
      const filterGroup = 'tournaments'
      const filters = { gameId: 'pokemon-tcg', status: 'active', storeId: '', startDate: '', endDate: '', search: '' }

      act(() => {
        store.setFilters(filterGroup, filters)
      })

      let updatedStore = useTestUIStore.getState()
      expect(updatedStore.filters[filterGroup]).toEqual(filters)

      // Perform other operations
      act(() => {
        store.openModal('tournamentRegistration', {})
        store.setActiveTab('tournamentDetails', 'active')
      })

      // Filter state should still be maintained
      updatedStore = useTestUIStore.getState()
      expect(updatedStore.filters[filterGroup]).toEqual(filters)
    })
  })
})