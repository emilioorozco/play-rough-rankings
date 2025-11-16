import { act } from '@testing-library/react'
import { vi } from 'vitest'
import { useUIStore } from '@/stores/ui-store'
import { useTournamentStore } from '@/stores/tournament-store'
import { useUserPreferencesStore } from '@/stores/user-preferences-store'
import { useFormDraftStore } from '@/stores/form-draft-store'
import { useLoadingStore } from '@/stores/loading-store'
import { createMockTournament } from './test-utils'

// Store test utilities for Zustand stores

export const resetAllStores = () => {
  act(() => {
    useUIStore.getState().resetUI()
    useTournamentStore.getState().clearTournamentCache()
    useUserPreferencesStore.getState().resetStore()
    useFormDraftStore.getState().resetStore()
    useLoadingStore.getState().clearAll()
  })
}

export const setupMockStores = () => {
  // Setup mock data for all stores
  const mockTournament = createMockTournament()
  
  act(() => {
    // Setup UI store
    useUIStore.getState().setActiveTab('test-tabs', 'active')
    useUIStore.getState().setFilters('test-filters', { status: ['active'] })
    
    // Setup tournament store
    useTournamentStore.getState().setCurrentTournament(mockTournament)
    useTournamentStore.getState().setTournaments([mockTournament])
    
    // Setup user preferences store
    useUserPreferencesStore.getState().setPreference('display.theme', 'dark')
    useUserPreferencesStore.getState().setPreference('communication.emailNotifications', false)
    
    // Setup form draft store
    useFormDraftStore.getState().saveDraft('test-draft', { name: 'John Doe' }, 'user-profile')
    
    // Setup loading store
    useLoadingStore.getState().setLoading('test-loading', true)
    useLoadingStore.getState().setError('test-error', 'Test error')
    useLoadingStore.getState().setProgress('test-progress', 50)
  })
}

export const verifyStoreState = (storeName: string, expectedState: any) => {
  let store: any
  
  switch (storeName) {
    case 'ui':
      store = useUIStore.getState()
      break
    case 'tournament':
      store = useTournamentStore.getState()
      break
    case 'userPreferences':
      store = useUserPreferencesStore.getState()
      break
    case 'formDraft':
      store = useFormDraftStore.getState()
      break
    case 'loading':
      store = useLoadingStore.getState()
      break
    default:
      throw new Error(`Unknown store: ${storeName}`)
  }
  
  // Verify the expected state
  Object.keys(expectedState).forEach(key => {
    expect(store[key]).toEqual(expectedState[key])
  })
}

export const waitForStoreUpdate = async (callback: () => void, timeout = 1000) => {
  return new Promise<void>((resolve, reject) => {
    const startTime = Date.now()
    
    const checkUpdate = () => {
      try {
        callback()
        resolve()
      } catch (error) {
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Store update timeout after ${timeout}ms`))
        } else {
          setTimeout(checkUpdate, 10)
        }
      }
    }
    
    checkUpdate()
  })
}

export const mockStoreActions = (storeName: string, actions: Record<string, ReturnType<typeof vi.fn>>) => {
  let store: any
  
  switch (storeName) {
    case 'ui':
      store = useUIStore.getState()
      break
    case 'tournament':
      store = useTournamentStore.getState()
      break
    case 'userPreferences':
      store = useUserPreferencesStore.getState()
      break
    case 'formDraft':
      store = useFormDraftStore.getState()
      break
    case 'loading':
      store = useLoadingStore.getState()
      break
    default:
      throw new Error(`Unknown store: ${storeName}`)
  }
  
  // Replace store actions with mocks
  Object.keys(actions).forEach(actionName => {
    if (store[actionName]) {
      store[actionName] = actions[actionName]
    }
  })
}

export const createMockStoreState = (storeName: string, overrides: any = {}) => {
  const baseStates = {
    ui: {
      modals: {},
      confirmationModal: { isOpen: false, config: undefined },
      tabs: {},
      filters: {},
      interactions: {}
    },
    tournament: {
      currentTournament: null,
      tournamentList: [],
      registrationStatuses: {},
      filters: {},
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      },
      loading: {
        currentTournament: false,
        tournamentList: false,
        registrationStatuses: {}
      },
      errors: {
        currentTournament: null,
        tournamentList: null,
        registrationStatuses: {}
      }
    },
    userPreferences: {
      preferences: {
        display: {
          theme: 'light',
          language: 'en',
          timezone: 'UTC',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          currency: 'USD',
          numberFormat: 'en-US',
          compactMode: false,
          animations: true,
          soundEffects: true
        },
        communication: {
          emailNotifications: true,
          pushNotifications: true,
          marketingEmails: false,
          tournamentUpdates: true,
          friendRequests: true,
          messages: true,
          weeklyDigest: false,
          notificationFrequency: 'immediate',
          quietHours: {
            enabled: false,
            start: '22:00',
            end: '08:00'
          }
        },
        formBehavior: {
          autoSave: true,
          autoSaveInterval: 3000,
          showDraftIndicators: true,
          confirmBeforeLeaving: true,
          rememberFormData: true,
          validateOnBlur: true,
          showValidationErrors: true,
          submitOnEnter: false
        }
      },
      metadata: {},
      lastUpdated: new Date(),
      version: 1
    },
    formDraft: {
      drafts: {},
      metadata: {},
      autoSaveSettings: {
        enabled: true,
        interval: 3000,
        debounce: 500,
        maxRetries: 3,
        retryDelay: 1000
      },
      lastUpdated: new Date(),
      version: 1
    },
    loading: {
      loading: {},
      errors: {},
      progress: {},
      isGlobalLoading: false,
      globalError: null,
      loadingBar: {
        isVisible: false,
        progress: 0,
        message: undefined
      }
    }
  }
  
  return { ...baseStates[storeName as keyof typeof baseStates], ...overrides }
}

export const simulateStoreAction = (storeName: string, actionName: string, ...args: any[]) => {
  let store: any
  
  switch (storeName) {
    case 'ui':
      store = useUIStore.getState()
      break
    case 'tournament':
      store = useTournamentStore.getState()
      break
    case 'userPreferences':
      store = useUserPreferencesStore.getState()
      break
    case 'formDraft':
      store = useFormDraftStore.getState()
      break
    case 'loading':
      store = useLoadingStore.getState()
      break
    default:
      throw new Error(`Unknown store: ${storeName}`)
  }
  
  if (store[actionName]) {
    act(() => {
      store[actionName](...args)
    })
  } else {
    throw new Error(`Action ${actionName} not found on ${storeName} store`)
  }
}

export const getStoreState = (storeName: string) => {
  let store: any
  
  switch (storeName) {
    case 'ui':
      store = useUIStore.getState()
      break
    case 'tournament':
      store = useTournamentStore.getState()
      break
    case 'userPreferences':
      store = useUserPreferencesStore.getState()
      break
    case 'formDraft':
      store = useFormDraftStore.getState()
      break
    case 'loading':
      store = useLoadingStore.getState()
      break
    default:
      throw new Error(`Unknown store: ${storeName}`)
  }
  
  return store
}

export const expectStoreState = (storeName: string, expectedState: any) => {
  const actualState = getStoreState(storeName)
  
  Object.keys(expectedState).forEach(key => {
    expect(actualState[key]).toEqual(expectedState[key])
  })
}

export const expectStoreAction = (storeName: string, actionName: string, ...args: any[]) => {
  const store = getStoreState(storeName)
  
  expect(store[actionName]).toBeDefined()
  expect(typeof store[actionName]).toBe('function')
  
  // Test that the action can be called without errors
  expect(() => {
    act(() => {
      store[actionName](...args)
    })
  }).not.toThrow()
}

export const createMockStoreSubscriber = (storeName: string) => {
  const store = getStoreState(storeName)
  const subscribers: Array<(state: any) => void> = []
  
  const subscribe = (callback: (state: any) => void) => {
    subscribers.push(callback)
    return () => {
      const index = subscribers.indexOf(callback)
      if (index > -1) {
        subscribers.splice(index, 1)
      }
    }
  }
  
  const notify = (state: any) => {
    subscribers.forEach(callback => callback(state))
  }
  
  return { subscribe, notify }
}

export const waitForStoreAction = async (storeName: string, actionName: string, ...args: any[]) => {
  return new Promise<void>((resolve, reject) => {
    const store = getStoreState(storeName)
    
    if (!store[actionName]) {
      reject(new Error(`Action ${actionName} not found on ${storeName} store`))
      return
    }
    
    try {
      act(() => {
        store[actionName](...args)
      })
      resolve()
    } catch (error) {
      reject(error)
    }
  })
}

export const createStoreTestSuite = (storeName: string) => {
  return {
    reset: () => resetAllStores(),
    setup: () => setupMockStores(),
    getState: () => getStoreState(storeName),
    expectState: (expectedState: any) => expectStoreState(storeName, expectedState),
    expectAction: (actionName: string, ...args: any[]) => expectStoreAction(storeName, actionName, ...args),
    simulateAction: (actionName: string, ...args: any[]) => simulateStoreAction(storeName, actionName, ...args),
    waitForAction: (actionName: string, ...args: any[]) => waitForStoreAction(storeName, actionName, ...args),
    mockActions: (actions: Record<string, ReturnType<typeof vi.fn>>) => mockStoreActions(storeName, actions),
    createSubscriber: () => createMockStoreSubscriber(storeName)
  }
}
