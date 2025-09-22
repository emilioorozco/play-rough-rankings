'use client'

import { MessageCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ApiTournament } from '@/lib/types/api'

interface TournamentDiscussionProps {
  tournament: ApiTournament
}

export function TournamentDiscussion({ tournament }: TournamentDiscussionProps) {
  return (
    <Card className="dark:bg-muted dark:text-foreground border-border">
      <CardHeader>
        <CardTitle className="text-primary">Tournament Discussion</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-foreground">Discussion Coming Soon</h3>
          <p className="text-muted-foreground">
            Tournament discussion board coming soon!
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Connect with other participants and stay updated.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
