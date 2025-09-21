// UI Store specific types

export interface ModalConfig {
  title?: string
  message?: string
  data?: any
  onClose?: () => void
  onConfirm?: () => void
  onCancel?: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closable?: boolean
  persistent?: boolean
}

export interface ConfirmationConfig {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive' | 'warning'
  onConfirm: () => void
  onCancel?: () => void
}

export interface ModalState {
  isOpen: boolean
  config?: ModalConfig
}

export interface TabState {
  [tabGroup: string]: string
}

export interface FilterState {
  [filterGroup: string]: Record<string, any>
}

export interface InteractionState {
  [interactionName: string]: boolean
}

export interface UIState {
  modals: Record<string, ModalState>
  confirmationModal: {
    isOpen: boolean
    config?: ConfirmationConfig
  }
  tabs: TabState
  filters: FilterState
  interactions: InteractionState
}

export interface UIActions {
  openModal: (modalName: string, config?: ModalConfig) => void
  closeModal: (modalName: string) => void
  closeAllModals: () => void
  openConfirmation: (config: ConfirmationConfig) => void
  closeConfirmation: () => void
  setActiveTab: (tabGroup: string, tab: string) => void
  setFilters: (filterGroup: string, filters: Record<string, any>) => void
  clearFilters: (filterGroup: string) => void
  setInteraction: (interactionName: string, isActive: boolean) => void
  resetUI: () => void
}

export type UIStore = UIState & UIActions

// Hook return types
export interface UseModalReturn {
  isOpen: boolean
  config?: ModalConfig
  open: (config?: ModalConfig) => void
  close: () => void
}

export interface UseConfirmationModalReturn {
  isOpen: boolean
  config?: ConfirmationConfig
  open: (config: ConfirmationConfig) => void
  close: () => void
}

export interface UseTabReturn {
  activeTab: string
  setTab: (tab: string) => void
}

export interface UseFilterReturn {
  filters: Record<string, any>
  setFilter: (filters: Record<string, any>) => void
  clear: () => void
}

export interface UseInteractionReturn {
  isActive: boolean
  activate: () => void
  deactivate: () => void
  toggle: () => void
}

export interface UseUIStoreActionsReturn {
  openModal: (modalName: string, config?: ModalConfig) => void
  closeModal: (modalName: string) => void
  closeAllModals: () => void
  openConfirmation: (config: ConfirmationConfig) => void
  closeConfirmation: () => void
  setActiveTab: (tabGroup: string, tab: string) => void
  setFilters: (filterGroup: string, filters: Record<string, any>) => void
  clearFilters: (filterGroup: string) => void
  setInteraction: (interactionName: string, isActive: boolean) => void
  resetUI: () => void
}

export interface UseUIStoreStateReturn {
  modals: Record<string, ModalState>
  tabs: TabState
  filters: FilterState
  interactions: InteractionState
}
