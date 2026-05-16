'use client'

import { Badge } from '@/components/ui/badge'
import { Activity } from 'lucide-react'

interface LiveTournamentIndicatorProps {
  /** From the owning tournament `getById` query (single source; no extra polling). */
  isLive: boolean
  className?: string
}

export function LiveTournamentIndicator({ isLive, className }: LiveTournamentIndicatorProps) {
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
