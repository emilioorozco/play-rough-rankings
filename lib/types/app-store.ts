// App Store specific types

export interface ActivityState {
  isActive: boolean
  lastActivity: Date
  sessionStart: Date
  pageViews: number
  interactions: number
}

export interface RealtimeState {
  isConnected: boolean
  lastPing: Date
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  retryCount: number
  maxRetries: number
}

export interface AppState {
  theme: 'light' | 'dark' | 'system'
  mounted: boolean
  activity: ActivityState
  realtime: RealtimeState
}

export interface AppActions {
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  toggleTheme: () => void
  setMounted: (mounted: boolean) => void
  updateActivity: (activity: Partial<ActivityState>) => void
  resetActivity: () => void
  updateRealtime: (realtime: Partial<RealtimeState>) => void
  connectRealtime: () => void
  disconnectRealtime: () => void
  retryRealtime: () => void
}

export type AppStore = AppState & AppActions

// Hook return types
export interface UseThemeReturn {
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  toggleTheme: () => void
}

export interface UseActivityReturn {
  activity: ActivityState
  updateActivity: (activity: Partial<ActivityState>) => void
  resetActivity: () => void
}

export interface UseRealtimeReturn {
  realtime: RealtimeState
  updateRealtime: (realtime: Partial<RealtimeState>) => void
  connectRealtime: () => void
  disconnectRealtime: () => void
  retryRealtime: () => void
}

export interface UseAppStoreActionsReturn {
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  toggleTheme: () => void
  setMounted: (mounted: boolean) => void
  updateActivity: (activity: Partial<ActivityState>) => void
  resetActivity: () => void
  updateRealtime: (realtime: Partial<RealtimeState>) => void
  connectRealtime: () => void
  disconnectRealtime: () => void
  retryRealtime: () => void
}

export interface UseAppStoreStateReturn {
  theme: 'light' | 'dark' | 'system'
  mounted: boolean
  activity: ActivityState
  realtime: RealtimeState
}
