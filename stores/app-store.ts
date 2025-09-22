import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useMemo } from 'react'

// Types
type Theme = 'light' | 'dark'

interface ActivityState {
  isActive: boolean
  lastActivity: Date
  currentPage: string
  isViewing: boolean
  viewingTarget?: string
}

interface Notification {
  id: string
  type: 'tournament_result' | 'leaderboard_update' | 'tournament_status'
  title: string
  message: string
  timestamp: Date
  read: boolean
  data?: Record<string, unknown>
}

interface RealtimeState {
  leaderboardUpdates: number
  tournamentUpdates: Record<string, number>
  notifications: Notification[]
  isConnected: boolean
}

interface AppState {
  // Theme state
  theme: Theme
  mounted: boolean
  
  // Activity state
  activity: ActivityState
  
  // Realtime state
  realtime: RealtimeState
  
  // Actions
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setMounted: (mounted: boolean) => void
  
  // Activity actions
  setActivity: (activity: Partial<ActivityState>) => void
  markActive: () => void
  setViewing: (target?: string) => void
  
  // Realtime actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markNotificationRead: (id: string) => void
  clearNotifications: () => void
  triggerLeaderboardUpdate: () => void
  triggerTournamentUpdate: (tournamentId: string) => void
  setRealtimeConnected: (connected: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      theme: 'light',
      mounted: false,
      
      activity: {
        isActive: true,
        lastActivity: new Date(),
        currentPage: '',
        isViewing: false,
      },
      
      realtime: {
        leaderboardUpdates: 0,
        tournamentUpdates: {},
        notifications: [],
        isConnected: true,
      },
      
      // Theme actions
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'light' ? 'dark' : 'light' 
      })),
      setMounted: (mounted) => set({ mounted }),
      
      // Activity actions
      setActivity: (newActivity) => set((state) => {
        // Check if any values actually changed
        const hasChanges = Object.keys(newActivity).some(
          key => state.activity[key as keyof ActivityState] !== newActivity[key as keyof ActivityState]
        );
        
        if (!hasChanges) {
          return state; // No changes, return same state
        }
        
        return {
          activity: {
            ...state.activity,
            ...newActivity,
            lastActivity: new Date(),
          }
        };
      }),
      
      markActive: () => set((state) => {
        // Only update if isActive is currently false
        if (state.activity.isActive) {
          return state; // Already active, no change needed
        }
        
        return {
          activity: {
            ...state.activity,
            isActive: true,
            lastActivity: new Date(),
          }
        };
      }),
      
      setViewing: (target) => set((state) => {
        const newIsViewing = !!target;
        const newViewingTarget = target;
        
        // Only update if the values actually changed to prevent unnecessary re-renders
        if (state.activity.isViewing === newIsViewing && 
            state.activity.viewingTarget === newViewingTarget) {
          return state; // No change, return same state
        }
        
        return {
          activity: {
            ...state.activity,
            isViewing: newIsViewing,
            viewingTarget: newViewingTarget,
            lastActivity: new Date(),
          }
        };
      }),
      
      // Realtime actions
      addNotification: (notification) => set((state) => {
        const newNotification: Notification = {
          ...notification,
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          read: false,
        }
        
        return {
          realtime: {
            ...state.realtime,
            notifications: [newNotification, ...state.realtime.notifications].slice(0, 50), // Keep last 50
          }
        }
      }),
      
      markNotificationRead: (id) => set((state) => ({
        realtime: {
          ...state.realtime,
          notifications: state.realtime.notifications.map(n => 
            n.id === id ? { ...n, read: true } : n
          ),
        }
      })),
      
      clearNotifications: () => set((state) => ({
        realtime: {
          ...state.realtime,
          notifications: [],
        }
      })),
      
      triggerLeaderboardUpdate: () => set((state) => {
        const newState = {
          realtime: {
            ...state.realtime,
            leaderboardUpdates: state.realtime.leaderboardUpdates + 1,
          }
        }
        
        // Add notification
        const notification: Omit<Notification, 'id' | 'timestamp' | 'read'> = {
          type: 'leaderboard_update',
          title: 'Leaderboard Updated',
          message: 'New tournament results have updated the leaderboard rankings.',
        }
        
        const newNotification: Notification = {
          ...notification,
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          read: false,
        }
        
        return {
          realtime: {
            ...newState.realtime,
            notifications: [newNotification, ...state.realtime.notifications].slice(0, 50),
          }
        }
      }),
      
      triggerTournamentUpdate: (tournamentId) => set((state) => ({
        realtime: {
          ...state.realtime,
          tournamentUpdates: {
            ...state.realtime.tournamentUpdates,
            [tournamentId]: (state.realtime.tournamentUpdates[tournamentId] || 0) + 1,
          },
        }
      })),
      
      setRealtimeConnected: (connected) => set((state) => ({
        realtime: {
          ...state.realtime,
          isConnected: connected,
        }
      })),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({ 
        theme: state.theme,
        // Don't persist activity or realtime state as they should reset on page load
      }),
    }
  )
)

// Memoized selectors to avoid object creation issues
export const useTheme = () => {
  const theme = useAppStore((state) => state.theme)
  const mounted = useAppStore((state) => state.mounted)
  const setTheme = useAppStore((state) => state.setTheme)
  const toggleTheme = useAppStore((state) => state.toggleTheme)
  const setMounted = useAppStore((state) => state.setMounted)
  
  return useMemo(() => ({ 
    theme, 
    mounted, 
    setTheme, 
    toggleTheme, 
    setMounted 
  }), [theme, mounted, setTheme, toggleTheme, setMounted])
}

export const useActivity = () => {
  const activity = useAppStore((state) => state.activity)
  const setActivity = useAppStore((state) => state.setActivity)
  const markActive = useAppStore((state) => state.markActive)
  const setViewing = useAppStore((state) => state.setViewing)
  
  return useMemo(() => ({ 
    activity, 
    setActivity, 
    markActive, 
    setViewing 
  }), [activity, setActivity, markActive, setViewing])
}

export const useRealtime = () => {
  const state = useAppStore((state) => state.realtime)
  const addNotification = useAppStore((state) => state.addNotification)
  const markNotificationRead = useAppStore((state) => state.markNotificationRead)
  const clearNotifications = useAppStore((state) => state.clearNotifications)
  const triggerLeaderboardUpdate = useAppStore((state) => state.triggerLeaderboardUpdate)
  const triggerTournamentUpdate = useAppStore((state) => state.triggerTournamentUpdate)
  const setRealtimeConnected = useAppStore((state) => state.setRealtimeConnected)
  
  return useMemo(() => ({ 
    state, 
    addNotification, 
    markNotificationRead, 
    clearNotifications, 
    triggerLeaderboardUpdate, 
    triggerTournamentUpdate, 
    setRealtimeConnected 
  }), [state, addNotification, markNotificationRead, clearNotifications, triggerLeaderboardUpdate, triggerTournamentUpdate, setRealtimeConnected])
}
