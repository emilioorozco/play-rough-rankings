import { useCallback } from 'react'
import { useUIStore } from '@/stores/ui-store'
import { useModalSelectors, useUIStoreSelectors } from '@/stores/ui-store-selectors'

// Modal Management Hooks
export function useModal(modalName: string) {
  const isOpen = useModalSelectors.isModalOpen(modalName as any)
  const config = useModalSelectors.getModalData(modalName as any)
  const openModal = useUIStore((state) => state.openModal)
  const closeModal = useUIStore((state) => state.closeModal)

  const open = useCallback((modalConfig?: any) => {
    openModal(modalName, modalConfig)
  }, [modalName, openModal])

  const close = useCallback(() => {
    closeModal(modalName)
  }, [modalName, closeModal])

  return {
    isOpen,
    config,
    open,
    close,
  }
}

export function useConfirmationModal() {
  const { isOpen, config } = useUIStoreSelectors.getConfirmationState()
  const openConfirmation = useUIStore((state) => state.openConfirmation)
  const closeConfirmation = useUIStore((state) => state.closeConfirmation)

  const open = useCallback((confirmationConfig: any) => {
    openConfirmation(confirmationConfig)
  }, [openConfirmation])

  const close = useCallback(() => {
    closeConfirmation()
  }, [closeConfirmation])

  return {
    isOpen,
    config,
    open,
    close,
  }
}

// Tab Management Hooks
export function useTab(tabName: string) {
  const { activeTab, setActiveTab } = useUIStoreSelectors.getTabState(tabName as any)
  const setTab = useUIStore((state) => state.setActiveTab)

  const setTabCallback = useCallback((tab: string) => {
    setTab(tabName, tab)
  }, [tabName, setTab])

  return {
    activeTab,
    setTab: setTabCallback,
  }
}

// Filter Management Hooks
export function useFilter(filterName: string) {
  const { filters, setFilters, resetFilters } = useUIStoreSelectors.getFilterState(filterName as any)
  const setFilter = useUIStore((state) => state.setFilters)
  const clearFilters = useUIStore((state) => state.clearFilters)

  const setFilterCallback = useCallback((newFilters: any) => {
    setFilter(filterName, newFilters)
  }, [filterName, setFilter])

  const clear = useCallback(() => {
    clearFilters(filterName)
  }, [filterName, clearFilters])

  return {
    filters,
    setFilter: setFilterCallback,
    clear,
  }
}

// Interaction Management Hooks
export function useInteraction(interactionName: string) {
  const isActive = useUIStore((state) => state.interactions[interactionName as keyof typeof state.interactions] || false)
  const setInteraction = useUIStore((state) => state.setInteraction)

  const activate = useCallback(() => {
    setInteraction(interactionName, true)
  }, [interactionName, setInteraction])

  const deactivate = useCallback(() => {
    setInteraction(interactionName, false)
  }, [interactionName, setInteraction])

  const toggle = useCallback(() => {
    setInteraction(interactionName, !isActive)
  }, [interactionName, isActive, setInteraction])

  return {
    isActive,
    activate,
    deactivate,
    toggle,
  }
}

// Bulk Operations Hooks
export function useUIStoreActions() {
  const openModal = useUIStore((state) => state.openModal)
  const closeModal = useUIStore((state) => state.closeModal)
  const closeAllModals = useUIStore((state) => state.closeAllModals)
  const openConfirmation = useUIStore((state) => state.openConfirmation)
  const closeConfirmation = useUIStore((state) => state.closeConfirmation)
  const setActiveTab = useUIStore((state) => state.setActiveTab)
  const setFilters = useUIStore((state) => state.setFilters)
  const clearFilters = useUIStore((state) => state.clearFilters)
  const setInteraction = useUIStore((state) => state.setInteraction)
  const resetUI = useUIStore((state) => state.resetUI)

  return {
    openModal,
    closeModal,
    closeAllModals,
    openConfirmation,
    closeConfirmation,
    setActiveTab,
    setFilters,
    clearFilters,
    setInteraction,
    resetUI,
  }
}

// State Getters Hooks
export function useUIStoreState() {
  const modals = useUIStoreSelectors.useAllModals()
  const tabs = useUIStoreSelectors.useAllTabs()
  const filters = useUIStoreSelectors.useAllFilters()
  const interactions = useUIStoreSelectors.useAllInteractions()

  return {
    modals,
    tabs,
    filters,
    interactions,
  }
}
