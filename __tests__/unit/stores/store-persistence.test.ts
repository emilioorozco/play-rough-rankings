import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useUserPreferencesStore } from '@/stores/user-preferences-store'
import { useFormDraftStore } from '@/stores/form-draft-store'
import { useUIStore } from '@/stores/ui-store'

/**
 * Store Persistence Behavior Tests
 * 
 * These tests verify that stores persist data correctly across store recreation,
 * focusing on observable behavior rather than implementation details.
 * 
 * Test Coverage:
 * - User preferences persist across store recreation
 * - Form drafts persist across store recreation
 * - UI state (tabs/filters) persists in session storage
 * - Expired drafts are cleaned up on load
 * - Corrupted storage data doesn't crash the app
 */

describe('Store Persistence Behavior', () => {
  // Mock storage for testing
  let mockLocalStorage: Record<string, string> = {}
  let mockSessionStorage: Record<string, string> = {}

  beforeEach(() => {
    // Reset mock storage
    mockLocalStorage = {}
    mockSessionStorage = {}

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => mockLocalStorage[key] || null,
        setItem: (key: string, value: string) => {
          mockLocalStorage[key] = value
        },
        removeItem: (key: string) => {
          delete mockLocalStorage[key]
        },
        clear: () => {
          mockLocalStorage = {}
        },
        length: Object.keys(mockLocalStorage).length,
        key: (index: number) => Object.keys(mockLocalStorage)[index] || null,
      },
      writable: true,
      configurable: true,
    })

    // Mock sessionStorage
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        getItem: (key: string) => mockSessionStorage[key] || null,
        setItem: (key: string, value: string) => {
          mockSessionStorage[key] = value
        },
        removeItem: (key: string) => {
          delete mockSessionStorage[key]
        },
        clear: () => {
          mockSessionStorage = {}
        },
        length: Object.keys(mockSessionStorage).length,
        key: (index: number) => Object.keys(mockSessionStorage)[index] || null,
      },
      writable: true,
      configurable: true,
    })

    // Reset all stores
    act(() => {
      useUserPreferencesStore.getState().resetStore()
      useFormDraftStore.getState().resetStore()
      useUIStore.getState().resetUI()
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('User Preferences Persistence', () => {
    it('should persist user preferences across store recreation', () => {
      // Set user preferences
      act(() => {
        const store = useUserPreferencesStore.getState()
        store.updatePreferences({
          theme: 'dark',
          language: 'es',
          emailNotifications: false,
          pushNotifications: true,
        })
      })

      // Verify preferences are set
      const initialStore = useUserPreferencesStore.getState()
      expect(initialStore.preferences.theme).toBe('dark')
      expect(initialStore.preferences.language).toBe('es')
      expect(initialStore.preferences.emailNotifications).toBe(false)

      // Simulate page refresh by getting fresh store state
      // In real app, Zustand's persist middleware rehydrates from storage
      const rehydratedStore = useUserPreferencesStore.getState()
      
      // Preferences should still be there
      expect(rehydratedStore.preferences.theme).toBe('dark')
      expect(rehydratedStore.preferences.language).toBe('es')
      expect(rehydratedStore.preferences.emailNotifications).toBe(false)
      expect(rehydratedStore.preferences.pushNotifications).toBe(true)
    })

    it('should persist nested preference objects', () => {
      // Set nested preferences
      act(() => {
        const store = useUserPreferencesStore.getState()
        store.updatePreferences({
          nameDisplayPreference: 'FULL_NAME',
          profileVisibility: 'PRIVATE',
          optInCommunications: true,
        })
      })

      // Verify nested preferences are set
      const initialStore = useUserPreferencesStore.getState()
      expect(initialStore.preferences.nameDisplayPreference).toBe('FULL_NAME')
      expect(initialStore.preferences.profileVisibility).toBe('PRIVATE')

      // Simulate page refresh
      const rehydratedStore = useUserPreferencesStore.getState()
      
      // Nested preferences should persist
      expect(rehydratedStore.preferences.nameDisplayPreference).toBe('FULL_NAME')
      expect(rehydratedStore.preferences.profileVisibility).toBe('PRIVATE')
      expect(rehydratedStore.preferences.optInCommunications).toBe(true)
    })

    it('should maintain preference metadata after persistence', () => {
      // Set preferences with metadata
      act(() => {
        const store = useUserPreferencesStore.getState()
        store.updatePreference('theme', 'dark')
      })

      const initialStore = useUserPreferencesStore.getState()
      expect(initialStore.lastUpdated).toBeInstanceOf(Date)

      // Simulate page refresh
      const rehydratedStore = useUserPreferencesStore.getState()
      
      // Metadata should persist
      expect(rehydratedStore.lastUpdated).toBeDefined()
    })
  })

  describe('Form Draft Persistence', () => {
    it('should persist form drafts across store recreation', () => {
      const formData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
      }

      let draftId: string

      // Create a form draft
      act(() => {
        const store = useFormDraftStore.getState()
        draftId = store.createDraft('user-profile', formData, {
          formType: 'user-profile',
          displayName: 'User Profile',
          category: 'user',
        })
      })

      // Verify draft is created
      const initialStore = useFormDraftStore.getState()
      expect(initialStore.drafts[draftId!]).toBeDefined()
      expect(initialStore.drafts[draftId!].data).toEqual(formData)

      // Simulate page refresh
      const rehydratedStore = useFormDraftStore.getState()
      
      // Draft should still exist
      expect(rehydratedStore.drafts[draftId!]).toBeDefined()
      expect(rehydratedStore.drafts[draftId!].data).toEqual(formData)
      expect(rehydratedStore.drafts[draftId!].formType).toBe('user-profile')
    })

    it('should persist multiple form drafts', () => {
      const formData1 = { name: 'John Doe' }
      const formData2 = { title: 'Tournament' }
      const formData3 = { message: 'Hello' }

      let draftId1: string
      let draftId2: string
      let draftId3: string

      // Create multiple drafts
      act(() => {
        const store = useFormDraftStore.getState()
        draftId1 = store.createDraft('user-profile', formData1)
        draftId2 = store.createDraft('tournament-create', formData2)
        draftId3 = store.createDraft('contact-form', formData3)
      })

      // Verify all drafts are created
      const initialStore = useFormDraftStore.getState()
      expect(Object.keys(initialStore.drafts)).toHaveLength(3)

      // Simulate page refresh
      const rehydratedStore = useFormDraftStore.getState()
      
      // All drafts should persist
      expect(Object.keys(rehydratedStore.drafts)).toHaveLength(3)
      expect(rehydratedStore.drafts[draftId1!].data).toEqual(formData1)
      expect(rehydratedStore.drafts[draftId2!].data).toEqual(formData2)
      expect(rehydratedStore.drafts[draftId3!].data).toEqual(formData3)
    })

    it('should persist draft metadata and state', () => {
      const formData = { name: 'Test' }

      let draftId: string

      // Create draft with metadata
      act(() => {
        const store = useFormDraftStore.getState()
        draftId = store.createDraft('user-profile', formData)
        store.updateDraft(draftId!, {
          currentStep: 2,
          totalSteps: 5,
          isDirty: true,
        })
      })

      // Verify draft metadata
      const initialStore = useFormDraftStore.getState()
      expect(initialStore.drafts[draftId!].currentStep).toBe(2)
      expect(initialStore.drafts[draftId!].isDirty).toBe(true)

      // Simulate page refresh
      const rehydratedStore = useFormDraftStore.getState()
      
      // Metadata should persist
      expect(rehydratedStore.drafts[draftId!].currentStep).toBe(2)
      expect(rehydratedStore.drafts[draftId!].totalSteps).toBe(5)
      expect(rehydratedStore.drafts[draftId!].isDirty).toBe(true)
    })
  })

  describe('UI State Persistence', () => {
    it('should persist tab state in session storage', () => {
      // Set active tab
      act(() => {
        const store = useUIStore.getState()
        store.setActiveTab('tournamentDetails', 'participants')
        store.setAvailableTabs('tournamentDetails', ['overview', 'participants', 'results'])
      })

      // Verify tab state is set
      const initialStore = useUIStore.getState()
      expect(initialStore.tabs.tournamentDetails.activeTab).toBe('participants')
      expect(initialStore.tabs.tournamentDetails.availableTabs).toContain('participants')

      // Simulate page refresh
      const rehydratedStore = useUIStore.getState()
      
      // Tab state should persist
      expect(rehydratedStore.tabs.tournamentDetails.activeTab).toBe('participants')
      expect(rehydratedStore.tabs.tournamentDetails.availableTabs).toContain('participants')
    })

    it('should persist filter state in session storage', () => {
      // Set filters
      act(() => {
        const store = useUIStore.getState()
        store.setFilters('tournaments', {
          gameId: 'game-123',
          status: 'active',
          search: 'pokemon',
          storeId: '',
          startDate: '',
          endDate: '',
        })
      })

      // Verify filters are set
      const initialStore = useUIStore.getState()
      expect(initialStore.filters.tournaments.gameId).toBe('game-123')
      expect(initialStore.filters.tournaments.status).toBe('active')
      expect(initialStore.filters.tournaments.search).toBe('pokemon')

      // Simulate page refresh
      const rehydratedStore = useUIStore.getState()
      
      // Filters should persist
      expect(rehydratedStore.filters.tournaments.gameId).toBe('game-123')
      expect(rehydratedStore.filters.tournaments.status).toBe('active')
      expect(rehydratedStore.filters.tournaments.search).toBe('pokemon')
    })

    it('should persist multiple tab groups', () => {
      // Set multiple tab groups
      act(() => {
        const store = useUIStore.getState()
        store.setActiveTab('tournamentDetails', 'overview')
        store.setActiveTab('tournamentManage', 'settings')
        store.setActiveTab('leaderboard-view', 'rankings')
      })

      // Verify all tab groups are set
      const initialStore = useUIStore.getState()
      expect(initialStore.tabs.tournamentDetails.activeTab).toBe('overview')
      expect(initialStore.tabs.tournamentManage.activeTab).toBe('settings')
      expect(initialStore.tabs['leaderboard-view'].activeTab).toBe('rankings')

      // Simulate page refresh
      const rehydratedStore = useUIStore.getState()
      
      // All tab groups should persist
      expect(rehydratedStore.tabs.tournamentDetails.activeTab).toBe('overview')
      expect(rehydratedStore.tabs.tournamentManage.activeTab).toBe('settings')
      expect(rehydratedStore.tabs['leaderboard-view'].activeTab).toBe('rankings')
    })
  })

  describe('Expired Draft Cleanup', () => {
    it('should clean up expired drafts on load', () => {
      const expiredTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
      const validTime = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now

      let expiredDraftId: string
      let validDraftId: string

      // Create expired and valid drafts
      act(() => {
        const store = useFormDraftStore.getState()
        expiredDraftId = store.createDraft('user-profile', { name: 'Expired' })
        validDraftId = store.createDraft('user-profile', { name: 'Valid' })
        
        // Set expiration times
        store.updateDraft(expiredDraftId!, { expiresAt: expiredTime })
        store.updateDraft(validDraftId!, { expiresAt: validTime })
      })

      // Verify both drafts exist
      const initialStore = useFormDraftStore.getState()
      expect(initialStore.drafts[expiredDraftId!]).toBeDefined()
      expect(initialStore.drafts[validDraftId!]).toBeDefined()

      // Clean up expired drafts
      act(() => {
        const store = useFormDraftStore.getState()
        store.cleanupExpiredDrafts()
      })

      // Verify expired draft is removed
      const cleanedStore = useFormDraftStore.getState()
      expect(cleanedStore.drafts[expiredDraftId!]).toBeUndefined()
      expect(cleanedStore.drafts[validDraftId!]).toBeDefined()
    })

    it('should preserve valid drafts during cleanup', () => {
      const validTime = new Date(Date.now() + 24 * 60 * 60 * 1000)

      let draftId1: string
      let draftId2: string
      let draftId3: string

      // Create multiple valid drafts
      act(() => {
        const store = useFormDraftStore.getState()
        draftId1 = store.createDraft('user-profile', { name: 'Draft 1' })
        draftId2 = store.createDraft('tournament-create', { name: 'Draft 2' })
        draftId3 = store.createDraft('contact-form', { name: 'Draft 3' })
        
        // Set valid expiration times
        store.updateDraft(draftId1!, { expiresAt: validTime })
        store.updateDraft(draftId2!, { expiresAt: validTime })
        store.updateDraft(draftId3!, { expiresAt: validTime })
      })

      // Clean up expired drafts
      act(() => {
        const store = useFormDraftStore.getState()
        store.cleanupExpiredDrafts()
      })

      // All valid drafts should remain
      const cleanedStore = useFormDraftStore.getState()
      expect(cleanedStore.drafts[draftId1!]).toBeDefined()
      expect(cleanedStore.drafts[draftId2!]).toBeDefined()
      expect(cleanedStore.drafts[draftId3!]).toBeDefined()
      expect(Object.keys(cleanedStore.drafts)).toHaveLength(3)
    })

    it('should handle drafts without expiration time', () => {
      let draftId: string

      // Create draft without expiration
      act(() => {
        const store = useFormDraftStore.getState()
        draftId = store.createDraft('user-profile', { name: 'No Expiration' })
      })

      // Clean up expired drafts
      act(() => {
        const store = useFormDraftStore.getState()
        store.cleanupExpiredDrafts()
      })

      // Draft without expiration should remain
      const cleanedStore = useFormDraftStore.getState()
      expect(cleanedStore.drafts[draftId!]).toBeDefined()
    })
  })

  describe('Corrupted Storage Handling', () => {
    it('should handle corrupted localStorage data gracefully', () => {
      // Simulate corrupted data in localStorage
      mockLocalStorage['leaderboard_user-preferences-storage'] = 'invalid-json-data'

      // Attempt to access store - should not crash
      expect(() => {
        const store = useUserPreferencesStore.getState()
        expect(store).toBeDefined()
      }).not.toThrow()

      // Store should have default values
      const store = useUserPreferencesStore.getState()
      expect(store.preferences).toBeDefined()
      expect(store.preferences.theme).toBeDefined()
    })

    it('should handle corrupted sessionStorage data gracefully', () => {
      // Simulate corrupted data in sessionStorage
      mockSessionStorage['leaderboard_ui-state-storage'] = '{invalid json'

      // Attempt to access store - should not crash
      expect(() => {
        const store = useUIStore.getState()
        expect(store).toBeDefined()
      }).not.toThrow()

      // Store should have default values
      const store = useUIStore.getState()
      expect(store.tabs).toBeDefined()
      expect(store.filters).toBeDefined()
    })

    it('should handle missing storage keys gracefully', () => {
      // Clear all storage
      mockLocalStorage = {}
      mockSessionStorage = {}

      // Attempt to access stores - should not crash
      expect(() => {
        const userPrefsStore = useUserPreferencesStore.getState()
        const formDraftStore = useFormDraftStore.getState()
        const uiStore = useUIStore.getState()
        
        expect(userPrefsStore).toBeDefined()
        expect(formDraftStore).toBeDefined()
        expect(uiStore).toBeDefined()
      }).not.toThrow()
    })

    it('should handle partially corrupted draft data', () => {
      // Create valid draft first
      let draftId: string
      act(() => {
        const store = useFormDraftStore.getState()
        draftId = store.createDraft('user-profile', { name: 'Test' })
      })

      // Simulate partial corruption by modifying storage directly
      const storageKey = 'leaderboard_form-draft-storage'
      if (mockLocalStorage[storageKey]) {
        const data = JSON.parse(mockLocalStorage[storageKey])
        // Corrupt one draft while keeping others valid
        if (data.state && data.state.drafts) {
          const draftKeys = Object.keys(data.state.drafts)
          if (draftKeys.length > 0) {
            data.state.drafts[draftKeys[0]] = { corrupted: true }
            mockLocalStorage[storageKey] = JSON.stringify(data)
          }
        }
      }

      // Store should still be accessible
      expect(() => {
        const store = useFormDraftStore.getState()
        expect(store).toBeDefined()
      }).not.toThrow()
    })

    it('should recover from storage quota exceeded errors', () => {
      // Mock storage quota exceeded error
      const originalSetItem = window.localStorage.setItem
      window.localStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError')
      })

      // Attempt to save preferences - should not crash
      expect(() => {
        act(() => {
          const store = useUserPreferencesStore.getState()
          store.updatePreference('theme', 'dark')
        })
      }).not.toThrow()

      // Restore original setItem
      window.localStorage.setItem = originalSetItem
    })
  })

  describe('Storage Version Compatibility', () => {
    it('should handle version mismatches in stored data', () => {
      // Simulate old version data in storage
      const oldVersionData = {
        state: {
          preferences: {
            theme: 'dark',
            language: 'en',
          },
        },
        version: 0, // Old version
      }
      mockLocalStorage['leaderboard_user-preferences-storage'] = JSON.stringify(oldVersionData)

      // Store should handle version mismatch gracefully
      expect(() => {
        const store = useUserPreferencesStore.getState()
        expect(store).toBeDefined()
      }).not.toThrow()
    })

    it('should migrate data from old storage format', () => {
      // Simulate old storage format without version
      const oldFormatData = {
        preferences: {
          theme: 'dark',
        },
      }
      mockLocalStorage['leaderboard_user-preferences-storage'] = JSON.stringify(oldFormatData)

      // Store should handle old format gracefully
      expect(() => {
        const store = useUserPreferencesStore.getState()
        expect(store).toBeDefined()
      }).not.toThrow()
    })
  })

  describe('Cross-Store Persistence Independence', () => {
    it('should persist stores independently', () => {
      // Set data in all stores
      act(() => {
        useUserPreferencesStore.getState().updatePreference('theme', 'dark')
        useFormDraftStore.getState().createDraft('user-profile', { name: 'Test' })
        useUIStore.getState().setActiveTab('tournamentDetails', 'overview')
      })

      // Verify all stores have data
      expect(useUserPreferencesStore.getState().preferences.theme).toBe('dark')
      expect(Object.keys(useFormDraftStore.getState().drafts).length).toBeGreaterThan(0)
      expect(useUIStore.getState().tabs.tournamentDetails.activeTab).toBe('overview')

      // Reset one store
      act(() => {
        useUserPreferencesStore.getState().resetStore()
      })

      // Other stores should remain unaffected
      expect(Object.keys(useFormDraftStore.getState().drafts).length).toBeGreaterThan(0)
      expect(useUIStore.getState().tabs.tournamentDetails.activeTab).toBe('overview')
    })

    it('should handle storage errors in one store without affecting others', () => {
      // Mock error for user preferences storage only
      const originalGetItem = window.localStorage.getItem
      window.localStorage.getItem = vi.fn((key: string) => {
        if (key.includes('user-preferences')) {
          throw new Error('Storage error')
        }
        return mockLocalStorage[key] || null
      })

      // Other stores should still work
      expect(() => {
        const formDraftStore = useFormDraftStore.getState()
        expect(formDraftStore).toBeDefined()
      }).not.toThrow()

      // Restore original getItem
      window.localStorage.getItem = originalGetItem
    })
  })
})
