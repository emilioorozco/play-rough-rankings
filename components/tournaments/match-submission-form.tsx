'use client'

import React, { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField, FormSelect, FormStatus } from '@/components/ui/form-components'
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
  className?: string
}

export function MatchSubmissionForm({
  match,
  currentUser,
  onSuccess,
  className
}: MatchSubmissionFormProps) {
  const [winnerId, setWinnerId] = useState<string>('')
  const [player1Score, setPlayer1Score] = useState<string>('0')
  const [player2Score, setPlayer2Score] = useState<string>('0')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Determine if current user is in this match by checking user IDs
  const isPlayer1 = currentUser?.id === match.player1.user.id
  const isPlayer2 = currentUser?.id === match.player2.user.id
  const isInMatch = isPlayer1 || isPlayer2

  // Check if either player is dropped by querying tournament entries
  const tournamentQuery = trpc.tournaments.getById.useQuery({
    id: match.tournamentId,
    includeParticipants: true
  })

  const entries = tournamentQuery.data?.entries || []
  const player1Entry = entries.find((e: any) => e.playerId === match.player1Id)
  const player2Entry = entries.find((e: any) => e.playerId === match.player2Id)
  const isPlayer1Dropped = player1Entry?.dropped || false
  const isPlayer2Dropped = player2Entry?.dropped || false
  const isCurrentPlayerDropped = isPlayer1 ? isPlayer1Dropped : isPlayer2Dropped
  const isEitherPlayerDropped = isPlayer1Dropped || isPlayer2Dropped

  // Get player names
  const player1Name = match.player1.user.firstName
    ? `${match.player1.user.firstName} ${match.player1.user.lastName || ''}`.trim()
    : match.player1.user.name || 'Player 1'
  
  const player2Name = match.player2.user.firstName
    ? `${match.player2.user.firstName} ${match.player2.user.lastName || ''}`.trim()
    : match.player2.user.name || 'Player 2'

  // Check if there's a pending submission
  const hasPendingSubmission = match.status === 'IN_PROGRESS'
  const isDisputed = match.status === 'DISPUTED'
  const isCompleted = match.status === 'COMPLETED'

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
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>You are not a participant in this match</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Don't allow submission if current player is dropped
  if (isCurrentPlayerDropped) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Player Dropped</CardTitle>
          </div>
          <CardDescription>
            You have been dropped from this tournament and cannot submit match results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              You are no longer an active participant in this tournament. 
              If you believe this is an error, please contact the tournament organizer.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show message if opponent is dropped
  if (isEitherPlayerDropped && !isCurrentPlayerDropped) {
    const droppedPlayerName = isPlayer1Dropped ? player1Name : player2Name
    
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <CardTitle>Opponent Dropped</CardTitle>
          </div>
          <CardDescription>
            Your opponent has been dropped from the tournament
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
            <p className="text-sm text-muted-foreground">
              {droppedPlayerName} has been dropped from the tournament. 
              The tournament organizer will handle this match accordingly.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show completed status
  if (isCompleted) {
    const winnerName = match.winnerId === match.player1Id ? player1Name : 
                       match.winnerId === match.player2Id ? player2Name : 
                       'Draw'
    
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle>Match Completed</CardTitle>
          </div>
          <CardDescription>
            This match has been completed and results are final
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    )
  }

  // Show disputed status
  if (isDisputed) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Match Disputed</CardTitle>
          </div>
          <CardDescription>
            Players disagreed on the match result. Waiting for organizer resolution.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              The tournament organizer has been notified and will resolve this dispute.
              You will be notified once the match result is finalized.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show pending confirmation status
  if (hasPendingSubmission) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            <CardTitle>Pending Confirmation</CardTitle>
          </div>
          <CardDescription>
            Match result has been submitted and is waiting for opponent confirmation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">
                Your opponent has submitted the match result. Please review and confirm:
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-background rounded-lg border">
                  <div className="text-sm text-muted-foreground mb-1">{player1Name}</div>
                  <div className="text-2xl font-bold">{match.player1Score ?? 0}</div>
                </div>
                <div className="text-center p-3 bg-background rounded-lg border">
                  <div className="text-sm text-muted-foreground mb-1">{player2Name}</div>
                  <div className="text-2xl font-bold">{match.player2Score ?? 0}</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                <span className="text-sm font-medium">Winner:</span>
                <span className="font-semibold">
                  {match.winnerId === match.player1Id ? player1Name : 
                   match.winnerId === match.player2Id ? player2Name : 
                   'Draw'}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirm Result
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  // Allow submitting different result which will create dispute
                  setWinnerId('')
                  setPlayer1Score('0')
                  setPlayer2Score('0')
                }}
                disabled={isSubmitting}
              >
                Submit Different Result
              </Button>
            </div>

            <FormStatus success={successMessage} error={errorMessage} />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show submission form
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <CardTitle>Submit Match Result</CardTitle>
        </div>
        <CardDescription>
          Round {match.round} {match.table ? `• Table ${match.table}` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Match Info */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">
                  {player1Name}
                </div>
                <Badge variant={isPlayer1 ? 'default' : 'secondary'}>
                  {isPlayer1 ? 'You' : 'Opponent'}
                </Badge>
              </div>
              <span className="text-muted-foreground">vs</span>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">
                  {player2Name}
                </div>
                <Badge variant={isPlayer2 ? 'default' : 'secondary'}>
                  {isPlayer2 ? 'You' : 'Opponent'}
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
          <div className="grid grid-cols-2 gap-4">
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

          {/* Info Message */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
            <p className="text-sm text-muted-foreground">
              After you submit, your opponent will need to confirm the result. If they disagree,
              the match will be flagged for organizer review.
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || !winnerId}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Result'
            )}
          </Button>

          {/* Status Messages */}
          <FormStatus success={successMessage} error={errorMessage} />
        </form>
      </CardContent>
    </Card>
  )
}
