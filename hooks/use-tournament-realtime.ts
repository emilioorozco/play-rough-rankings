'use client'

import { useEffect, useCallback, useRef } from 'react'
import { trpc } from '@/lib/trpc/client'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Hook for real-time tournament updates using polling
 * Provides automatic refetching of tournament data when changes occur
 */
export function useTournamentRealtime(tournamentId: string | null, options?: {
  enabled?: boolean
  pollingInterval?: number
  onMatchUpdate?: () => void
  onRoundAdvance?: () => void
  onStatusChange?: (newStatus: string) => void
}) {
  const queryClient = useQueryClient()
  const {
    enabled = true,
    pollingInterval = 10000, // 10 seconds default
    onMatchUpdate,
    onRoundAdvance,
    onStatusChange,
  } = options || {}

  // Track previous state for change detection
  const previousStateRef = useRef<{
    status?: string
    currentRound?: number
    completedMatches?: number
  }>({})

  // Query tournament data with polling
  const { data: tournament, refetch } = trpc.tournaments.getById.useQuery(
    {
      id: tournamentId!,
      includeMatches: true,
      includeParticipants: false,
    },
    {
      enabled: enabled && !!tournamentId,
      refetchInterval: enabled && tournamentId ? pollingInterval : false,
      refetchIntervalInBackground: false, // Only poll when tab is active
      refetchOnWindowFocus: true, // Refetch when user returns to tab
    }
  )

  // Detect changes and trigger callbacks
  useEffect(() => {
    if (!tournament) return

    const previousState = previousStateRef.current
    // Calculate currentRound from matches if not available, or convert to number
    const currentRound = (tournament as any).currentRound 
      ? (typeof (tournament as any).currentRound === 'string' 
          ? parseInt((tournament as any).currentRound as string, 10) 
          : (typeof (tournament as any).currentRound === 'number' 
              ? (tournament as any).currentRound 
              : 0))
      : (tournament.matches && tournament.matches.length > 0 
          ? Math.max(...tournament.matches.map(m => Number(m.round)))
          : 0)
    
    const currentState = {
      status: tournament.status,
      currentRound: currentRound,
      completedMatches: tournament.matches?.filter(m => m.status === 'COMPLETED').length || 0,
    }

    // Detect status change
    if (previousState.status && previousState.status !== currentState.status) {
      onStatusChange?.(currentState.status)
      
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: [['tournaments', 'getById']],
      })
      queryClient.invalidateQueries({
        queryKey: [['tournamentLifecycle', 'getProjectedRatings']],
      })
    }

    // Detect round advance
    if (previousState.currentRound !== undefined && previousState.currentRound !== currentState.currentRound) {
      onRoundAdvance?.()
      
      // Invalidate tournament and match queries
      queryClient.invalidateQueries({
        queryKey: [['tournaments', 'getById']],
      })
      queryClient.invalidateQueries({
        queryKey: [['matches', 'getByTournament']],
      })
    }

    // Detect match completion
    if (previousState.completedMatches !== undefined && 
        previousState.completedMatches < currentState.completedMatches) {
      onMatchUpdate?.()
      
      // Invalidate projected ratings
      queryClient.invalidateQueries({
        queryKey: [['tournamentLifecycle', 'getProjectedRatings']],
      })
    }

    // Update previous state
    previousStateRef.current = currentState
  }, [tournament, onMatchUpdate, onRoundAdvance, onStatusChange, queryClient])

  // Manual refresh function
  const refresh = useCallback(async () => {
    await refetch()
    
    // Also invalidate related queries
    if (tournamentId) {
      queryClient.invalidateQueries({
        queryKey: [['tournaments', 'getById'], { input: { id: tournamentId } }],
      })
      queryClient.invalidateQueries({
        queryKey: [['matches', 'getByTournament'], { input: { tournamentId } }],
      })
      queryClient.invalidateQueries({
        queryKey: [['tournamentLifecycle', 'getProjectedRatings'], { input: { tournamentId } }],
      })
    }
  }, [refetch, tournamentId, queryClient])

  return {
    tournament,
    refresh,
    isPolling: enabled && !!tournamentId,
  }
}

/**
 * Hook for real-time match updates
 * Provides automatic refetching of match data
 */
export function useMatchRealtime(tournamentId: string | null, options?: {
  enabled?: boolean
  pollingInterval?: number
  round?: number
  onMatchComplete?: (matchId: string) => void
}) {
  const queryClient = useQueryClient()
  const {
    enabled = true,
    pollingInterval = 10000,
    round,
    onMatchComplete,
  } = options || {}

  // Track previous completed matches
  const previousCompletedRef = useRef<Set<string>>(new Set())

  // Query matches with polling
  const { data: matches, refetch } = trpc.matches.getByTournament.useQuery(
    {
      tournamentId: tournamentId!,
      round,
    },
    {
      enabled: enabled && !!tournamentId,
      refetchInterval: enabled && tournamentId ? pollingInterval : false,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    }
  )

  // Detect newly completed matches
  useEffect(() => {
    if (!matches) return

    const currentCompleted = new Set(
      matches.filter(m => m.status === 'COMPLETED').map(m => m.id)
    )

    // Find newly completed matches
    const newlyCompleted = Array.from(currentCompleted).filter(
      id => !previousCompletedRef.current.has(id)
    )

    // Trigger callbacks for newly completed matches
    newlyCompleted.forEach(matchId => {
      onMatchComplete?.(matchId)
    })

    // Update previous state
    previousCompletedRef.current = currentCompleted
  }, [matches, onMatchComplete])

  // Manual refresh function
  const refresh = useCallback(async () => {
    await refetch()
    
    // Invalidate related queries
    if (tournamentId) {
      queryClient.invalidateQueries({
        queryKey: [['matches', 'getByTournament'], { input: { tournamentId } }],
      })
      queryClient.invalidateQueries({
        queryKey: [['tournamentLifecycle', 'getProjectedRatings'], { input: { tournamentId } }],
      })
    }
  }, [refetch, tournamentId, queryClient])

  return {
    matches,
    refresh,
    isPolling: enabled && !!tournamentId,
  }
}

/**
 * Hook for live tournament indicator
 * Shows if tournament is currently active and being updated
 */
export function useLiveTournamentIndicator(tournamentId: string | null) {
  const { data: tournament } = trpc.tournaments.getById.useQuery(
    {
      id: tournamentId!,
      includeMatches: false,
      includeParticipants: false,
    },
    {
      enabled: !!tournamentId,
      refetchInterval: 30000, // Check every 30 seconds
    }
  )

  const isLive = tournament?.status === 'ACTIVE' && tournament?.isLive

  return {
    isLive,
    status: tournament?.status,
  }
}
