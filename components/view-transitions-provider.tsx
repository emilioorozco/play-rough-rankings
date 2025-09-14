'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface ViewTransitionsProviderProps {
  children: React.ReactNode
}

export function ViewTransitionsProvider({ children }: ViewTransitionsProviderProps) {
  const pathname = usePathname()

  useEffect(() => {
    // Check if the browser supports View Transitions API
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      // Add view transition names to key elements for smooth transitions
      const addViewTransitionNames = () => {
        // Add transition names to main navigation elements
        const nav = document.querySelector('.main-navigation') as HTMLElement
        if (nav) {
          (nav.style as Record<string, string>).viewTransitionName = 'main-navigation'
        }

        // Add transition names to main content area
        const main = document.querySelector('.main-content') as HTMLElement
        if (main) {
          (main.style as Record<string, string>).viewTransitionName = 'main-content'
        }

        // Add transition names to tournament cards
        const tournamentCards = document.querySelectorAll('.tournament-card')
        tournamentCards.forEach((card, index) => {
          (card as HTMLElement).style.viewTransitionName = `tournament-card-${index}`
        })

        // Add transition names to player profile elements
        const playerProfile = document.querySelector('.player-dashboard')
        if (playerProfile) {
          (playerProfile as HTMLElement).style.viewTransitionName = 'player-dashboard'
        }

        // Add transition names to leaderboard elements
        const leaderboard = document.querySelector('.leaderboard-table')
        if (leaderboard) {
          (leaderboard as HTMLElement).style.viewTransitionName = 'leaderboard-table'
        }
      }

      // Apply transition names after DOM is ready
      const timer = setTimeout(addViewTransitionNames, 100)
      return () => clearTimeout(timer)
    }
  }, [pathname])

  return <>{children}</>
}