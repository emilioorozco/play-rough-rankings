import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useMemo } from 'react'
import { storageConfigs } from './persistence-config'

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
  error?: string
  success?: string
  autoCloseDelay?: number
  loadingDelay?: number
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

interface UIState {
  // Modal states
  modals: {
    tournamentRegistration: ModalConfig
    tournamentManagement: ModalConfig
    tournamentCreate: ModalConfig
    userPreferences: ModalConfig
    login: ModalConfig
    confirmation: ModalConfig & { config?: ConfirmationConfig }
    storeCreate: ModalConfig
    // Add more modals as needed
  }
  
  // Tab states
  tabs: {
    tournamentDetails: TabState
    tournamentManage: TabState
    'leaderboard-view': TabState
    // Add more tab states as needed
  }
  
  // Filter states
  filters: {
    tournaments: FilterState
    'tournament-list': FilterState
    'tournament-participants': { status: string }
    // Add more filter states as needed
  }
  
  // UI interaction states
  interactions: {
    isWithdrawing: boolean
    withdrawSuccess: boolean
    userMenu: boolean
    // Add more interaction states as needed
  }
  
  // Actions for modals
  openModal: (modalName: keyof UIState['modals'], data?: Record<string, any>) => void
  closeModal: (modalName: keyof UIState['modals']) => void
  closeAllModals: () => void
  toggleModal: (modalName: keyof UIState['modals']) => void
  
  // Actions for confirmation modal
  openConfirmation: (config: ConfirmationConfig) => void
  closeConfirmation: () => void
  
  // Actions for tabs
  setActiveTab: (tabGroup: keyof UIState['tabs'], tab: string) => void
  setAvailableTabs: (tabGroup: keyof UIState['tabs'], tabs: string[]) => void
  
  // Actions for filters
  setFilters: (filterGroup: keyof UIState['filters'], filters: Partial<FilterState>) => void
  resetFilters: (filterGroup: keyof UIState['filters']) => void
  
  // Actions for interactions
  setInteraction: (key: keyof UIState['interactions'], value: any) => void
  resetInteractions: () => void
  
  // Utility actions
  resetUI: () => void
}

// Initial state
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

const initialInteractionState = {
  isWithdrawing: false,
  withdrawSuccess: false,
  userMenu: false
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
  // Initial state
  modals: {
    tournamentRegistration: { ...initialModalState },
    tournamentManagement: { ...initialModalState },
    tournamentCreate: { ...initialModalState },
    userPreferences: { ...initialModalState },
    login: { ...initialModalState },
    confirmation: { ...initialModalState, config: undefined },
    storeCreate: { ...initialModalState },
  },
  
  tabs: {
    tournamentDetails: { ...initialTabState },
    tournamentManage: { ...initialTabState },
    'leaderboard-view': { ...initialTabState },
  },
  
  filters: {
    tournaments: { ...initialFilterState },
    'tournament-list': { ...initialFilterState },
    'tournament-participants': { status: 'all' },
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
  
  closeAllModals: () => set((state) => {
    const closedModals = {} as typeof state.modals
    Object.keys(state.modals).forEach(key => {
      const modalKey = key as keyof typeof state.modals
      closedModals[modalKey] = {
        ...state.modals[modalKey],
        isOpen: false,
        data: undefined
      }
    })
    return { modals: closedModals }
  }),
  
  toggleModal: (modalName) => set((state) => ({
    modals: {
      ...state.modals,
      [modalName]: {
        ...state.modals[modalName],
        isOpen: !state.modals[modalName].isOpen
      }
    }
  })),
  
  // Confirmation modal actions
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
  setInteraction: (key, value) => set((state) => ({
    interactions: {
      ...state.interactions,
      [key]: value
    }
  })),
  
  resetInteractions: () => set({
    interactions: { ...initialInteractionState }
  }),
  
  // Utility actions
  resetUI: () => set({
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
      'leaderboard-view': { ...initialTabState },
    },
    filters: {
      tournaments: { ...initialFilterState },
      'tournament-list': { ...initialFilterState },
      'tournament-participants': { status: 'all' },
    },
    interactions: { ...initialInteractionState },
  }),
}),
{
  name: storageConfigs.uiState.name,
  storage: storageConfigs.uiState.storage,
  partialize: storageConfigs.uiState.partialize,
  onRehydrateStorage: storageConfigs.uiState.onRehydrateStorage,
}
))

// Memoized selectors for better performance
export const useModal = (modalName: keyof UIState['modals']) => {
  const modal = useUIStore((state) => state.modals[modalName])
  const openModal = useUIStore((state) => state.openModal)
  const closeModal = useUIStore((state) => state.closeModal)
  const toggleModal = useUIStore((state) => state.toggleModal)
  
  return useMemo(() => ({
    isOpen: modal.isOpen,
    data: modal.data,
    open: (data?: Record<string, any>) => openModal(modalName, data),
    close: () => closeModal(modalName),
    toggle: () => toggleModal(modalName),
  }), [modal, openModal, closeModal, toggleModal, modalName])
}

export const useConfirmationModal = () => {
  const confirmation = useUIStore((state) => state.modals.confirmation)
  const openConfirmation = useUIStore((state) => state.openConfirmation)
  const closeConfirmation = useUIStore((state) => state.closeConfirmation)
  
  return useMemo(() => ({
    isOpen: confirmation.isOpen,
    config: confirmation.config,
    open: (config: ConfirmationConfig) => openConfirmation(config),
    close: () => closeConfirmation(),
  }), [confirmation, openConfirmation, closeConfirmation])
}

export const useTab = (tabGroup: keyof UIState['tabs']) => {
  const tab = useUIStore((state) => state.tabs[tabGroup])
  const setActiveTab = useUIStore((state) => state.setActiveTab)
  const setAvailableTabs = useUIStore((state) => state.setAvailableTabs)
  
  return useMemo(() => ({
    activeTab: tab.activeTab,
    availableTabs: tab.availableTabs,
    setActiveTab: (tab: string) => setActiveTab(tabGroup, tab),
    setAvailableTabs: (tabs: string[]) => setAvailableTabs(tabGroup, tabs),
  }), [tab, setActiveTab, setAvailableTabs, tabGroup])
}

export const useFilters = (filterGroup: keyof UIState['filters']) => {
  const filters = useUIStore((state) => state.filters[filterGroup])
  const setFilters = useUIStore((state) => state.setFilters)
  const resetFilters = useUIStore((state) => state.resetFilters)
  
  return useMemo(() => ({
    filters,
    setFilters: (newFilters: Partial<FilterState>) => setFilters(filterGroup, newFilters),
    resetFilters: () => resetFilters(filterGroup),
  }), [filters, setFilters, resetFilters, filterGroup])
}

export const useInteractions = () => {
  const interactions = useUIStore((state) => state.interactions)
  const setInteraction = useUIStore((state) => state.setInteraction)
  const resetInteractions = useUIStore((state) => state.resetInteractions)
  
  return useMemo(() => ({
    ...interactions,
    setInteraction,
    resetInteractions,
  }), [interactions, setInteraction, resetInteractions])
}

// Utility hook for managing multiple modals
export const useModals = () => {
  const modals = useUIStore((state) => state.modals)
  const closeAllModals = useUIStore((state) => state.closeAllModals)
  
  return useMemo(() => ({
    modals,
    closeAllModals,
    isAnyModalOpen: Object.values(modals).some(modal => modal.isOpen),
  }), [modals, closeAllModals])
}

// Export types for use in components
export type { ModalConfig, ConfirmationConfig, TabState, FilterState }
