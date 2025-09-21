// User Preferences Store specific types

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

// Hook return types
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

export interface UsePreferenceCategoryReturn {
  preferences: any
  set: (preferences: any) => void
  reset: () => void
}

export interface UseDisplayPreferencesReturn {
  preferences: DisplayPreferences
  set: (preferences: Partial<DisplayPreferences>) => void
  reset: () => void
}

export interface UseCommunicationPreferencesReturn {
  preferences: CommunicationPreferences
  set: (preferences: Partial<CommunicationPreferences>) => void
  reset: () => void
}

export interface UseFormBehaviorPreferencesReturn {
  preferences: FormBehaviorPreferences
  set: (preferences: Partial<FormBehaviorPreferences>) => void
  reset: () => void
}

export interface UsePreferenceMetadataReturn {
  metadata: Record<string, PreferenceMetadata>
  lastUpdated: Date
  version: number
}

export interface UseUserPreferencesStoreActionsReturn {
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

export interface UseUserPreferencesStoreStateReturn {
  allPreferences: UserPreferences
  displayPreferences: DisplayPreferences
  communicationPreferences: CommunicationPreferences
  formBehaviorPreferences: FormBehaviorPreferences
  metadata: Record<string, PreferenceMetadata>
  lastUpdated: Date
  version: number
}
