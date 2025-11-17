import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { 
  useUserPreferencesStore,
  useUserPreferences,
  useUserPreference,
  useUserPreferencesByCategory,
  useUserPreferencesLoading,
  useUserPreferencesErrors,
  useUserPreferencesCache,
  useUserPreferencesMetadata,
  useUserPreferencesOperations
} from '@/stores/user-preferences-store'

describe('User Preferences Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUserPreferencesStore.getState().resetStore()
    // Clear localStorage to ensure clean state
    localStorage.clear()
  })

  describe('Preference Management', () => {
    it('should set a single preference', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.updatePreference('theme', 'dark')
      })

      expect(result.current.preferences.theme).toBe('dark')
      expect(result.current.isDirty).toBe(true)
      expect(result.current.hasUnsavedChanges).toBe(true)
    })

    it('should set multiple preferences at once', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.setPreferences({
          theme: 'dark',
          language: 'es',
          emailNotifications: false
        })
      })

      expect(result.current.preferences.theme).toBe('dark')
      expect(result.current.preferences.language).toBe('es')
      expect(result.current.preferences.emailNotifications).toBe(false)
      expect(result.current.isDirty).toBe(true)
    })

    it('should update existing preferences', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.setPreferences({
          theme: 'dark',
          language: 'es'
        })
      })

      act(() => {
        result.current.updatePreferences({
          theme: 'light',
          emailNotifications: false
        })
      })

      expect(result.current.preferences.theme).toBe('light')
      expect(result.current.preferences.emailNotifications).toBe(false)
      expect(result.current.preferences.language).toBe('es')
    })

    it('should update preference and mark as dirty', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.updatePreference('profileVisibility', 'PRIVATE')
      })

      expect(result.current.preferences.profileVisibility).toBe('PRIVATE')
      expect(result.current.isDirty).toBe(true)
      expect(result.current.hasUnsavedChanges).toBe(true)
      expect(result.current.lastUpdated).toBeInstanceOf(Date)
    })

    it('should update multiple preferences with updatePreferences', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.updatePreferences({
          optInCommunications: true,
          optInTournamentUpdates: false,
          optInLeaderboardUpdates: false
        })
      })

      expect(result.current.preferences.optInCommunications).toBe(true)
      expect(result.current.preferences.optInTournamentUpdates).toBe(false)
      expect(result.current.preferences.optInLeaderboardUpdates).toBe(false)
    })
  })

  describe('Category-Specific Preferences', () => {
    it('should get preferences by category - display', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.updatePreferences({
          theme: 'dark',
          language: 'es',
          timezone: 'America/New_York'
        })
      })

      const displayPrefs = result.current.getPreferencesByCategory('display')
      expect(displayPrefs.theme).toBe('dark')
      expect(displayPrefs.language).toBe('es')
      expect(displayPrefs.timezone).toBe('America/New_York')
    })

    it('should get preferences by category - communications', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.updatePreferences({
          optInCommunications: true,
          optInTournamentUpdates: false,
          emailNotifications: false
        })
      })

      const commPrefs = result.current.getPreferencesByCategory('communications')
      expect(commPrefs.optInCommunications).toBe(true)
      expect(commPrefs.optInTournamentUpdates).toBe(false)
      expect(commPrefs.emailNotifications).toBe(false)
    })

    it('should get preferences by category - tournaments', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.updatePreferences({
          defaultTournamentView: 'grid',
          autoRegisterForTournaments: true,
          tournamentReminderTime: 60
        })
      })

      const tournamentPrefs = result.current.getPreferencesByCategory('tournaments')
      expect(tournamentPrefs.defaultTournamentView).toBe('grid')
      expect(tournamentPrefs.autoRegisterForTournaments).toBe(true)
      expect(tournamentPrefs.tournamentReminderTime).toBe(60)
    })

    it('should get preferences by category - privacy', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.updatePreferences({
          showEmail: true,
          showPhone: false,
          allowDirectMessages: false
        })
      })

      const privacyPrefs = result.current.getPreferencesByCategory('privacy')
      expect(privacyPrefs.showEmail).toBe(true)
      expect(privacyPrefs.showPhone).toBe(false)
      expect(privacyPrefs.allowDirectMessages).toBe(false)
    })

    it('should get preferences by category - games', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.updatePreferences({
          favoriteGames: ['pokemon', 'mtg'],
          defaultGame: 'pokemon'
        })
      })

      const gamePrefs = result.current.getPreferencesByCategory('games')
      expect(gamePrefs.favoriteGames).toEqual(['pokemon', 'mtg'])
      expect(gamePrefs.defaultGame).toBe('pokemon')
    })

    it('should get preferences by category - accessibility', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.updatePreferences({
          fontSize: 'large',
          highContrast: true,
          reducedMotion: true
        })
      })

      const accessibilityPrefs = result.current.getPreferencesByCategory('accessibility')
      expect(accessibilityPrefs.fontSize).toBe('large')
      expect(accessibilityPrefs.highContrast).toBe(true)
      expect(accessibilityPrefs.reducedMotion).toBe(true)
    })

    it('should get preferences by category - advanced', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.updatePreferences({
          experimentalFeatures: true,
          analyticsOptIn: false,
          crashReporting: false
        })
      })

      const advancedPrefs = result.current.getPreferencesByCategory('advanced')
      expect(advancedPrefs.experimentalFeatures).toBe(true)
      expect(advancedPrefs.analyticsOptIn).toBe(false)
      expect(advancedPrefs.crashReporting).toBe(false)
    })
  })

  describe('Preference Reset', () => {
    it('should reset preferences to defaults', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.updatePreferences({
          theme: 'dark',
          language: 'es',
          emailNotifications: false
        })
      })

      expect(result.current.preferences.theme).toBe('dark')
      expect(result.current.isDirty).toBe(true)

      act(() => {
        result.current.resetToDefaults()
      })

      expect(result.current.preferences.theme).toBe('system')
      expect(result.current.preferences.language).toBe('en')
      expect(result.current.preferences.emailNotifications).toBe(true)
      expect(result.current.isDirty).toBe(false)
      expect(result.current.hasUnsavedChanges).toBe(false)
    })

    it('should reset preferences using resetPreferences', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.setPreferences({
          theme: 'dark',
          optInMarketing: true
        })
      })

      act(() => {
        result.current.resetPreferences()
      })

      expect(result.current.preferences.theme).toBe('system')
      expect(result.current.preferences.optInMarketing).toBe(false)
      expect(result.current.isDirty).toBe(false)
    })

    it('should update lastUpdated when resetting', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.updatePreference('theme', 'dark')
      })

      const beforeReset = result.current.lastUpdated

      act(() => {
        result.current.resetToDefaults()
      })

      expect(result.current.lastUpdated).toBeInstanceOf(Date)
      if (beforeReset) {
        expect(result.current.lastUpdated!.getTime()).toBeGreaterThanOrEqual(beforeReset.getTime())
      }
    })
  })

  describe('Loading State Management', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.setLoading('saving', true)
      })

      expect(result.current.loading.saving).toBe(true)

      act(() => {
        result.current.setLoading('saving', false)
      })

      expect(result.current.loading.saving).toBe(false)
    })

    it('should handle multiple loading states', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.setLoading('loading', true)
        result.current.setLoading('saving', true)
      })

      expect(result.current.loading.loading).toBe(true)
      expect(result.current.loading.saving).toBe(true)

      act(() => {
        result.current.setLoading('loading', false)
      })

      expect(result.current.loading.loading).toBe(false)
      expect(result.current.loading.saving).toBe(true)
    })

    it('should set resetting loading state', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.setLoading('resetting', true)
      })

      expect(result.current.loading.resetting).toBe(true)
    })
  })

  describe('Error State Management', () => {
    it('should set error state', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.setError('save', 'Failed to save preferences')
      })

      expect(result.current.errors.save).toBe('Failed to save preferences')
    })

    it('should clear specific error', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.setError('save', 'Error message')
        result.current.setError('load', 'Another error')
      })

      expect(result.current.errors.save).toBe('Error message')
      expect(result.current.errors.load).toBe('Another error')

      act(() => {
        result.current.clearError('save')
      })

      expect(result.current.errors.save).toBeNull()
      expect(result.current.errors.load).toBe('Another error')
    })

    it('should clear all errors', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.setError('save', 'Save error')
        result.current.setError('load', 'Load error')
        result.current.setError('reset', 'Reset error')
      })

      expect(result.current.errors.save).toBe('Save error')
      expect(result.current.errors.load).toBe('Load error')
      expect(result.current.errors.reset).toBe('Reset error')

      act(() => {
        result.current.clearAllErrors()
      })

      expect(result.current.errors.save).toBeNull()
      expect(result.current.errors.load).toBeNull()
      expect(result.current.errors.reset).toBeNull()
    })
  })

  describe('Cache State Management', () => {
    it('should mark as dirty', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      expect(result.current.isDirty).toBe(false)

      act(() => {
        result.current.markAsDirty()
      })

      expect(result.current.isDirty).toBe(true)
      expect(result.current.hasUnsavedChanges).toBe(true)
    })

    it('should mark as clean', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.markAsDirty()
      })

      expect(result.current.isDirty).toBe(true)

      act(() => {
        result.current.markAsClean()
      })

      expect(result.current.isDirty).toBe(false)
      expect(result.current.hasUnsavedChanges).toBe(false)
    })

    it('should set last updated timestamp', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      const testDate = new Date('2024-01-01')

      act(() => {
        result.current.setLastUpdated(testDate)
      })

      expect(result.current.lastUpdated).toEqual(testDate)
    })

    it('should track last updated on preference changes', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      expect(result.current.lastUpdated).toBeNull()

      act(() => {
        result.current.updatePreference('theme', 'dark')
      })

      expect(result.current.lastUpdated).toBeInstanceOf(Date)
    })
  })

  describe('Preference Validation', () => {
    it('should validate required preferences', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      const validation = result.current.validatePreferences({
        nameDisplayPreference: '' as any
      })

      expect(validation.isValid).toBe(false)
      expect(validation.errors.nameDisplayPreference).toBeDefined()
    })

    it('should validate enum values', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      const validation = result.current.validatePreferences({
        theme: 'invalid' as any
      })

      expect(validation.isValid).toBe(false)
      expect(validation.errors.theme).toBeDefined()
    })

    it('should validate number ranges', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      const validation = result.current.validatePreferences({
        tournamentReminderTime: 2000 // max is 1440
      })

      expect(validation.isValid).toBe(false)
      expect(validation.errors.tournamentReminderTime).toBeDefined()
    })

    it('should validate minimum number values', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      const validation = result.current.validatePreferences({
        tournamentReminderTime: 2 // min is 5
      })

      expect(validation.isValid).toBe(false)
      expect(validation.errors.tournamentReminderTime).toBeDefined()
    })

    it('should pass validation for valid preferences', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      const validation = result.current.validatePreferences({
        theme: 'dark',
        tournamentReminderTime: 30,
        nameDisplayPreference: 'FIRST_NAME'
      })

      expect(validation.isValid).toBe(true)
      expect(Object.keys(validation.errors)).toHaveLength(0)
    })
  })

  describe('Utility Actions', () => {
    it('should get specific preference value', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.updatePreference('theme', 'dark')
      })

      const theme = result.current.getPreference('theme')
      expect(theme).toBe('dark')
    })

    it('should check if preference exists', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      expect(result.current.hasPreference('theme')).toBe(true)
      expect(result.current.hasPreference('invalidKey' as any)).toBe(false)
    })

    it('should get preference metadata', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      const themeMetadata = result.current.metadata.theme
      expect(themeMetadata).toBeDefined()
      expect(themeMetadata.type).toBe('enum')
      expect(themeMetadata.category).toBe('display')
      expect(themeMetadata.enumValues).toContain('light')
      expect(themeMetadata.enumValues).toContain('dark')
    })
  })

  describe('Store Reset', () => {
    it('should reset entire store state', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      act(() => {
        result.current.updatePreferences({
          theme: 'dark',
          language: 'es'
        })
        result.current.setError('save', 'Error')
        result.current.setLoading('saving', true)
      })

      expect(result.current.preferences.theme).toBe('dark')
      expect(result.current.errors.save).toBe('Error')
      expect(result.current.loading.saving).toBe(true)

      act(() => {
        result.current.resetStore()
      })

      expect(result.current.preferences.theme).toBe('system')
      expect(result.current.errors.save).toBeNull()
      expect(result.current.loading.saving).toBe(false)
      expect(result.current.isDirty).toBe(false)
      expect(result.current.lastUpdated).toBeNull()
    })
  })

  describe('Custom Hooks', () => {
    it('should use useUserPreferences hook', () => {
      const { result } = renderHook(() => useUserPreferences())

      expect(result.current.preferences).toBeDefined()
      expect(result.current.setPreferences).toBeDefined()
      expect(result.current.updatePreference).toBeDefined()
      expect(result.current.updatePreferences).toBeDefined()
      expect(result.current.resetPreferences).toBeDefined()
      expect(result.current.resetToDefaults).toBeDefined()
    })

    it('should use useUserPreference hook for single preference', () => {
      const { result } = renderHook(() => useUserPreference('theme'))

      expect(result.current.value).toBe('system')
      expect(result.current.update).toBeDefined()
      expect(result.current.metadata).toBeDefined()

      act(() => {
        result.current.update('dark')
      })

      expect(result.current.value).toBe('dark')
    })

    it('should use useUserPreferencesByCategory hook', () => {
      const { result } = renderHook(() => useUserPreferencesByCategory('display'))

      expect(result.current.preferences).toBeDefined()
      expect(result.current.metadata).toBeDefined()
      expect(result.current.updatePreferences).toBeDefined()
      expect(result.current.preferences.theme).toBe('system')
    })

    it('should use useUserPreferencesLoading hook', () => {
      const { result } = renderHook(() => useUserPreferencesLoading())

      expect(result.current.loading).toBe(false)
      expect(result.current.saving).toBe(false)
      expect(result.current.resetting).toBe(false)
      expect(result.current.setLoading).toBeDefined()
      expect(result.current.isAnyLoading).toBe(false)

      act(() => {
        result.current.setLoading('saving', true)
      })

      expect(result.current.saving).toBe(true)
      expect(result.current.isAnyLoading).toBe(true)
    })

    it('should use useUserPreferencesErrors hook', () => {
      const { result } = renderHook(() => useUserPreferencesErrors())

      expect(result.current.load).toBeNull()
      expect(result.current.save).toBeNull()
      expect(result.current.reset).toBeNull()
      expect(result.current.setError).toBeDefined()
      expect(result.current.clearError).toBeDefined()
      expect(result.current.clearAllErrors).toBeDefined()
      expect(result.current.hasAnyError).toBe(false)

      act(() => {
        result.current.setError('save', 'Test error')
      })

      expect(result.current.save).toBe('Test error')
      expect(result.current.hasAnyError).toBe(true)
    })

    it('should use useUserPreferencesCache hook', () => {
      const { result } = renderHook(() => useUserPreferencesCache())

      expect(result.current.lastUpdated).toBeNull()
      expect(result.current.isDirty).toBe(false)
      expect(result.current.hasUnsavedChanges).toBe(false)
      expect(result.current.markAsDirty).toBeDefined()
      expect(result.current.markAsClean).toBeDefined()
      expect(result.current.setLastUpdated).toBeDefined()
    })

    it('should use useUserPreferencesMetadata hook', () => {
      const { result } = renderHook(() => useUserPreferencesMetadata())

      expect(result.current.metadata).toBeDefined()
      expect(result.current.getPreference).toBeDefined()
      expect(result.current.hasPreference).toBeDefined()
      expect(result.current.validatePreferences).toBeDefined()
    })

    it('should use useUserPreferencesOperations hook', () => {
      const { result } = renderHook(() => useUserPreferencesOperations())

      expect(result.current.resetStore).toBeDefined()
      expect(result.current.getPreferencesByCategory).toBeDefined()
    })
  })

  describe('Default Values', () => {
    it('should have correct default values for all categories', () => {
      const { result } = renderHook(() => useUserPreferencesStore())

      // Display
      expect(result.current.preferences.theme).toBe('system')
      expect(result.current.preferences.language).toBe('en')
      expect(result.current.preferences.timezone).toBe('UTC')

      // Communications
      expect(result.current.preferences.emailNotifications).toBe(true)
      expect(result.current.preferences.pushNotifications).toBe(true)
      expect(result.current.preferences.smsNotifications).toBe(false)
      expect(result.current.preferences.optInMarketing).toBe(false)

      // Tournaments
      expect(result.current.preferences.defaultTournamentView).toBe('list')
      expect(result.current.preferences.autoRegisterForTournaments).toBe(false)
      expect(result.current.preferences.tournamentReminderTime).toBe(30)

      // Privacy
      expect(result.current.preferences.showEmail).toBe(false)
      expect(result.current.preferences.showPhone).toBe(false)
      expect(result.current.preferences.allowDirectMessages).toBe(true)

      // Games
      expect(result.current.preferences.favoriteGames).toEqual([])
      expect(result.current.preferences.defaultGame).toBe('')

      // Accessibility
      expect(result.current.preferences.fontSize).toBe('medium')
      expect(result.current.preferences.highContrast).toBe(false)
      expect(result.current.preferences.reducedMotion).toBe(false)

      // Advanced
      expect(result.current.preferences.experimentalFeatures).toBe(false)
      expect(result.current.preferences.analyticsOptIn).toBe(true)
      expect(result.current.preferences.crashReporting).toBe(true)
    })
  })
})
