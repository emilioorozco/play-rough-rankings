import { useUserPreferencesStore } from './user-preferences-store'
import { useFormDraftStore } from './form-draft-store'
import { useUIStore } from './ui-store'
import { storageHealth, migrationUtils } from './persistence-config'

// Persistence manager for centralized control over store persistence
export class PersistenceManager {
  private static instance: PersistenceManager
  private isInitialized = false

  private constructor() {}

  static getInstance(): PersistenceManager {
    if (!PersistenceManager.instance) {
      PersistenceManager.instance = new PersistenceManager()
    }
    return PersistenceManager.instance
  }

  // Initialize persistence manager
  initialize(): void {
    if (this.isInitialized) return

    // Clean up old storage
    migrationUtils.cleanupOldStorage()

    // Check storage health
    this.checkStorageHealth()

    // Set up periodic cleanup
    this.setupPeriodicCleanup()

    this.isInitialized = true
    console.log('Persistence manager initialized')
  }

  // Check storage health and log warnings
  private checkStorageHealth(): void {
    if (typeof window === 'undefined') return

    const localStorageUsage = storageHealth.getStorageUsage(localStorage)
    const sessionStorageUsage = storageHealth.getStorageUsage(sessionStorage)

    if (localStorageUsage.percentage > 80) {
      console.warn(`LocalStorage usage is high: ${localStorageUsage.percentage.toFixed(2)}%`)
    }

    if (sessionStorageUsage.percentage > 80) {
      console.warn(`SessionStorage usage is high: ${sessionStorageUsage.percentage.toFixed(2)}%`)
    }

    // Clean up if needed
    if (localStorageUsage.percentage > 90) {
      this.cleanupStorage()
    }
  }

  // Set up periodic cleanup
  private setupPeriodicCleanup(): void {
    if (typeof window === 'undefined') return

    // Clean up every hour
    setInterval(() => {
      this.cleanupExpiredDrafts()
      this.checkStorageHealth()
    }, 60 * 60 * 1000) // 1 hour

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanupExpiredDrafts()
    })
  }

  // Clean up expired form drafts
  cleanupExpiredDrafts(): void {
    try {
      const formDraftStore = useFormDraftStore.getState()
      const now = Date.now()
      let cleanedCount = 0

      Object.keys(formDraftStore.drafts).forEach(draftId => {
        const draft = formDraftStore.drafts[draftId]
        if (draft.expiresAt && new Date(draft.expiresAt).getTime() < now) {
          formDraftStore.deleteDraft(draftId)
          cleanedCount++
        }
      })

      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired form drafts`)
      }
    } catch (error) {
      console.error('Error cleaning up expired drafts:', error)
    }
  }

  // Clean up storage when it's getting full
  cleanupStorage(): void {
    try {
      // Clean up expired drafts first
      this.cleanupExpiredDrafts()

      // Clean up old user preferences (keep only recent ones)
      const userPreferencesStore = useUserPreferencesStore.getState()
      const now = Date.now()
      const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days

      if (userPreferencesStore.lastUpdated && 
          now - new Date(userPreferencesStore.lastUpdated).getTime() > maxAge) {
        // Reset to defaults if preferences are too old
        userPreferencesStore.resetPreferences()
        console.log('Reset old user preferences to defaults')
      }

      // Clean up UI state (reset to defaults)
      const uiStore = useUIStore.getState()
      uiStore.resetUI()
      console.log('Reset UI state to defaults')

      console.log('Storage cleanup completed')
    } catch (error) {
      console.error('Error during storage cleanup:', error)
    }
  }

  // Export all store data for backup
  exportStoreData(): {
    userPreferences: any
    formDrafts: any
    uiState: any
    timestamp: number
  } {
    try {
      const userPreferencesStore = useUserPreferencesStore.getState()
      const formDraftStore = useFormDraftStore.getState()
      const uiStore = useUIStore.getState()

      return {
        userPreferences: {
          preferences: userPreferencesStore.preferences,
          lastUpdated: userPreferencesStore.lastUpdated,
        },
        formDrafts: {
          drafts: formDraftStore.drafts,
          metadata: formDraftStore.metadata,
          autoSaveSettings: formDraftStore.autoSaveSettings,
        },
        uiState: {
          tabs: uiStore.tabs,
          filters: uiStore.filters,
        },
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error('Error exporting store data:', error)
      throw error
    }
  }

  // Import store data from backup
  importStoreData(data: {
    userPreferences?: any
    formDrafts?: any
    uiState?: any
  }): void {
    try {
      if (data.userPreferences) {
        const userPreferencesStore = useUserPreferencesStore.getState()
        userPreferencesStore.setPreferences(data.userPreferences.preferences)
        console.log('Imported user preferences')
      }

      if (data.formDrafts) {
        const formDraftStore = useFormDraftStore.getState()
        // Import drafts one by one to maintain integrity
        Object.entries(data.formDrafts.drafts || {}).forEach(([draftId, draft]: [string, any]) => {
          formDraftStore.createDraft(
            draft.formType,
            draft.data,
            draft.metadata
          )
        })
        console.log('Imported form drafts')
      }

      if (data.uiState) {
        const uiStore = useUIStore.getState()
        if (data.uiState.tabs) {
          Object.entries(data.uiState.tabs).forEach(([tabGroup, tabState]: [string, any]) => {
            uiStore.setActiveTab(tabGroup as any, tabState.activeTab)
            uiStore.setAvailableTabs(tabGroup as any, tabState.availableTabs)
          })
        }
        if (data.uiState.filters) {
          Object.entries(data.uiState.filters).forEach(([filterGroup, filters]: [string, any]) => {
            uiStore.setFilters(filterGroup as any, filters)
          })
        }
        console.log('Imported UI state')
      }

      console.log('Store data import completed')
    } catch (error) {
      console.error('Error importing store data:', error)
      throw error
    }
  }

  // Clear all store data
  clearAllStoreData(): void {
    try {
      const userPreferencesStore = useUserPreferencesStore.getState()
      const formDraftStore = useFormDraftStore.getState()
      const uiStore = useUIStore.getState()

      userPreferencesStore.resetPreferences()
      formDraftStore.clearDrafts()
      uiStore.resetUI()

      console.log('All store data cleared')
    } catch (error) {
      console.error('Error clearing store data:', error)
    }
  }

  // Get storage statistics
  getStorageStats(): {
    userPreferences: { size: number; lastUpdated: Date | null }
    formDrafts: { count: number; size: number }
    uiState: { size: number }
    totalSize: number
  } {
    try {
      const userPreferencesStore = useUserPreferencesStore.getState()
      const formDraftStore = useFormDraftStore.getState()
      const uiStore = useUIStore.getState()

      const userPreferencesSize = JSON.stringify(userPreferencesStore.preferences).length
      const formDraftsCount = Object.keys(formDraftStore.drafts).length
      const formDraftsSize = JSON.stringify(formDraftStore.drafts).length
      const uiStateSize = JSON.stringify({ tabs: uiStore.tabs, filters: uiStore.filters }).length

      return {
        userPreferences: {
          size: userPreferencesSize,
          lastUpdated: userPreferencesStore.lastUpdated,
        },
        formDrafts: {
          count: formDraftsCount,
          size: formDraftsSize,
        },
        uiState: {
          size: uiStateSize,
        },
        totalSize: userPreferencesSize + formDraftsSize + uiStateSize,
      }
    } catch (error) {
      console.error('Error getting storage stats:', error)
      return {
        userPreferences: { size: 0, lastUpdated: null },
        formDrafts: { count: 0, size: 0 },
        uiState: { size: 0 },
        totalSize: 0,
      }
    }
  }
}

// React hook for using the persistence manager
export const usePersistenceManager = () => {
  const manager = PersistenceManager.getInstance()

  return {
    initialize: () => manager.initialize(),
    cleanupExpiredDrafts: () => manager.cleanupExpiredDrafts(),
    cleanupStorage: () => manager.cleanupStorage(),
    exportStoreData: () => manager.exportStoreData(),
    importStoreData: (data: any) => manager.importStoreData(data),
    clearAllStoreData: () => manager.clearAllStoreData(),
    getStorageStats: () => manager.getStorageStats(),
  }
}

// Export singleton instance
export const persistenceManager = PersistenceManager.getInstance()

// Initialize persistence manager on module load
if (typeof window !== 'undefined') {
  persistenceManager.initialize()
}
