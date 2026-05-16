'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc/client'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Info,
  AlertCircle,
  CheckCircle2,
  HelpCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { LoadingSpinner, ErrorDisplay, EmptyState } from '@/components/ui/loading-states'
import { cn } from '@/lib/utils'
import type { ProjectedRating } from '@/lib/tournament/types'

interface ProjectedRatingsDisplayProps {
  tournamentId: string
  /** Optional callback when ratings are updated */
  onRatingsUpdate?: (ratings: ProjectedRating[]) => void
  /** Tournament participants for displaying player names */
  participants?: Array<{
    id: string
    displayName?: string
  }>
}

/**
 * Projected Ratings Display Component
 * 
 * Displays projected rating changes for all tournament participants.
 * Shows current rating, projected rating, rating change with color coding,
 * and confidence indicators based on matches played.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */
export function ProjectedRatingsDisplay({ 
  tournamentId,
  onRatingsUpdate,
  participants = []
}: ProjectedRatingsDisplayProps) {
  const [sortBy, setSortBy] = useState<'rating' | 'change' | 'confidence'>('rating')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Fetch projected ratings
  const {
    data,
    isLoading,
    error,
    refetch,
  } = trpc.tournamentLifecycle.getProjectedRatings.useQuery(
    { tournamentId }
  )

  // Call onRatingsUpdate when data changes
  useEffect(() => {
    if (data?.projectedRatings && onRatingsUpdate) {
      onRatingsUpdate(data.projectedRatings)
    }
  }, [data?.projectedRatings, onRatingsUpdate])

  if (isLoading) {
    return (
      <Card className="dark:bg-muted dark:text-foreground border-border">
        <CardHeader>
          <CardTitle>Projected Rating Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="dark:bg-muted dark:text-foreground border-border">
        <CardHeader>
          <CardTitle>Projected Rating Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorDisplay 
            error={error.message}
            onRetry={() => refetch()}
            title="Failed to load projected ratings"
          />
        </CardContent>
      </Card>
    )
  }

  const projectedRatings = data?.projectedRatings || []
  const stats = data?.stats

  // Determine why there are no rating projections
  const getEmptyStateMessage = () => {
    const tournamentStatus = data?.tournamentStatus
    const completedMatches = stats?.completedMatches ?? 0
    const totalMatches = stats?.totalMatches ?? 0
    const totalEntries = stats?.totalEntries ?? 0

    // Tournament hasn't started
    if (tournamentStatus === 'UPCOMING') {
      return {
        title: "No rating projections available",
        description: "This tournament hasn't started yet. Rating projections will be available once matches begin and are completed."
      }
    }

    // Tournament is completed or cancelled
    if (tournamentStatus === 'COMPLETED' || tournamentStatus === 'CANCELLED') {
      return {
        title: "No rating projections available",
        description: completedMatches === 0 
          ? "This tournament has no completed matches. Ratings cannot be calculated without match results."
          : "Final ratings have been applied. Projected ratings are no longer displayed for completed tournaments."
      }
    }

    // No completed matches yet
    if (completedMatches === 0) {
      if (totalMatches === 0) {
        return {
          title: "No rating projections available",
          description: "No matches have been created yet. Once matches are created and completed, rating projections will appear here."
        }
      }
      return {
        title: "No rating projections available",
        description: `There are ${totalMatches} match${totalMatches === 1 ? '' : 'es'} in progress, but none have been completed yet. Rating projections will appear once matches are completed.`
      }
    }

    // Matches completed but no ratings calculated
    if (totalEntries === 0) {
      return {
        title: "No rating projections available",
        description: "There are no registered participants in this tournament yet."
      }
    }

    // This should rarely happen now since we use default ratings, but keep as fallback
    return {
      title: "No rating projections available",
      description: `There ${completedMatches === 1 ? 'is' : 'are'} ${completedMatches} completed match${completedMatches === 1 ? '' : 'es'}, but rating projections could not be calculated. Please ensure matches have been properly completed with winners.`
    }
  }

  if (projectedRatings.length === 0) {
    const emptyMessage = getEmptyStateMessage()
    return (
      <Card className="dark:bg-muted dark:text-foreground border-border">
        <CardHeader>
          <CardTitle>Projected Rating Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title={emptyMessage.title}
            description={emptyMessage.description}
          />
        </CardContent>
      </Card>
    )
  }

  // Sort projected ratings
  const sortedRatings = [...projectedRatings].sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case 'rating':
        comparison = b.projectedRating - a.projectedRating
        break
      case 'change':
        comparison = Math.abs(b.ratingChange) - Math.abs(a.ratingChange)
        break
      case 'confidence':
        const confidenceOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
        comparison = confidenceOrder[b.confidence] - confidenceOrder[a.confidence]
        break
    }
    
    return sortOrder === 'desc' ? comparison : -comparison
  })

  const toggleSort = (column: 'rating' | 'change' | 'confidence') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  return (
    <Card className="dark:bg-muted dark:text-foreground border-border">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              Projected Rating Changes
              <Badge variant="outline" className="text-xs font-normal">
                <Info className="h-3 w-3 mr-1" />
                Estimates
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Projected ratings based on current tournament results. Final ratings will be applied upon tournament completion.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Desktop Table View */}
        <div className="hidden md:block rounded-md border border-border overflow-hidden">
          <div className="relative overflow-x-auto">
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-10" />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleSort('rating')}
                  >
                    <div className="flex items-center gap-1">
                      Current → Projected
                      {sortBy === 'rating' && (
                        <span className="text-xs">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleSort('confidence')}
                  >
                    <div className="flex items-center gap-1">
                      Confidence
                      {sortBy === 'confidence' && (
                        <span className="text-xs">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Matches</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRatings.map((rating, index) => {
                  const participant = participants.find(p => p.id === rating.playerId)
                  return (
                    <ProjectedRatingRow 
                      key={rating.playerId}
                      rating={rating}
                      rank={index + 1}
                      playerName={participant?.displayName}
                    />
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {sortedRatings.map((rating, index) => {
            const participant = participants.find(p => p.id === rating.playerId)
            const playerName = participant?.displayName || `Player ${rating.playerId.slice(0, 8)}`
            const isIncrease = rating.ratingChange > 0
            const isDecrease = rating.ratingChange < 0
            const isNoChange = rating.ratingChange === 0

            const getConfidenceBadge = () => {
              switch (rating.confidence) {
                case 'HIGH':
                  return { variant: 'default' as const, icon: <CheckCircle2 className="h-3 w-3" />, label: 'High' }
                case 'MEDIUM':
                  return { variant: 'secondary' as const, icon: <AlertCircle className="h-3 w-3" />, label: 'Medium' }
                case 'LOW':
                  return { variant: 'outline' as const, icon: <HelpCircle className="h-3 w-3" />, label: 'Low' }
              }
            }

            const confidenceBadge = getConfidenceBadge()
            const changeDisplay = isIncrease 
              ? { icon: <TrendingUp className="h-4 w-4" />, color: 'text-success', sign: '+' }
              : isDecrease 
              ? { icon: <TrendingDown className="h-4 w-4" />, color: 'text-destructive', sign: '' }
              : { icon: <Minus className="h-4 w-4" />, color: 'text-muted-foreground', sign: '' }

            return (
              <div
                key={rating.playerId}
                className="rounded-lg border border-border p-4 bg-card"
              >
                <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="w-8 h-8 p-0 flex items-center justify-center shrink-0">
                      {index + 1}
                    </Badge>
                    <span className="font-medium text-sm text-foreground truncate">
                      {playerName}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Rating</div>
                    <div className="flex items-center gap-1.5 font-medium text-sm">
                      <span className="font-mono text-xs text-muted-foreground">
                        {rating.currentRating}
                      </span>
                      <span className={cn(changeDisplay.color)}>
                        {changeDisplay.icon}
                      </span>
                      <span className={cn(
                        "font-mono text-xs font-semibold",
                        isIncrease && "text-success",
                        isDecrease && "text-destructive",
                        isNoChange && "text-muted-foreground"
                      )}>
                        {rating.projectedRating}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[auto_auto] gap-2 items-start">
                    <div className="hidden sm:block min-w-0 shrink-0">
                      <div className="text-xs text-muted-foreground">Confidence</div>
                      <Badge variant={confidenceBadge.variant} className="text-xs">
                        {confidenceBadge.icon}
                        <span className="ml-1">{confidenceBadge.label}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center">
                      <Badge variant="outline" className="text-xs shrink-0 whitespace-nowrap">
                        {rating.matchesConsidered}{'\u00A0'}{rating.matchesConsidered === 1 ? 'match' : 'matches'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Individual row component for projected rating display
 */
function ProjectedRatingRow({ 
  rating, 
  rank,
  playerName
}: { 
  rating: ProjectedRating
  rank: number
  playerName?: string
}) {
  const isIncrease = rating.ratingChange > 0
  const isDecrease = rating.ratingChange < 0
  const isNoChange = rating.ratingChange === 0

  // Get confidence badge variant and icon
  const getConfidenceBadge = () => {
    switch (rating.confidence) {
      case 'HIGH':
        return {
          variant: 'default' as const,
          icon: <CheckCircle2 className="h-3 w-3" />,
          label: 'High'
        }
      case 'MEDIUM':
        return {
          variant: 'secondary' as const,
          icon: <AlertCircle className="h-3 w-3" />,
          label: 'Medium'
        }
      case 'LOW':
        return {
          variant: 'outline' as const,
          icon: <HelpCircle className="h-3 w-3" />,
          label: 'Low'
        }
    }
  }

  const confidenceBadge = getConfidenceBadge()

  // Get rating change icon and color
  const getRatingChangeDisplay = () => {
    if (isIncrease) {
      return {
        icon: <TrendingUp className="h-4 w-4" />,
        color: 'text-success',
        bgColor: 'bg-success/10',
        sign: '+'
      }
    } else if (isDecrease) {
      return {
        icon: <TrendingDown className="h-4 w-4" />,
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        sign: ''
      }
    } else {
      return {
        icon: <Minus className="h-4 w-4" />,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        sign: ''
      }
    }
  }

  const changeDisplay = getRatingChangeDisplay()

  return (
    <TableRow>
      <TableCell>
        <Badge variant="outline" className="w-8 h-8 p-0 flex items-center justify-center">
          {rank}
        </Badge>
      </TableCell>
      
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {playerName 
                ? playerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                : `P${rank}`
              }
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {playerName || `Player ${rating.playerId.slice(0, 8)}`}
            </span>
          </div>
        </div>
      </TableCell>
      
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">
            {rating.currentRating}
          </span>
          <span className={cn(
            changeDisplay.color
          )}>
            {changeDisplay.icon}
          </span>
          <span className={cn(
            "font-mono text-sm font-semibold",
            isIncrease && "text-success",
            isDecrease && "text-destructive",
            isNoChange && "text-muted-foreground"
          )}>
            {rating.projectedRating}
          </span>
        </div>
      </TableCell>
      
      <TableCell>
        <Badge 
          variant={confidenceBadge.variant}
          className="text-xs"
        >
          {confidenceBadge.icon}
          <span className="ml-1">{confidenceBadge.label}</span>
        </Badge>
      </TableCell>
      
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {rating.matchesConsidered} {rating.matchesConsidered === 1 ? 'match' : 'matches'}
        </span>
      </TableCell>
    </TableRow>
  )
}
