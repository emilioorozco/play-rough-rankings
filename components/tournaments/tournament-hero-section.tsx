'use client'

import { useEffect, useMemo } from 'react'
import {
  UserPlus,
  UserMinus,
  Settings,
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
import { getTournamentRegistrationState } from '@/lib/utils/registration-state'

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
  // Ensure tournament has required properties to prevent undefined errors
  const safeTournament = {
    ...tournament,
    participants: tournament.participants || [],
    matches: tournament.matches || [],
  }
  
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
  

  // Use Tournament Store for state management
  const { setRegistrationStatus, invalidateTournament } = useTournamentStore()
  
  // Get registration status from tournament store
  const storeRegistrationStatus = useTournamentStore(state => 
    state.getRegistrationStatus(tournament.id)
  )
  
  // Get tRPC utils for query invalidation
  const utils = trpc.useUtils()
  
  // Computed registration status - use store state (primary), fallback to prop
  const effectiveIsRegistered = storeRegistrationStatus?.isRegistered ?? isRegistered

  // Withdraw mutation (for upcoming tournaments)
  const withdrawMutation = trpc.tournaments.unregister.useMutation({
    onSuccess: () => {
      setInteraction('isWithdrawing', false)
      setInteraction('withdrawSuccess', true)
      
      // Update tournament store state
      setRegistrationStatus(tournament.id, {
        isRegistered: false,
        canRegister: true,
        canWithdraw: false,
        isFull: false,
        participantCount: safeTournament.participants?.length || 0,
        maxPlayers: tournament.maxPlayers || undefined,
      })
      invalidateTournament(tournament.id)
      
      // Invalidate tRPC queries to trigger refetch
      utils.tournaments.getRegistrationStatus.invalidate({ tournamentId: tournament.id })
      utils.tournaments.getById.invalidate({ id: tournament.id })
    },
    onError: () => {
      setInteraction('isWithdrawing', false)
      setInteraction('withdrawSuccess', false)
      // Error will be displayed in the modal via error prop
    },
  })

  // Drop mutation (for active tournaments)
  const dropMutation = trpc.tournamentLifecycle.dropPlayer.useMutation({
    onSuccess: () => {
      setInteraction('isWithdrawing', false)
      setInteraction('withdrawSuccess', true)

      // For active tournaments, player cannot re-register after dropping
      setRegistrationStatus(tournament.id, {
        isRegistered: false,
        canRegister: false,
        canWithdraw: false,
        isFull: false,
        participantCount: safeTournament.participants?.length || 0,
        maxPlayers: tournament.maxPlayers || undefined,
      })
      invalidateTournament(tournament.id)

      // Invalidate tRPC queries to trigger refetch
      utils.tournaments.getRegistrationStatus.invalidate({ tournamentId: tournament.id })
      utils.tournaments.getById.invalidate({ id: tournament.id })
    },
    onError: () => {
      setInteraction('isWithdrawing', false)
      setInteraction('withdrawSuccess', false)
    },
  })

  // Reset interactions when component unmounts or tournament changes
  useEffect(() => {
    return () => {
      resetInteractions()
    }
  }, [tournament.id, resetInteractions])

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
      // If tournament is active, this should behave as a "Drop" action
      if (tournament.status === 'ACTIVE') {
        handleDrop()
      } else {
        handleWithdraw()
      }
    } else {
      registrationModal.open({ tournamentId: tournament.id })
    }
  }

  const handleDrop = () => {
    confirmationModal.openWithdraw({
      title: "Are you sure you want to drop?",
      message:
        "This will:\n\n" +
        "• Remove you from future pairings\n\n" +
        "• Forfeit any pending matches\n\n" +
        "• Update tournament standings\n\n\n" +
        "This action cannot be undone.",
      confirmLabel: "Drop",
      cancelLabel: "Cancel",
      variant: "destructive",
      onConfirm: confirmDrop,
    })
  }

  const handleWithdraw = () => {
    confirmationModal.openWithdraw({
      title: "Withdraw from Tournament",
      message: "Are you sure you want to withdraw from this tournament? Once the tournament registration closes, you will not be able to rejoin.",
      confirmLabel: "Withdraw",
      cancelLabel: "Cancel",
      variant: "destructive",
      onConfirm: confirmWithdraw,
    })
  }

  const confirmWithdraw = async () => {
    setInteraction('isWithdrawing', true)
    try {
      await withdrawMutation.mutateAsync({
        tournamentId: tournament.id,
      })
    } catch {
      // Error handling is done in the mutation's onError callback
    }
  }

  const confirmDrop = async () => {
    setInteraction('isWithdrawing', true)
    try {
      // playerId is optional in the backend; omitting it will drop the current user
      await dropMutation.mutateAsync({
        tournamentId: tournament.id,
      } as any)
    } catch {
      // Error handling is handled in the mutation's onError callback
    }
  }


  const handleManagementSuccess = () => {
    managementModal.close()
    // Invalidate tournament data to refresh
    invalidateTournament(tournament.id)
  }

  const handleLoginSuccess = () => {
    loginModal.close()
  }

  const isActive = tournament.status === 'ACTIVE'
  const participantsCount = safeTournament.participantCount ?? safeTournament.participants?.length ?? 0

  const registrationState = useMemo(
    () =>
      getTournamentRegistrationState({
        status: tournament.status,
        tournamentStructure: tournament.tournamentStructure,
        registrationDeadline: tournament.registrationDeadline,
        maxPlayers: tournament.maxPlayers,
        participantCount: participantsCount,
        participants: safeTournament.participants,
        totalRounds: tournament.totalRounds,
        matches: tournament.matches?.map(m => ({ round: m.round })),
      }),
    [
      participantsCount,
      safeTournament.participants,
      tournament.maxPlayers,
      tournament.registrationDeadline,
      tournament.status,
      tournament.tournamentStructure,
      tournament.totalRounds,
      tournament.matches,
    ],
  )

  const canShowRegistrationButton =
    !isOrganizer &&
    tournament.status !== 'CANCELLED' &&
    tournament.status !== 'COMPLETED' &&
    (registrationState.canRegister || effectiveIsRegistered)

  const isRegistrationButtonDisabled =
    isWithdrawing || (!effectiveIsRegistered && !registrationState.canRegister)

  return (
    <>
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-foreground mb-2 font-heading">
              {tournament.name}
            </h1>
            <div className="flex items-center justify-between gap-2 mb-4">
              <p className="text-xl text-muted-foreground">
                {tournament.game.name}
              </p>
              <div className="flex items-center gap-2">
                {getLevelBadge()}
                {tournament.format && (
                  <Badge
                    variant="outline"
                    className="dark:bg-accent dark:text-white dark:border-transparent text-xs"
                  >
                    {tournament.format.charAt(0).toUpperCase() +
                      tournament.format.slice(1).toLowerCase()}
                  </Badge>
                )}
                {isActive && (
                  <Badge variant="success" className="text-xs">
                    ACTIVE
                  </Badge>
                )}
              </div>
            </div>

            {isActive && (
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 max-w-xs">
                  <Progress value={75} className="h-2" />
                  <span className="text-xs text-muted-foreground">75% Complete</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {canShowRegistrationButton && (
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleRegistration}
                  className={effectiveIsRegistered ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : ''}
                  variant={effectiveIsRegistered ? 'destructive' : 'default'}
                  disabled={isRegistrationButtonDisabled}
                >
                  {isWithdrawing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin mr-2" />
                      {tournament.status === 'ACTIVE' ? 'Dropping...' : 'Withdrawing...'}
                    </>
                  ) : effectiveIsRegistered ? (
                    <>
                      <UserMinus className="h-4 w-4 mr-2" />
                      {tournament.status === 'ACTIVE' ? 'Drop' : 'Withdraw'}
                    </>
                  ) : !currentUser && registrationState.canRegister ? (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Sign in to Register
                    </>
                  ) : registrationState.isLateRegistration ? (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Late Registration
                    </>
                  ) : registrationState.canRegister ? (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Register Now
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Registration Closed
                    </>
                  )}
                </Button>
                {!effectiveIsRegistered && !registrationState.canRegister && registrationState.reason && (
                  <p className="text-xs text-muted-foreground text-center">
                    {registrationState.reason}
                  </p>
                )}
              </div>
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

          </div>
        </div>
      </div>

      {/* Registration Modal */}
      <TournamentRegistration
        tournamentId={tournament.id}
        currentUser={currentUser}
      />

      {/* Management Modal */}
      <TournamentManagement
        isOpen={managementModal.isOpen && canManage}
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
      >
        {confirmationModal.config?.title === 'Are you sure you want to drop?' ? (
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="mb-1">This will:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Remove you from future pairings</li>
                <li>Forfeit any pending matches</li>
                <li>Update tournament standings</li>
              </ul>
            </div>

            <p className="font-medium text-foreground text-center">
              This action cannot be undone.
            </p>
          </div>
        ) : undefined}
      </ConfirmationModal>
    </>
  )
}