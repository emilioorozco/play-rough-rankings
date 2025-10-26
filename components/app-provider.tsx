'use client'

import { useEffect } from 'react'
import { useAppStore, useTheme, useActivity, useRealtime } from '@/stores/app-store'

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { theme, mounted, setTheme, setMounted } = useTheme()
  const { activity, setActivity, markActive } = useActivity()
  const { triggerLeaderboardUpdate } = useRealtime()

  // Theme initialization
  useEffect(() => {
    setMounted(true)
    
    // Add no-transitions class to prevent initial flash
    document.documentElement.classList.add("no-transitions")

    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem("theme") as 'light' | 'dark'
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      // Check system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      setTheme(prefersDark ? "dark" : "light")
    }

    // Remove no-transitions class after initial theme is applied
    const timer = setTimeout(() => {
      document.documentElement.classList.remove("no-transitions")
    }, 100)

    return () => clearTimeout(timer)
  }, [setTheme, setMounted])

  // Apply theme to document
  useEffect(() => {
    if (mounted) {
      // Remove existing theme classes
      document.documentElement.classList.remove("light", "dark")
      // Add current theme class
      document.documentElement.classList.add(theme)
      localStorage.setItem("theme", theme)
    }
  }, [theme, mounted])

  // Activity tracking
  useEffect(() => {
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
  }, [activity.lastActivity, markActive, setActivity])

  // Update current page when pathname changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setActivity({ currentPage: window.location.pathname })
    }
  }, [setActivity])

  // Realtime initialization
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
  }, [triggerLeaderboardUpdate])

  // Prevent hydration mismatch for theme
  if (!mounted) {
    return <div style={{ visibility: "hidden" }}>{children}</div>
  }

  return <>{children}</>
}
