'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Share2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { useSession } from '@/components/auth/session-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { TournamentHeroSection } from '@/components/tournaments/tournament-hero-section'
import { TournamentTabs } from '@/components/tournaments/tournament-tabs'
import { TournamentManagementPanel } from '@/components/tournaments/tournament-management-panel'
import { LiveTournamentIndicator } from '@/components/tournaments/live-tournament-indicator'
import { useTab } from '@/stores/ui-store'
import type { ApiTournament } from '@/lib/types/api'
import { usePermissions } from '@/stores/auth-store'
import {
  useTournamentRealtime,
  TOURNAMENT_LIVE_POLL_MS,
  getTournamentLiveBadgeVisible,
} from '@/hooks/use-tournament-realtime'
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
  const { user, isLoading: isAuthLoading } = useSession()
  const { toast } = useToast()
  const tournamentId = params.id as string
  const { canManageTournament } = usePermissions()

  // Fetch tournament data with TRPC (single refetchInterval owner for live detail — PLA-17)
  const tournamentQuery = trpc.tournaments.getById.useQuery(
    {
      id: tournamentId,
      includeMatches: true,
      includeParticipants: true,
    },
    {
      refetchInterval: query => {
        const status = (query.state.data as { status?: string } | undefined)?.status
        if (status === 'ACTIVE' || status === 'PAUSED') {
          return TOURNAMENT_LIVE_POLL_MS
        }
        return false
      },
      refetchIntervalInBackground: false,
    }
  )

  // Registration status is user-specific; only fetch when session is resolved and authenticated
  const registrationStatusQuery = trpc.tournaments.getRegistrationStatus.useQuery(
    { tournamentId },
    { enabled: !!user && !isAuthLoading }
  )

  const isRegistered = Boolean(registrationStatusQuery.data?.isRegistered)

  const tournamentData = tournamentQuery.data as ApiTournament | undefined
  const safeTournament: ApiTournament | null = tournamentData
    ? {
        ...tournamentData,
        participants: tournamentData.participants ?? [],
        matches: tournamentData.matches ?? [],
      }
    : null

  const refetchTournamentDetail = React.useCallback(() => {
    void tournamentQuery.refetch()
    if (user) {
      void registrationStatusQuery.refetch()
    }
  }, [tournamentQuery, registrationStatusQuery, user])
  const isTournamentLoading = tournamentQuery.isLoading
  const tournamentError = tournamentQuery.error?.message
  const isRegistrationLoading =
    !!user && !isAuthLoading && registrationStatusQuery.isLoading

  // Use UI Store for active tab
  const { activeTab, setActiveTab } = useTab('tournamentDetails')

  // Get user preferences from TRPC (simplified for now)
  const userPreferencesQuery = trpc.userPreferences.get.useQuery(
    undefined,
    { enabled: !!user }
  )

  const userPreferencesData = userPreferencesQuery.data as
    | {
        nameDisplayPreference: 'FIRST_NAME' | 'FIRST_LAST_NAME' | 'DISPLAY_NAME' | 'OPT_OUT'
      }
    | undefined

  // Set default tab if none is selected
  React.useEffect(() => {
    if (!activeTab) {
      setActiveTab('overview')
    }
  }, [activeTab, setActiveTab])

  // Change detection + toasts (polling owned by tournamentQuery above)
  useTournamentRealtime(tournamentId, {
    tournament: tournamentQuery.data,
    refetch: tournamentQuery.refetch,
    enabled: safeTournament?.status === 'ACTIVE' || safeTournament?.status === 'PAUSED',
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

  if (tournamentError) {
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
                  {tournamentError}
                </p>
                <Button onClick={() => {
                  tournamentQuery.refetch()
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
  const isActive = safeTournament.status === 'ACTIVE'

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-2 pb-6">
        {/* Breadcrumb / Header */}
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
          
          {/* Right-side controls: Live Indicator + Actions */}
          <div className="flex items-center gap-2">
            {isActive && (
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4" />
              </Button>
            )}
            <LiveTournamentIndicator isLive={getTournamentLiveBadgeVisible(safeTournament)} />
          </div>
        </div>

        {/* Hero Section */}
        <TournamentHeroSection
          tournament={safeTournament}
          isOrganizer={isOrganizer}
          canManage={canManage}
          isRegistered={isRegistered}
          currentUser={user}
          onRegistrationChange={refetchTournamentDetail}
        />

        {/* Management Panel - Only visible to organizers and admins */}
        {canManage && (
          <div className="mb-6">
            <TournamentManagementPanel
              tournament={safeTournament}
              onUpdate={refetchTournamentDetail}
            />
          </div>
        )}

        {/* Tabs */}
        <TournamentTabs
          tournament={safeTournament}
          isOrganizer={isOrganizer}
          isRegistered={isRegistered}
          currentUser={user}
          userPreferences={userPreferencesData}
          canManage={canManage}
          onUpdate={refetchTournamentDetail}
        />
      </div>
    </div>
  )
}
