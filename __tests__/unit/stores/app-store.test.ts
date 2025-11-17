import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { 
  useAppStore,
  useTheme,
  useActivity,
  useRealtime
} from '@/stores/app-store'

describe('App Store', () => {
  beforeEach(() => {
    // Clear localStorage first
    localStorage.clear()
    
    // Reset store state before each test
    const store = useAppStore.getState()
    store.setTheme('light')
    store.setMounted(false)
    store.setActivity({
      isActive: true,
      lastActivity: new Date(),
      currentPage: '',
      isViewing: false,
      viewingTarget: undefined,
    })
    store.clearNotifications()
    store.setRealtimeConnected(true)
    
    // Reset realtime state completely
    useAppStore.setState({
      realtime: {
        leaderboardUpdates: 0,
        tournamentUpdates: {},
        notifications: [],
        isConnected: true,
      }
    })
  })

  describe('Theme Management', () => {
    it('should set theme', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setTheme('dark')
      })

      expect(result.current.theme).toBe('dark')
    })

    it('should toggle theme from light to dark', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setTheme('light')
      })

      expect(result.current.theme).toBe('light')

      act(() => {
        result.current.toggleTheme()
      })

      expect(result.current.theme).toBe('dark')
    })

    it('should toggle theme from dark to light', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setTheme('dark')
      })

      expect(result.current.theme).toBe('dark')

      act(() => {
        result.current.toggleTheme()
      })

      expect(result.current.theme).toBe('light')
    })

    it('should set mounted state', () => {
      const { result } = renderHook(() => useAppStore())

      expect(result.current.mounted).toBe(false)

      act(() => {
        result.current.setMounted(true)
      })

      expect(result.current.mounted).toBe(true)
    })

    it('should use useTheme hook', () => {
      const { result } = renderHook(() => useTheme())

      expect(result.current.theme).toBe('light')
      expect(result.current.mounted).toBe(false)
      expect(result.current.setTheme).toBeDefined()
      expect(result.current.toggleTheme).toBeDefined()
      expect(result.current.setMounted).toBeDefined()

      act(() => {
        result.current.setTheme('dark')
      })

      expect(result.current.theme).toBe('dark')
    })
  })

  describe('Activity Tracking', () => {
    it('should set activity state', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setActivity({
          isActive: false,
          currentPage: '/tournaments'
        })
      })

      expect(result.current.activity.isActive).toBe(false)
      expect(result.current.activity.currentPage).toBe('/tournaments')
      expect(result.current.activity.lastActivity).toBeInstanceOf(Date)
    })

    it('should mark as active', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setActivity({ isActive: false })
      })

      expect(result.current.activity.isActive).toBe(false)

      act(() => {
        result.current.markActive()
      })

      expect(result.current.activity.isActive).toBe(true)
      expect(result.current.activity.lastActivity).toBeInstanceOf(Date)
    })

    it('should not update state when marking active if already active', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setActivity({ isActive: true })
      })

      const beforeActivity = result.current.activity

      act(() => {
        result.current.markActive()
      })

      // State reference should be the same (no update)
      expect(result.current.activity).toBe(beforeActivity)
    })

    it('should set viewing state with target', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setViewing('tournament-123')
      })

      expect(result.current.activity.isViewing).toBe(true)
      expect(result.current.activity.viewingTarget).toBe('tournament-123')
      expect(result.current.activity.lastActivity).toBeInstanceOf(Date)
    })

    it('should clear viewing state when no target provided', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setViewing('tournament-123')
      })

      expect(result.current.activity.isViewing).toBe(true)

      act(() => {
        result.current.setViewing()
      })

      expect(result.current.activity.isViewing).toBe(false)
      expect(result.current.activity.viewingTarget).toBeUndefined()
    })

    it('should not update state when setting same viewing state', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setViewing('tournament-123')
      })

      const beforeActivity = result.current.activity

      act(() => {
        result.current.setViewing('tournament-123')
      })

      // State reference should be the same (no update)
      expect(result.current.activity).toBe(beforeActivity)
    })

    it('should detect changes in setActivity', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setActivity({
          currentPage: '/tournaments'
        })
      })

      const beforeActivity = result.current.activity

      // Setting same value should not update state
      act(() => {
        result.current.setActivity({
          currentPage: '/tournaments'
        })
      })

      expect(result.current.activity).toBe(beforeActivity)

      // Setting different value should update state
      act(() => {
        result.current.setActivity({
          currentPage: '/leaderboards'
        })
      })

      expect(result.current.activity).not.toBe(beforeActivity)
      expect(result.current.activity.currentPage).toBe('/leaderboards')
    })

    it('should use useActivity hook', () => {
      const { result } = renderHook(() => useActivity())

      expect(result.current.activity).toBeDefined()
      expect(result.current.setActivity).toBeDefined()
      expect(result.current.markActive).toBeDefined()
      expect(result.current.setViewing).toBeDefined()

      act(() => {
        result.current.markActive()
      })

      expect(result.current.activity.isActive).toBe(true)
    })
  })

  describe('Notification System', () => {
    it('should add notification', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.addNotification({
          type: 'tournament_result',
          title: 'Tournament Complete',
          message: 'Your tournament has finished'
        })
      })

      expect(result.current.realtime.notifications).toHaveLength(1)
      expect(result.current.realtime.notifications[0].title).toBe('Tournament Complete')
      expect(result.current.realtime.notifications[0].read).toBe(false)
      expect(result.current.realtime.notifications[0].id).toBeDefined()
      expect(result.current.realtime.notifications[0].timestamp).toBeInstanceOf(Date)
    })

    it('should add multiple notifications', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.addNotification({
          type: 'tournament_result',
          title: 'Notification 1',
          message: 'Message 1'
        })
        result.current.addNotification({
          type: 'leaderboard_update',
          title: 'Notification 2',
          message: 'Message 2'
        })
      })

      expect(result.current.realtime.notifications).toHaveLength(2)
      expect(result.current.realtime.notifications[0].title).toBe('Notification 2')
      expect(result.current.realtime.notifications[1].title).toBe('Notification 1')
    })

    it('should limit notifications to 50', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        for (let i = 0; i < 60; i++) {
          result.current.addNotification({
            type: 'tournament_result',
            title: `Notification ${i}`,
            message: `Message ${i}`
          })
        }
      })

      expect(result.current.realtime.notifications).toHaveLength(50)
    })

    it('should mark notification as read', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.addNotification({
          type: 'tournament_result',
          title: 'Test',
          message: 'Test message'
        })
      })

      const notificationId = result.current.realtime.notifications[0].id

      act(() => {
        result.current.markNotificationRead(notificationId)
      })

      expect(result.current.realtime.notifications[0].read).toBe(true)
    })

    it('should clear all notifications', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.addNotification({
          type: 'tournament_result',
          title: 'Test 1',
          message: 'Message 1'
        })
        result.current.addNotification({
          type: 'tournament_result',
          title: 'Test 2',
          message: 'Message 2'
        })
      })

      expect(result.current.realtime.notifications).toHaveLength(2)

      act(() => {
        result.current.clearNotifications()
      })

      expect(result.current.realtime.notifications).toHaveLength(0)
    })

    it('should add notification with data payload', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.addNotification({
          type: 'tournament_result',
          title: 'Tournament Complete',
          message: 'Your tournament has finished',
          data: { tournamentId: '123', placement: 1 }
        })
      })

      expect(result.current.realtime.notifications[0].data).toEqual({
        tournamentId: '123',
        placement: 1
      })
    })
  })

  describe('Real-time Updates', () => {
    it('should trigger leaderboard update', () => {
      const { result } = renderHook(() => useAppStore())

      expect(result.current.realtime.leaderboardUpdates).toBe(0)

      act(() => {
        result.current.triggerLeaderboardUpdate()
      })

      expect(result.current.realtime.leaderboardUpdates).toBe(1)
      expect(result.current.realtime.notifications).toHaveLength(1)
      expect(result.current.realtime.notifications[0].type).toBe('leaderboard_update')
    })

    it('should increment leaderboard updates', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.triggerLeaderboardUpdate()
        result.current.triggerLeaderboardUpdate()
        result.current.triggerLeaderboardUpdate()
      })

      expect(result.current.realtime.leaderboardUpdates).toBe(3)
    })

    it('should trigger tournament update', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.triggerTournamentUpdate('tournament-123')
      })

      expect(result.current.realtime.tournamentUpdates['tournament-123']).toBe(1)
    })

    it('should track multiple tournament updates', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.triggerTournamentUpdate('tournament-123')
        result.current.triggerTournamentUpdate('tournament-123')
        result.current.triggerTournamentUpdate('tournament-456')
      })

      expect(result.current.realtime.tournamentUpdates['tournament-123']).toBe(2)
      expect(result.current.realtime.tournamentUpdates['tournament-456']).toBe(1)
    })

    it('should set realtime connected state', () => {
      const { result } = renderHook(() => useAppStore())

      expect(result.current.realtime.isConnected).toBe(true)

      act(() => {
        result.current.setRealtimeConnected(false)
      })

      expect(result.current.realtime.isConnected).toBe(false)

      act(() => {
        result.current.setRealtimeConnected(true)
      })

      expect(result.current.realtime.isConnected).toBe(true)
    })

    it('should use useRealtime hook', () => {
      // Start fresh
      localStorage.clear()
      useAppStore.setState({
        realtime: {
          leaderboardUpdates: 0,
          tournamentUpdates: {},
          notifications: [],
          isConnected: true,
        }
      })

      const { result } = renderHook(() => useRealtime())

      expect(result.current.state).toBeDefined()
      expect(result.current.addNotification).toBeDefined()
      expect(result.current.markNotificationRead).toBeDefined()
      expect(result.current.clearNotifications).toBeDefined()
      expect(result.current.triggerLeaderboardUpdate).toBeDefined()
      expect(result.current.triggerTournamentUpdate).toBeDefined()
      expect(result.current.setRealtimeConnected).toBeDefined()

      act(() => {
        result.current.triggerLeaderboardUpdate()
      })

      expect(result.current.state.leaderboardUpdates).toBe(1)
    })
  })

  describe('Persistence', () => {
    it('should persist theme preference', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setTheme('dark')
      })

      // Theme is persisted in localStorage
      const stored = localStorage.getItem('app-storage')
      expect(stored).toBeDefined()
      if (stored) {
        const parsed = JSON.parse(stored)
        expect(parsed.state.theme).toBe('dark')
      }
    })

    it('should only persist theme, not activity or realtime', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setTheme('dark')
        result.current.setActivity({
          isActive: false,
          currentPage: '/tournaments'
        })
        result.current.addNotification({
          type: 'tournament_result',
          title: 'Test',
          message: 'Test message'
        })
      })

      // Check what's persisted
      const stored = localStorage.getItem('app-storage')
      expect(stored).toBeDefined()
      if (stored) {
        const parsed = JSON.parse(stored)
        expect(parsed.state.theme).toBe('dark')
        // Activity and realtime should not be persisted
        expect(parsed.state.activity).toBeUndefined()
        expect(parsed.state.realtime).toBeUndefined()
      }
    })
  })

  describe('State Consistency', () => {
    it('should maintain consistent state across multiple operations', () => {
      // Start fresh
      localStorage.clear()
      useAppStore.setState({
        realtime: {
          leaderboardUpdates: 0,
          tournamentUpdates: {},
          notifications: [],
          isConnected: true,
        }
      })

      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.setTheme('dark')
        result.current.setActivity({ currentPage: '/tournaments' })
        result.current.addNotification({
          type: 'tournament_result',
          title: 'Test',
          message: 'Test'
        })
        result.current.triggerLeaderboardUpdate()
      })

      expect(result.current.theme).toBe('dark')
      expect(result.current.activity.currentPage).toBe('/tournaments')
      expect(result.current.realtime.notifications).toHaveLength(2) // notification + leaderboard update notification
      expect(result.current.realtime.leaderboardUpdates).toBe(1)
    })

    it('should handle rapid state changes', () => {
      const { result } = renderHook(() => useAppStore())

      act(() => {
        result.current.toggleTheme()
        result.current.toggleTheme()
        result.current.toggleTheme()
      })

      expect(result.current.theme).toBe('dark')
    })
  })
})
