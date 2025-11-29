'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Edit } from 'lucide-react'
import { MatchSubmissionForm } from '@/components/tournaments/match-submission-form'
import { OrganizerMatchControls } from '@/components/tournaments/organizer-match-controls'
import { Modal } from '@/components/ui/modal'
import { useTournamentStore } from '@/stores/tournament-store'
import type { ApiTournament } from '@/lib/types/api'
import { cn } from '@/lib/utils'

interface TournamentBracketsProps {
  tournament: ApiTournament
  isOrganizer: boolean
  canManage?: boolean
  currentUser?: {
    id: string
    role: string
    displayName?: string | null
  } | null
}

export function TournamentBrackets({ tournament, canManage = false, currentUser }: TournamentBracketsProps) {
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null)
  const [showSubmissionModal, setShowSubmissionModal] = useState(false)
  const [showOrganizerModal, setShowOrganizerModal] = useState(false)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | 'none'>('none')
  const previousRoundRef = useRef<number | null>(null)

  // Get selected round from Zustand store - using selector to subscribe to changes
  const storedRound = useTournamentStore((state) => state.selectedRoundCache[tournament.id])
  const setSelectedRound = useTournamentStore((state) => state.setSelectedRound)

  // Group matches by round
  const matchesByRound = tournament.matches?.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = []
    }
    acc[match.round].push(match)
    return acc
  }, {} as Record<number, typeof tournament.matches>) || {}

  const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b)
  
  // Get selected round from store or default to latest round
  const latestRound = rounds.length > 0 ? rounds[rounds.length - 1] : 1
  const currentRound = storedRound || latestRound
  const currentRoundMatches = matchesByRound[currentRound] || []

  // Track round changes for slide direction (mimics multi-step modal transitions)
  useEffect(() => {
    const previousRound = previousRoundRef.current

    if (previousRound !== null && previousRound !== currentRound) {
      // Going up in rounds -> slide left, going down -> slide right
      setSlideDirection(currentRound > previousRound ? 'left' : 'right')

      const timer = setTimeout(() => {
        setSlideDirection('none')
      }, 300) // Match modal animation duration

      return () => clearTimeout(timer)
    }

    // Always update previous round after handling current change
    previousRoundRef.current = currentRound
  }, [currentRound])

  // Initialize selected round in store if not set (default to latest round)
  useEffect(() => {
    if (!storedRound && rounds.length > 0) {
      setSelectedRound(tournament.id, latestRound)
    }
  }, [tournament.id, storedRound, rounds, latestRound, setSelectedRound])

  // Check if a match is a bye (same player on both sides)
  const isBye = (match: any) => {
    return match.player1?.id && match.player2?.id && match.player1.id === match.player2.id
  }

  // Check if current user is in a match
  const isPlayerInMatch = (match: any) => {
    if (!currentUser) return false
    // Check user IDs, not player IDs
    const player1UserId = match.player1?.user?.id
    const player2UserId = match.player2?.user?.id
    return player1UserId === currentUser.id || player2UserId === currentUser.id
  }

  // Handle match click
  const handleMatchClick = (match: any) => {
    if (match.status === 'COMPLETED') return // Don't allow editing completed matches
    if (isBye(match)) return // Don't allow interaction with bye matches
    
    setSelectedMatch(match)
    
    if (canManage) {
      setShowOrganizerModal(true)
    } else if (isPlayerInMatch(match)) {
      setShowSubmissionModal(true)
    }
  }

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success'
      case 'IN_PROGRESS': return 'outline' // Waiting for confirmation - shown as "PENDING"
      case 'PENDING': return 'success' // Match ready - shown as "Live" (green)
      default: return 'outline'
    }
  }

  const renderPlayer = (player: any, isWinner: boolean) => {
    if (!player) {
      return (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded border border-dashed border-border">
          <span className="text-muted-foreground text-sm">TBD</span>
        </div>
      )
    }

    return (
      <div className={`flex items-center justify-between p-3 rounded border transition-colors ${
        isWinner 
          ? 'bg-primary/5 border-primary/20 font-medium' 
          : 'bg-background border-border'
      }`}>
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="font-medium text-sm text-card-foreground">{player.displayName}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="dark:bg-muted dark:text-foreground border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Tournament Bracket</CardTitle>
        <Badge variant="outline">
          {currentRoundMatches.length} matches
        </Badge>
      </CardHeader>
      <CardContent>
        {/* Round Navigation - horizontally scrollable like tabs */}
        <div className="mb-6 -mx-4 px-4">
          <div className="overflow-x-auto no-scrollbar">
            <div className="inline-flex gap-2 min-w-max">
              {rounds.map((round) => (
                <Button
                  key={round}
                  variant={round === currentRound ? "default" : "outline"}
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => setSelectedRound(tournament.id, round)}
                >
                  Round {round}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Matches Grid with multi-modal style transitions */}
        <div
          className={cn(
            "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto overflow-x-hidden",
            slideDirection === 'left' && 'animate-slide-left',
            slideDirection === 'right' && 'animate-slide-right'
          )}
          key={currentRound}
        >
          {currentRoundMatches.map((match, index) => {
            const matchIsBye = isBye(match)
            const canInteract = !matchIsBye && (canManage || isPlayerInMatch(match))
            const isCompleted = match.status === 'COMPLETED'
            // Show friendly match number for non-admins, ID for admins/organizers
            // Prefer table number if available, otherwise use index-based numbering
            const matchLabel = canManage 
              ? `Match ${match.id.slice(0, 8)}...` 
              : match.table 
                ? `Match ${match.table}` 
                : `Match ${index + 1}`
            
            return (
              <Card 
                key={match.id} 
                className={`relative dark:bg-muted dark:text-foreground border-border ${
                  matchIsBye ? 'opacity-75 border-dashed' : ''
                } ${
                  canInteract && !isCompleted ? 'cursor-pointer hover:border-primary transition-colors' : ''
                }`}
                onClick={() => {
                  if (canInteract && !isCompleted) {
                    handleMatchClick(match)
                  }
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{matchLabel}</span>
                      {matchIsBye && (
                        <Badge variant="secondary" className="text-xs">BYE</Badge>
                      )}
                      {canInteract && !isCompleted && !matchIsBye && (
                        <Edit className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <Badge 
                      variant={getMatchStatusColor(match.status) as any}
                      className="text-xs"
                    >
                      {match.status === 'PENDING' ? 'Live' : match.status === 'IN_PROGRESS' ? 'PENDING' : match.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {matchIsBye ? (
                    // Render bye match - single player gets automatic win
                    <>
                      {renderPlayer(
                        match.player1, 
                        true // Bye matches are automatic wins
                      )}
                      <div className="text-center text-xs text-muted-foreground font-medium">
                        BYE
                      </div>
                      <div className="flex items-center justify-center p-2">
                        <Badge variant="outline" className="text-xs">
                          Automatic Win
                        </Badge>
                      </div>
                    </>
                  ) : (
                    // Render normal match
                    <>
                      {renderPlayer(
                        match.player1, 
                        match.winner?.id === match.player1.id
                      )}
                      <div className="text-center text-xs text-muted-foreground font-medium">
                        VS
                      </div>
                      {renderPlayer(
                        match.player2, 
                        match.winner?.id === match.player2.id
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {currentRoundMatches.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No matches scheduled for this round yet.</p>
          </div>
        )}
      </CardContent>

      {/* Match Submission Modal for Players */}
      <Modal
        isOpen={showSubmissionModal}
        onClose={() => {
          setShowSubmissionModal(false)
          setSelectedMatch(null)
        }}
        title="Submit Match Result"
        size="sm"
      >
        {selectedMatch && (
          <MatchSubmissionForm
            match={selectedMatch}
            currentUser={currentUser ? { id: currentUser.id, role: currentUser.role } : null}
            onSuccess={() => {
              setShowSubmissionModal(false)
              setSelectedMatch(null)
              // Trigger refetch in parent component
              window.location.reload()
            }}
            onCancel={() => {
              setShowSubmissionModal(false)
              setSelectedMatch(null)
            }}
          />
        )}
      </Modal>

      {/* Organizer Match Controls Modal */}
      <Modal
        isOpen={showOrganizerModal}
        onClose={() => {
          setShowOrganizerModal(false)
          setSelectedMatch(null)
        }}
        title="Manage Match"
      >
        {selectedMatch && (
          <OrganizerMatchControls
            match={selectedMatch}
            currentUser={currentUser ? { id: currentUser.id, role: currentUser.role } : null}
            onSuccess={() => {
              setShowOrganizerModal(false)
              setSelectedMatch(null)
              // Trigger refetch in parent component
              window.location.reload()
            }}
          />
        )}
      </Modal>
    </Card>
  )
}
