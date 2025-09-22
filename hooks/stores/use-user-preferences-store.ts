import { useCallback } from 'react'
import { useUserPreferencesStore } from '@/stores/user-preferences-store'
import { useUserPreferencesStoreSelectors } from '@/stores/user-preferences-store-selectors'

// Preference Management Hooks
export function useUserPreference(preferenceKey: string) {
  const value = useUserPreferencesStoreSelectors.usePreference(preferenceKey)
  const setPreference = useUserPreferencesStore((state) => state.setPreference)
  const resetPreference = useUserPreferencesStore((state) => state.resetPreference)

  const set = useCallback((newValue: any) => {
    setPreference(preferenceKey, newValue)
  }, [preferenceKey, setPreference])

  const reset = useCallback(() => {
    resetPreference(preferenceKey)
  }, [preferenceKey, resetPreference])

  return {
    value,
    set,
    reset,
  }
}

export function useUserPreferences(category?: string) {
  const preferences = useUserPreferencesStoreSelectors.usePreferences(category)
  const setPreferences = useUserPreferencesStore((state) => state.setPreferences)
  const resetPreferences = useUserPreferencesStore((state) => state.resetPreferences)
  const updatePreferences = useUserPreferencesStore((state) => state.updatePreferences)

  const set = useCallback((newPreferences: any) => {
    setPreferences(newPreferences)
  }, [setPreferences])

  const reset = useCallback((categoryToReset?: string) => {
    resetPreferences(categoryToReset)
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
  const categoryPreferences = useUserPreferencesStoreSelectors.usePreferencesByCategory(category)
  const setCategoryPreferences = useUserPreferencesStore((state) => state.setCategoryPreferences)
  const resetCategoryPreferences = useUserPreferencesStore((state) => state.resetCategoryPreferences)

  const set = useCallback((preferences: any) => {
    setCategoryPreferences(category, preferences)
  }, [category, setCategoryPreferences])

  const reset = useCallback(() => {
    resetCategoryPreferences(category)
  }, [category, resetCategoryPreferences])

  return {
    preferences: categoryPreferences,
    set,
    reset,
  }
}

// Display Preferences Hooks
export function useDisplayPreferences() {
  const displayPreferences = useUserPreferencesStoreSelectors.useDisplayPreferences()
  const setDisplayPreferences = useUserPreferencesStore((state) => state.setDisplayPreferences)
  const resetDisplayPreferences = useUserPreferencesStore((state) => state.resetDisplayPreferences)

  const set = useCallback((preferences: any) => {
    setDisplayPreferences(preferences)
  }, [setDisplayPreferences])

  const reset = useCallback(() => {
    resetDisplayPreferences()
  }, [resetDisplayPreferences])

  return {
    preferences: displayPreferences,
    set,
    reset,
  }
}

// Communication Preferences Hooks
export function useCommunicationPreferences() {
  const communicationPreferences = useUserPreferencesStoreSelectors.useCommunicationPreferences()
  const setCommunicationPreferences = useUserPreferencesStore((state) => state.setCommunicationPreferences)
  const resetCommunicationPreferences = useUserPreferencesStore((state) => state.resetCommunicationPreferences)

  const set = useCallback((preferences: any) => {
    setCommunicationPreferences(preferences)
  }, [setCommunicationPreferences])

  const reset = useCallback(() => {
    resetCommunicationPreferences()
  }, [resetCommunicationPreferences])

  return {
    preferences: communicationPreferences,
    set,
    reset,
  }
}

// Form Behavior Preferences Hooks
export function useFormBehaviorPreferences() {
  const formBehaviorPreferences = useUserPreferencesStoreSelectors.useFormBehaviorPreferences()
  const setFormBehaviorPreferences = useUserPreferencesStore((state) => state.setFormBehaviorPreferences)
  const resetFormBehaviorPreferences = useUserPreferencesStore((state) => state.resetFormBehaviorPreferences)

  const set = useCallback((preferences: any) => {
    setFormBehaviorPreferences(preferences)
  }, [setFormBehaviorPreferences])

  const reset = useCallback(() => {
    resetFormBehaviorPreferences()
  }, [resetFormBehaviorPreferences])

  return {
    preferences: formBehaviorPreferences,
    set,
    reset,
  }
}

// Metadata Hooks
export function usePreferenceMetadata() {
  const metadata = useUserPreferencesStoreSelectors.usePreferenceMetadata()
  const lastUpdated = useUserPreferencesStoreSelectors.useLastUpdated()
  const version = useUserPreferencesStoreSelectors.useVersion()

  return {
    metadata,
    lastUpdated,
    version,
  }
}

// Bulk Operations Hooks
export function useUserPreferencesStoreActions() {
  const setPreference = useUserPreferencesStore((state) => state.setPreference)
  const setPreferences = useUserPreferencesStore((state) => state.setPreferences)
  const setCategoryPreferences = useUserPreferencesStore((state) => state.setCategoryPreferences)
  const setDisplayPreferences = useUserPreferencesStore((state) => state.setDisplayPreferences)
  const setCommunicationPreferences = useUserPreferencesStore((state) => state.setCommunicationPreferences)
  const setFormBehaviorPreferences = useUserPreferencesStore((state) => state.setFormBehaviorPreferences)
  const updatePreferences = useUserPreferencesStore((state) => state.updatePreferences)
  const resetPreference = useUserPreferencesStore((state) => state.resetPreference)
  const resetPreferences = useUserPreferencesStore((state) => state.resetPreferences)
  const resetCategoryPreferences = useUserPreferencesStore((state) => state.resetCategoryPreferences)
  const resetDisplayPreferences = useUserPreferencesStore((state) => state.resetDisplayPreferences)
  const resetCommunicationPreferences = useUserPreferencesStore((state) => state.resetCommunicationPreferences)
  const resetFormBehaviorPreferences = useUserPreferencesStore((state) => state.resetFormBehaviorPreferences)
  const resetAllPreferences = useUserPreferencesStore((state) => state.resetAllPreferences)

  return {
    setPreference,
    setPreferences,
    setCategoryPreferences,
    setDisplayPreferences,
    setCommunicationPreferences,
    setFormBehaviorPreferences,
    updatePreferences,
    resetPreference,
    resetPreferences,
    resetCategoryPreferences,
    resetDisplayPreferences,
    resetCommunicationPreferences,
    resetFormBehaviorPreferences,
    resetAllPreferences,
  }
}

// State Getters Hooks
export function useUserPreferencesStoreState() {
  const allPreferences = useUserPreferencesStoreSelectors.useAllPreferences()
  const displayPreferences = useUserPreferencesStoreSelectors.useDisplayPreferences()
  const communicationPreferences = useUserPreferencesStoreSelectors.useCommunicationPreferences()
  const formBehaviorPreferences = useUserPreferencesStoreSelectors.useFormBehaviorPreferences()
  const metadata = useUserPreferencesStoreSelectors.usePreferenceMetadata()
  const lastUpdated = useUserPreferencesStoreSelectors.useLastUpdated()
  const version = useUserPreferencesStoreSelectors.useVersion()

  return {
    allPreferences,
    displayPreferences,
    communicationPreferences,
    formBehaviorPreferences,
    metadata,
    lastUpdated,
    version,
  }
}
