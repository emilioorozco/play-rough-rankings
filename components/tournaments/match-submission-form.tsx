'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { FormField, FormSelect, FormStatus, FormActions, ModalForm } from '@/components/ui/form-components'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, CheckCircle, Clock, Loader2, Trophy, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MatchSubmissionFormProps {
  match: {
    id: string
    tournamentId: string
    player1Id: string
    player2Id: string
    winnerId: string | null
    round: number
    status: string
    player1Score: number | null
    player2Score: number | null
    table: number | null
    playerSubmissions?: any
    player1: {
      id: string
      user: {
        id: string
        firstName: string | null
        lastName: string | null
        name: string | null
      }
    }
    player2: {
      id: string
      user: {
        id: string
        firstName: string | null
        lastName: string | null
        name: string | null
      }
    }
    tournament: {
      id: string
      name: string
      status: string
    }
  }
  currentUser?: {
    id: string
    role: string
  } | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function MatchSubmissionForm({
  match,
  currentUser,
  onSuccess,
  onCancel
}: MatchSubmissionFormProps) {
  const [winnerId, setWinnerId] = useState<string>('')
  const [player1Score, setPlayer1Score] = useState<string>('0')
  const [player2Score, setPlayer2Score] = useState<string>('0')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [showDifferentResultForm, setShowDifferentResultForm] = useState(false)

  // Determine if current user is in this match by checking user IDs
  const isPlayer1 = currentUser?.id === match.player1?.user?.id
  const isPlayer2 = currentUser?.id === match.player2?.user?.id
  const isInMatch = isPlayer1 || isPlayer2

  // Check if either player is dropped by querying tournament entries
  const tournamentQuery = trpc.tournaments.getById.useQuery({
    id: match.tournamentId,
    includeParticipants: true
  })

  const participants = tournamentQuery.data?.participants || []
  const player1Participant = participants.find((participant) => participant.id === match.player1Id)
  const player2Participant = participants.find((participant) => participant.id === match.player2Id)
  const isPlayer1Dropped = player1Participant?.dropped || false
  const isPlayer2Dropped = player2Participant?.dropped || false
  const isCurrentPlayerDropped = isPlayer1 ? isPlayer1Dropped : isPlayer2Dropped
  const isEitherPlayerDropped = isPlayer1Dropped || isPlayer2Dropped

  // Get player names
  // Prefer explicit user first/last name, then user.name, then API-level displayName, then fallback
  const player1Name =
    (match.player1?.user?.firstName
      ? `${match.player1.user.firstName} ${match.player1.user.lastName || ''}`.trim()
      : match.player1?.user?.name) ||
    (match as any).player1?.displayName ||
    'Player 1'

  const player2Name =
    (match.player2?.user?.firstName
      ? `${match.player2.user.firstName} ${match.player2.user.lastName || ''}`.trim()
      : match.player2?.user?.name) ||
    (match as any).player2?.displayName ||
    'Player 2'

  // Check if there's a pending submission
  const hasPendingSubmission = match.status === 'IN_PROGRESS'
  const isDisputed = match.status === 'DISPUTED'
  const isCompleted = match.status === 'COMPLETED'

  // Parse playerSubmissions to find who submitted first
  // playerSubmissions structure: { submissions: { [playerId]: { submittedBy, winnerId, player1Score, player2Score, ... } } }
  const playerSubmissions = match.playerSubmissions as any
  const submissions = useMemo(() => playerSubmissions?.submissions || {}, [playerSubmissions])
  
  // Debug logging
  React.useEffect(() => {
    if (hasPendingSubmission) {
      console.log('=== Match Submission Debug ===')
      console.log('Match status:', match.status)
      console.log('PlayerSubmissions:', playerSubmissions)
      console.log('Submissions object:', submissions)
      console.log('Match player1Id:', match.player1Id)
      console.log('Match player2Id:', match.player2Id)
      console.log('Current user isPlayer1:', isPlayer1)
      console.log('Current user isPlayer2:', isPlayer2)
      console.log('Match scores:', { player1Score: match.player1Score, player2Score: match.player2Score, winnerId: match.winnerId })
    }
  }, [hasPendingSubmission, playerSubmissions, submissions, match, isPlayer1, isPlayer2])
  
  // Find the first submission (when pending, there's only one submission)
  const submissionKeys = Object.keys(submissions)
  const firstSubmissionKey = submissionKeys[0]
  const firstSubmission = firstSubmissionKey ? submissions[firstSubmissionKey] : null
  
  console.log('First submission key:', firstSubmissionKey)
  console.log('First submission data:', firstSubmission)
  
  const submittedByPlayerId = firstSubmission?.submittedBy
  const submittedScores = firstSubmission ? {
    player1Score: firstSubmission.player1Score,
    player2Score: firstSubmission.player2Score,
    winnerId: firstSubmission.winnerId,
  } : null

  console.log('Submitted by player ID:', submittedByPlayerId)
  console.log('Submitted scores:', submittedScores)

  // Determine if current user is the one who submitted
  const currentPlayerId = isPlayer1 ? match.player1Id : match.player2Id
  const isSubmitter = submittedByPlayerId === currentPlayerId
  const isConfirmer = !isSubmitter && hasPendingSubmission
  
  console.log('Current player ID:', currentPlayerId)
  console.log('Is submitter:', isSubmitter)
  console.log('Is confirmer:', isConfirmer)

  // Submit result mutation
  const submitMutation = trpc.matchManagement.submitResult.useMutation({
    onMutate: () => {
      setIsSubmitting(true)
      setSuccessMessage('')
      setErrorMessage('')
    },
    onSuccess: (data: any) => {
      setSuccessMessage(data.message)
      setIsSubmitting(false)
      
      // Reset form if match is completed
      if (!data.requiresConfirmation && !data.disputed) {
        setWinnerId('')
        setPlayer1Score('0')
        setPlayer2Score('0')
        setShowDifferentResultForm(false)
      } else if (data.disputed) {
        // If dispute created, reset the form view
        setShowDifferentResultForm(false)
      }
      
      if (onSuccess) {
        onSuccess()
      }
    },
    onError: (error: any) => {
      setErrorMessage(error.message)
      setIsSubmitting(false)
    }
  } as any)

  // Confirm result mutation
  const confirmMutation = trpc.matchManagement.confirmResult.useMutation({
    onMutate: () => {
      setIsSubmitting(true)
      setSuccessMessage('')
      setErrorMessage('')
    },
    onSuccess: (data: any) => {
      setSuccessMessage(data.message)
      setIsSubmitting(false)
      
      if (onSuccess) {
        onSuccess()
      }
    },
    onError: (error: any) => {
      setErrorMessage(error.message)
      setIsSubmitting(false)
    }
  } as any)

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!winnerId) {
      setErrorMessage('Please select a winner')
      return
    }

    const p1Score = parseInt(player1Score, 10)
    const p2Score = parseInt(player2Score, 10)

    if (isNaN(p1Score) || isNaN(p2Score) || p1Score < 0 || p2Score < 0) {
      setErrorMessage('Scores must be non-negative numbers')
      return
    }

    submitMutation.mutate({
      matchId: match.id,
      winnerId: winnerId === 'draw' ? null : winnerId,
      player1Score: p1Score,
      player2Score: p2Score
    })
  }

  // Handle confirmation
  const handleConfirm = () => {
    confirmMutation.mutate({
      matchId: match.id
    })
  }

  // Reset messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage])

  // Don't show form if user is not in the match
  if (!isInMatch) {
    return (
      <ModalForm
        className="w-full max-w-sm mx-auto"
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span>You are not a participant in this match</span>
        </div>
      </ModalForm>
    )
  }

  // Don't allow submission if current player is dropped
  if (isCurrentPlayerDropped) {
    return (
      <ModalForm
        className="w-full max-w-sm mx-auto"
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <h2 className="text-base font-semibold">Player Dropped</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            You have been dropped from this tournament and cannot submit match results.
          </p>
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg rounded-lg">
            <p className="text-sm text-muted-foreground">
              You are no longer an active participant in this tournament. 
              If you believe this is an error, please contact the tournament organizer.
            </p>
          </div>
        </div>
      </ModalForm>
    )
  }

  // Show message if opponent is dropped
  if (isEitherPlayerDropped && !isCurrentPlayerDropped) {
    const droppedPlayerName = isPlayer1Dropped ? player1Name : player2Name
    
    return (
      <ModalForm
        className="w-full max-w-sm mx-auto"
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <h2 className="text-base font-semibold">Opponent Dropped</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Your opponent has been dropped from the tournament.
          </p>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
            <p className="text-sm text-muted-foreground">
              {droppedPlayerName} has been dropped from the tournament. 
              The tournament organizer will handle this match accordingly.
            </p>
          </div>
        </div>
      </ModalForm>
    )
  }

  // Show completed status
  if (isCompleted) {
    const winnerName = match.winnerId === match.player1Id ? player1Name : 
                       match.winnerId === match.player2Id ? player2Name : 
                       'Draw'
    
    return (
      <ModalForm
        className="w-full max-w-sm mx-auto"
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h2 className="text-base font-semibold">Match Completed</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            This match has been completed and results are final.
          </p>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                <span className="font-medium">Winner:</span>
              </div>
              <span className="font-semibold">{winnerName}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">{player1Name}</div>
                <div className="text-2xl font-bold">{match.player1Score ?? 0}</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">{player2Name}</div>
                <div className="text-2xl font-bold">{match.player2Score ?? 0}</div>
              </div>
            </div>
          </div>
        </div>
      </ModalForm>
    )
  }

  // Show disputed status
  if (isDisputed) {
    return (
      <ModalForm
        className="w-full max-w-sm mx-auto"
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <h2 className="text-base font-semibold">Match Disputed</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Players disagreed on the match result. Waiting for organizer resolution.
          </p>
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              The tournament organizer has been notified and will resolve this dispute.
              You will be notified once the match result is finalized.
            </p>
          </div>
        </div>
      </ModalForm>
    )
  }

  // Show pending confirmation status
  if (hasPendingSubmission && !showDifferentResultForm) {
    // Use submitted scores if available, otherwise fall back to match scores
    // Log what we're using for display
    console.log('Display scores - submittedScores:', submittedScores, 'match scores:', { 
      player1Score: match.player1Score, 
      player2Score: match.player2Score, 
      winnerId: match.winnerId 
    })
    
    const displayPlayer1Score = submittedScores?.player1Score ?? match.player1Score ?? 0
    const displayPlayer2Score = submittedScores?.player2Score ?? match.player2Score ?? 0
    const displayWinnerId = submittedScores?.winnerId ?? match.winnerId
    
    console.log('Final display values:', { displayPlayer1Score, displayPlayer2Score, displayWinnerId })

    if (isSubmitter) {
      // Show waiting message for the submitter
      return (
        <ModalForm
          className="w-full max-w-sm mx-auto"
          onSubmit={(e) => {
            e.preventDefault()
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <h2 className="text-base font-semibold">Waiting for Confirmation</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              You have submitted the match result. Waiting for your opponent to confirm.
            </p>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">
                Your submitted result:
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-background rounded-lg border">
                  <div className="text-sm text-muted-foreground mb-1">{player1Name}</div>
                  <div className="text-2xl font-bold">{displayPlayer1Score}</div>
                </div>
                <div className="text-center p-3 bg-background rounded-lg border">
                  <div className="text-sm text-muted-foreground mb-1">{player2Name}</div>
                  <div className="text-2xl font-bold">{displayPlayer2Score}</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                <span className="text-sm font-medium">Winner:</span>
                <span className="font-semibold">
                  {displayWinnerId === match.player1Id ? player1Name : 
                   displayWinnerId === match.player2Id ? player2Name : 
                   'Draw'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                Your opponent will be notified to review and confirm this result.
              </p>
            </div>

            <FormStatus success={successMessage} error={errorMessage} />
          </div>
        </ModalForm>
      )
    }

    // Show confirmation screen for the confirmer, using modal form styling for consistency
    const winnerDisplayName =
      displayWinnerId === match.player1Id ? player1Name :
      displayWinnerId === match.player2Id ? player2Name :
      'Draw'

    const scoreSummary = `${displayPlayer1Score}-${displayPlayer2Score}`

    return (
      <ModalForm
        className="w-full max-w-sm mx-auto"
        onSubmit={(e) => {
          e.preventDefault()
          handleConfirm()
        }}
        onCancel={() => {
          // Switch to submission form to allow submitting different result
          setShowDifferentResultForm(true)
          setWinnerId('')
          setPlayer1Score('0')
          setPlayer2Score('0')
          setErrorMessage('')
          setSuccessMessage('')
        }}
      >
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-semibold">Pending Confirmation</h2>
              <p className="text-sm text-muted-foreground">
                Your opponent submitted this result. Review the details and confirm, or submit a different result if it’s wrong.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 items-center text-base divide-x divide-border rounded-lg border">
            <div className="px-3 py-2 flex justify-center">
              <Badge className="px-3 py-1 text-sm font-semibold">
                {winnerDisplayName}
              </Badge>
            </div>
            <div className="px-3 py-2 flex justify-center">
              <span className="text-sm text-muted-foreground">
                ({scoreSummary})
              </span>
            </div>
          </div>

          <FormActions
            onCancel={() => {
              // Switch to submission form to allow submitting different result
              setShowDifferentResultForm(true)
              setWinnerId('')
              setPlayer1Score('0')
              setPlayer2Score('0')
              setErrorMessage('')
              setSuccessMessage('')
            }}
            isSubmitting={isSubmitting}
            isValid
            showReset={false}
            showCancel={true}
            submitLabel={isSubmitting ? 'Confirming...' : 'Confirm Result'}
            cancelLabel="Submit Different Result"
            className="pt-0"
          />

          <FormStatus success={successMessage} error={errorMessage} />
        </div>
      </ModalForm>
    )
  }

  // Show submission form
  return (
    <ModalForm
      className="w-full max-w-sm mx-auto"
      onSubmit={(e) => handleSubmit(e)}
      onCancel={onCancel}
    >
      <div className="space-y-6">
        {/* Context: round / table */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>
            Round {match.round} {match.table ? `• Table ${match.table}` : ''}
          </span>
        </div>

        {/* Match Info */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-4 bg-muted/50 rounded-lg gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-3 w-full">
            <div className="text-center flex-1">
              <Badge variant={isPlayer1 ? 'default' : 'secondary'} className="truncate max-w-full">
                {player1Name}
                {isPlayer1 ? ' (You)' : ''}
              </Badge>
            </div>
            <span className="text-muted-foreground">vs</span>
            <div className="text-center flex-1">
              <Badge variant={isPlayer2 ? 'default' : 'secondary'} className="truncate max-w-full">
                {player2Name}
                {isPlayer2 ? ' (You)' : ''}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Winner Selection */}
        <FormSelect
          label="Match Winner"
          required
          value={winnerId}
          onValueChange={setWinnerId}
          options={[
            { value: match.player1Id, label: player1Name },
            { value: match.player2Id, label: player2Name },
            { value: 'draw', label: 'Draw' }
          ]}
          placeholder="Select the winner"
        />

        {/* Score Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label={`${player1Name} Score`} required>
            <input
              type="number"
              min="0"
              value={player1Score}
              onChange={(e) => setPlayer1Score(e.target.value)}
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            />
          </FormField>

          <FormField label={`${player2Name} Score`} required>
            <input
              type="number"
              min="0"
              value={player2Score}
              onChange={(e) => setPlayer2Score(e.target.value)}
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            />
          </FormField>
        </div>

        {/* Info Message - only for different result flow */}
        {showDifferentResultForm && (
          <div className="p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
            <p className="text-sm text-muted-foreground">
              Submitting a different result will create a dispute. The tournament organizer will review both submissions and make a final decision.
            </p>
          </div>
        )}

        {/* Actions */}
        <FormActions
          onCancel={onCancel}
          isSubmitting={isSubmitting}
          isValid={!!winnerId}
          // We don't use reset here, just cancel + submit
          showReset={false}
          showCancel={true}
          submitLabel="Submit"
          cancelLabel="Cancel"
          className="pt-2"
        />

        {/* Status Messages */}
        <FormStatus success={successMessage} error={errorMessage} />
      </div>
    </ModalForm>
  )
}
