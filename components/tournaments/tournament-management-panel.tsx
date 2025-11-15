'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { Modal } from '@/components/ui/modal'
import { FormInput, FormTextarea } from '@/components/ui/form-components'
import { 
  Play, 
  SkipForward, 
  CheckCircle, 
  Pause, 
  PlayCircle, 
  XCircle,
  AlertCircle,
  Loader2,
  Trophy,
  Users,
  Calendar
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { cn } from '@/lib/utils'
import type { ApiTournament } from '@/lib/types/api'

interface TournamentManagementPanelProps {
  tournament: ApiTournament
  onUpdate?: () => void
}

export function TournamentManagementPanel({ 
  tournament,
  onUpdate 
}: TournamentManagementPanelProps) {
  // Modal states
  const [showStartConfirm, setShowStartConfirm] = useState(false)
  const [showAdvanceConfirm, setShowAdvanceConfirm] = useState(false)
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [showPauseModal, setShowPauseModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  
  // Form states
  const [pauseReason, setPauseReason] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  
  // Loading and error states
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // tRPC mutations
  const startMutation = trpc.tournamentLifecycle.start.useMutation()
  const advanceMutation = trpc.tournamentLifecycle.advanceRound.useMutation()
  const completeMutation = trpc.tournamentLifecycle.complete.useMutation()
  const pauseMutation = trpc.tournamentLifecycle.pause.useMutation()
  const resumeMutation = trpc.tournamentLifecycle.resume.useMutation()
  const cancelMutation = trpc.tournamentLifecycle.cancel.useMutation()

  // Get current round from metadata or matches
  const getCurrentRound = () => {
    if (!tournament.matches || tournament.matches.length === 0) return 0
    return Math.max(...tournament.matches.map(m => m.round))
  }

  const currentRound = getCurrentRound()

  // Check if all current round matches are completed
  const areAllMatchesCompleted = () => {
    if (!tournament.matches || tournament.matches.length === 0) return false
    const currentRoundMatches = tournament.matches.filter(m => m.round === currentRound)
    return currentRoundMatches.length > 0 && currentRoundMatches.every(m => m.status === 'COMPLETED')
  }

  // Handle start tournament
  const handleStart = async () => {
    setActionError(null)
    setActionSuccess(null)
    
    try {
      const result = await startMutation.mutateAsync({
        tournamentId: tournament.id
      })
      
      setActionSuccess(result.message)
      setShowStartConfirm(false)
      onUpdate?.()
    } catch (error: any) {
      setActionError(error.message || 'Failed to start tournament')
    }
  }

  // Handle advance round
  const handleAdvance = async () => {
    setActionError(null)
    setActionSuccess(null)
    
    try {
      const result = await advanceMutation.mutateAsync({
        tournamentId: tournament.id
      })
      
      setActionSuccess(result.message)
      setShowAdvanceConfirm(false)
      onUpdate?.()
    } catch (error: any) {
      setActionError(error.message || 'Failed to advance round')
    }
  }

  // Handle complete tournament
  const handleComplete = async () => {
    setActionError(null)
    setActionSuccess(null)
    
    try {
      const result = await completeMutation.mutateAsync({
        tournamentId: tournament.id
      })
      
      setActionSuccess(result.message)
      setShowCompleteConfirm(false)
      onUpdate?.()
    } catch (error: any) {
      setActionError(error.message || 'Failed to complete tournament')
    }
  }

  // Handle pause tournament
  const handlePause = async () => {
    setActionError(null)
    setActionSuccess(null)
    
    try {
      const result = await pauseMutation.mutateAsync({
        tournamentId: tournament.id,
        reason: pauseReason || undefined
      })
      
      setActionSuccess(result.message)
      setShowPauseModal(false)
      setPauseReason('')
      onUpdate?.()
    } catch (error: any) {
      setActionError(error.message || 'Failed to pause tournament')
    }
  }

  // Handle resume tournament
  const handleResume = async () => {
    setActionError(null)
    setActionSuccess(null)
    
    try {
      const result = await resumeMutation.mutateAsync({
        tournamentId: tournament.id
      })
      
      setActionSuccess(result.message)
      onUpdate?.()
    } catch (error: any) {
      setActionError(error.message || 'Failed to resume tournament')
    }
  }

  // Handle cancel tournament
  const handleCancel = async () => {
    setActionError(null)
    setActionSuccess(null)
    
    if (!cancelReason.trim()) {
      setActionError('Cancellation reason is required')
      return
    }
    
    try {
      const result = await cancelMutation.mutateAsync({
        tournamentId: tournament.id,
        reason: cancelReason
      })
      
      setActionSuccess(result.message)
      setShowCancelModal(false)
      setCancelReason('')
      onUpdate?.()
    } catch (error: any) {
      setActionError(error.message || 'Failed to cancel tournament')
    }
  }

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'UPCOMING':
        return 'default'
      case 'ACTIVE':
        return 'default'
      case 'PAUSED':
        return 'secondary'
      case 'COMPLETED':
        return 'default'
      case 'CANCELLED':
        return 'destructive'
      default:
        return 'default'
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UPCOMING':
        return 'text-blue-600'
      case 'ACTIVE':
        return 'text-green-600'
      case 'PAUSED':
        return 'text-yellow-600'
      case 'COMPLETED':
        return 'text-gray-600'
      case 'CANCELLED':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const isLoading = startMutation.isPending || 
                    advanceMutation.isPending || 
                    completeMutation.isPending || 
                    pauseMutation.isPending || 
                    resumeMutation.isPending || 
                    cancelMutation.isPending

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Tournament Management</span>
            <Badge 
              variant={getStatusVariant(tournament.status)}
              className={cn(getStatusColor(tournament.status))}
            >
              {tournament.status}
            </Badge>
          </CardTitle>
          <CardDescription>
            Manage tournament lifecycle and progression
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tournament Status Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Trophy className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Current Round</p>
                <p className="text-2xl font-bold">{currentRound || 'Not Started'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Participants</p>
                <p className="text-2xl font-bold">{tournament.participants?.length || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Matches</p>
                <p className="text-2xl font-bold">{tournament.matchCount || 0}</p>
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {actionSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <p className="text-sm text-green-800">{actionSuccess}</p>
            </div>
          )}
          
          {actionError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <p className="text-sm text-red-800">{actionError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Start Tournament */}
            {tournament.status === 'UPCOMING' && (
              <Button
                onClick={() => setShowStartConfirm(true)}
                disabled={isLoading || (tournament.participants?.length || 0) < 2}
                className="w-full"
                size="lg"
              >
                <Play className="mr-2 h-4 w-4" />
                Start Tournament
              </Button>
            )}

            {/* Advance Round */}
            {tournament.status === 'ACTIVE' && (
              <Button
                onClick={() => setShowAdvanceConfirm(true)}
                disabled={isLoading || !areAllMatchesCompleted()}
                className="w-full"
                size="lg"
              >
                <SkipForward className="mr-2 h-4 w-4" />
                Advance to Next Round
              </Button>
            )}

            {/* Complete Tournament */}
            {tournament.status === 'ACTIVE' && (
              <Button
                onClick={() => setShowCompleteConfirm(true)}
                disabled={isLoading || !areAllMatchesCompleted()}
                className="w-full"
                size="lg"
                variant="default"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete Tournament
              </Button>
            )}

            {/* Pause/Resume Toggle */}
            {tournament.status === 'ACTIVE' && (
              <Button
                onClick={() => setShowPauseModal(true)}
                disabled={isLoading}
                className="w-full"
                size="lg"
                variant="outline"
              >
                <Pause className="mr-2 h-4 w-4" />
                Pause Tournament
              </Button>
            )}

            {tournament.status === 'PAUSED' && (
              <Button
                onClick={handleResume}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlayCircle className="mr-2 h-4 w-4" />
                )}
                Resume Tournament
              </Button>
            )}

            {/* Cancel Tournament */}
            {(tournament.status === 'UPCOMING' || 
              tournament.status === 'ACTIVE' || 
              tournament.status === 'PAUSED') && (
              <Button
                onClick={() => setShowCancelModal(true)}
                disabled={isLoading}
                className="w-full"
                size="lg"
                variant="destructive"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Tournament
              </Button>
            )}
          </div>

          {/* Validation Messages */}
          {tournament.status === 'UPCOMING' && (tournament.participants?.length || 0) < 2 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-800">
                At least 2 participants are required to start the tournament
              </p>
            </div>
          )}

          {tournament.status === 'ACTIVE' && !areAllMatchesCompleted() && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-800">
                All matches in the current round must be completed before advancing
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Start Tournament Confirmation */}
      <ConfirmationModal
        isOpen={showStartConfirm}
        onClose={() => setShowStartConfirm(false)}
        onConfirm={handleStart}
        title="Start Tournament"
        message={`Are you sure you want to start "${tournament.name}"? This will generate initial pairings and begin the tournament.`}
        confirmLabel="Start Tournament"
        variant="default"
        isLoading={startMutation.isPending}
        error={actionError || undefined}
        success={actionSuccess || undefined}
      />

      {/* Advance Round Confirmation */}
      <ConfirmationModal
        isOpen={showAdvanceConfirm}
        onClose={() => setShowAdvanceConfirm(false)}
        onConfirm={handleAdvance}
        title="Advance to Next Round"
        message={`Are you sure you want to advance to round ${currentRound + 1}? This will generate new pairings based on current standings.`}
        confirmLabel="Advance Round"
        variant="default"
        isLoading={advanceMutation.isPending}
        error={actionError || undefined}
        success={actionSuccess || undefined}
      />

      {/* Complete Tournament Confirmation */}
      <ConfirmationModal
        isOpen={showCompleteConfirm}
        onClose={() => setShowCompleteConfirm(false)}
        onConfirm={handleComplete}
        title="Complete Tournament"
        message={`Are you sure you want to complete "${tournament.name}"? This will finalize standings and apply rating changes. This action cannot be undone.`}
        confirmLabel="Complete Tournament"
        variant="default"
        isLoading={completeMutation.isPending}
        error={actionError || undefined}
        success={actionSuccess || undefined}
      />

      {/* Pause Tournament Modal */}
      <Modal
        isOpen={showPauseModal}
        onClose={() => {
          setShowPauseModal(false)
          setPauseReason('')
          setActionError(null)
        }}
        title="Pause Tournament"
        description="Provide an optional reason for pausing the tournament"
        size="md"
        onSubmit={handlePause}
        onCancel={() => {
          setShowPauseModal(false)
          setPauseReason('')
          setActionError(null)
        }}
        isSubmitting={pauseMutation.isPending}
        submitLabel="Pause Tournament"
        showCancel={true}
        error={actionError || undefined}
        success={actionSuccess || undefined}
      >
        <FormTextarea
          label="Reason (Optional)"
          value={pauseReason}
          onChange={(e) => setPauseReason(e.target.value)}
          placeholder="e.g., Lunch break, technical issues, etc."
          rows={3}
        />
      </Modal>

      {/* Cancel Tournament Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false)
          setCancelReason('')
          setActionError(null)
        }}
        title="Cancel Tournament"
        description="Provide a reason for cancelling the tournament"
        size="md"
        onSubmit={handleCancel}
        onCancel={() => {
          setShowCancelModal(false)
          setCancelReason('')
          setActionError(null)
        }}
        isSubmitting={cancelMutation.isPending}
        isValid={cancelReason.trim().length > 0}
        submitLabel="Cancel Tournament"
        submitVariant="destructive"
        showCancel={true}
        error={actionError || undefined}
        success={actionSuccess || undefined}
      >
        <FormTextarea
          label="Cancellation Reason"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Explain why the tournament is being cancelled..."
          rows={3}
          required
          error={cancelReason.trim().length === 0 ? 'Reason is required' : undefined}
        />
      </Modal>
    </>
  )
}
