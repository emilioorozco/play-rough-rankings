import { useMemo, useCallback } from 'react'
import { useUserPreferencesStore } from './user-preferences-store'

// Basic preference hooks
export const usePreference = (key: string, defaultValue?: any) => {
  return useUserPreferencesStore((state) => state.preferences[key as keyof typeof state.preferences] ?? defaultValue)
}

export const usePreferences = (keys: string[]) => {
  return useUserPreferencesStore(
    useCallback((state) => {
      const preferences: Record<string, any> = {}
      keys.forEach(key => {
        preferences[key] = state.preferences[key as keyof typeof state.preferences]
      })
      return preferences
    }, [keys])
  )
}

export const useAllPreferences = () => {
  return useUserPreferencesStore((state) => state.preferences)
}

export const useHasPreference = (key: string) => {
  return useUserPreferencesStore((state) => key in state.preferences)
}

export const usePreferencesByCategory = (category: string) => {
  const metadata = useUserPreferencesStore((state) => state.metadata)
  const preferences = useUserPreferencesStore((state) => state.preferences)
  
  return useMemo(() => {
    const categoryKeys = Object.keys(metadata).filter(
      key => metadata[key as keyof typeof metadata].category === category
    ) as (keyof typeof preferences)[]
    
    const result: Partial<typeof preferences> = {}
    categoryKeys.forEach(key => {
      (result as any)[key] = preferences[key]
    })
    return result
  }, [metadata, preferences, category])
}

export const usePreferenceCategories = () => {
  return useUserPreferencesStore(
    useCallback((state) => {
      const categories = new Set<string>()
      Object.values(state.metadata).forEach(meta => {
        categories.add(meta.category)
      })
      return Array.from(categories)
    }, [])
  )
}

// Category-specific hooks
export const useDisplayPreferences = () => {
  return usePreferencesByCategory('display')
}

export const useCommunicationPreferences = () => {
  return usePreferencesByCategory('communications')
}

export const useTournamentPreferences = () => {
  return usePreferencesByCategory('tournaments')
}

export const usePrivacyPreferences = () => {
  return usePreferencesByCategory('privacy')
}

export const useGamePreferences = () => {
  return usePreferencesByCategory('games')
}

export const useAccessibilityPreferences = () => {
  return usePreferencesByCategory('accessibility')
}

export const useAdvancedPreferences = () => {
  return usePreferencesByCategory('advanced')
}

// Specific preference hooks
export const useTheme = () => {
  return useUserPreferencesStore((state) => state.preferences.theme ?? 'system')
}

export const useLanguage = () => {
  return useUserPreferencesStore((state) => state.preferences.language ?? 'en')
}

export const useTimezone = () => {
  return useUserPreferencesStore((state) => state.preferences.timezone ?? 'UTC')
}

export const useNameDisplayPreference = () => {
  return useUserPreferencesStore((state) => state.preferences.nameDisplayPreference ?? 'FIRST_NAME')
}

export const useProfileVisibility = () => {
  return useUserPreferencesStore((state) => state.preferences.profileVisibility ?? 'PUBLIC')
}

export const useOptInCommunications = () => {
  return useUserPreferencesStore((state) => state.preferences.optInCommunications ?? false)
}

export const useOptInTournamentUpdates = () => {
  return useUserPreferencesStore((state) => state.preferences.optInTournamentUpdates ?? true)
}

export const useOptInLeaderboardUpdates = () => {
  return useUserPreferencesStore((state) => state.preferences.optInLeaderboardUpdates ?? true)
}

export const useOptInMarketing = () => {
  return useUserPreferencesStore((state) => state.preferences.optInMarketing ?? false)
}

export const useFontSize = () => {
  return useUserPreferencesStore((state) => state.preferences.fontSize ?? 'medium')
}

export const useHighContrast = () => {
  return useUserPreferencesStore((state) => state.preferences.highContrast ?? false)
}

export const useReducedMotion = () => {
  return useUserPreferencesStore((state) => state.preferences.reducedMotion ?? false)
}

export const useDefaultTournamentView = () => {
  return useUserPreferencesStore((state) => state.preferences.defaultTournamentView ?? 'list')
}

export const useAutoRegisterForTournaments = () => {
  return useUserPreferencesStore((state) => state.preferences.autoRegisterForTournaments ?? false)
}

export const useTournamentReminderTime = () => {
  return useUserPreferencesStore((state) => state.preferences.tournamentReminderTime ?? 30)
}

// Action hooks
export const useUserPreferencesActions = () => {
  return useUserPreferencesStore((state) => ({
    setPreferences: state.setPreferences,
    updatePreference: state.updatePreference,
    updatePreferences: state.updatePreferences,
    resetPreferences: state.resetPreferences,
    resetToDefaults: state.resetToDefaults,
    resetStore: state.resetStore,
  }))
}

// Combined hooks for common use cases
export const useDisplayPreferencesState = () => {
  const preferences = useDisplayPreferences()
  const actions = useUserPreferencesActions()

  return useMemo(() => ({
    preferences,
    updatePreference: actions.updatePreference,
  }), [preferences, actions])
}

export const useCommunicationPreferencesState = () => {
  const preferences = useCommunicationPreferences()
  const actions = useUserPreferencesActions()

  return useMemo(() => ({
    preferences,
    updatePreference: actions.updatePreference,
  }), [preferences, actions])
}

export const useTournamentPreferencesState = () => {
  const preferences = useTournamentPreferences()
  const actions = useUserPreferencesActions()

  return useMemo(() => ({
    preferences,
    updatePreference: actions.updatePreference,
  }), [preferences, actions])
}

export const useAccessibilityPreferencesState = () => {
  const preferences = useAccessibilityPreferences()
  const actions = useUserPreferencesActions()

  return useMemo(() => ({
    preferences,
    updatePreference: actions.updatePreference,
  }), [preferences, actions])
}

export const usePrivacyPreferencesState = () => {
  const preferences = usePrivacyPreferences()
  const actions = useUserPreferencesActions()

  return useMemo(() => ({
    preferences,
    updatePreference: actions.updatePreference,
  }), [preferences, actions])
}

export const useAdvancedPreferencesState = () => {
  const preferences = useAdvancedPreferences()
  const actions = useUserPreferencesActions()

  return useMemo(() => ({
    preferences,
    updatePreference: actions.updatePreference,
  }), [preferences, actions])
}

// Performance-optimized hooks for rendering
export const useThemeRenderData = () => {
  const theme = useTheme()
  const highContrast = useHighContrast()
  const reducedMotion = useReducedMotion()
  
  return useMemo(() => ({
    theme,
    highContrast,
    reducedMotion,
  }), [theme, highContrast, reducedMotion])
}

export const useCommunicationRenderData = () => {
  const optInCommunications = useOptInCommunications()
  const optInTournamentUpdates = useOptInTournamentUpdates()
  const optInLeaderboardUpdates = useOptInLeaderboardUpdates()
  const optInMarketing = useOptInMarketing()
  
  return useMemo(() => ({
    optInCommunications,
    optInTournamentUpdates,
    optInLeaderboardUpdates,
    optInMarketing,
  }), [optInCommunications, optInTournamentUpdates, optInLeaderboardUpdates, optInMarketing])
}

export const useDisplayRenderData = () => {
  const nameDisplayPreference = useNameDisplayPreference()
  const profileVisibility = useProfileVisibility()
  const fontSize = useFontSize()
  
  return useMemo(() => ({
    nameDisplayPreference,
    profileVisibility,
    fontSize,
  }), [nameDisplayPreference, profileVisibility, fontSize])
}

export const useTournamentRenderData = () => {
  const defaultTournamentView = useDefaultTournamentView()
  const autoRegisterForTournaments = useAutoRegisterForTournaments()
  const tournamentReminderTime = useTournamentReminderTime()
  
  return useMemo(() => ({
    defaultTournamentView,
    autoRegisterForTournaments,
    tournamentReminderTime,
  }), [defaultTournamentView, autoRegisterForTournaments, tournamentReminderTime])
}

export const useAccessibilityRenderData = () => {
  const fontSize = useFontSize()
  const highContrast = useHighContrast()
  const reducedMotion = useReducedMotion()
  
  return useMemo(() => ({
    fontSize,
    highContrast,
    reducedMotion,
  }), [fontSize, highContrast, reducedMotion])
}
