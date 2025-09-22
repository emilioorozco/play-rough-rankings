'use client'

import { Trophy, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ApiTournament } from '@/lib/types/api'

interface TournamentResultsProps {
  tournament: ApiTournament
}

export function TournamentResults({ tournament }: TournamentResultsProps) {
  const isCompleted = tournament.status === 'COMPLETED'

  return (
    <Card className="dark:bg-muted dark:text-foreground border-border">
      <CardHeader>
        <CardTitle className="text-primary">Tournament Results</CardTitle>
      </CardHeader>
      <CardContent>
        {isCompleted ? (
          <div className="text-center py-8">
            <Trophy className="h-16 w-16 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-foreground">Results Available</h3>
            <p className="text-muted-foreground">
              Final tournament results and rankings will be displayed here.
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-foreground">Results Pending</h3>
            <p className="text-muted-foreground">
              Final results will be available once the tournament is completed.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
