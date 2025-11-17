'use client'

import React, { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField, FormSelect, FormTextarea } from '@/components/ui/form-components'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Modal } from '@/components/ui/modal'
import { 
  AlertCircle, 
  CheckCircle, 
  Shield, 
  XCircle,
  Clock,
  FileText,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface OrganizerMatchControlsProps {
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

export function OrganizerMatchControls({
  match,
  currentUser,
  onSuccess,
  className
}: OrganizerMatchControlsProps) {
  // Modal states
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [showNoShowModal, setShowNoShowModal] = useState(false)
  const [showAuditModal, setShowAuditModal] = useState(false)

  // Form states
  const [winnerId, setWinnerId] = useState<string>('')
  const [player1Score, setPlayer1Score] = useState<string>('0')
  const [player2Score, setPlayer2Score] = useState<string>('0')
  const [reason, setReason] = useState<string>('')
  const [noShowWinnerId, setNoShowWinnerId] = useState<string>('')

  // Status states
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  // Check if user is organizer or admin
  const isOrganizer = currentUser?.role === 'admin' || currentUser?.role === 'organizer'
  const isDisputed = match.status === 'DISPUTED'
  const isCompleted = match.status === 'COMPLETED'
  const isPending = match.status === 'PENDING'
  const isInProgress = match.status === 'IN_PROGRESS'

  // Get player names
  const player1Name = match.player1.user.firstName
    ? `${match.player1.user.firstName} ${match.player1.user.lastName || ''}`.trim()
    : match.player1.user.name || 'Player 1'
  
  const player2Name = match.player2.user.firstName
    ? `${match.player2.user.firstName} ${match.player2.user.lastName || ''}`.trim()
    : match.player2.user.name || 'Player 2'

  // tRPC mutations
  const overrideMutation = trpc.matchManagement.organizerSubmitResult.useMutation({
    onSuccess: (data: any) => {
      setSuccessMessage(data.message)
      setShowOverrideModal(false)
      resetForm()
      onSuccess?.()
    },
    onError: (error: any) => {
      setErrorMessage(error.message)
    }
  } as any)

  const disputeMutation = trpc.matchManagement.resolveDispute.useMutation({
    onSuccess: (data: any) => {
      setSuccessMessage(data.message)
      setShowDisputeModal(false)
      resetForm()
      onSuccess?.()
    },
    onError: (error: any) => {
      setErrorMessage(error.message)
    }
  } as any)

  const noShowMutation = trpc.matchManagement.awardNoShow.useMutation({
    onSuccess: (data: any) => {
      setSuccessMessage(data.message)
      setShowNoShowModal(false)
      setNoShowWinnerId('')
      onSuccess?.()
    },
    onError: (error: any) => {
      setErrorMessage(error.message)
    }
  } as any)

  // Reset form
  const resetForm = () => {
    setWinnerId('')
    setPlayer1Score('0')
    setPlayer2Score('0')
    setReason('')
  }

  // Handle override submission
  const handleOverride = () => {
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

    overrideMutation.mutate({
      matchId: match.id,
      winnerId: winnerId === 'draw' ? null : winnerId,
      player1Score: p1Score,
      player2Score: p2Score,
      reason: reason || undefined
    })
  }

  // Handle dispute resolution
  const handleResolveDispute = () => {
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

    disputeMutation.mutate({
      matchId: match.id,
      winnerId: winnerId === 'draw' ? null : winnerId,
      player1Score: p1Score,
      player2Score: p2Score
    })
  }

  // Handle no-show award
  const handleNoShow = () => {
    if (!noShowWinnerId) {
      setErrorMessage('Please select the present player')
      return
    }

    noShowMutation.mutate({
      matchId: match.id,
      winnerId: noShowWinnerId
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

  // Don't show controls if user is not organizer
  if (!isOrganizer) {
    return null
  }

  const isLoading = overrideMutation.isPending || disputeMutation.isPending || noShowMutation.isPending

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Organizer Controls</CardTitle>
          </div>
          <CardDescription>
            Manage match results and resolve disputes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Match Status */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm font-medium">Match Status</p>
              <p className="text-xs text-muted-foreground">
                Round {match.round} {match.table ? `• Table ${match.table}` : ''}
              </p>
            </div>
            <Badge 
              variant={
                isCompleted ? 'default' : 
                isDisputed ? 'destructive' : 
                isInProgress ? 'secondary' : 
                'outline'
              }
            >
              {match.status}
            </Badge>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <p className="text-sm text-green-800 dark:text-green-200">{successMessage}</p>
            </div>
          )}
          
          {errorMessage && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
            </div>
          )}

          {/* Disputed Match Alert */}
          {isDisputed && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Match Disputed
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Players disagreed on the match result. Please review and resolve the dispute.
                  </p>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Override Result */}
            {!isCompleted && (
              <Button
                onClick={() => setShowOverrideModal(true)}
                disabled={isLoading}
                className="w-full"
                variant="outline"
              >
                <Shield className="mr-2 h-4 w-4" />
                Override Match Result
              </Button>
            )}

            {/* Resolve Dispute */}
            {isDisputed && (
              <Button
                onClick={() => setShowDisputeModal(true)}
                disabled={isLoading}
                className="w-full"
                variant="default"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Resolve Dispute
              </Button>
            )}

            {/* Award No-Show */}
            {(isPending || isInProgress) && (
              <Button
                onClick={() => setShowNoShowModal(true)}
                disabled={isLoading}
                className="w-full"
                variant="outline"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Award No-Show
              </Button>
            )}

            {/* View Audit Trail */}
            <Button
              onClick={() => setShowAuditModal(true)}
              disabled={isLoading}
              className="w-full"
              variant="ghost"
            >
              <FileText className="mr-2 h-4 w-4" />
              View Audit Trail
            </Button>
          </div>

          {/* Current Result Display (if completed) */}
          {isCompleted && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-medium">Current Result</p>
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
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium">Winner:</span>
                  <span className="font-semibold">
                    {match.winnerId === match.player1Id ? player1Name : 
                     match.winnerId === match.player2Id ? player2Name : 
                     'Draw'}
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Override Result Modal */}
      <Modal
        isOpen={showOverrideModal}
        onClose={() => {
          setShowOverrideModal(false)
          resetForm()
          setErrorMessage('')
        }}
        title="Override Match Result"
        description="Submit the correct match result as organizer"
        size="md"
        onSubmit={handleOverride}
        onCancel={() => {
          setShowOverrideModal(false)
          resetForm()
          setErrorMessage('')
        }}
        isSubmitting={overrideMutation.isPending}
        submitLabel="Submit Result"
        showCancel={true}
      >
        <div className="space-y-4">
          {/* Match Info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">Match Participants</p>
            <div className="flex items-center justify-between text-sm">
              <span>{player1Name}</span>
              <span className="text-muted-foreground">vs</span>
              <span>{player2Name}</span>
            </div>
          </div>

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

          {/* Reason Input */}
          <FormTextarea
            label="Reason (Optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why you're overriding the result..."
            rows={3}
            description="This will be logged in the audit trail"
          />

          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Resolve Dispute Modal */}
      <Modal
        isOpen={showDisputeModal}
        onClose={() => {
          setShowDisputeModal(false)
          resetForm()
          setErrorMessage('')
        }}
        title="Resolve Match Dispute"
        description="Provide the correct match result to resolve the dispute"
        size="md"
        onSubmit={handleResolveDispute}
        onCancel={() => {
          setShowDisputeModal(false)
          resetForm()
          setErrorMessage('')
        }}
        isSubmitting={disputeMutation.isPending}
        submitLabel="Resolve Dispute"
        showCancel={true}
      >
        <div className="space-y-4">
          {/* Dispute Alert */}
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Players submitted conflicting results. Review the situation and provide the correct outcome.
              </p>
            </div>
          </div>

          {/* Match Info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">Match Participants</p>
            <div className="flex items-center justify-between text-sm">
              <span>{player1Name}</span>
              <span className="text-muted-foreground">vs</span>
              <span>{player2Name}</span>
            </div>
          </div>

          {/* Winner Selection */}
          <FormSelect
            label="Correct Winner"
            required
            value={winnerId}
            onValueChange={setWinnerId}
            options={[
              { value: match.player1Id, label: player1Name },
              { value: match.player2Id, label: player2Name },
              { value: 'draw', label: 'Draw' }
            ]}
            placeholder="Select the correct winner"
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

          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Award No-Show Modal */}
      <Modal
        isOpen={showNoShowModal}
        onClose={() => {
          setShowNoShowModal(false)
          setNoShowWinnerId('')
          setErrorMessage('')
        }}
        title="Award Match - No-Show"
        description="Award the match to the present player"
        size="md"
        onSubmit={handleNoShow}
        onCancel={() => {
          setShowNoShowModal(false)
          setNoShowWinnerId('')
          setErrorMessage('')
        }}
        isSubmitting={noShowMutation.isPending}
        submitLabel="Award Match"
        showCancel={true}
      >
        <div className="space-y-4">
          {/* No-Show Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              This will award a 2-0 victory to the present player and mark the match as completed.
            </p>
          </div>

          {/* Match Info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">Match Participants</p>
            <div className="flex items-center justify-between text-sm">
              <span>{player1Name}</span>
              <span className="text-muted-foreground">vs</span>
              <span>{player2Name}</span>
            </div>
          </div>

          {/* Winner Selection */}
          <FormSelect
            label="Present Player (Winner)"
            required
            value={noShowWinnerId}
            onValueChange={setNoShowWinnerId}
            options={[
              { value: match.player1Id, label: player1Name },
              { value: match.player2Id, label: player2Name }
            ]}
            placeholder="Select the present player"
            description="The player who showed up for the match"
          />

          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Audit Trail Modal */}
      <Modal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        title="Match Audit Trail"
        description="Complete history of all actions for this match"
        size="lg"
        showCancel={false}
        submitLabel="Close"
        onSubmit={() => setShowAuditModal(false)}
      >
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Audit trail functionality will be implemented with the audit logger integration</span>
            </div>
          </div>
          
          {/* Placeholder for audit trail entries */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Recent Actions</p>
            <div className="text-sm text-muted-foreground text-center py-8">
              No audit entries available yet
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
