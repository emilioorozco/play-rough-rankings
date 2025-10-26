import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PersistStorage } from 'zustand/middleware'
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
  
  // Dropdown menu states
  dropdowns: {
    [dropdownId: string]: {
      isOpen: boolean
    }
  }
  
  // Actions for modals
  openModal: (modalName: keyof UIState['modals'], data?: Record<string, any>) => void
  closeModal: (modalName: keyof UIState['modals']) => void
  closeAllModals: () => void
  toggleModal: (modalName: keyof UIState['modals']) => void
  
  // Actions for confirmation modal
  openConfirmation: (config: ConfirmationConfig) => void
  closeConfirmation: () => void
  
  // Specific actions for withdraw confirmation
  openWithdrawConfirmation: (config: ConfirmationConfig) => void
  
  // Actions for tabs
  setActiveTab: (tabGroup: keyof UIState['tabs'], tab: string) => void
  setAvailableTabs: (tabGroup: keyof UIState['tabs'], tabs: string[]) => void
  
  // Actions for filters
  setFilters: (filterGroup: keyof UIState['filters'], filters: Partial<FilterState>) => void
  resetFilters: (filterGroup: keyof UIState['filters']) => void
  
  // Actions for interactions
  setInteraction: (key: keyof UIState['interactions'], value: any) => void
  resetInteractions: () => void
  
  // Actions for dropdowns
  setDropdownOpen: (dropdownId: string, isOpen: boolean) => void
  toggleDropdown: (dropdownId: string) => void
  closeAllDropdowns: () => void
  
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
    (set) => ({
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
  
  dropdowns: {},
  
  // Modal actions
  openModal: (modalName: keyof UIState['modals'], data?: Record<string, any>) => set((state: UIState) => ({
    modals: {
      ...state.modals,
      [modalName]: {
        isOpen: true,
        data: data || undefined
      }
    }
  })),
  
  closeModal: (modalName: keyof UIState['modals']) => set((state: UIState) => ({
    modals: {
      ...state.modals,
      [modalName]: {
        ...state.modals[modalName],
        isOpen: false,
        data: undefined
      }
    }
  })),
  
  closeAllModals: () => set((state: UIState) => {
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
  
  toggleModal: (modalName: keyof UIState['modals']) => set((state: UIState) => ({
    modals: {
      ...state.modals,
      [modalName]: {
        ...state.modals[modalName],
        isOpen: !state.modals[modalName].isOpen
      }
    }
  })),
  
  // Confirmation modal actions
  openConfirmation: (config: ConfirmationConfig) => set((state: UIState) => ({
    modals: {
      ...state.modals,
      confirmation: {
        isOpen: true,
        config
      }
    }
  })),
  
  closeConfirmation: () => set((state: UIState) => ({
    modals: {
      ...state.modals,
      confirmation: {
        ...state.modals.confirmation,
        isOpen: false,
        config: undefined
      }
    },
    // Reset withdraw success state when closing confirmation modal
    interactions: {
      ...state.interactions,
      withdrawSuccess: false
    }
  })),
  
  // Specific action for withdraw confirmation that resets withdraw state
  openWithdrawConfirmation: (config: ConfirmationConfig) => set((state: UIState) => ({
    modals: {
      ...state.modals,
      confirmation: {
        isOpen: true,
        config
      }
    },
    // Reset withdraw success state when opening withdraw confirmation
    interactions: {
      ...state.interactions,
      withdrawSuccess: false
    }
  })),
  
  // Tab actions
  setActiveTab: (tabGroup: keyof UIState['tabs'], tab: string) => set((state: UIState) => {
    const currentTabState = state.tabs[tabGroup]
    
    // Initialize available tabs for tournamentDetails if not set
    let availableTabs = currentTabState.availableTabs
    if (tabGroup === 'tournamentDetails' && availableTabs.length === 0) {
      availableTabs = ['overview', 'brackets', 'participants', 'results', 'discussion']
    }
    
    return {
      tabs: {
        ...state.tabs,
        [tabGroup]: {
          ...currentTabState,
          activeTab: tab,
          availableTabs
        }
      }
    }
  }),
  
  setAvailableTabs: (tabGroup: keyof UIState['tabs'], tabs: string[]) => set((state: UIState) => ({
    tabs: {
      ...state.tabs,
      [tabGroup]: {
        ...state.tabs[tabGroup],
        availableTabs: tabs
      }
    }
  })),
  
  // Filter actions
  setFilters: (filterGroup: keyof UIState['filters'], filters: Partial<FilterState>) => set((state: UIState) => ({
    filters: {
      ...state.filters,
      [filterGroup]: {
        ...state.filters[filterGroup],
        ...filters
      }
    }
  })),
  
  resetFilters: (filterGroup: keyof UIState['filters']) => set((state: UIState) => ({
    filters: {
      ...state.filters,
      [filterGroup]: { ...initialFilterState }
    }
  })),
  
  // Interaction actions
  setInteraction: (key: keyof UIState['interactions'], value: any) => set((state: UIState) => ({
    interactions: {
      ...state.interactions,
      [key]: value
    }
  })),
  
  resetInteractions: () => set({
    interactions: { ...initialInteractionState }
  }),
  
  // Dropdown actions
  setDropdownOpen: (dropdownId: string, isOpen: boolean) => set((state: UIState) => {
    // If opening a dropdown, close all others first
    if (isOpen) {
      const closedDropdowns = {} as typeof state.dropdowns
      Object.keys(state.dropdowns).forEach(key => {
        closedDropdowns[key] = { isOpen: false }
      })
      // Then set the current dropdown as open
      closedDropdowns[dropdownId] = { isOpen: true }
      return { dropdowns: closedDropdowns }
    }
    
    // If closing, just update this dropdown
    return {
      dropdowns: {
        ...state.dropdowns,
        [dropdownId]: {
          isOpen
        }
      }
    }
  }),
  
  toggleDropdown: (dropdownId: string) => set((state: UIState) => {
    const currentState = state.dropdowns[dropdownId]?.isOpen || false
    const newState = !currentState
    
    // If opening a dropdown, close all others first
    if (newState) {
      const closedDropdowns = {} as typeof state.dropdowns
      Object.keys(state.dropdowns).forEach(key => {
        closedDropdowns[key] = { isOpen: false }
      })
      // Then set the current dropdown as open
      closedDropdowns[dropdownId] = { isOpen: true }
      return { dropdowns: closedDropdowns }
    }
    
    // If closing, just update this dropdown
    return {
      dropdowns: {
        ...state.dropdowns,
        [dropdownId]: {
          isOpen: false
        }
      }
    }
  }),
  
  closeAllDropdowns: () => set((state: UIState) => {
    const closedDropdowns = {} as typeof state.dropdowns
    Object.keys(state.dropdowns).forEach(key => {
      closedDropdowns[key] = { isOpen: false }
    })
    return { dropdowns: closedDropdowns }
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
    dropdowns: {},
  }),
}),
{
  name: storageConfigs.uiState.name,
  storage: storageConfigs.uiState.storage as unknown as PersistStorage<Partial<UIState>>,
  partialize: storageConfigs.uiState.partialize as unknown as (state: UIState) => Partial<UIState>,
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
  }), [modal.isOpen, modal.data, modalName, openModal, closeModal, toggleModal])
}

export const useConfirmationModal = () => {
  const confirmation = useUIStore((state) => state.modals.confirmation)
  const openConfirmation = useUIStore((state) => state.openConfirmation)
  const openWithdrawConfirmation = useUIStore((state) => state.openWithdrawConfirmation)
  const closeConfirmation = useUIStore((state) => state.closeConfirmation)
  
  return useMemo(() => ({
    isOpen: confirmation.isOpen,
    config: confirmation.config,
    open: (config: ConfirmationConfig) => openConfirmation(config),
    openWithdraw: (config: ConfirmationConfig) => openWithdrawConfirmation(config),
    close: () => closeConfirmation(),
  }), [confirmation, openConfirmation, openWithdrawConfirmation, closeConfirmation])
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
  }), [tab.activeTab, tab.availableTabs, tabGroup, setActiveTab, setAvailableTabs])
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

export const useDropdown = (dropdownId: string) => {
  const dropdown = useUIStore((state) => state.dropdowns[dropdownId])
  const setDropdownOpen = useUIStore((state) => state.setDropdownOpen)
  const toggleDropdown = useUIStore((state) => state.toggleDropdown)
  const closeAllDropdowns = useUIStore((state) => state.closeAllDropdowns)
  
  return useMemo(() => ({
    isOpen: dropdown?.isOpen || false,
    open: () => setDropdownOpen(dropdownId, true),
    close: () => setDropdownOpen(dropdownId, false),
    toggle: () => toggleDropdown(dropdownId),
    closeAll: closeAllDropdowns,
  }), [dropdown, setDropdownOpen, toggleDropdown, closeAllDropdowns, dropdownId])
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
