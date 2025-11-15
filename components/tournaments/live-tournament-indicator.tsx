'use client'

import { Badge } from '@/components/ui/badge'
import { useLiveTournamentIndicator } from '@/hooks/use-tournament-realtime'
import { Activity } from 'lucide-react'

interface LiveTournamentIndicatorProps {
  tournamentId: string
  className?: string
}

export function LiveTournamentIndicator({ tournamentId, className }: LiveTournamentIndicatorProps) {
  const { isLive } = useLiveTournamentIndicator(tournamentId)

  if (!isLive) return null

  return (
    <Badge 
      variant="default" 
      className={`bg-green-500 text-white animate-pulse ${className || ''}`}
    >
      <Activity className="w-3 h-3 mr-1" />
      LIVE
    </Badge>
  )
}
