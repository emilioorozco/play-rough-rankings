import { useMemo } from 'react'
import { useUserPreferencesStore } from './user-preferences-store'
import type { UserPreferencesState } from './user-preferences-store'

// Preference selectors
export const usePreferenceSelectors = {
  // Get specific preference value
  getPreference: (key: string, defaultValue?: any) => {
    return useUserPreferencesStore((state) => state.preferences[key as keyof typeof state.preferences] ?? defaultValue)
  },

  // Get multiple preferences
  getPreferences: (keys: string[]) => {
    return useUserPreferencesStore((state) => {
      const preferences: Record<string, any> = {}
      keys.forEach(key => {
        preferences[key] = state.preferences[key as keyof typeof state.preferences]
      })
      return preferences
    })
  },

  // Get all preferences
  getAllPreferences: () => {
    return useUserPreferencesStore((state) => state.preferences)
  },

  // Check if preference exists
  hasPreference: (key: string) => {
    return useUserPreferencesStore((state) => key in state.preferences)
  },

  // Get preference by category
  getPreferencesByCategory: (category: string) => {
    const metadata = useUserPreferencesStore((state) => state.metadata)
    const preferences = useUserPreferencesStore((state) => state.preferences)
    
    return useMemo(() => {
      const categoryKeys = Object.keys(metadata).filter(
        key => metadata[key as keyof typeof metadata].category === category
      ) as (keyof typeof preferences)[]
      
      const result: Partial<typeof preferences> = {}
      categoryKeys.forEach(key => {
        result[key] = preferences[key]
      })
      return result
    }, [metadata, preferences, category])
  },

  // Get preference categories
  getCategories: () => {
    return useUserPreferencesStore((state) => {
      const categories = new Set<string>()
      Object.values(state.metadata).forEach(meta => {
        categories.add(meta.category)
      })
      return Array.from(categories)
    })
  },
}

// Category-specific selectors
export const useCategorySelectors = {
  // Display preferences
  getDisplayPreferences: () => {
    const metadata = useUserPreferencesStore((state) => state.metadata)
    const preferences = useUserPreferencesStore((state) => state.preferences)
    
    return useMemo(() => {
      const categoryKeys = Object.keys(metadata).filter(
        key => metadata[key as keyof typeof metadata].category === 'display'
      ) as (keyof typeof preferences)[]
      
      const result: Partial<typeof preferences> = {}
      categoryKeys.forEach(key => {
        result[key] = preferences[key]
      })
      return result
    }, [metadata, preferences])
  },

  // Communication preferences
  getCommunicationPreferences: () => {
    const metadata = useUserPreferencesStore((state) => state.metadata)
    const preferences = useUserPreferencesStore((state) => state.preferences)
    
    return useMemo(() => {
      const categoryKeys = Object.keys(metadata).filter(
        key => metadata[key as keyof typeof metadata].category === 'communications'
      ) as (keyof typeof preferences)[]
      
      const result: Partial<typeof preferences> = {}
      categoryKeys.forEach(key => {
        result[key] = preferences[key]
      })
      return result
    }, [metadata, preferences])
  },

  // Tournament preferences
  getTournamentPreferences: () => {
    const metadata = useUserPreferencesStore((state) => state.metadata)
    const preferences = useUserPreferencesStore((state) => state.preferences)
    
    return useMemo(() => {
      const categoryKeys = Object.keys(metadata).filter(
        key => metadata[key as keyof typeof metadata].category === 'tournaments'
      ) as (keyof typeof preferences)[]
      
      const result: Partial<typeof preferences> = {}
      categoryKeys.forEach(key => {
        result[key] = preferences[key]
      })
      return result
    }, [metadata, preferences])
  },

  // Privacy preferences
  getPrivacyPreferences: () => {
    const metadata = useUserPreferencesStore((state) => state.metadata)
    const preferences = useUserPreferencesStore((state) => state.preferences)
    
    return useMemo(() => {
      const categoryKeys = Object.keys(metadata).filter(
        key => metadata[key as keyof typeof metadata].category === 'privacy'
      ) as (keyof typeof preferences)[]
      
      const result: Partial<typeof preferences> = {}
      categoryKeys.forEach(key => {
        result[key] = preferences[key]
      })
      return result
    }, [metadata, preferences])
  },

  // Game preferences
  getGamePreferences: () => {
    const metadata = useUserPreferencesStore((state) => state.metadata)
    const preferences = useUserPreferencesStore((state) => state.preferences)
    
    return useMemo(() => {
      const categoryKeys = Object.keys(metadata).filter(
        key => metadata[key as keyof typeof metadata].category === 'games'
      ) as (keyof typeof preferences)[]
      
      const result: Partial<typeof preferences> = {}
      categoryKeys.forEach(key => {
        result[key] = preferences[key]
      })
      return result
    }, [metadata, preferences])
  },

  // Accessibility preferences
  getAccessibilityPreferences: () => {
    const metadata = useUserPreferencesStore((state) => state.metadata)
    const preferences = useUserPreferencesStore((state) => state.preferences)
    
    return useMemo(() => {
      const categoryKeys = Object.keys(metadata).filter(
        key => metadata[key as keyof typeof metadata].category === 'accessibility'
      ) as (keyof typeof preferences)[]
      
      const result: Partial<typeof preferences> = {}
      categoryKeys.forEach(key => {
        result[key] = preferences[key]
      })
      return result
    }, [metadata, preferences])
  },

  // Advanced preferences
  getAdvancedPreferences: () => {
    const metadata = useUserPreferencesStore((state) => state.metadata)
    const preferences = useUserPreferencesStore((state) => state.preferences)
    
    return useMemo(() => {
      const categoryKeys = Object.keys(metadata).filter(
        key => metadata[key as keyof typeof metadata].category === 'advanced'
      ) as (keyof typeof preferences)[]
      
      const result: Partial<typeof preferences> = {}
      categoryKeys.forEach(key => {
        result[key] = preferences[key]
      })
      return result
    }, [metadata, preferences])
  },
}

// Specific preference selectors
export const useSpecificPreferenceSelectors = {
  // Theme preferences
  getTheme: () => {
    return useUserPreferencesStore((state) => state.preferences.theme ?? 'system')
  },

  // Language preferences
  getLanguage: () => {
    return useUserPreferencesStore((state) => state.preferences.language ?? 'en')
  },

  // Timezone preferences
  getTimezone: () => {
    return useUserPreferencesStore((state) => state.preferences.timezone ?? 'UTC')
  },

  // Name display preference
  getNameDisplayPreference: () => {
    return useUserPreferencesStore((state) => state.preferences.nameDisplayPreference ?? 'FIRST_NAME')
  },

  // Profile visibility
  getProfileVisibility: () => {
    return useUserPreferencesStore((state) => state.preferences.profileVisibility ?? 'PUBLIC')
  },

  // Communication preferences
  getOptInCommunications: () => {
    return useUserPreferencesStore((state) => state.preferences.optInCommunications ?? false)
  },

  getOptInTournamentUpdates: () => {
    return useUserPreferencesStore((state) => state.preferences.optInTournamentUpdates ?? true)
  },

  getOptInLeaderboardUpdates: () => {
    return useUserPreferencesStore((state) => state.preferences.optInLeaderboardUpdates ?? true)
  },

  getOptInMarketing: () => {
    return useUserPreferencesStore((state) => state.preferences.optInMarketing ?? false)
  },

  // Accessibility preferences
  getFontSize: () => {
    return useUserPreferencesStore((state) => state.preferences.fontSize ?? 'medium')
  },

  getHighContrast: () => {
    return useUserPreferencesStore((state) => state.preferences.highContrast ?? false)
  },

  getReducedMotion: () => {
    return useUserPreferencesStore((state) => state.preferences.reducedMotion ?? false)
  },

  // Tournament preferences
  getDefaultTournamentView: () => {
    return useUserPreferencesStore((state) => state.preferences.defaultTournamentView ?? 'list')
  },

  getAutoRegisterForTournaments: () => {
    return useUserPreferencesStore((state) => state.preferences.autoRegisterForTournaments ?? false)
  },

  getTournamentReminderTime: () => {
    return useUserPreferencesStore((state) => state.preferences.tournamentReminderTime ?? 30)
  },
}

// Action selectors
export const useUserPreferencesActions = {
  // Set multiple preferences
  setPreferences: () => useUserPreferencesStore((state) => state.setPreferences),

  // Update preference
  updatePreference: () => useUserPreferencesStore((state) => state.updatePreference),

  // Update multiple preferences
  updatePreferences: () => useUserPreferencesStore((state) => state.updatePreferences),

  // Reset preferences
  resetPreferences: () => useUserPreferencesStore((state) => state.resetPreferences),

  // Reset to defaults
  resetToDefaults: () => useUserPreferencesStore((state) => state.resetToDefaults),

  // Reset store
  resetStore: () => useUserPreferencesStore((state) => state.resetStore),
}

// Combined selectors for common use cases
export const useUserPreferencesStoreSelectors = {
  // Get complete display preferences state
  getDisplayPreferencesState: () => {
    const preferences = useCategorySelectors.getDisplayPreferences()
    const updatePreference = useUserPreferencesActions.updatePreference()

    return useMemo(() => ({
      preferences,
      updatePreference: (key: string, value: any) => updatePreference(key, value),
    }), [preferences, updatePreference])
  },

  // Get complete communication preferences state
  getCommunicationPreferencesState: () => {
    const preferences = useCategorySelectors.getCommunicationPreferences()
    const updatePreference = useUserPreferencesActions.updatePreference()

    return useMemo(() => ({
      preferences,
      updatePreference: (key: string, value: any) => updatePreference(key, value),
    }), [preferences, updatePreference])
  },

  // Get complete tournament preferences state
  getTournamentPreferencesState: () => {
    const preferences = useCategorySelectors.getTournamentPreferences()
    const updatePreference = useUserPreferencesActions.updatePreference()

    return useMemo(() => ({
      preferences,
      updatePreference: (key: string, value: any) => updatePreference(key, value),
    }), [preferences, updatePreference])
  },

  // Get complete accessibility preferences state
  getAccessibilityPreferencesState: () => {
    const preferences = useCategorySelectors.getAccessibilityPreferences()
    const updatePreference = useUserPreferencesActions.updatePreference()

    return useMemo(() => ({
      preferences,
      updatePreference: (key: string, value: any) => updatePreference(key, value),
    }), [preferences, updatePreference])
  },

  // Get complete privacy preferences state
  getPrivacyPreferencesState: () => {
    const preferences = useCategorySelectors.getPrivacyPreferences()
    const updatePreference = useUserPreferencesActions.updatePreference()

    return useMemo(() => ({
      preferences,
      updatePreference: (key: string, value: any) => updatePreference(key, value),
    }), [preferences, updatePreference])
  },

  // Get complete advanced preferences state
  getAdvancedPreferencesState: () => {
    const preferences = useCategorySelectors.getAdvancedPreferences()
    const updatePreference = useUserPreferencesActions.updatePreference()

    return useMemo(() => ({
      preferences,
      updatePreference: (key: string, value: any) => updatePreference(key, value),
    }), [preferences, updatePreference])
  },
}

// Performance-optimized selectors for specific use cases
export const useOptimizedUserPreferencesSelectors = {
  // Get only the data needed for theme rendering
  getThemeRenderData: () => {
    const theme = useUserPreferencesStore((state) => state.preferences.theme)
    const highContrast = useUserPreferencesStore((state) => state.preferences.highContrast)
    const reducedMotion = useUserPreferencesStore((state) => state.preferences.reducedMotion)
    
    return useMemo(() => ({
      theme: theme ?? 'system',
      highContrast: highContrast ?? false,
      reducedMotion: reducedMotion ?? false,
    }), [theme, highContrast, reducedMotion])
  },

  // Get only the data needed for communication preferences rendering
  getCommunicationRenderData: () => {
    const optInCommunications = useUserPreferencesStore((state) => state.preferences.optInCommunications)
    const optInTournamentUpdates = useUserPreferencesStore((state) => state.preferences.optInTournamentUpdates)
    const optInLeaderboardUpdates = useUserPreferencesStore((state) => state.preferences.optInLeaderboardUpdates)
    const optInMarketing = useUserPreferencesStore((state) => state.preferences.optInMarketing)
    
    return useMemo(() => ({
      optInCommunications: optInCommunications ?? false,
      optInTournamentUpdates: optInTournamentUpdates ?? true,
      optInLeaderboardUpdates: optInLeaderboardUpdates ?? true,
      optInMarketing: optInMarketing ?? false,
    }), [optInCommunications, optInTournamentUpdates, optInLeaderboardUpdates, optInMarketing])
  },

  // Get only the data needed for display preferences rendering
  getDisplayRenderData: () => {
    const nameDisplayPreference = useUserPreferencesStore((state) => state.preferences.nameDisplayPreference)
    const profileVisibility = useUserPreferencesStore((state) => state.preferences.profileVisibility)
    const fontSize = useUserPreferencesStore((state) => state.preferences.fontSize)
    
    return useMemo(() => ({
      nameDisplayPreference: nameDisplayPreference ?? 'FIRST_NAME',
      profileVisibility: profileVisibility ?? 'PUBLIC',
      fontSize: fontSize ?? 'medium',
    }), [nameDisplayPreference, profileVisibility, fontSize])
  },

  // Get only the data needed for tournament preferences rendering
  getTournamentRenderData: () => {
    const defaultTournamentView = useUserPreferencesStore((state) => state.preferences.defaultTournamentView)
    const autoRegisterForTournaments = useUserPreferencesStore((state) => state.preferences.autoRegisterForTournaments)
    const tournamentReminderTime = useUserPreferencesStore((state) => state.preferences.tournamentReminderTime)
    
    return useMemo(() => ({
      defaultTournamentView: defaultTournamentView ?? 'list',
      autoRegisterForTournaments: autoRegisterForTournaments ?? false,
      tournamentReminderTime: tournamentReminderTime ?? 30,
    }), [defaultTournamentView, autoRegisterForTournaments, tournamentReminderTime])
  },

  // Get only the data needed for accessibility rendering
  getAccessibilityRenderData: () => {
    const fontSize = useUserPreferencesStore((state) => state.preferences.fontSize)
    const highContrast = useUserPreferencesStore((state) => state.preferences.highContrast)
    const reducedMotion = useUserPreferencesStore((state) => state.preferences.reducedMotion)
    
    return useMemo(() => ({
      fontSize: fontSize ?? 'medium',
      highContrast: highContrast ?? false,
      reducedMotion: reducedMotion ?? false,
    }), [fontSize, highContrast, reducedMotion])
  },
}
