import { useMemo, useCallback } from 'react'
import { useUIStore } from './ui-store'

// Stable empty array to prevent infinite loops
const EMPTY_ARRAY: string[] = []

// Define the types locally to avoid import issues
type ModalConfig = {
  isOpen: boolean
  data?: Record<string, any>
}

type TabState = {
  activeTab: string
  availableTabs: string[]
}

type FilterState = {
  gameId: string
  storeId: string
  status: string
  startDate: string
  endDate: string
  search: string
}

type UIState = {
  modals: {
    tournamentRegistration: ModalConfig
    tournamentManagement: ModalConfig
    tournamentCreate: ModalConfig
    userPreferences: ModalConfig
    login: ModalConfig
    confirmation: ModalConfig & { config?: any }
  }
  tabs: {
    tournamentDetails: TabState
    tournamentManage: TabState
  }
  filters: {
    tournaments: FilterState
  }
  interactions: {
    isWithdrawing: boolean
    withdrawSuccess: boolean
  }
}

// Modal selectors
export const useModalSelectors = {
  // Get specific modal state
  getModal: (modalName: keyof UIState['modals']) => {
    return useUIStore((state) => state.modals[modalName])
  },

  // Get modal open state
  isModalOpen: (modalName: keyof UIState['modals']) => {
    return useUIStore((state) => state.modals[modalName]?.isOpen || false)
  },

  // Get modal data
  getModalData: (modalName: keyof UIState['modals']) => {
    return useUIStore((state) => state.modals[modalName]?.data)
  },

  // Get all open modals - memoized to prevent infinite loops
  getOpenModals: () => {
    return useUIStore(
      useCallback((state) => 
        Object.entries(state.modals)
          .filter(([_, config]) => config.isOpen)
          .map(([name, config]) => ({ name, config }))
      , [])
    )
  },

  // Check if any modal is open
  hasOpenModals: () => {
    return useUIStore((state) => 
      Object.values(state.modals).some(config => config.isOpen)
    )
  },

  // Get confirmation modal state - memoized to prevent infinite loops
  getConfirmationModal: () => {
    return useUIStore(
      useCallback((state) => ({
        isOpen: state.modals.confirmation?.isOpen || false,
        config: state.modals.confirmation?.config
      }), [])
    )
  },
}

// Tab selectors
export const useTabSelectors = {
  // Get specific tab state
  getTab: (tabName: keyof UIState['tabs']) => {
    return useUIStore((state) => state.tabs[tabName])
  },

  // Get active tab
  getActiveTab: (tabName: keyof UIState['tabs']) => {
    return useUIStore((state) => state.tabs[tabName]?.activeTab)
  },

  // Get available tabs 
  getAvailableTabs: (tabName: keyof UIState['tabs']) => {
    return useUIStore((state) => state.tabs[tabName]?.availableTabs || [])
  },

  // Check if tab is active
  isTabActive: (tabName: keyof UIState['tabs'], tab: string) => {
    return useUIStore((state) => state.tabs[tabName]?.activeTab === tab)
  },
}

// Filter selectors
export const useFilterSelectors = {
  // Get specific filter state
  getFilters: (filterName: keyof UIState['filters']) => {
    return useUIStore((state) => state.filters[filterName])
  },

  // Get specific filter value
  getFilterValue: (filterName: keyof UIState['filters'], key: string) => {
    return useUIStore((state) => state.filters[filterName]?.[key as keyof typeof state.filters[typeof filterName]])
  },

  // Get tournament list filters
  getTournamentListFilters: () => {
    return useUIStore((state) => state.filters.tournaments)
  },

  // Check if filters are active - memoized to prevent infinite loops
  hasActiveFilters: (filterName: keyof UIState['filters']) => {
    return useUIStore(
      useCallback((state) => {
        const filters = state.filters[filterName]
        return Object.values(filters).some(value => 
          value !== '' && value !== null && value !== undefined
        )
      }, [filterName])
    )
  },

  // Get active filter count - memoized to prevent infinite loops
  getActiveFilterCount: (filterName: keyof UIState['filters']) => {
    return useUIStore(
      useCallback((state) => {
        const filters = state.filters[filterName]
        return Object.values(filters).filter(value => 
          value !== '' && value !== null && value !== undefined
        ).length
      }, [filterName])
    )
  },
}

// Interaction selectors
export const useInteractionSelectors = {
  // Get specific interaction state
  getInteraction: (key: keyof UIState['interactions']) => {
    return useUIStore((state) => state.interactions[key])
  },

  // Get all interactions
  getAllInteractions: () => {
    return useUIStore((state) => state.interactions)
  },

  // Check if interaction is active
  isInteractionActive: (key: keyof UIState['interactions']) => {
    return useUIStore((state) => !!state.interactions[key])
  },

  // Get interaction state for specific actions - memoized to prevent infinite loops
  getWithdrawalState: () => {
    return useUIStore(
      useCallback((state) => ({
        isWithdrawing: state.interactions.isWithdrawing,
        withdrawSuccess: state.interactions.withdrawSuccess,
      }), [])
    )
  },
}

// Action selectors
export const useUIActions = {
  // Modal actions
  openModal: () => useUIStore((state) => state.openModal),
  closeModal: () => useUIStore((state) => state.closeModal),
  closeAllModals: () => useUIStore((state) => state.closeAllModals),

  // Tab actions
  setActiveTab: () => useUIStore((state) => state.setActiveTab),
  setAvailableTabs: () => useUIStore((state) => state.setAvailableTabs),

  // Filter actions
  setFilters: () => useUIStore((state) => state.setFilters),
  resetFilters: () => useUIStore((state) => state.resetFilters),

  // Interaction actions
  setInteraction: () => useUIStore((state) => state.setInteraction),
  resetInteractions: () => useUIStore((state) => state.resetInteractions),

  // Confirmation actions
  openConfirmation: () => useUIStore((state) => state.openConfirmation),
  closeConfirmation: () => useUIStore((state) => state.closeConfirmation),
}

// Combined selectors for common use cases
export const useUIStoreSelectors = {
  // Get complete modal state for a specific modal
  getModalState: (modalName: keyof UIState['modals']) => {
    const isOpen = useModalSelectors.isModalOpen(modalName)
    const data = useModalSelectors.getModalData(modalName)
    const openModal = useUIActions.openModal()
    const closeModal = useUIActions.closeModal()

    return useMemo(() => ({
      isOpen,
      data,
      open: (data?: any) => openModal(modalName, data),
      close: () => closeModal(modalName),
    }), [isOpen, data, openModal, closeModal, modalName])
  },

  // Get complete tab state for a specific tab
  getTabState: (tabName: keyof UIState['tabs']) => {
    const activeTab = useTabSelectors.getActiveTab(tabName)
    const availableTabs = useTabSelectors.getAvailableTabs(tabName)
    const setActiveTab = useUIActions.setActiveTab()

    return useMemo(() => ({
      activeTab,
      availableTabs,
      setActiveTab: (tab: string) => setActiveTab(tabName, tab),
    }), [activeTab, availableTabs, setActiveTab, tabName])
  },

  // Get complete filter state for a specific filter
  getFilterState: (filterName: keyof UIState['filters']) => {
    const filters = useFilterSelectors.getFilters(filterName)
    const hasActiveFilters = useFilterSelectors.hasActiveFilters(filterName)
    const activeFilterCount = useFilterSelectors.getActiveFilterCount(filterName)
    const setFilters = useUIActions.setFilters()
    const resetFilters = useUIActions.resetFilters()

    return useMemo(() => ({
      filters,
      hasActiveFilters,
      activeFilterCount,
      setFilters: (newFilters: Partial<UIState['filters'][typeof filterName]>) => setFilters(filterName, newFilters),
      resetFilters: () => resetFilters(filterName),
    }), [filters, hasActiveFilters, activeFilterCount, setFilters, resetFilters, filterName])
  },

  // Get complete interaction state
  getInteractionState: () => {
    const interactions = useInteractionSelectors.getAllInteractions()
    const setInteraction = useUIActions.setInteraction()
    const resetInteractions = useUIActions.resetInteractions()

    return useMemo(() => ({
      ...interactions,
      setInteraction,
      resetInteractions,
    }), [interactions, setInteraction, resetInteractions])
  },

  // Get confirmation modal state
  getConfirmationState: () => {
    const { isOpen, config } = useModalSelectors.getConfirmationModal()
    const openConfirmation = useUIActions.openConfirmation()
    const closeConfirmation = useUIActions.closeConfirmation()

    return useMemo(() => ({
      isOpen,
      config,
      openConfirmation,
      closeConfirmation,
    }), [isOpen, config, openConfirmation, closeConfirmation])
  },
}

// Performance-optimized selectors for specific use cases
export const useOptimizedUISelectors = {
  // Get only the data needed for modal rendering - memoized to prevent infinite loops
  getModalRenderData: (modalName: keyof UIState['modals']) => {
    return useUIStore(
      useCallback((state) => ({
        isOpen: state.modals[modalName]?.isOpen || false,
        data: state.modals[modalName]?.data,
      }), [modalName])
    )
  },

  // Get only the data needed for tab rendering - memoized to prevent infinite loops
  getTabRenderData: (tabName: keyof UIState['tabs']) => {
    return useUIStore(
      useCallback((state) => ({
        activeTab: state.tabs[tabName]?.activeTab,
        availableTabs: state.tabs[tabName]?.availableTabs || EMPTY_ARRAY,
      }), [tabName])
    )
  },

  // Get only the data needed for filter rendering - memoized to prevent infinite loops
  getFilterRenderData: (filterName: keyof UIState['filters']) => {
    return useUIStore(
      useCallback((state) => ({
        filters: state.filters[filterName],
        hasActiveFilters: Object.values(state.filters[filterName]).some(value => 
          value !== '' && value !== null && value !== undefined
        ),
      }), [filterName])
    )
  },

  // Get only the data needed for interaction rendering - memoized to prevent infinite loops
  getInteractionRenderData: () => {
    return useUIStore(
      useCallback((state) => ({
        isWithdrawing: state.interactions.isWithdrawing,
        withdrawSuccess: state.interactions.withdrawSuccess,
      }), [])
    )
  },
}
