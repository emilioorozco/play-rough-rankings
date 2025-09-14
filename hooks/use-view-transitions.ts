'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

export function useViewTransitions() {
  const router = useRouter()

  const navigateWithTransition = useCallback((url: string) => {
    // Check if the browser supports View Transitions API
    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      // Use View Transitions API for smooth navigation
      (document as any).startViewTransition(() => {
        router.push(url as any)
      })
    } else {
      // Fallback to regular navigation
      router.push(url as any)
    }
  }, [router])

  const transitionToTournament = useCallback((tournamentId: string) => {
    navigateWithTransition(`/tournaments/${tournamentId}`)
  }, [navigateWithTransition])

  const transitionToPlayer = useCallback((playerId: string) => {
    navigateWithTransition(`/players/${playerId}`)
  }, [navigateWithTransition])

  const transitionToLeaderboard = useCallback((game?: string, format?: string) => {
    const params = new URLSearchParams()
    if (game) params.set('game', game)
    if (format) params.set('format', format)
    const query = params.toString()
    navigateWithTransition(`/leaderboards${query ? `?${query}` : ''}`)
  }, [navigateWithTransition])

  return {
    navigateWithTransition,
    transitionToTournament,
    transitionToPlayer,
    transitionToLeaderboard,
  }
}