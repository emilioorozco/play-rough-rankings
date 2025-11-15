'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Maximize2, Edit } from 'lucide-react'
import { MatchSubmissionForm } from '@/components/tournaments/match-submission-form'
import { OrganizerMatchControls } from '@/components/tournaments/organizer-match-controls'
import { Modal } from '@/components/ui/modal'
import type { ApiTournament } from '@/lib/types/api'

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

  // Group matches by round
  const matchesByRound = tournament.matches?.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = []
    }
    acc[match.round].push(match)
    return acc
  }, {} as Record<number, typeof tournament.matches>) || {}

  const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b)
  const currentRound = rounds[0] // For now, show first round
  const currentRoundMatches = matchesByRound[currentRound] || []

  // Check if current user is in a match
  const isPlayerInMatch = (match: any) => {
    return currentUser && (
      match.player1?.id === currentUser.id || 
      match.player2?.id === currentUser.id
    )
  }

  // Handle match click
  const handleMatchClick = (match: any) => {
    if (match.status === 'COMPLETED') return // Don't allow editing completed matches
    
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
      case 'IN_PROGRESS': return 'warning'
      case 'PENDING': return 'outline'
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Round Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentRound <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex gap-1">
              {rounds.map((round) => (
                <Button
                  key={round}
                  variant={round === currentRound ? "default" : "outline"}
                  size="sm"
                  className="min-w-fit"
                >
                  Round {round}
                </Button>
              ))}
            </div>
            
            <Button variant="outline" size="sm" disabled={currentRound >= rounds.length}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Badge variant="outline">
            {currentRoundMatches.length} matches
          </Badge>
        </div>

        {/* Matches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
          {currentRoundMatches.map((match) => {
            const canInteract = canManage || isPlayerInMatch(match)
            const isCompleted = match.status === 'COMPLETED'
            
            return (
              <Card 
                key={match.id} 
                className={`relative dark:bg-muted dark:text-foreground border-border ${
                  canInteract && !isCompleted ? 'cursor-pointer hover:border-primary transition-colors' : ''
                }`}
                onClick={() => canInteract && handleMatchClick(match)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Match {match.id}</span>
                      {canInteract && !isCompleted && (
                        <Edit className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <Badge 
                      variant={getMatchStatusColor(match.status) as any}
                      className="text-xs"
                    >
                      {match.status === 'IN_PROGRESS' ? 'Live' : match.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
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
      >
        {selectedMatch && (
          <MatchSubmissionForm
            match={selectedMatch}
            currentUserId={currentUser?.id || ''}
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
            tournamentId={tournament.id}
            onSuccess={() => {
              setShowOrganizerModal(false)
              setSelectedMatch(null)
              // Trigger refetch in parent component
              window.location.reload()
            }}
            onCancel={() => {
              setShowOrganizerModal(false)
              setSelectedMatch(null)
            }}
          />
        )}
      </Modal>
    </Card>
  )
}
