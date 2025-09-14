'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface ActivityState {
  isActive: boolean
  lastActivity: Date
  currentPage: string
  isViewing: boolean
  viewingTarget?: string
}

interface ActivityContextType {
  activity: ActivityState
  setActivity: (activity: Partial<ActivityState>) => void
  markActive: () => void
  setViewing: (target?: string) => void
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined)

interface ActivityProviderProps {
  children: ReactNode
}

export function ActivityProvider({ children }: ActivityProviderProps) {
  const [activity, setActivityState] = useState<ActivityState>({
    isActive: true,
    lastActivity: new Date(),
    currentPage: '',
    isViewing: false,
  })

  const setActivity = (newActivity: Partial<ActivityState>) => {
    setActivityState(prev => ({
      ...prev,
      ...newActivity,
      lastActivity: new Date(),
    }))
  }

  const markActive = () => {
    setActivity({ isActive: true })
  }

  const setViewing = (target?: string) => {
    setActivity({
      isViewing: !!target,
      viewingTarget: target,
    })
  }

  useEffect(() => {
    // Track user activity events
    const handleActivity = () => {
      markActive()
    }

    const handleVisibilityChange = () => {
      setActivity({ isActive: !document.hidden })
    }

    // Add event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Set up activity timeout
    const activityTimeout = setInterval(() => {
      const now = new Date()
      const timeSinceLastActivity = now.getTime() - activity.lastActivity.getTime()
      
      // Mark as inactive after 5 minutes of no activity
      if (timeSinceLastActivity > 5 * 60 * 1000) {
        setActivity({ isActive: false })
      }
    }, 30000) // Check every 30 seconds

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(activityTimeout)
    }
  }, [activity.lastActivity])

  useEffect(() => {
    // Update current page when pathname changes
    if (typeof window !== 'undefined') {
      setActivity({ currentPage: window.location.pathname })
    }
  }, [])

  const contextValue: ActivityContextType = {
    activity,
    setActivity,
    markActive,
    setViewing,
  }

  return (
    <ActivityContext.Provider value={contextValue}>
      {children}
    </ActivityContext.Provider>
  )
}

export function useActivity() {
  const context = useContext(ActivityContext)
  if (context === undefined) {
    throw new Error('useActivity must be used within an ActivityProvider')
  }
  return context
}