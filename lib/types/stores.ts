// Comprehensive TypeScript types for all Zustand stores

// ============================================================================
// UI Store Types
// ============================================================================

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

// ============================================================================
// Tournament Store Types
// ============================================================================

export interface Tournament {
  id: string
  name: string
  description?: string
  game: string
  status: 'upcoming' | 'active' | 'completed' | 'cancelled'
  startDate: Date
  endDate?: Date
  maxPlayers?: number
  currentPlayers: number
  entryFee?: number
  prizePool?: number
  rules?: string
  location?: string
  organizer: {
    id: string
    name: string
    email: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface RegistrationStatus {
  isRegistered: boolean
  registeredAt?: Date
  withdrawnAt?: Date
  position?: number
  maxPlayers?: number
  currentPlayers?: number
  canRegister: boolean
  canWithdraw: boolean
  registrationDeadline?: Date
}

export interface TournamentFilters {
  status?: string[]
  game?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  entryFee?: {
    min: number
    max: number
  }
  location?: string
  organizer?: string
  search?: string
}

export interface TournamentListParams {
  page?: number
  limit?: number
  filters?: TournamentFilters
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface TournamentListResponse {
  tournaments: Tournament[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface TournamentState {
  currentTournament: Tournament | null
  tournamentList: Tournament[]
  registrationStatuses: Record<string, RegistrationStatus>
  filters: TournamentFilters
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  loading: {
    currentTournament: boolean
    tournamentList: boolean
    registrationStatuses: Record<string, boolean>
  }
  errors: {
    currentTournament: Error | null
    tournamentList: Error | null
    registrationStatuses: Record<string, Error | null>
  }
}

export interface TournamentActions {
  fetchTournament: (tournamentId: string) => Promise<Tournament | null>
  fetchTournaments: (params?: TournamentListParams) => Promise<TournamentListResponse | null>
  fetchRegistrationStatus: (tournamentId: string) => Promise<RegistrationStatus | null>
  setCurrentTournament: (tournament: Tournament | null) => void
  setTournaments: (tournaments: Tournament[]) => void
  setRegistrationStatus: (tournamentId: string, status: RegistrationStatus) => void
  addTournament: (tournament: Tournament) => void
  updateTournament: (tournamentId: string, updates: Partial<Tournament>) => void
  removeTournament: (tournamentId: string) => void
  clearCurrentTournament: () => void
  clearTournaments: () => void
  clearRegistrationStatus: (tournamentId: string) => void
  setFilters: (filters: TournamentFilters) => void
  clearFilters: () => void
  invalidateTournament: (tournamentId: string) => void
  invalidateTournamentList: () => void
  invalidateRegistrationStatus: (tournamentId: string) => void
  clearCache: () => void
}

export type TournamentStore = TournamentState & TournamentActions

// ============================================================================
// User Preferences Store Types
// ============================================================================

export interface DisplayPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  dateFormat: string
  timeFormat: '12h' | '24h'
  currency: string
  numberFormat: string
  compactMode: boolean
  animations: boolean
  soundEffects: boolean
}

export interface CommunicationPreferences {
  emailNotifications: boolean
  pushNotifications: boolean
  marketingEmails: boolean
  tournamentUpdates: boolean
  friendRequests: boolean
  messages: boolean
  weeklyDigest: boolean
  notificationFrequency: 'immediate' | 'daily' | 'weekly' | 'never'
  quietHours: {
    enabled: boolean
    start: string
    end: string
  }
}

export interface FormBehaviorPreferences {
  autoSave: boolean
  autoSaveInterval: number
  showDraftIndicators: boolean
  confirmBeforeLeaving: boolean
  rememberFormData: boolean
  validateOnBlur: boolean
  showValidationErrors: boolean
  submitOnEnter: boolean
}

export interface UserPreferences {
  display: DisplayPreferences
  communication: CommunicationPreferences
  formBehavior: FormBehaviorPreferences
}

export interface PreferenceMetadata {
  version: number
  lastUpdated: Date
  source: 'user' | 'default' | 'import'
  category: string
  description?: string
}

export interface UserPreferencesState {
  preferences: UserPreferences
  metadata: Record<string, PreferenceMetadata>
  lastUpdated: Date
  version: number
}

export interface UserPreferencesActions {
  setPreference: (key: string, value: any) => void
  setPreferences: (preferences: Partial<UserPreferences>) => void
  setCategoryPreferences: (category: string, preferences: any) => void
  setDisplayPreferences: (preferences: Partial<DisplayPreferences>) => void
  setCommunicationPreferences: (preferences: Partial<CommunicationPreferences>) => void
  setFormBehaviorPreferences: (preferences: Partial<FormBehaviorPreferences>) => void
  updatePreferences: (updates: Partial<UserPreferences>) => void
  resetPreference: (key: string) => void
  resetPreferences: (category?: string) => void
  resetCategoryPreferences: (category: string) => void
  resetDisplayPreferences: () => void
  resetCommunicationPreferences: () => void
  resetFormBehaviorPreferences: () => void
  resetAllPreferences: () => void
}

export type UserPreferencesStore = UserPreferencesState & UserPreferencesActions

// ============================================================================
// Form Draft Store Types
// ============================================================================

export interface BaseFormDraft {
  id: string
  formType: string
  formData: Record<string, any>
  lastUpdated: Date
  expiresAt?: Date
  isSubmitted: boolean
  submittedAt?: Date
}

export interface ExtendedFormDraft extends BaseFormDraft {
  metadata: {
    userId?: string
    sessionId?: string
    userAgent?: string
    ipAddress?: string
    version: number
  }
  validation: {
    isValid: boolean
    errors: Record<string, string[]>
    warnings: Record<string, string[]>
  }
  history: {
    versions: Array<{
      timestamp: Date
      data: Record<string, any>
      changes: string[]
    }>
    maxVersions: number
  }
}

export interface FormDraftMetadata {
  formType: string
  displayName: string
  description?: string
  version: number
  expireAfter: number
  maxVersions: number
  autoSave: boolean
  autoSaveInterval: number
  validation: {
    schema?: any
    rules?: Record<string, any>
  }
}

export interface AutoSaveSettings {
  enabled: boolean
  interval: number
  debounce: number
  maxRetries: number
  retryDelay: number
}

export interface FormDraftState {
  drafts: Record<string, ExtendedFormDraft>
  metadata: Record<string, FormDraftMetadata>
  autoSaveSettings: AutoSaveSettings
  lastUpdated: Date
  version: number
}

export interface FormDraftActions {
  saveDraft: (draftId: string, formData: any, formType: string, metadata?: any) => void
  updateDraft: (draftId: string, updates: Partial<ExtendedFormDraft>) => void
  deleteDraft: (draftId: string) => void
  clearDraft: (draftId: string) => void
  clearDrafts: (formType?: string) => void
  clearExpiredDrafts: () => void
  extendDraft: (draftId: string, additionalTime?: number) => void
  markDraftAsSubmitted: (draftId: string) => void
  setAutoSaveSettings: (settings: Partial<AutoSaveSettings>) => void
  enableAutoSave: () => void
  disableAutoSave: () => void
  setAutoSaveInterval: (interval: number) => void
  resetAllDrafts: () => void
}

export type FormDraftStore = FormDraftState & FormDraftActions

// ============================================================================
// Loading Store Types
// ============================================================================

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

// ============================================================================
// App Store Types
// ============================================================================

export interface ActivityState {
  isActive: boolean
  lastActivity: Date
  sessionStart: Date
  pageViews: number
  interactions: number
}

export interface RealtimeState {
  isConnected: boolean
  lastPing: Date
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  retryCount: number
  maxRetries: number
}

export interface AppState {
  theme: 'light' | 'dark' | 'system'
  mounted: boolean
  activity: ActivityState
  realtime: RealtimeState
}

export interface AppActions {
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  toggleTheme: () => void
  setMounted: (mounted: boolean) => void
  updateActivity: (activity: Partial<ActivityState>) => void
  resetActivity: () => void
  updateRealtime: (realtime: Partial<RealtimeState>) => void
  connectRealtime: () => void
  disconnectRealtime: () => void
  retryRealtime: () => void
}

export type AppStore = AppState & AppActions

// ============================================================================
// Store Integration Types
// ============================================================================

export interface StoreIntegrationConfig {
  enableLoadingStates: boolean
  enableErrorHandling: boolean
  enableProgressTracking: boolean
  enableAutoRetry: boolean
  maxRetries: number
  retryDelay: number
  timeout: number
}

export interface StoreStatus {
  name: string
  version: number
  isPersisting: boolean
  lastRehydrated?: Date
  errorCount: number
  loadingCount: number
  dataSize: number
}

export interface StoreHealth {
  isHealthy: boolean
  issues: string[]
  recommendations: string[]
  lastChecked: Date
}

// ============================================================================
// Hook Return Types
// ============================================================================

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

export interface UseCurrentTournamentReturn {
  tournament: Tournament | null
  isLoading: boolean
  error: Error | null
  fetch: (tournamentId: string) => Promise<Tournament | null>
  set: (tournament: Tournament | null) => void
  clear: () => void
}

export interface UseTournamentListReturn {
  tournaments: Tournament[]
  isLoading: boolean
  error: Error | null
  pagination: TournamentListResponse['pagination']
  fetch: (params?: TournamentListParams) => Promise<TournamentListResponse | null>
  set: (tournaments: Tournament[]) => void
  add: (tournament: Tournament) => void
  update: (tournamentId: string, updates: Partial<Tournament>) => void
  remove: (tournamentId: string) => void
  clear: () => void
}

export interface UseTournamentRegistrationStatusReturn {
  registrationStatus: RegistrationStatus | null
  isLoading: boolean
  error: Error | null
  fetch: (tournamentId?: string) => Promise<RegistrationStatus | null>
  set: (status: RegistrationStatus) => void
  clear: () => void
}

export interface UseUserPreferenceReturn {
  value: any
  set: (value: any) => void
  reset: () => void
}

export interface UseUserPreferencesReturn {
  preferences: Partial<UserPreferences>
  set: (preferences: Partial<UserPreferences>) => void
  reset: (category?: string) => void
  update: (updates: Partial<UserPreferences>) => void
}

export interface UseFormDraftReturn {
  draft: ExtendedFormDraft | null
  save: (formData: any, formType: string, metadata?: any) => void
  update: (updates: Partial<ExtendedFormDraft>) => void
  delete: () => void
  clear: () => void
}

export interface UseFormDraftsReturn {
  drafts: ExtendedFormDraft[]
  save: (draftId: string, formData: any, formType: string, metadata?: any) => void
  update: (draftId: string, updates: Partial<ExtendedFormDraft>) => void
  delete: (draftId: string) => void
  clear: (formType?: string) => void
  clearExpired: () => void
}

export interface UseAutoSaveReturn {
  settings: AutoSaveSettings
  set: (settings: Partial<AutoSaveSettings>) => void
  enable: () => void
  disable: () => void
  setInterval: (interval: number) => void
}

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

// ============================================================================
// Utility Types
// ============================================================================

export type StoreKey = keyof UIStore | keyof TournamentStore | keyof UserPreferencesStore | keyof FormDraftStore | keyof LoadingStore | keyof AppStore

export type StoreState = UIState | TournamentState | UserPreferencesState | FormDraftState | LoadingStoreState | AppState

export type StoreActions = UIActions | TournamentActions | UserPreferencesActions | FormDraftActions | LoadingStoreActions | AppActions

export type Store = UIStore | TournamentStore | UserPreferencesStore | FormDraftStore | LoadingStore | AppStore

// ============================================================================
// Generic Types
// ============================================================================

export interface StoreConfig<T> {
  name: string
  version: number
  initialState: T
  actions: Record<string, (...args: any[]) => any>
  selectors?: Record<string, (state: T) => any>
  middleware?: any[]
  persistence?: {
    enabled: boolean
    storage: 'localStorage' | 'sessionStorage'
    partialize?: (state: T) => Partial<T>
    onRehydrateStorage?: (state: T) => void
  }
}

export interface StoreHook<T> {
  (): T
  getState: () => T
  setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => void
  subscribe: (listener: (state: T, prevState: T) => void) => () => void
  destroy: () => void
}

export interface StoreSelector<T, R> {
  (state: T): R
}

export interface StoreMiddleware<T> {
  (config: StoreConfig<T>): StoreConfig<T>
}


