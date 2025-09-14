'use client'

import { useParams } from 'next/navigation'
import { trpc } from '@/lib/trpc/client'
import { TournamentDetails } from '@/components/tournaments/tournament-details'
import { TournamentManagement } from '@/components/tournaments/tournament-management'
import { useSession } from '@/components/auth/session-provider'
import type { ApiTournament } from '@/lib/types/api'

export default function TournamentDetailsPage() {
  const params = useParams()
  const { user } = useSession()
  const tournamentId = params.id as string

  const tournamentQuery = trpc.tournaments.getById.useQuery({
    id: tournamentId,
    includeMatches: true,
    includeParticipants: true,
  })

  if (tournamentQuery.isLoading) {
    return (
      <div className="container">
        <div className="loading-state">
          <p>Loading tournament details...</p>
        </div>
      </div>
    )
  }

  if (tournamentQuery.error) {
    return (
      <div className="container">
        <div className="error-state">
          <h1>Tournament Not Found</h1>
          <p>{tournamentQuery.error.message}</p>
        </div>
      </div>
    )
  }

  const tournament = tournamentQuery.data! as ApiTournament
  const isOrganizer = user && (
    user.role === 'admin' || 
    user.role === 'organizer' || 
    user.id === tournament.organizer.id
  )

  return (
    <div className="container">
      <div className="tournament-details-layout">
        <main className="tournament-details-main">
          <TournamentDetails tournament={tournament} />
        </main>
        
        {isOrganizer && (
          <aside className="tournament-management-sidebar">
            <TournamentManagement tournament={tournament} />
          </aside>
        )}
      </div>
    </div>
  )
}