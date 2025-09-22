'use client'

import { Calendar, MapPin, Users, DollarSign } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate, formatDateTime } from '@/lib/utils/date-formatting'
import type { ApiTournament } from '@/lib/types/api'

interface TournamentQuickInfoProps {
  tournament: ApiTournament
}

export function TournamentQuickInfo({ tournament }: TournamentQuickInfoProps) {
  const tournamentDate = new Date(tournament.date)
  const participantCount = tournament.participants?.length || 0
  const maxParticipants = tournament.maxPlayers || 0

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-card-foreground">{formatDate(tournamentDate)}</p>
              <p className="text-sm text-muted-foreground">{formatDateTime(tournamentDate)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-card-foreground">{tournament.store.name}</p>
              <p className="text-sm text-muted-foreground">
                {tournament.store.city}, {tournament.store.state}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-card-foreground">
                {participantCount}/{maxParticipants}
              </p>
              <p className="text-sm text-muted-foreground">Participants</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-card-foreground">
                {tournament.prizePool ? `$${tournament.prizePool}` : 'TBD'}
              </p>
              <p className="text-sm text-muted-foreground">Prize Pool</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
