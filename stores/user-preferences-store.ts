import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useMemo } from 'react'
import { storageConfigs } from './persistence-config'

// Base user preferences interface - this can be extended as features evolve
interface BaseUserPreferences {
  // Display preferences
  nameDisplayPreference: 'FIRST_NAME' | 'FIRST_LAST_NAME' | 'DISPLAY_NAME' | 'OPT_OUT'
  profileVisibility: 'PUBLIC' | 'PRIVATE'
  
  // Communication preferences
  optInCommunications: boolean
  optInTournamentUpdates: boolean
  optInLeaderboardUpdates: boolean
  optInMarketing: boolean
}

// Extended preferences interface for future features
interface ExtendedUserPreferences extends BaseUserPreferences {
  // UI preferences
  theme?: 'light' | 'dark' | 'system'
  language?: string
  timezone?: string
  
  // Notification preferences
  emailNotifications?: boolean
  pushNotifications?: boolean
  smsNotifications?: boolean
  
  // Tournament preferences
  defaultTournamentView?: 'list' | 'grid' | 'calendar'
  autoRegisterForTournaments?: boolean
  tournamentReminderTime?: number // minutes before tournament
  
  // Privacy preferences
  showEmail?: boolean
  showPhone?: boolean
  showLocation?: boolean
  allowDirectMessages?: boolean
  
  // Game-specific preferences
  favoriteGames?: string[]
  defaultGame?: string
  
  // Accessibility preferences
  fontSize?: 'small' | 'medium' | 'large'
  highContrast?: boolean
  reducedMotion?: boolean
  
  // Advanced preferences
  experimentalFeatures?: boolean
  analyticsOptIn?: boolean
  crashReporting?: boolean
}

// Preference categories for organization
interface PreferenceCategories {
  display: Pick<ExtendedUserPreferences, 'nameDisplayPreference' | 'profileVisibility' | 'theme' | 'language' | 'timezone'>
  communications: Pick<ExtendedUserPreferences, 'optInCommunications' | 'optInTournamentUpdates' | 'optInLeaderboardUpdates' | 'optInMarketing' | 'emailNotifications' | 'pushNotifications' | 'smsNotifications'>
  tournaments: Pick<ExtendedUserPreferences, 'defaultTournamentView' | 'autoRegisterForTournaments' | 'tournamentReminderTime'>
  privacy: Pick<ExtendedUserPreferences, 'showEmail' | 'showPhone' | 'showLocation' | 'allowDirectMessages'>
  games: Pick<ExtendedUserPreferences, 'favoriteGames' | 'defaultGame'>
  accessibility: Pick<ExtendedUserPreferences, 'fontSize' | 'highContrast' | 'reducedMotion'>
  advanced: Pick<ExtendedUserPreferences, 'experimentalFeatures' | 'analyticsOptIn' | 'crashReporting'>
}

// Preference metadata for validation and UI
interface PreferenceMetadata {
  key: keyof ExtendedUserPreferences
  category: keyof PreferenceCategories
  type: 'boolean' | 'string' | 'number' | 'array' | 'enum'
  enumValues?: string[]
  min?: number
  max?: number
  required?: boolean
  description?: string
  label?: string
  defaultValue?: any
}

// Store state interface
interface UserPreferencesState {
  // Current preferences
  preferences: ExtendedUserPreferences
  
  // Preference metadata
  metadata: Record<keyof ExtendedUserPreferences, PreferenceMetadata>
  
  // Loading states
  loading: {
    loading: boolean
    saving: boolean
    resetting: boolean
  }
  
  // Error states
  errors: {
    load: string | null
    save: string | null
    reset: string | null
  }
  
  // Cache state
  lastUpdated: Date | null
  isDirty: boolean
  hasUnsavedChanges: boolean
  
  // Actions
  setPreferences: (preferences: Partial<ExtendedUserPreferences>) => void
  updatePreference: <K extends keyof ExtendedUserPreferences>(key: K, value: ExtendedUserPreferences[K]) => void
  updatePreferences: (updates: Partial<ExtendedUserPreferences>) => void
  resetPreferences: () => void
  resetToDefaults: () => void
  
  // Loading actions
  setLoading: (key: keyof UserPreferencesState['loading'], isLoading: boolean) => void
  
  // Error actions
  setError: (key: keyof UserPreferencesState['errors'], error: string | null) => void
  clearError: (key: keyof UserPreferencesState['errors']) => void
  clearAllErrors: () => void
  
  // Cache actions
  markAsDirty: () => void
  markAsClean: () => void
  setLastUpdated: (date: Date) => void
  
  // Utility actions
  getPreference: <K extends keyof ExtendedUserPreferences>(key: K) => ExtendedUserPreferences[K]
  hasPreference: (key: keyof ExtendedUserPreferences) => boolean
  getPreferencesByCategory: (category: keyof PreferenceCategories) => Partial<ExtendedUserPreferences>
  validatePreferences: (preferences: Partial<ExtendedUserPreferences>) => { isValid: boolean; errors: Record<string, string> }
  
  // Store management
  resetStore: () => void
}

// Default preferences
const defaultPreferences: ExtendedUserPreferences = {
  // Base preferences
  nameDisplayPreference: 'FIRST_NAME',
  profileVisibility: 'PUBLIC',
  optInCommunications: false,
  optInTournamentUpdates: true,
  optInLeaderboardUpdates: true,
  optInMarketing: false,
  
  // Extended preferences with defaults
  theme: 'system',
  language: 'en',
  timezone: 'UTC',
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
  defaultTournamentView: 'list',
  autoRegisterForTournaments: false,
  tournamentReminderTime: 30,
  showEmail: false,
  showPhone: false,
  showLocation: false,
  allowDirectMessages: true,
  favoriteGames: [],
  defaultGame: '',
  fontSize: 'medium',
  highContrast: false,
  reducedMotion: false,
  experimentalFeatures: false,
  analyticsOptIn: true,
  crashReporting: true,
}

// Preference metadata configuration
const preferenceMetadata: Record<keyof ExtendedUserPreferences, PreferenceMetadata> = {
  // Display preferences
  nameDisplayPreference: {
    key: 'nameDisplayPreference',
    category: 'display',
    type: 'enum',
    enumValues: ['FIRST_NAME', 'FIRST_LAST_NAME', 'DISPLAY_NAME', 'OPT_OUT'],
    required: true,
    description: 'How your name is displayed to other users',
    label: 'Name Display Preference',
    defaultValue: 'FIRST_NAME',
  },
  profileVisibility: {
    key: 'profileVisibility',
    category: 'display',
    type: 'enum',
    enumValues: ['PUBLIC', 'PRIVATE'],
    required: true,
    description: 'Who can see your profile',
    label: 'Profile Visibility',
    defaultValue: 'PUBLIC',
  },
  theme: {
    key: 'theme',
    category: 'display',
    type: 'enum',
    enumValues: ['light', 'dark', 'system'],
    description: 'Application theme preference',
    label: 'Theme',
    defaultValue: 'system',
  },
  language: {
    key: 'language',
    category: 'display',
    type: 'string',
    description: 'Preferred language',
    label: 'Language',
    defaultValue: 'en',
  },
  timezone: {
    key: 'timezone',
    category: 'display',
    type: 'string',
    description: 'Your timezone',
    label: 'Timezone',
    defaultValue: 'UTC',
  },
  
  // Communication preferences
  optInCommunications: {
    key: 'optInCommunications',
    category: 'communications',
    type: 'boolean',
    description: 'Receive general communications',
    label: 'General Communications',
    defaultValue: false,
  },
  optInTournamentUpdates: {
    key: 'optInTournamentUpdates',
    category: 'communications',
    type: 'boolean',
    description: 'Receive tournament updates',
    label: 'Tournament Updates',
    defaultValue: true,
  },
  optInLeaderboardUpdates: {
    key: 'optInLeaderboardUpdates',
    category: 'communications',
    type: 'boolean',
    description: 'Receive leaderboard updates',
    label: 'Leaderboard Updates',
    defaultValue: true,
  },
  optInMarketing: {
    key: 'optInMarketing',
    category: 'communications',
    type: 'boolean',
    description: 'Receive marketing communications',
    label: 'Marketing Communications',
    defaultValue: false,
  },
  emailNotifications: {
    key: 'emailNotifications',
    category: 'communications',
    type: 'boolean',
    description: 'Receive email notifications',
    label: 'Email Notifications',
    defaultValue: true,
  },
  pushNotifications: {
    key: 'pushNotifications',
    category: 'communications',
    type: 'boolean',
    description: 'Receive push notifications',
    label: 'Push Notifications',
    defaultValue: true,
  },
  smsNotifications: {
    key: 'smsNotifications',
    category: 'communications',
    type: 'boolean',
    description: 'Receive SMS notifications',
    label: 'SMS Notifications',
    defaultValue: false,
  },
  
  // Tournament preferences
  defaultTournamentView: {
    key: 'defaultTournamentView',
    category: 'tournaments',
    type: 'enum',
    enumValues: ['list', 'grid', 'calendar'],
    description: 'Default tournament view',
    label: 'Tournament View',
    defaultValue: 'list',
  },
  autoRegisterForTournaments: {
    key: 'autoRegisterForTournaments',
    category: 'tournaments',
    type: 'boolean',
    description: 'Automatically register for tournaments',
    label: 'Auto-Register',
    defaultValue: false,
  },
  tournamentReminderTime: {
    key: 'tournamentReminderTime',
    category: 'tournaments',
    type: 'number',
    min: 5,
    max: 1440,
    description: 'Minutes before tournament to send reminder',
    label: 'Reminder Time',
    defaultValue: 30,
  },
  
  // Privacy preferences
  showEmail: {
    key: 'showEmail',
    category: 'privacy',
    type: 'boolean',
    description: 'Show email on profile',
    label: 'Show Email',
    defaultValue: false,
  },
  showPhone: {
    key: 'showPhone',
    category: 'privacy',
    type: 'boolean',
    description: 'Show phone on profile',
    label: 'Show Phone',
    defaultValue: false,
  },
  showLocation: {
    key: 'showLocation',
    category: 'privacy',
    type: 'boolean',
    description: 'Show location on profile',
    label: 'Show Location',
    defaultValue: false,
  },
  allowDirectMessages: {
    key: 'allowDirectMessages',
    category: 'privacy',
    type: 'boolean',
    description: 'Allow direct messages from other users',
    label: 'Direct Messages',
    defaultValue: true,
  },
  
  // Game preferences
  favoriteGames: {
    key: 'favoriteGames',
    category: 'games',
    type: 'array',
    description: 'Your favorite games',
    label: 'Favorite Games',
    defaultValue: [],
  },
  defaultGame: {
    key: 'defaultGame',
    category: 'games',
    type: 'string',
    description: 'Your default game',
    label: 'Default Game',
    defaultValue: '',
  },
  
  // Accessibility preferences
  fontSize: {
    key: 'fontSize',
    category: 'accessibility',
    type: 'enum',
    enumValues: ['small', 'medium', 'large'],
    description: 'Font size preference',
    label: 'Font Size',
    defaultValue: 'medium',
  },
  highContrast: {
    key: 'highContrast',
    category: 'accessibility',
    type: 'boolean',
    description: 'Use high contrast mode',
    label: 'High Contrast',
    defaultValue: false,
  },
  reducedMotion: {
    key: 'reducedMotion',
    category: 'accessibility',
    type: 'boolean',
    description: 'Reduce motion and animations',
    label: 'Reduced Motion',
    defaultValue: false,
  },
  
  // Advanced preferences
  experimentalFeatures: {
    key: 'experimentalFeatures',
    category: 'advanced',
    type: 'boolean',
    description: 'Enable experimental features',
    label: 'Experimental Features',
    defaultValue: false,
  },
  analyticsOptIn: {
    key: 'analyticsOptIn',
    category: 'advanced',
    type: 'boolean',
    description: 'Opt in to analytics',
    label: 'Analytics',
    defaultValue: true,
  },
  crashReporting: {
    key: 'crashReporting',
    category: 'advanced',
    type: 'boolean',
    description: 'Send crash reports',
    label: 'Crash Reporting',
    defaultValue: true,
  },
}

export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set, get) => ({
      // Initial state
      preferences: { ...defaultPreferences },
      metadata: preferenceMetadata,
      loading: {
        loading: false,
        saving: false,
        resetting: false,
      },
      errors: {
        load: null,
        save: null,
        reset: null,
      },
      lastUpdated: null,
      isDirty: false,
      hasUnsavedChanges: false,
      
      // Actions
      setPreferences: (preferences: Partial<ExtendedUserPreferences>) => {
        set((state: UserPreferencesState) => ({
          preferences: { ...state.preferences, ...preferences },
          isDirty: true,
          hasUnsavedChanges: true,
          lastUpdated: new Date(),
        }))
      },
      
      updatePreference: <K extends keyof ExtendedUserPreferences>(key: K, value: ExtendedUserPreferences[K]) => {
        set((state: UserPreferencesState) => ({
          preferences: { ...state.preferences, [key]: value },
          isDirty: true,
          hasUnsavedChanges: true,
          lastUpdated: new Date(),
        }))
      },
      
      updatePreferences: (updates: Partial<ExtendedUserPreferences>) => {
        set((state: UserPreferencesState) => ({
          preferences: { ...state.preferences, ...updates },
          isDirty: true,
          hasUnsavedChanges: true,
          lastUpdated: new Date(),
        }))
      },
      
      resetPreferences: () => {
        set({
          preferences: { ...defaultPreferences },
          isDirty: false,
          hasUnsavedChanges: false,
          lastUpdated: new Date(),
        })
      },
      
      resetToDefaults: () => {
        set({
          preferences: { ...defaultPreferences },
          isDirty: false,
          hasUnsavedChanges: false,
          lastUpdated: new Date(),
        })
      },
      
      // Loading actions
      setLoading: (key: keyof UserPreferencesState['loading'], isLoading: boolean) => {
        set((state: UserPreferencesState) => ({
          loading: {
            ...state.loading,
            [key]: isLoading,
          },
        }))
      },
      
      // Error actions
      setError: (key: keyof UserPreferencesState['errors'], error: string | null) => {
        set((state: UserPreferencesState) => ({
          errors: {
            ...state.errors,
            [key]: error,
          },
        }))
      },
      
      clearError: (key: keyof UserPreferencesState['errors']) => {
        set((state: UserPreferencesState) => ({
          errors: {
            ...state.errors,
            [key]: null,
          },
        }))
      },
      
      clearAllErrors: () => {
        set({
          errors: {
            load: null,
            save: null,
            reset: null,
          },
        })
      },
      
      // Cache actions
      markAsDirty: () => {
        set({
          isDirty: true,
          hasUnsavedChanges: true,
        })
      },
      
      markAsClean: () => {
        set({
          isDirty: false,
          hasUnsavedChanges: false,
        })
      },
      
      setLastUpdated: (date: Date) => {
        set({ lastUpdated: date })
      },
      
      // Utility actions
      getPreference: <K extends keyof ExtendedUserPreferences>(key: K) => {
        const state = get()
        return state.preferences[key] as ExtendedUserPreferences[K]
      },
      
      hasPreference: (key: keyof ExtendedUserPreferences) => {
        const state = get()
        return key in state.preferences
      },
      
      getPreferencesByCategory: (category: keyof PreferenceCategories) => {
        const state = get()
        const categoryKeys = Object.keys(state.metadata).filter(
          key => state.metadata[key as keyof ExtendedUserPreferences].category === category
        ) as (keyof ExtendedUserPreferences)[]
        
        const result: Partial<ExtendedUserPreferences> = {}
        categoryKeys.forEach(key => {
          ;(result as any)[key] = state.preferences[key]
        })
        
        return result
      },
      
      validatePreferences: (preferences: Partial<ExtendedUserPreferences>) => {
        const state = get()
        const errors: Record<string, string> = {}
        
        Object.keys(preferences).forEach(key => {
          const prefKey = key as keyof ExtendedUserPreferences
          const metadata = state.metadata[prefKey]
          const value = preferences[prefKey]
          
          if (metadata.required && (value === undefined || value === null || value === '')) {
            errors[key] = `${metadata.label || key} is required`
          }
          
          if (metadata.type === 'number' && typeof value === 'number') {
            if (metadata.min !== undefined && value < metadata.min) {
              errors[key] = `${metadata.label || key} must be at least ${metadata.min}`
            }
            if (metadata.max !== undefined && value > metadata.max) {
              errors[key] = `${metadata.label || key} must be at most ${metadata.max}`
            }
          }
          
          if (metadata.type === 'enum' && metadata.enumValues && !metadata.enumValues.includes(value)) {
            errors[key] = `${metadata.label || key} must be one of: ${metadata.enumValues.join(', ')}`
          }
        })
        
        return {
          isValid: Object.keys(errors).length === 0,
          errors,
        }
      },
      
      // Store management
      resetStore: () => {
        set({
          preferences: { ...defaultPreferences },
          loading: {
            loading: false,
            saving: false,
            resetting: false,
          },
          errors: {
            load: null,
            save: null,
            reset: null,
          },
          lastUpdated: null,
          isDirty: false,
          hasUnsavedChanges: false,
        })
      },
    }),
    {
      name: storageConfigs.userPreferences.name,
      storage: createJSONStorage(() => storageConfigs.userPreferences.storage),
      partialize: storageConfigs.userPreferences.partialize,
      onRehydrateStorage: storageConfigs.userPreferences.onRehydrateStorage,
    }
  )
)

// Memoized selectors for better performance
export const useUserPreferences = () => {
  const preferences = useUserPreferencesStore((state) => state.preferences)
  const setPreferences = useUserPreferencesStore((state) => state.setPreferences)
  const updatePreference = useUserPreferencesStore((state) => state.updatePreference)
  const updatePreferences = useUserPreferencesStore((state) => state.updatePreferences)
  const resetPreferences = useUserPreferencesStore((state) => state.resetPreferences)
  const resetToDefaults = useUserPreferencesStore((state) => state.resetToDefaults)
  
  return useMemo(() => ({
    preferences,
    setPreferences,
    updatePreference,
    updatePreferences,
    resetPreferences,
    resetToDefaults,
  }), [preferences, setPreferences, updatePreference, updatePreferences, resetPreferences, resetToDefaults])
}

export const useUserPreference = <K extends keyof ExtendedUserPreferences>(key: K) => {
  const value = useUserPreferencesStore((state) => state.preferences[key])
  const updatePreference = useUserPreferencesStore((state) => state.updatePreference)
  const metadata = useUserPreferencesStore((state) => state.metadata[key])
  
  return useMemo(() => ({
    value,
    update: (newValue: ExtendedUserPreferences[K]) => updatePreference(key, newValue),
    metadata,
  }), [value, updatePreference, key, metadata])
}

export const useUserPreferencesByCategory = (category: keyof PreferenceCategories) => {
  const preferences = useUserPreferencesStore((state) => state.preferences)
  const metadata = useUserPreferencesStore((state) => state.metadata)
  const updatePreferences = useUserPreferencesStore((state) => state.updatePreferences)
  
  return useMemo(() => {
    const categoryKeys = Object.keys(metadata).filter(
      key => metadata[key as keyof ExtendedUserPreferences].category === category
    ) as (keyof ExtendedUserPreferences)[]
    
    const categoryPreferences: Partial<ExtendedUserPreferences> = {}
    const categoryMetadata: Record<string, PreferenceMetadata> = {}
    
    categoryKeys.forEach(key => {
      ;(categoryPreferences as any)[key] = preferences[key]
      categoryMetadata[key] = metadata[key]
    })
    
    return {
      preferences: categoryPreferences,
      metadata: categoryMetadata,
      updatePreferences,
    }
  }, [preferences, metadata, category, updatePreferences])
}

export const useUserPreferencesLoading = () => {
  const loading = useUserPreferencesStore((state) => state.loading)
  const setLoading = useUserPreferencesStore((state) => state.setLoading)
  
  return useMemo(() => ({
    ...loading,
    setLoading,
    isAnyLoading: Object.values(loading).some(Boolean),
  }), [loading, setLoading])
}

export const useUserPreferencesErrors = () => {
  const errors = useUserPreferencesStore((state) => state.errors)
  const setError = useUserPreferencesStore((state) => state.setError)
  const clearError = useUserPreferencesStore((state) => state.clearError)
  const clearAllErrors = useUserPreferencesStore((state) => state.clearAllErrors)
  
  return useMemo(() => ({
    ...errors,
    setError,
    clearError,
    clearAllErrors,
    hasAnyError: Object.values(errors).some(Boolean),
  }), [errors, setError, clearError, clearAllErrors])
}

export const useUserPreferencesCache = () => {
  const lastUpdated = useUserPreferencesStore((state) => state.lastUpdated)
  const isDirty = useUserPreferencesStore((state) => state.isDirty)
  const hasUnsavedChanges = useUserPreferencesStore((state) => state.hasUnsavedChanges)
  const markAsDirty = useUserPreferencesStore((state) => state.markAsDirty)
  const markAsClean = useUserPreferencesStore((state) => state.markAsClean)
  const setLastUpdated = useUserPreferencesStore((state) => state.setLastUpdated)
  
  return useMemo(() => ({
    lastUpdated,
    isDirty,
    hasUnsavedChanges,
    markAsDirty,
    markAsClean,
    setLastUpdated,
  }), [lastUpdated, isDirty, hasUnsavedChanges, markAsDirty, markAsClean, setLastUpdated])
}

export const useUserPreferencesMetadata = () => {
  const metadata = useUserPreferencesStore((state) => state.metadata)
  const getPreference = useUserPreferencesStore((state) => state.getPreference)
  const hasPreference = useUserPreferencesStore((state) => state.hasPreference)
  const validatePreferences = useUserPreferencesStore((state) => state.validatePreferences)
  
  return useMemo(() => ({
    metadata,
    getPreference,
    hasPreference,
    validatePreferences,
  }), [metadata, getPreference, hasPreference, validatePreferences])
}

// Utility hook for preference operations
export const useUserPreferencesOperations = () => {
  const resetStore = useUserPreferencesStore((state) => state.resetStore)
  const getPreferencesByCategory = useUserPreferencesStore((state) => state.getPreferencesByCategory)
  
  return useMemo(() => ({
    resetStore,
    getPreferencesByCategory,
  }), [resetStore, getPreferencesByCategory])
}

// Export types for use in components
export type { 
  BaseUserPreferences, 
  ExtendedUserPreferences, 
  PreferenceCategories, 
  PreferenceMetadata,
  UserPreferencesState 
}
