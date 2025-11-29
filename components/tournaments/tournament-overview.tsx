'use client'

import { Calendar, MapPin, Users, DollarSign, Eye } from 'lucide-react'
import { StatusMessage } from '@/components/ui/status-message'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { getDisplayName, getDisplayInitials } from '@/lib/utils/name-display'
import type { ApiTournament } from '@/lib/types/api'
import { formatDate, formatDateTime } from '@/lib/utils/date-formatting'
import { getTournamentRegistrationState } from '@/lib/utils/registration-state'

interface TournamentOverviewProps {
  tournament: ApiTournament
  isOrganizer: boolean
  isRegistered: boolean
  currentUser?: {
    id: string
    role: string
    displayName?: string | null
  } | null
  userPreferences?: {
    nameDisplayPreference: 'FIRST_NAME' | 'FIRST_LAST_NAME' | 'DISPLAY_NAME' | 'OPT_OUT'
  } | null
}

// Tournament rules - can be moved to a config file later
const tournamentRules = [
  { message: "Standard tournament rules apply", type: "success" as const },
  { message: "Players must check in 30 minutes before start time", type: "success" as const },
  { message: "No coaching during matches", type: "success" as const },
  { message: "Tournament-approved equipment only", type: "success" as const },
  { message: "Respectful conduct required at all times", type: "success" as const },
  { message: "Late arrivals may be disqualified", type: "warning" as const },
  { message: "Unsportsmanlike conduct will result in immediate removal", type: "error" as const }
]

export function TournamentOverview({ 
  tournament, 
  userPreferences
}: TournamentOverviewProps) {
  const participantCount = tournament.participants?.length || 0
  const maxParticipants = tournament.maxPlayers || 0
  const tournamentDate = new Date(tournament.date)
  const registrationState = getTournamentRegistrationState({
    status: tournament.status,
    tournamentStructure: tournament.tournamentStructure,
    registrationDeadline: tournament.registrationDeadline,
    maxPlayers: tournament.maxPlayers,
    participantCount,
    participants: tournament.participants,
    totalRounds: tournament.totalRounds,
    matches: tournament.matches?.map(m => ({ round: m.round })),
  })

  // Get organizer display name based on user preferences
  const organizerDisplayName = getDisplayName(
    { name: tournament.organizer.name, displayName: null },
    { 
      preference: userPreferences?.nameDisplayPreference || 'FIRST_NAME',
      fallback: 'Tournament Organizer'
    }
  )

  const organizerInitials = getDisplayInitials(
    { name: tournament.organizer.name, displayName: null },
    { 
      preference: userPreferences?.nameDisplayPreference || 'FIRST_NAME',
      fallback: 'O'
    }
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Tournament Description + Quick Facts */}
        <Card className="dark:bg-muted dark:text-foreground">
          <CardHeader>
            <CardTitle className="text-primary">Tournament Details</CardTitle>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-1" />
                <div>
                  <p className="font-medium text-card-foreground">
                    {formatDate(tournamentDate)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(tournamentDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-1" />
                <div>
                  <p className="font-medium text-card-foreground">
                    {tournament.store?.name}
                  </p>
                  {tournament.store?.city && tournament.store?.state && (
                    <p className="text-xs text-muted-foreground">
                      {tournament.store.city}, {tournament.store.state}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 mt-1" />
                <div>
                  <p className="font-medium text-card-foreground">
                    {participantCount}/{maxParticipants || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {registrationState.label}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 mt-1" />
                <div>
                  <p className="font-medium text-card-foreground">
                    {typeof tournament.prizePool === 'number'
                      ? `$${tournament.prizePool}`
                      : '$0'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Prize Pool
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground dark:text-foreground leading-relaxed whitespace-pre-wrap">
              {tournament.description || 'No description provided for this tournament.'}
            </p>
          </CardContent>
        </Card>

        {/* Rules & Format */}
        <Card className="dark:bg-muted dark:text-foreground">
          <CardHeader>
            <CardTitle className="text-primary">Rules & Format</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2 dark:text-foreground">Tournament Format</h4>
              <p className="text-sm text-muted-foreground dark:text-foreground">
                {tournament.format}
              </p>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-medium mb-3 dark:text-foreground">Tournament Rules</h4>
              <ul className="space-y-2">
                {tournamentRules.map((rule, index) => (
                  <li key={index}>
                    <StatusMessage message={rule.message} type={rule.type} />
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {/* Tournament Organizer */}
        <Card className="dark:bg-muted dark:text-foreground">
          <CardHeader>
            <CardTitle className="text-primary">Tournament Organizer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {organizerInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium dark:text-foreground">
                  {organizerDisplayName}
                </p>
                <p className="text-sm text-muted-foreground">Tournament Organizer</p>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              <Eye className="h-4 w-4 mr-2" />
              View Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
