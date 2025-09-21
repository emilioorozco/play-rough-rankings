// Loading Store specific types

export interface LoadingState {
  [key: string]: boolean
}

export interface ErrorState {
  [key: string]: Error | string | null
}

export interface ProgressState {
  [key: string]: number
}

export interface LoadingBarState {
  isVisible: boolean
  progress: number
  message?: string
}

export interface LoadingStoreState {
  loading: LoadingState
  errors: ErrorState
  progress: ProgressState
  isGlobalLoading: boolean
  globalError: Error | string | null
  loadingBar: LoadingBarState
}

export interface LoadingStoreActions {
  setLoading: (key: string, isLoading: boolean) => void
  clearLoading: (key: string) => void
  clearAllLoading: () => void
  setError: (key: string, error: Error | string | null) => void
  clearError: (key: string) => void
  clearAllErrors: () => void
  setProgress: (key: string, progress: number) => void
  clearProgress: (key: string) => void
  clearAllProgress: () => void
  setGlobalLoading: (isLoading: boolean) => void
  setGlobalError: (error: Error | string | null) => void
  clearGlobalError: () => void
  showLoadingBar: (initialProgress?: number, message?: string) => void
  hideLoadingBar: () => void
  setLoadingBarProgress: (progress: number, message?: string) => void
  isLoading: (key: string) => boolean
  getError: (key: string) => Error | string | null
  getProgress: (key: string) => number
  hasError: (key: string) => boolean
  hasAnyError: () => boolean
  isAnyLoading: () => boolean
  clearAll: () => void
  getStoreStatus: () => {
    loading: string[]
    errors: string[]
    progress: string[]
  }
}

export type LoadingStore = LoadingStoreState & LoadingStoreActions

// Hook return types
export interface UseLoadingReturn {
  isLoading: boolean
  set: (loading: boolean) => void
  clear: () => void
}

export interface UseErrorReturn {
  error: Error | string | null
  set: (error: Error | string | null) => void
  clear: () => void
}

export interface UseProgressReturn {
  progress: number
  set: (progress: number) => void
  clear: () => void
}

export interface UseLoadingBarReturn {
  isVisible: boolean
  progress: number
  message?: string
  show: (initialProgress?: number, message?: string) => void
  hide: () => void
  setProgress: (progress: number, message?: string) => void
}

export interface UseAsyncOperationReturn {
  isLoading: boolean
  error: Error | string | null
  progress: number
  execute: (operation: () => Promise<any>) => Promise<any>
  updateProgress: (progress: number) => void
  clear: () => void
}

export interface UseLoadingStoreActionsReturn {
  setLoading: (key: string, isLoading: boolean) => void
  setError: (key: string, error: Error | string | null) => void
  setProgress: (key: string, progress: number) => void
  clearLoading: (key: string) => void
  clearError: (key: string) => void
  clearProgress: (key: string) => void
  clearAll: () => void
  showLoadingBar: (initialProgress?: number, message?: string) => void
  hideLoadingBar: () => void
  setLoadingBarProgress: (progress: number, message?: string) => void
}

export interface UseLoadingStoreStateReturn {
  loadingStates: LoadingState
  errorStates: ErrorState
  progressStates: ProgressState
  loadingBar: LoadingBarState
}

// Enhanced hook return types
export interface UseLoadingEnhancedReturn {
  isLoading: boolean
  set: (loading: boolean) => void
  clear: () => void
}

export interface UseErrorEnhancedReturn {
  error: Error | string | null
  set: (error: Error | string | null) => void
  clear: () => void
}

export interface UseProgressEnhancedReturn {
  progress: number
  set: (progress: number) => void
  clear: () => void
}

export interface UseLoadingBarEnhancedReturn {
  isVisible: boolean
  progress: number
  message?: string
  show: (initialProgress?: number, message?: string) => void
  hide: () => void
  setProgress: (progress: number, message?: string) => void
}

export interface UseAsyncOperationEnhancedReturn {
  isLoading: boolean
  error: Error | string | null
  progress: number
  execute: (operation: () => Promise<any>) => Promise<any>
  updateProgress: (progress: number) => void
  clear: () => void
}

// Store integration types
export interface StoreLoadingIntegration {
  fetchTournament: (tournamentId: string) => Promise<any>
  fetchTournaments: (params?: any) => Promise<any>
  fetchRegistrationStatus: (tournamentId: string) => Promise<any>
}

export interface UserPreferencesLoadingIntegration {
  setPreferences: (preferences: any) => Promise<void>
  updatePreferences: (updates: any) => Promise<void>
  resetPreferences: (category?: string) => Promise<void>
}

export interface FormDraftLoadingIntegration {
  saveDraft: (draftId: string, formData: any, formType: string, metadata?: any) => Promise<void>
  updateDraft: (draftId: string, updates: any) => Promise<void>
  deleteDraft: (draftId: string) => Promise<void>
  clearDrafts: (formType?: string) => Promise<void>
}

export interface UILoadingIntegration {
  openModal: (modalName: string, config?: any) => Promise<void>
  closeModal: (modalName: string) => Promise<void>
  openConfirmation: (config: any) => Promise<void>
}

export interface GlobalLoadingIntegration {
  setGlobalLoading: (isLoading: boolean) => void
  setGlobalError: (error: Error | string | null) => void
  clearGlobalError: () => void
  showLoadingBar: (initialProgress?: number, message?: string) => void
  hideLoadingBar: () => void
  setLoadingBarProgress: (progress: number, message?: string) => void
  clearAll: () => void
  getStoreStatus: () => {
    loading: string[]
    errors: string[]
    progress: string[]
  }
}

export interface StoreLoadingIntegrationReturn {
  tournament: StoreLoadingIntegration
  userPreferences: UserPreferencesLoadingIntegration
  formDraft: FormDraftLoadingIntegration
  ui: UILoadingIntegration
  global: GlobalLoadingIntegration
}
