import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { act } from '@testing-library/react'
import { useUserPreferencesStore } from '@/stores/user-preferences-store'
import { useFormDraftStore } from '@/stores/form-draft-store'
import { useUIStore } from '@/stores/ui-store'
import { persistenceManager } from '@/stores/persistence-manager'

// Mock localStorage and sessionStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
}

const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
}

// Mock window object
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
})

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true
})

describe('Persistence Middleware', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()
    
    // Reset store states
    useUserPreferencesStore.getState().resetStore()
    useFormDraftStore.getState().resetStore()
    useUIStore.getState().resetUI()
    
    // Clear storage
    mockLocalStorage.clear()
    mockSessionStorage.clear()
  })

  describe('User Preferences Store Persistence', () => {
    it('should persist user preferences to localStorage', () => {
      const store = useUserPreferencesStore.getState()

      act(() => {
        store.updatePreference('theme', 'dark')
      })

      // Should call setItem on localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'user-preferences-storage',
        expect.stringContaining('"theme":"dark"')
      )
    })

    it('should rehydrate user preferences from localStorage', () => {
      const mockStoredData = JSON.stringify({
        state: {
          preferences: {
            display: { theme: 'dark' },
            communication: { emailNotifications: false },
            formBehavior: { autoSave: true }
          },
          lastUpdated: new Date().toISOString(),
          version: 1
        },
        version: 1
      })

      mockLocalStorage.getItem.mockReturnValue(mockStoredData)

      // Rehydrate the store
      useUserPreferencesStore.persist.rehydrate()

      const store = useUserPreferencesStore.getState()
      expect(store.preferences.theme).toBe('dark')
      expect(store.preferences.emailNotifications).toBe(false)
      expect(store.preferences.autoSave).toBe(true)
    })

    it('should handle corrupted localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json')

      // Should not throw error when rehydrating corrupted data
      expect(() => {
        useUserPreferencesStore.persist.rehydrate()
      }).not.toThrow()

      // Store should maintain default values
      const store = useUserPreferencesStore.getState()
      expect(store.preferences.theme).toBe('system')
    })

    it('should handle missing localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      // Should not throw error when no data exists
      expect(() => {
        useUserPreferencesStore.persist.rehydrate()
      }).not.toThrow()

      // Store should maintain default values
      const store = useUserPreferencesStore.getState()
      expect(store.preferences.theme).toBe('system')
    })
  })

  describe('Form Draft Store Persistence', () => {
    it('should persist form drafts to localStorage', () => {
      const store = useFormDraftStore.getState()
      const formData = { name: 'John Doe', email: 'john@example.com' }

      act(() => {
        store.createDraft('test-draft', formData, 'user-profile')
      })

      // Should call setItem on localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'form-draft-storage',
        expect.stringContaining('test-draft')
      )
    })

    it('should rehydrate form drafts from localStorage', () => {
      const mockStoredData = JSON.stringify({
        state: {
          drafts: {
            'test-draft': {
              id: 'test-draft',
              formType: 'user-profile',
              formData: { name: 'John Doe', email: 'john@example.com' },
              lastUpdated: new Date().toISOString(),
              isSubmitted: false,
              metadata: { version: 1 },
              validation: { isValid: true, errors: {}, warnings: {} },
              history: { versions: [], maxVersions: 5 }
            }
          },
          metadata: {},
          autoSaveSettings: { enabled: true, interval: 3000, debounce: 500, maxRetries: 3, retryDelay: 1000 },
          lastUpdated: new Date().toISOString(),
          version: 1
        },
        version: 1
      })

      mockLocalStorage.getItem.mockReturnValue(mockStoredData)

      // Rehydrate the store
      useFormDraftStore.persist.rehydrate()

      const store = useFormDraftStore.getState()
      expect(store.drafts['test-draft']).toBeDefined()
      expect(store.drafts['test-draft'].data.name).toBe('John Doe')
    })

    it('should clean up expired drafts on rehydration', () => {
      const expiredTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
      const mockStoredData = JSON.stringify({
        state: {
          drafts: {
            'expired-draft': {
              id: 'expired-draft',
              formType: 'user-profile',
              formData: { name: 'John Doe' },
              lastUpdated: expiredTime,
              expiresAt: expiredTime,
              isSubmitted: false,
              metadata: { version: 1 },
              validation: { isValid: true, errors: {}, warnings: {} },
              history: { versions: [], maxVersions: 5 }
            },
            'valid-draft': {
              id: 'valid-draft',
              formType: 'user-profile',
              formData: { name: 'Jane Doe' },
              lastUpdated: new Date().toISOString(),
              isSubmitted: false,
              metadata: { version: 1 },
              validation: { isValid: true, errors: {}, warnings: {} },
              history: { versions: [], maxVersions: 5 }
            }
          },
          metadata: {},
          autoSaveSettings: { enabled: true, interval: 3000, debounce: 500, maxRetries: 3, retryDelay: 1000 },
          lastUpdated: new Date().toISOString(),
          version: 1
        },
        version: 1
      })

      mockLocalStorage.getItem.mockReturnValue(mockStoredData)

      // Rehydrate the store
      useFormDraftStore.persist.rehydrate()

      const store = useFormDraftStore.getState()
      expect(store.drafts['expired-draft']).toBeUndefined()
      expect(store.drafts['valid-draft']).toBeDefined()
    })
  })

  describe('UI Store Persistence', () => {
    it('should persist tabs and filters to sessionStorage', () => {
      const store = useUIStore.getState()

      act(() => {
        store.setActiveTab('tournament-tabs', 'details')
        store.setFilters('tournament-list', { status: ['active'], game: ['pokemon-tcg'] })
      })

      // Should call setItem on sessionStorage
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'ui-state-storage',
        expect.stringContaining('tournament-tabs')
      )
    })

    it('should rehydrate tabs and filters from sessionStorage', () => {
      const mockStoredData = JSON.stringify({
        state: {
          tabs: { 'tournament-tabs': 'details' },
          filters: { 'tournament-list': { status: ['active'], game: ['pokemon-tcg'] } }
        },
        version: 1
      })

      mockSessionStorage.getItem.mockReturnValue(mockStoredData)

      // Rehydrate the store
      useUIStore.persist.rehydrate()

      const store = useUIStore.getState()
      expect(store.tabs['tournament-tabs']).toBe('details')
      expect(store.filters['tournament-list']).toEqual({ status: ['active'], game: ['pokemon-tcg'] })
    })

    it('should not persist modals and interactions', () => {
      const store = useUIStore.getState()

      act(() => {
        store.openModal('test-modal', { title: 'Test' })
        store.setInteraction('sidebar', true)
      })

      // Should not call setItem for modals and interactions
      expect(mockSessionStorage.setItem).not.toHaveBeenCalledWith(
        'ui-state-storage',
        expect.stringContaining('test-modal')
      )
    })
  })

  describe('Persistence Manager', () => {
    it('should initialize correctly', () => {
      expect(() => {
        persistenceManager.initialize()
      }).not.toThrow()
    })

    it('should get storage usage', async () => {
      mockLocalStorage.getItem.mockReturnValue('{"test": "data"}')
      mockSessionStorage.getItem.mockReturnValue('{"test": "data"}')

      const usage = persistenceManager.getStorageStats()
      
      expect(usage).toBeDefined()
      expect(usage.totalSize).toBeDefined()
    })

    it('should export all data', () => {
      const mockData = { test: 'data' }
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockData))
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(mockData))

      const exportedData = persistenceManager.exportStoreData()
      expect(exportedData.timestamp).toBeDefined()
      expect(exportedData.userPreferences).toBeDefined()
      expect(exportedData.formDrafts).toBeDefined()
      expect(exportedData.uiState).toBeDefined()
    })

    it('should import data successfully', () => {
      const importData = {
        version: 1,
        timestamp: new Date().toISOString(),
        data: {
          'user-preferences-storage': {
            state: {
              preferences: { display: { theme: 'dark' } },
              lastUpdated: new Date().toISOString(),
              version: 1
            },
            version: 1
          }
        }
      }

      expect(() => {
        persistenceManager.importStoreData(importData)
      }).not.toThrow()
    })

    it('should handle invalid import data', () => {
      expect(() => {
        persistenceManager.importStoreData('invalid-json' as any)
      }).not.toThrow() // The method handles invalid data gracefully
    })

    it('should get store status', () => {
      const stats = persistenceManager.getStorageStats()
      
      expect(stats).toBeDefined()
      expect(stats.userPreferences).toBeDefined()
      expect(stats.formDrafts).toBeDefined()
      expect(stats.uiState).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const store = useUserPreferencesStore.getState()

      // Should not throw error when localStorage fails
      expect(() => {
        act(() => {
          store.updatePreference('theme', 'dark')
        })
      }).not.toThrow()
    })

    it('should handle sessionStorage errors gracefully', () => {
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const store = useUIStore.getState()

      // Should not throw error when sessionStorage fails
      expect(() => {
        act(() => {
          store.setActiveTab('test-tabs', 'active')
        })
      }).not.toThrow()
    })

    it('should handle storage unavailability', () => {
      // Mock storage as unavailable
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true
      })

      const store = useUserPreferencesStore.getState()

      // Should not throw error when storage is unavailable
      expect(() => {
        act(() => {
          store.updatePreference('theme', 'dark')
        })
      }).not.toThrow()
    })
  })

  describe('Storage Cleanup', () => {
    it('should clean up expired data', () => {
      const store = useFormDraftStore.getState()

      // Save a draft
      act(() => {
        store.createDraft('test-draft', { name: 'John' }, 'user-profile')
      })

      // Manually expire it
      act(() => {
        store.updateDraft('test-draft', { 
          expiresAt: new Date(Date.now() - 25 * 60 * 60 * 1000) 
        })
      })

      // Cleanup should remove expired drafts
      act(() => {
        store.cleanupExpiredDrafts()
      })

      expect(store.drafts['test-draft']).toBeUndefined()
    })
  })
})
