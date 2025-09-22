import { StateStorage } from 'zustand/middleware'

// Enhanced storage with error handling and versioning
export class EnhancedStorage implements StateStorage {
  private storage: Storage
  private version: number
  private keyPrefix: string

  constructor(storage: Storage, version: number = 1, keyPrefix: string = '') {
    this.storage = storage
    this.version = version
    this.keyPrefix = keyPrefix
  }

  getItem(name: string): string | null {
    try {
      const item = this.storage.getItem(`${this.keyPrefix}${name}`)
      if (!item) return null

      const parsed = JSON.parse(item)
      
      // Check version compatibility
      if (parsed.version && parsed.version !== this.version) {
        console.warn(`Storage version mismatch for ${name}. Expected ${this.version}, got ${parsed.version}`)
        // Could implement migration logic here
        return null
      }

      return item
    } catch (error) {
      console.error(`Error reading from storage for ${name}:`, error)
      return null
    }
  }

  setItem(name: string, value: string): void {
    try {
      // Value is already a JSON string from Zustand
      let parsedValue
      try {
        parsedValue = JSON.parse(value)
      } catch (parseError) {
        // If parsing fails, treat as a plain string
        parsedValue = { data: value }
      }
      
      const versionedValue = {
        ...parsedValue,
        version: this.version,
        timestamp: Date.now(),
      }

      this.storage.setItem(`${this.keyPrefix}${name}`, JSON.stringify(versionedValue))
    } catch (error) {
      console.error(`Error writing to storage for ${name}:`, error)
    }
  }

  removeItem(name: string): void {
    try {
      this.storage.removeItem(`${this.keyPrefix}${name}`)
    } catch (error) {
      console.error(`Error removing from storage for ${name}:`, error)
    }
  }
}

// Storage configurations for different stores
export const storageConfigs = {
  userPreferences: {
    name: 'user-preferences-storage',
    version: 1,
    keyPrefix: 'leaderboard_',
    storage: new EnhancedStorage(
      typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      } as Storage,
      1,
      'leaderboard_'
    ),
    partialize: (state: any) => ({
      preferences: state.preferences,
      lastUpdated: state.lastUpdated,
      version: 1,
    }),
    onRehydrateStorage: () => (state, error) => {
      if (error) {
        console.error('Error rehydrating user preferences:', error)
      } else {
        console.log('User preferences rehydrated successfully')
      }
    },
  },

  formDrafts: {
    name: 'form-draft-storage',
    version: 1,
    keyPrefix: 'leaderboard_',
    storage: new EnhancedStorage(
      typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      } as Storage,
      1,
      'leaderboard_'
    ),
    partialize: (state: any) => ({
      drafts: state.drafts,
      metadata: state.metadata,
      autoSaveSettings: state.autoSaveSettings,
      version: 1,
    }),
    onRehydrateStorage: () => (state, error) => {
      if (error) {
        console.error('Error rehydrating form drafts:', error)
      } else {
        console.log('Form drafts rehydrated successfully')
        // Clean up expired drafts on rehydration
        if (state) {
          const now = Date.now()
          const expiredDraftIds = Object.keys(state.drafts).filter(draftId => {
            const draft = state.drafts[draftId]
            return draft.expiresAt && new Date(draft.expiresAt).getTime() < now
          })
          
          if (expiredDraftIds.length > 0) {
            console.log(`Cleaning up ${expiredDraftIds.length} expired drafts`)
            expiredDraftIds.forEach(draftId => {
              delete state.drafts[draftId]
            })
          }
        }
      }
    },
  },

  uiState: {
    name: 'ui-state-storage',
    version: 1,
    keyPrefix: 'leaderboard_',
    storage: new EnhancedStorage(
      typeof window !== 'undefined' ? sessionStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      } as Storage,
      1,
      'leaderboard_'
    ),
    partialize: (state: any) => ({
      // Only persist certain UI states that should survive page refreshes
      tabs: state.tabs,
      filters: state.filters,
      version: 1,
    }),
    onRehydrateStorage: () => (state, error) => {
      if (error) {
        console.error('Error rehydrating UI state:', error)
      } else {
        console.log('UI state rehydrated successfully')
      }
    },
  },
}

// Migration utilities
export const migrationUtils = {
  // Migrate user preferences from old format to new format
  migrateUserPreferences: (oldData: any, version: number): any => {
    if (version === 1) {
      // Add any migration logic here for future versions
      return oldData
    }
    return oldData
  },

  // Migrate form drafts from old format to new format
  migrateFormDrafts: (oldData: any, version: number): any => {
    if (version === 1) {
      // Add any migration logic here for future versions
      return oldData
    }
    return oldData
  },

  // Clean up old storage keys
  cleanupOldStorage: () => {
    if (typeof window === 'undefined') return

    const oldKeys = [
      'user-preferences-storage',
      'form-draft-storage',
      'ui-state-storage',
    ]

    oldKeys.forEach(key => {
      try {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      } catch (error) {
        console.error(`Error cleaning up old storage key ${key}:`, error)
      }
    })
  },
}

// Storage health check utilities
export const storageHealth = {
  // Check if storage is available and working
  isStorageAvailable: (storage: Storage): boolean => {
    try {
      const testKey = '__storage_test__'
      storage.setItem(testKey, 'test')
      storage.removeItem(testKey)
      return true
    } catch (error) {
      console.error('Storage not available:', error)
      return false
    }
  },

  // Get storage usage information
  getStorageUsage: (storage: Storage): { used: number; available: number; percentage: number } => {
    if (typeof window === 'undefined') {
      return { used: 0, available: 0, percentage: 0 }
    }

    try {
      let used = 0
      for (const key in storage) {
        if (storage.hasOwnProperty(key)) {
          used += storage[key].length + key.length
        }
      }

      // Estimate available space (this is approximate)
      const available = 5 * 1024 * 1024 - used // 5MB estimate
      const percentage = (used / (5 * 1024 * 1024)) * 100

      return { used, available, percentage }
    } catch (error) {
      console.error('Error calculating storage usage:', error)
      return { used: 0, available: 0, percentage: 0 }
    }
  },

  // Clean up storage if it's getting full
  cleanupStorage: (storage: Storage, targetPercentage: number = 80): void => {
    const usage = storageHealth.getStorageUsage(storage)
    
    if (usage.percentage > targetPercentage) {
      console.log(`Storage usage at ${usage.percentage.toFixed(2)}%, cleaning up...`)
      
      // Remove old form drafts first (they're less critical)
      const formDraftKey = 'leaderboard_form-draft-storage'
      try {
        const formDraftData = storage.getItem(formDraftKey)
        if (formDraftData) {
          const parsed = JSON.parse(formDraftData)
          if (parsed.drafts) {
            const now = Date.now()
            const expiredDraftIds = Object.keys(parsed.drafts).filter(draftId => {
              const draft = parsed.drafts[draftId]
              return draft.expiresAt && new Date(draft.expiresAt).getTime() < now
            })
            
            expiredDraftIds.forEach(draftId => {
              delete parsed.drafts[draftId]
            })
            
            storage.setItem(formDraftKey, JSON.stringify(parsed))
            console.log(`Cleaned up ${expiredDraftIds.length} expired form drafts`)
          }
        }
      } catch (error) {
        console.error('Error cleaning up form drafts:', error)
      }
    }
  },
}

// Initialize storage cleanup on app start
if (typeof window !== 'undefined') {
  // Clean up old storage keys
  migrationUtils.cleanupOldStorage()
  
  // Check storage health
  const localStorageHealth = storageHealth.isStorageAvailable(localStorage)
  const sessionStorageHealth = storageHealth.isStorageAvailable(sessionStorage)
  
  if (!localStorageHealth) {
    console.warn('LocalStorage is not available. Persistence features will be disabled.')
  }
  
  if (!sessionStorageHealth) {
    console.warn('SessionStorage is not available. Some UI state persistence will be disabled.')
  }
  
  // Clean up storage if needed
  storageHealth.cleanupStorage(localStorage)
}
