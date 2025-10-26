import { useCallback } from 'react'
import { useUserPreferencesStore } from '@/stores/user-preferences-store'

// Preference Management Hooks
export function useUserPreference(preferenceKey: string) {
  const value = useUserPreferencesStore((state) => state.preferences[preferenceKey as keyof typeof state.preferences])
  const updatePreference = useUserPreferencesStore((state) => state.updatePreference)
  const resetPreferences = useUserPreferencesStore((state) => state.resetPreferences)

  const set = useCallback((newValue: any) => {
    updatePreference(preferenceKey as any, newValue)
  }, [preferenceKey, updatePreference])

  const reset = useCallback(() => {
    resetPreferences()
  }, [resetPreferences])

  return {
    value,
    set,
    reset,
  }
}

export function useUserPreferences() {
  const preferences = useUserPreferencesStore((state) => state.preferences)
  const setPreferences = useUserPreferencesStore((state) => state.setPreferences)
  const resetPreferences = useUserPreferencesStore((state) => state.resetPreferences)
  const updatePreferences = useUserPreferencesStore((state) => state.updatePreferences)

  const set = useCallback((newPreferences: any) => {
    setPreferences(newPreferences)
  }, [setPreferences])

  const reset = useCallback(() => {
    resetPreferences()
  }, [resetPreferences])

  const update = useCallback((updates: any) => {
    updatePreferences(updates)
  }, [updatePreferences])

  return {
    preferences,
    set,
    reset,
    update,
  }
}

// Category Management Hooks
export function usePreferenceCategory(category: string) {
  const categoryPreferences = useUserPreferencesStore((state) => {
    // Filter preferences by category using metadata
    const result: any = {}
    Object.keys(state.preferences).forEach(key => {
      if (state.metadata[key as keyof typeof state.metadata]?.category === category) {
        result[key] = state.preferences[key as keyof typeof state.preferences]
      }
    })
    return result
  })
  const updatePreferences = useUserPreferencesStore((state) => state.updatePreferences)
  const resetPreferences = useUserPreferencesStore((state) => state.resetPreferences)

  const set = useCallback((preferences: any) => {
    updatePreferences(preferences)
  }, [updatePreferences])

  const reset = useCallback(() => {
    resetPreferences()
  }, [resetPreferences])

  return {
    preferences: categoryPreferences,
    set,
    reset,
  }
}

// Display Preferences Hooks
export function useDisplayPreferences() {
  const displayPreferences = useUserPreferencesStore((state) => {
    // Filter preferences by display category
    const result: any = {}
    Object.keys(state.preferences).forEach(key => {
      if (state.metadata[key as keyof typeof state.metadata]?.category === 'display') {
        result[key] = state.preferences[key as keyof typeof state.preferences]
      }
    })
    return result
  })
  const updatePreferences = useUserPreferencesStore((state) => state.updatePreferences)
  const resetPreferences = useUserPreferencesStore((state) => state.resetPreferences)

  const set = useCallback((preferences: any) => {
    updatePreferences(preferences)
  }, [updatePreferences])

  const reset = useCallback(() => {
    resetPreferences()
  }, [resetPreferences])

  return {
    preferences: displayPreferences,
    set,
    reset,
  }
}

// Communication Preferences Hooks
export function useCommunicationPreferences() {
  const communicationPreferences = useUserPreferencesStore((state) => {
    // Filter preferences by communication category
    const result: any = {}
    Object.keys(state.preferences).forEach(key => {
      if (state.metadata[key as keyof typeof state.metadata]?.category === 'communications') {
        result[key] = state.preferences[key as keyof typeof state.preferences]
      }
    })
    return result
  })
  const updatePreferences = useUserPreferencesStore((state) => state.updatePreferences)
  const resetPreferences = useUserPreferencesStore((state) => state.resetPreferences)

  const set = useCallback((preferences: any) => {
    updatePreferences(preferences)
  }, [updatePreferences])

  const reset = useCallback(() => {
    resetPreferences()
  }, [resetPreferences])

  return {
    preferences: communicationPreferences,
    set,
    reset,
  }
}

// Accessibility Preferences Hooks
export function useAccessibilityPreferences() {
  const accessibilityPreferences = useUserPreferencesStore((state) => {
    // Filter preferences by accessibility category
    const result: any = {}
    Object.keys(state.preferences).forEach(key => {
      if (state.metadata[key as keyof typeof state.metadata]?.category === 'accessibility') {
        result[key] = state.preferences[key as keyof typeof state.preferences]
      }
    })
    return result
  })
  const updatePreferences = useUserPreferencesStore((state) => state.updatePreferences)
  const resetPreferences = useUserPreferencesStore((state) => state.resetPreferences)

  const set = useCallback((preferences: any) => {
    updatePreferences(preferences)
  }, [updatePreferences])

  const reset = useCallback(() => {
    resetPreferences()
  }, [resetPreferences])

  return {
    preferences: accessibilityPreferences,
    set,
    reset,
  }
}

// Metadata Hooks
export function usePreferenceMetadata() {
  const metadata = useUserPreferencesStore((state) => state.metadata)
  const lastUpdated = useUserPreferencesStore((state) => state.lastUpdated)
  const version = useUserPreferencesStore(() => 1) // Assuming version 1 for now

  return {
    metadata,
    lastUpdated,
    version,
  }
}

// Bulk Operations Hooks
export function useUserPreferencesStoreActions() {
  const setPreferences = useUserPreferencesStore((state) => state.setPreferences)
  const updatePreference = useUserPreferencesStore((state) => state.updatePreference)
  const updatePreferences = useUserPreferencesStore((state) => state.updatePreferences)
  const resetPreferences = useUserPreferencesStore((state) => state.resetPreferences)
  const resetToDefaults = useUserPreferencesStore((state) => state.resetToDefaults)

  return {
    setPreferences,
    updatePreference,
    updatePreferences,
    resetPreferences,
    resetToDefaults,
  }
}

// State Getters Hooks
export function useUserPreferencesStoreState() {
  const allPreferences = useUserPreferencesStore((state) => state.preferences)
  const displayPreferences = useUserPreferencesStore((state) => {
    const result: any = {}
    Object.keys(state.preferences).forEach(key => {
      if (state.metadata[key as keyof typeof state.metadata]?.category === 'display') {
        result[key] = state.preferences[key as keyof typeof state.preferences]
      }
    })
    return result
  })
  const communicationPreferences = useUserPreferencesStore((state) => {
    const result: any = {}
    Object.keys(state.preferences).forEach(key => {
      if (state.metadata[key as keyof typeof state.metadata]?.category === 'communications') {
        result[key] = state.preferences[key as keyof typeof state.preferences]
      }
    })
    return result
  })
  const accessibilityPreferences = useUserPreferencesStore((state) => {
    const result: any = {}
    Object.keys(state.preferences).forEach(key => {
      if (state.metadata[key as keyof typeof state.metadata]?.category === 'accessibility') {
        result[key] = state.preferences[key as keyof typeof state.preferences]
      }
    })
    return result
  })
  const metadata = useUserPreferencesStore((state) => state.metadata)
  const lastUpdated = useUserPreferencesStore((state) => state.lastUpdated)
  const version = useUserPreferencesStore(() => 1)

  return {
    allPreferences,
    displayPreferences,
    communicationPreferences,
    accessibilityPreferences,
    metadata,
    lastUpdated,
    version,
  }
}
