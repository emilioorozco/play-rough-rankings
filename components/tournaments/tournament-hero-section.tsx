'use client'

import { useEffect, useState } from 'react'
import {
  Clock,
  Play,
  CheckCircle,
  AlertCircle,
  Trophy,
  UserPlus,
  UserMinus,
  Settings,
  Share2,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TournamentRegistration } from './tournament-registration'
import { TournamentManagement } from './tournament-management'
import { LoginModal } from '@/components/auth/login-modal'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { trpc } from '@/lib/trpc/client'
import type { ApiTournament } from '@/lib/types/api'
import { 
  useModal, 
  useConfirmationModal, 
  useInteractions 
} from '@/stores/ui-store'
import { useTournamentStore } from '@/stores/tournament-store'

interface TournamentHeroSectionProps {
  tournament: ApiTournament
  isOrganizer: boolean
  canManage: boolean
  isRegistered: boolean
  currentUser?: {
    id: string
    role: string
    displayName?: string | null
    firstName?: string | null
    lastName?: string | null
    email?: string | null
  } | null
}

export function TournamentHeroSection({
  tournament,
  isOrganizer,
  canManage,
  isRegistered,
  currentUser,
}: TournamentHeroSectionProps) {
  // Use UI store for modal management
  const registrationModal = useModal('tournamentRegistration')
  const managementModal = useModal('tournamentManagement')
  const loginModal = useModal('login')
  const confirmationModal = useConfirmationModal()
  
  // Use UI store for interaction states
  const { 
    isWithdrawing, 
    withdrawSuccess, 
    setInteraction, 
    resetInteractions 
  } = useInteractions()
  
  // Local UI state for immediate registration status feedback
  const [localRegistrationStatus, setLocalRegistrationStatus] = useState<{
    isRegistered?: boolean
    canRegister?: boolean
    canWithdraw?: boolean
  }>({})

  // Use Tournament Store for state management
  const { setRegistrationStatus, invalidateTournament } = useTournamentStore()
  
  // Get tRPC utils for query invalidation
  const utils = trpc.useUtils()
  
  // Computed registration status - use local state for immediate feedback, fallback to server state
  const effectiveIsRegistered = localRegistrationStatus.isRegistered !== undefined 
    ? localRegistrationStatus.isRegistered 
    : isRegistered

  // Withdraw mutation
  const withdrawMutation = trpc.tournaments.unregister.useMutation({
    onSuccess: () => {
      setInteraction('isWithdrawing', false)
      setInteraction('withdrawSuccess', true)
      
      // Immediately update local UI state for instant feedback
      setLocalRegistrationStatus({
        isRegistered: false,
        canRegister: true,
        canWithdraw: false,
      })
      
      // Update tournament store state
      setRegistrationStatus(tournament.id, {
        isRegistered: false,
        canRegister: true,
        canWithdraw: false,
        isFull: false,
        participantCount: tournament.participants?.length || 0,
        maxPlayers: tournament.maxPlayers || undefined,
      })
      invalidateTournament(tournament.id)
      
      // Invalidate tRPC queries to trigger refetch
      utils.tournaments.getRegistrationStatus.invalidate({ tournamentId: tournament.id })
      utils.tournaments.getById.invalidate({ id: tournament.id })
    },
    onError: (error) => {
      setInteraction('isWithdrawing', false)
      setInteraction('withdrawSuccess', false)
      // Error will be displayed in the modal via error prop
    },
  })

  // Reset interactions when component unmounts or tournament changes
  useEffect(() => {
    return () => {
      resetInteractions()
    }
  }, [tournament.id, resetInteractions])
  
  // Reset local registration status when tournament changes
  useEffect(() => {
    setLocalRegistrationStatus({})
  }, [tournament.id])

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'UPCOMING':
        return 'default'
      case 'ACTIVE':
        return 'default'
      case 'COMPLETED':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'UPCOMING':
        return <Clock className="h-4 w-4" />
      case 'ACTIVE':
        return <Play className="h-4 w-4" />
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getLevelBadge = () => {
    if (!tournament.tournamentLevel) return null

    const levelVariants = {
      LOCAL: 'outline',
      REGIONAL: 'secondary',
      NATIONAL: 'default',
      INTERNATIONAL: 'destructive',
    }

    return (
      <Badge
        variant={(levelVariants as any)[tournament.tournamentLevel] || 'info'}
        className="dark:bg-accent dark:text-white dark:border-transparent"
      >
        {tournament.tournamentLevel.charAt(0).toUpperCase() + tournament.tournamentLevel.slice(1).toLowerCase()}
      </Badge>
    )
  }

  const handleRegistration = () => {
    if (!currentUser) {
      loginModal.open()
      return
    }
    
    if (effectiveIsRegistered) {
      handleWithdraw()
    } else {
      registrationModal.open({ tournamentId: tournament.id })
    }
  }

  const handleWithdraw = () => {
    confirmationModal.open({
      title: "Withdraw from Tournament",
      message: "Are you sure you want to withdraw from this tournament? Once the tournament registration closes, you will not be able to rejoin.",
      confirmLabel: "Withdraw",
      cancelLabel: "Cancel",
      variant: "destructive",
      onConfirm: confirmWithdraw,
      isLoading: isWithdrawing,
      error: withdrawMutation.error?.message,
      success: withdrawSuccess ? "Successfully withdrew from tournament!" : undefined,
      autoCloseDelay: withdrawSuccess ? 3 : 0,
    })
  }

  const confirmWithdraw = async () => {
    setInteraction('isWithdrawing', true)
    try {
      await withdrawMutation.mutateAsync({
        tournamentId: tournament.id,
      })
    } catch (error) {
      // Error handling is done in the mutation's onError callback
    }
  }

  const handleRegistrationSuccess = () => {
    registrationModal.close()
    
    // Immediately update local UI state for instant feedback
    setLocalRegistrationStatus({
      isRegistered: true,
      canRegister: false,
      canWithdraw: true,
    })
    
    // Update tournament store state
    setRegistrationStatus(tournament.id, {
      isRegistered: true,
      canRegister: false,
      canWithdraw: true,
      isFull: false,
      participantCount: (tournament.participants?.length || 0) + 1,
      maxPlayers: tournament.maxPlayers || undefined,
    })
    invalidateTournament(tournament.id)
    
    // Invalidate tRPC queries to trigger refetch
    utils.tournaments.getRegistrationStatus.invalidate({ tournamentId: tournament.id })
    utils.tournaments.getById.invalidate({ id: tournament.id })
  }

  const handleManagementSuccess = () => {
    managementModal.close()
    // Invalidate tournament data to refresh
    invalidateTournament(tournament.id)
  }

  const handleLoginSuccess = () => {
    loginModal.close()
  }

  const isUpcoming = tournament.status === 'UPCOMING'
  const isActive = tournament.status === 'ACTIVE'
  const isCompleted = tournament.status === 'COMPLETED'
  const isLive = isActive

  return (
    <>
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <Badge
                variant={getStatusBadgeVariant(tournament.status) as any}
                className="flex items-center gap-1"
              >
                {getStatusIcon(tournament.status)}
                {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1).toLowerCase()}
                {isLive && (
                  <span className="flex h-2 w-2 ml-1">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </Badge>
              {getLevelBadge()}
            </div>

            <h1 className="text-4xl font-bold text-foreground mb-2 font-heading">
              {tournament.name}
            </h1>
            <p className="text-xl text-muted-foreground mb-4">
              {tournament.game.name}
            </p>

            {isActive && (
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  <span className="font-medium">Tournament in Progress</span>
                </div>
                <div className="flex-1 max-w-xs">
                  <Progress value={75} className="h-2" />
                  <span className="text-xs text-muted-foreground">75% Complete</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {!isOrganizer && (
              <Button
                onClick={handleRegistration}
                className={effectiveIsRegistered ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : ''}
                variant={effectiveIsRegistered ? 'destructive' : 'default'}
                disabled={(() => {
                  const participantsCount = tournament.participants?.length ?? 0
                  const maxPlayers = tournament.maxPlayers
                  const isCapacityLimited = typeof maxPlayers === 'number' && maxPlayers > 0
                  const isFull = isCapacityLimited && participantsCount >= maxPlayers
                  return isCompleted || isFull || isWithdrawing
                })()}
              >
                {isWithdrawing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin mr-2" />
                    Withdrawing...
                  </>
                ) : effectiveIsRegistered ? (
                  <>
                    <UserMinus className="h-4 w-4 mr-2" />
                    Withdraw
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Register Now
                  </>
                )}
              </Button>
            )}

            {canManage && (
              <Button 
                onClick={() => managementModal.open({ tournamentId: tournament.id })} 
                variant="outline" 
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Manage Tournament
              </Button>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      <TournamentRegistration
        isOpen={registrationModal.isOpen}
        onClose={registrationModal.close}
        tournamentId={tournament.id}
        currentUser={currentUser}
        onSuccess={handleRegistrationSuccess}
      />

      {/* Management Modal */}
      <TournamentManagement
        isOpen={managementModal.isOpen && isOrganizer}
        onClose={managementModal.close}
        tournament={tournament}
        onUpdate={handleManagementSuccess}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={loginModal.isOpen}
        onClose={loginModal.close}
        onSuccess={handleLoginSuccess}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={confirmationModal.close}
        onConfirm={confirmationModal.config?.onConfirm || (() => {})}
        title={confirmationModal.config?.title || ''}
        message={confirmationModal.config?.message || ''}
        confirmLabel={confirmationModal.config?.confirmLabel}
        cancelLabel={confirmationModal.config?.cancelLabel}
        variant={confirmationModal.config?.variant === 'destructive' ? 'destructive' : 'default'}
        isLoading={isWithdrawing}
        error={withdrawMutation.error?.message}
        success={withdrawSuccess ? "Successfully withdrew from tournament!" : undefined}
        autoCloseDelay={withdrawSuccess ? 3 : 0}
      />
    </>
  )
}