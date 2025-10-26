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
    storeCreate: ModalConfig
  }
  tabs: {
    tournamentDetails: TabState
    tournamentManage: TabState
    'leaderboard-view': TabState
  }
  filters: {
    tournaments: FilterState
    'tournament-list': FilterState
    'tournament-participants': { status: string }
  }
  interactions: {
    isWithdrawing: boolean
    withdrawSuccess: boolean
    userMenu: boolean
  }
}

// Modal hooks
export const useModal = (modalName: keyof UIState['modals']) => {
  return useUIStore((state) => state.modals[modalName])
}

export const useIsModalOpen = (modalName: keyof UIState['modals']) => {
  return useUIStore((state) => state.modals[modalName]?.isOpen || false)
}

export const useModalData = (modalName: keyof UIState['modals']) => {
  return useUIStore((state) => state.modals[modalName]?.data)
}

export const useOpenModals = () => {
  return useUIStore(
    useCallback((state) => 
      Object.entries(state.modals)
        .filter(([, config]) => config.isOpen)
        .map(([name, config]) => ({ name, config }))
    , [])
  )
}

export const useHasOpenModals = () => {
  return useUIStore((state) => 
    Object.values(state.modals).some(config => config.isOpen)
  )
}

export const useConfirmationModal = () => {
  return useUIStore(
    useCallback((state) => ({
      isOpen: state.modals.confirmation?.isOpen || false,
      config: state.modals.confirmation?.config
    }), [])
  )
}

// Tab hooks
export const useTab = (tabName: keyof UIState['tabs']) => {
  return useUIStore((state) => state.tabs[tabName])
}

export const useActiveTab = (tabName: keyof UIState['tabs']) => {
  return useUIStore((state) => state.tabs[tabName]?.activeTab)
}

export const useAvailableTabs = (tabName: keyof UIState['tabs']) => {
  return useUIStore((state) => state.tabs[tabName]?.availableTabs || [])
}

export const useIsTabActive = (tabName: keyof UIState['tabs'], tab: string) => {
  return useUIStore((state) => state.tabs[tabName]?.activeTab === tab)
}

// Filter hooks
export const useFilters = (filterName: keyof UIState['filters']) => {
  return useUIStore((state) => state.filters[filterName])
}

export const useFilterValue = (filterName: keyof UIState['filters'], key: string) => {
  return useUIStore((state) => state.filters[filterName]?.[key as keyof typeof state.filters[typeof filterName]])
}

export const useTournamentListFilters = () => {
  return useUIStore((state) => state.filters.tournaments)
}

export const useHasActiveFilters = (filterName: keyof UIState['filters']) => {
  return useUIStore(
    useCallback((state) => {
      const filters = state.filters[filterName]
      return Object.values(filters).some(value => 
        value !== '' && value !== null && value !== undefined
      )
    }, [filterName])
  )
}

export const useActiveFilterCount = (filterName: keyof UIState['filters']) => {
  return useUIStore(
    useCallback((state) => {
      const filters = state.filters[filterName]
      return Object.values(filters).filter(value => 
        value !== '' && value !== null && value !== undefined
      ).length
    }, [filterName])
  )
}

// Interaction hooks
export const useInteraction = (key: keyof UIState['interactions']) => {
  return useUIStore((state) => state.interactions[key])
}

export const useAllInteractions = () => {
  return useUIStore((state) => state.interactions)
}

export const useIsInteractionActive = (key: keyof UIState['interactions']) => {
  return useUIStore((state) => !!state.interactions[key])
}

export const useWithdrawalState = () => {
  return useUIStore(
    useCallback((state) => ({
      isWithdrawing: state.interactions.isWithdrawing,
      withdrawSuccess: state.interactions.withdrawSuccess,
    }), [])
  )
}

// Action hooks
export const useUIActions = () => {
  return useUIStore((state) => ({
    // Modal actions
    openModal: state.openModal,
    closeModal: state.closeModal,
    closeAllModals: state.closeAllModals,
    // Tab actions
    setActiveTab: state.setActiveTab,
    setAvailableTabs: state.setAvailableTabs,
    // Filter actions
    setFilters: state.setFilters,
    resetFilters: state.resetFilters,
    // Interaction actions
    setInteraction: state.setInteraction,
    resetInteractions: state.resetInteractions,
    // Confirmation actions
    openConfirmation: state.openConfirmation,
    closeConfirmation: state.closeConfirmation,
  }))
}

// Combined hooks for common use cases
export const useModalState = (modalName: keyof UIState['modals']) => {
  const isOpen = useIsModalOpen(modalName)
  const data = useModalData(modalName)
  const actions = useUIActions()

  return useMemo(() => ({
    isOpen,
    data,
    open: (data?: any) => actions.openModal(modalName, data),
    close: () => actions.closeModal(modalName),
  }), [isOpen, data, actions, modalName])
}

export const useTabState = (tabName: keyof UIState['tabs']) => {
  const activeTab = useActiveTab(tabName)
  const availableTabs = useAvailableTabs(tabName)
  const actions = useUIActions()

  return useMemo(() => ({
    activeTab,
    availableTabs,
    setActiveTab: (tab: string) => actions.setActiveTab(tabName, tab),
  }), [activeTab, availableTabs, actions, tabName])
}

export const useFilterState = (filterName: keyof UIState['filters']) => {
  const filters = useFilters(filterName)
  const hasActiveFilters = useHasActiveFilters(filterName)
  const activeFilterCount = useActiveFilterCount(filterName)
  const actions = useUIActions()

  return useMemo(() => ({
    filters,
    hasActiveFilters,
    activeFilterCount,
    setFilters: (newFilters: Partial<UIState['filters'][typeof filterName]>) => actions.setFilters(filterName, newFilters),
    resetFilters: () => actions.resetFilters(filterName),
  }), [filters, hasActiveFilters, activeFilterCount, actions, filterName])
}

export const useInteractionState = () => {
  const interactions = useAllInteractions()
  const actions = useUIActions()

  return useMemo(() => ({
    ...interactions,
    setInteraction: actions.setInteraction,
    resetInteractions: actions.resetInteractions,
  }), [interactions, actions])
}

export const useConfirmationState = () => {
  const { isOpen, config } = useConfirmationModal()
  const actions = useUIActions()

  return useMemo(() => ({
    isOpen,
    config,
    openConfirmation: actions.openConfirmation,
    closeConfirmation: actions.closeConfirmation,
  }), [isOpen, config, actions])
}

// Performance-optimized hooks for rendering
export const useModalRenderData = (modalName: keyof UIState['modals']) => {
  return useUIStore(
    useCallback((state) => ({
      isOpen: state.modals[modalName]?.isOpen || false,
      data: state.modals[modalName]?.data,
    }), [modalName])
  )
}

export const useTabRenderData = (tabName: keyof UIState['tabs']) => {
  return useUIStore(
    useCallback((state) => ({
      activeTab: state.tabs[tabName]?.activeTab,
      availableTabs: state.tabs[tabName]?.availableTabs || EMPTY_ARRAY,
    }), [tabName])
  )
}

export const useFilterRenderData = (filterName: keyof UIState['filters']) => {
  return useUIStore(
    useCallback((state) => ({
      filters: state.filters[filterName],
      hasActiveFilters: Object.values(state.filters[filterName]).some(value => 
        value !== '' && value !== null && value !== undefined
      ),
    }), [filterName])
  )
}

export const useInteractionRenderData = () => {
  return useUIStore(
    useCallback((state) => ({
      isWithdrawing: state.interactions.isWithdrawing,
      withdrawSuccess: state.interactions.withdrawSuccess,
    }), [])
  )
}
