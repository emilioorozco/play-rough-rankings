'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { trpc } from '@/lib/trpc/client'

interface RealtimeState {
  leaderboardUpdates: number
  tournamentUpdates: Record<string, number>
  notifications: Notification[]
  isConnected: boolean
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

interface RealtimeContextType {
  state: RealtimeState
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markNotificationRead: (id: string) => void
  clearNotifications: () => void
  triggerLeaderboardUpdate: () => void
  triggerTournamentUpdate: (tournamentId: string) => void
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined)

interface RealtimeProviderProps {
  children: ReactNode
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const [state, setState] = useState<RealtimeState>({
    leaderboardUpdates: 0,
    tournamentUpdates: {},
    notifications: [],
    isConnected: true, // Mock connection status
  })

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false,
    }

    setState(prev => ({
      ...prev,
      notifications: [newNotification, ...prev.notifications].slice(0, 50), // Keep last 50
    }))

    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
      })
    }
  }

  const markNotificationRead = (id: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ),
    }))
  }

  const clearNotifications = () => {
    setState(prev => ({
      ...prev,
      notifications: [],
    }))
  }

  const triggerLeaderboardUpdate = () => {
    setState(prev => ({
      ...prev,
      leaderboardUpdates: prev.leaderboardUpdates + 1,
    }))

    addNotification({
      type: 'leaderboard_update',
      title: 'Leaderboard Updated',
      message: 'New tournament results have updated the leaderboard rankings.',
    })
  }

  const triggerTournamentUpdate = (tournamentId: string) => {
    setState(prev => ({
      ...prev,
      tournamentUpdates: {
        ...prev.tournamentUpdates,
        [tournamentId]: (prev.tournamentUpdates[tournamentId] || 0) + 1,
      },
    }))
  }

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // Simulate real-time updates for demo purposes
    const interval = setInterval(() => {
      // Randomly trigger updates to simulate real tournament activity
      if (Math.random() < 0.1) { // 10% chance every 30 seconds
        triggerLeaderboardUpdate()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const contextValue: RealtimeContextType = {
    state,
    addNotification,
    markNotificationRead,
    clearNotifications,
    triggerLeaderboardUpdate,
    triggerTournamentUpdate,
  }

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider')
  }
  return context
}