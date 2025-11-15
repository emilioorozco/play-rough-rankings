'use client'

import { useState } from 'react'
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
  onRatingsUpdate 
}: ProjectedRatingsDisplayProps) {
  const [sortBy, setSortBy] = useState<'rating' | 'change' | 'confidence'>('rating')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Fetch projected ratings with real-time updates
  const { 
    data, 
    isLoading, 
    error,
    refetch 
  } = trpc.tournamentLifecycle.getProjectedRatings.useQuery(
    { tournamentId },
    {
      // Refetch every 30 seconds for real-time updates
      refetchInterval: 30000,
      // Refetch on window focus
      refetchOnWindowFocus: true
    }
  )

  // Call onRatingsUpdate when data changes
  if (data?.projectedRatings && onRatingsUpdate) {
    onRatingsUpdate(data.projectedRatings)
  }

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

  if (projectedRatings.length === 0) {
    return (
      <Card className="dark:bg-muted dark:text-foreground border-border">
        <CardHeader>
          <CardTitle>Projected Rating Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No rating projections available"
            description="Rating projections will appear once matches are completed."
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
        <div className="rounded-md border border-border">
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
                  onClick={() => toggleSort('change')}
                >
                  <div className="flex items-center gap-1">
                    Change
                    {sortBy === 'change' && (
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
              {sortedRatings.map((rating, index) => (
                <ProjectedRatingRow 
                  key={rating.playerId}
                  rating={rating}
                  rank={index + 1}
                />
              ))}
            </TableBody>
          </Table>
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
  rank 
}: { 
  rating: ProjectedRating
  rank: number 
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
              P{rank}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              Player {rating.playerId.slice(0, 8)}
            </span>
            <span className="text-xs text-muted-foreground">
              ID: {rating.playerId.slice(0, 8)}
            </span>
          </div>
        </div>
      </TableCell>
      
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">
            {rating.currentRating}
          </span>
          <span className="text-muted-foreground">→</span>
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
        <div className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md",
          changeDisplay.bgColor
        )}>
          <span className={changeDisplay.color}>
            {changeDisplay.icon}
          </span>
          <span className={cn(
            "font-mono text-sm font-semibold",
            changeDisplay.color
          )}>
            {changeDisplay.sign}{rating.ratingChange}
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
