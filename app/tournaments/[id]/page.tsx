'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { useSession } from '@/components/auth/session-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { TournamentHeroSection } from '@/components/tournaments/tournament-hero-section'
import { TournamentQuickInfo } from '@/components/tournaments/tournament-quick-info'
import { TournamentTabs } from '@/components/tournaments/tournament-tabs'
import { TournamentManagementPanel } from '@/components/tournaments/tournament-management-panel'
import { LiveTournamentIndicator } from '@/components/tournaments/live-tournament-indicator'
import { useTournamentStore } from '@/stores/tournament-store'
import { useTab } from '@/stores/ui-store'
import { usePermissions } from '@/stores/auth-store'
import { useTournamentRealtime } from '@/hooks/use-tournament-realtime'
import { useToast } from '@/hooks/use-toast'

// Helper function to get tournament status badge variant
const getStatusVariant = (status: string) => {
  switch (status) {
    case 'UPCOMING': return 'default'
    case 'ACTIVE': return 'success'
    case 'PAUSED': return 'warning'
    case 'COMPLETED': return 'secondary'
    case 'CANCELLED': return 'destructive'
    default: return 'outline'
  }
}

export default function TournamentDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useSession()
  const { toast } = useToast()
  const tournamentId = params.id as string
  const { canManageTournament } = usePermissions()

  // Fetch tournament data with TRPC
  const tournamentQuery = trpc.tournaments.getById.useQuery({
    id: tournamentId,
    includeMatches: true,
    includeParticipants: true,
  })

  // Fetch registration status with TRPC
  const registrationStatusQuery = trpc.tournaments.getRegistrationStatus.useQuery(
    { tournamentId },
    { enabled: !!user }
  )

  // Get tournament store state and actions separately (stable selectors)
  const storeTournament = useTournamentStore(state => state.currentTournament)
  const setCurrentTournament = useTournamentStore(state => state.setCurrentTournament)
  const setCurrentTournamentId = useTournamentStore(state => state.setCurrentTournamentId)

  // Get registration status from tournament store (primary) and tRPC query (fallback)
  const storeRegistrationStatus = useTournamentStore(state => 
    state.getRegistrationStatus(tournamentId)
  )
  const setRegistrationStatus = useTournamentStore(state => state.setRegistrationStatus)
  const isRegistered = storeRegistrationStatus?.isRegistered ?? registrationStatusQuery.data?.isRegistered ?? false

  // Sync tournament data when query completes
  // Extract IDs to avoid deep type instantiation from tRPC query data
  const queryTournamentId = tournamentQuery.data?.id
  const storeTournamentId = storeTournament?.id
  
  React.useEffect(() => {
    const data = tournamentQuery.data
    if (data && queryTournamentId !== storeTournamentId) {
      setCurrentTournament(data as any)
      setCurrentTournamentId(tournamentId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryTournamentId, storeTournamentId, tournamentId, setCurrentTournament, setCurrentTournamentId])

  // Sync registration status when query completes
  const hasRegistrationData = !!registrationStatusQuery.data
  const hasStoredStatus = !!storeRegistrationStatus
  
  React.useEffect(() => {
    const data = registrationStatusQuery.data
    if (hasRegistrationData && !hasStoredStatus && data) {
      setRegistrationStatus(tournamentId, {
        isRegistered: !!data.isRegistered,
        canRegister: !!data.canRegister,
        canWithdraw: false,
        isFull: false,
        participantCount: 0,
        maxPlayers: undefined,
        registrationDeadline: undefined,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRegistrationData, hasStoredStatus, tournamentId, setRegistrationStatus])

  // Use TRPC data as primary source, fallback to store (avoid deep type instantiation at union)
  const tournament = (tournamentQuery.data as any) ?? storeTournament
  
  // Ensure tournament has required properties to prevent undefined errors
  const safeTournament = tournament ? {
    ...(tournament as any),
    participants: (tournament as any).participants || [],
    matches: (tournament as any).matches || [],
  } : null
  const isTournamentLoading = tournamentQuery.isLoading
  const tournamentError = tournamentQuery.error?.message
  const isRegistrationLoading = registrationStatusQuery.isLoading
  const registrationError = registrationStatusQuery.error?.message

  // Use UI Store for active tab
  const { activeTab, setActiveTab } = useTab('tournamentDetails')

  // Get user preferences from TRPC (simplified for now)
  const userPreferencesQuery = trpc.userPreferences.get.useQuery(
    undefined,
    { enabled: !!user }
  )

  // Use user preferences data for rendering
  const userPreferencesData = userPreferencesQuery.data

  // Set default tab if none is selected
  React.useEffect(() => {
    if (!activeTab) {
      setActiveTab('overview')
    }
  }, [activeTab, setActiveTab])

  // Set up real-time updates with callbacks
  useTournamentRealtime(tournamentId, {
    enabled: safeTournament?.status === 'ACTIVE' || safeTournament?.status === 'PAUSED',
    pollingInterval: 10000, // Poll every 10 seconds for active tournaments
    onMatchUpdate: () => {
      toast({
        title: 'Match Updated',
        description: 'A match result has been submitted',
      })
      tournamentQuery.refetch()
    },
    onRoundAdvance: () => {
      toast({
        title: 'Round Advanced',
        description: 'The tournament has advanced to the next round',
      })
      tournamentQuery.refetch()
    },
    onStatusChange: (newStatus) => {
      const statusMessages: Record<string, string> = {
        ACTIVE: 'Tournament has started',
        PAUSED: 'Tournament has been paused',
        COMPLETED: 'Tournament has been completed',
        CANCELLED: 'Tournament has been cancelled',
      }
      toast({
        title: 'Tournament Status Changed',
        description: statusMessages[newStatus] || `Status changed to ${newStatus}`,
      })
      tournamentQuery.refetch()
    },
  })

  if (isTournamentLoading || isRegistrationLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 pt-2 pb-6">
          {/* Breadcrumb Skeleton */}
          <div className="flex items-center gap-4 mb-2">
            <Skeleton className="h-8 w-32" />
          </div>

          {/* Hero Section Skeleton */}
          <div className="mb-8">
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>

          {/* Quick Info Skeleton */}
          <div className="mb-8">
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>

          {/* Tabs Skeleton */}
          <div className="mb-6">
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Content Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  if (tournamentError || registrationError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 pt-2 pb-6">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-destructive mb-2">
                  Error Loading Tournament
                </h2>
                <p className="text-muted-foreground mb-4">
                  {tournamentError || registrationError}
                </p>
                <Button onClick={() => {
                  tournamentQuery.refetch()
                  registrationStatusQuery.refetch()
                }}>
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!safeTournament) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 pt-2 pb-6">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Tournament Not Found</h2>
                <p className="text-muted-foreground mb-4">
                  The tournament you&apos;re looking for doesn&apos;t exist or has been removed.
                </p>
                <Button onClick={() => router.push('/tournaments')}>
                  Browse Tournaments
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Check if user is organizer or can manage
  const isOrganizer = user?.id === safeTournament.organizer?.id
  const canManage = canManageTournament(safeTournament.organizer?.id)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-2 pb-6">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <span className="text-sm text-muted-foreground">
              Tournament Details
            </span>
          </div>
          
          {/* Tournament Status Indicators */}
          <div className="flex items-center gap-2">
            <LiveTournamentIndicator tournamentId={tournamentId} />
            <Badge variant={getStatusVariant(safeTournament.status) as any} className="text-xs">
              {safeTournament.status}
            </Badge>
          </div>
        </div>

        {/* Hero Section */}
        <TournamentHeroSection
          tournament={safeTournament as any}
          isOrganizer={isOrganizer}
          canManage={canManage}
          isRegistered={isRegistered}
          currentUser={user}
        />

        {/* Quick Info */}
        <TournamentQuickInfo
          tournament={safeTournament as any}
        />

        {/* Management Panel - Only visible to organizers and admins */}
        {canManage && (
          <div className="mb-6">
            <TournamentManagementPanel
              tournament={safeTournament as any}
              onUpdate={() => {
                tournamentQuery.refetch()
              }}
            />
          </div>
        )}

        {/* Tabs */}
        <TournamentTabs
          tournament={safeTournament as any}
          isOrganizer={isOrganizer}
          isRegistered={isRegistered}
          currentUser={user}
          userPreferences={userPreferencesData as any}
          canManage={canManage}
          onUpdate={() => {
            tournamentQuery.refetch()
            registrationStatusQuery.refetch()
          }}
        />
      </div>
    </div>
  )
}
