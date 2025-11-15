'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormSelect } from '@/components/ui/form-components'
import { Separator } from '@/components/ui/separator'
import { 
  FileText, 
  User, 
  Clock, 
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Play,
  SkipForward,
  Pause,
  PlayCircle,
  XCircle,
  UserMinus,
  Trophy,
  Edit,
  Trash2,
  Scale
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { cn } from '@/lib/utils'
import { formatDateShort, formatTimeShort } from '@/lib/utils/date-formatting'
import type { TournamentAction } from '@/lib/tournament/types'

/**
 * Format date and time for audit trail display
 */
function formatAuditTimestamp(date: Date): string {
  const dateStr = formatDateShort(date)
  const timeStr = formatTimeShort(date)
  return `${dateStr} ${timeStr}`
}

interface AuditTrailViewerProps {
  tournamentId: string
  /** Optional: Show only match-specific audit trail */
  matchId?: string
  /** Optional: Compact view for embedding in other components */
  compact?: boolean
  /** Optional: Maximum number of entries to display initially */
  initialLimit?: number
}

/**
 * Audit Trail Viewer Component
 * 
 * Displays chronological list of all tournament actions with filtering capabilities.
 * Provides transparency and accountability for tournament management.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */
export function AuditTrailViewer({ 
  tournamentId,
  matchId,
  compact = false,
  initialLimit = 20
}: AuditTrailViewerProps) {
  // Filter states
  const [actionFilter, setActionFilter] = useState<TournamentAction | 'ALL'>('ALL')
  const [showFilters, setShowFilters] = useState(false)
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())
  const [displayLimit, setDisplayLimit] = useState(initialLimit)

  // Fetch audit trail
  const { data, isLoading, error } = trpc.tournamentLifecycle.getAuditTrail.useQuery({
    tournamentId,
    filters: actionFilter !== 'ALL' ? { action: actionFilter } : undefined
  })

  // Filter audit trail for match-specific view
  const auditTrail = useMemo(() => {
    if (!data?.auditTrail) return []
    
    let filtered = data.auditTrail
    
    // Filter by match ID if provided
    if (matchId) {
      filtered = filtered.filter(entry => entry.details.matchId === matchId)
    }
    
    return filtered
  }, [data?.auditTrail, matchId])

  // Paginated audit trail
  const displayedAuditTrail = useMemo(() => {
    return auditTrail.slice(0, displayLimit)
  }, [auditTrail, displayLimit])

  // Toggle entry expansion
  const toggleExpanded = (entryId: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev)
      if (next.has(entryId)) {
        next.delete(entryId)
      } else {
        next.add(entryId)
      }
      return next
    })
  }

  // Get icon for action type
  const getActionIcon = (action: TournamentAction) => {
    const iconMap: Record<TournamentAction, React.ReactNode> = {
      START: <Play className="h-4 w-4" />,
      ADVANCE_ROUND: <SkipForward className="h-4 w-4" />,
      SUBMIT_MATCH: <CheckCircle className="h-4 w-4" />,
      OVERRIDE_MATCH: <Edit className="h-4 w-4" />,
      PAUSE: <Pause className="h-4 w-4" />,
      RESUME: <PlayCircle className="h-4 w-4" />,
      CANCEL: <XCircle className="h-4 w-4" />,
      COMPLETE: <Trophy className="h-4 w-4" />,
      PLAYER_DROP: <UserMinus className="h-4 w-4" />,
      ASSIGN_BYE: <User className="h-4 w-4" />,
      CREATE_MANUAL_PAIRING: <Edit className="h-4 w-4" />,
      UPDATE_MANUAL_PAIRING: <Edit className="h-4 w-4" />,
      DELETE_MANUAL_PAIRING: <Trash2 className="h-4 w-4" />,
      RESOLVE_DISPUTE: <Scale className="h-4 w-4" />
    }
    return iconMap[action] || <FileText className="h-4 w-4" />
  }

  // Get badge variant for action type
  const getActionBadgeVariant = (action: TournamentAction): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (['START', 'COMPLETE', 'RESUME'].includes(action)) return 'default'
    if (['CANCEL', 'PLAYER_DROP', 'DELETE_MANUAL_PAIRING'].includes(action)) return 'destructive'
    if (['PAUSE', 'OVERRIDE_MATCH', 'RESOLVE_DISPUTE'].includes(action)) return 'secondary'
    return 'outline'
  }

  // Format action name for display
  const formatActionName = (action: TournamentAction): string => {
    return action.split('_').map(word => 
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ')
  }

  // Format audit entry details
  const formatDetails = (entry: any) => {
    const details: string[] = []
    
    if (entry.details.round !== undefined) {
      details.push(`Round: ${entry.details.round}`)
    }
    
    if (entry.details.matchId) {
      details.push(`Match ID: ${entry.details.matchId.slice(0, 8)}...`)
    }
    
    if (entry.details.playerId) {
      details.push(`Player ID: ${entry.details.playerId.slice(0, 8)}...`)
    }
    
    if (entry.details.reason) {
      details.push(`Reason: ${entry.details.reason}`)
    }
    
    return details
  }

  // Render loading state
  if (isLoading) {
    return (
      <Card className={cn(compact && 'border-0 shadow-none')}>
        <CardHeader className={cn(compact && 'px-0')}>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {matchId ? 'Match Audit Trail' : 'Tournament Audit Trail'}
          </CardTitle>
          {!compact && (
            <CardDescription>
              Loading audit trail...
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className={cn(compact && 'px-0')}>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render error state
  if (error) {
    return (
      <Card className={cn(compact && 'border-0 shadow-none')}>
        <CardHeader className={cn(compact && 'px-0')}>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {matchId ? 'Match Audit Trail' : 'Tournament Audit Trail'}
          </CardTitle>
        </CardHeader>
        <CardContent className={cn(compact && 'px-0')}>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to load audit trail: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render empty state
  if (!auditTrail || auditTrail.length === 0) {
    return (
      <Card className={cn(compact && 'border-0 shadow-none')}>
        <CardHeader className={cn(compact && 'px-0')}>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {matchId ? 'Match Audit Trail' : 'Tournament Audit Trail'}
          </CardTitle>
          {!compact && (
            <CardDescription>
              No audit entries found
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className={cn(compact && 'px-0')}>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No audit trail entries yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Action filter options
  const actionOptions = [
    { value: 'ALL', label: 'All Actions' },
    { value: 'START', label: 'Start' },
    { value: 'ADVANCE_ROUND', label: 'Advance Round' },
    { value: 'SUBMIT_MATCH', label: 'Submit Match' },
    { value: 'OVERRIDE_MATCH', label: 'Override Match' },
    { value: 'PAUSE', label: 'Pause' },
    { value: 'RESUME', label: 'Resume' },
    { value: 'CANCEL', label: 'Cancel' },
    { value: 'COMPLETE', label: 'Complete' },
    { value: 'PLAYER_DROP', label: 'Player Drop' },
    { value: 'ASSIGN_BYE', label: 'Assign Bye' },
    { value: 'CREATE_MANUAL_PAIRING', label: 'Create Manual Pairing' },
    { value: 'UPDATE_MANUAL_PAIRING', label: 'Update Manual Pairing' },
    { value: 'DELETE_MANUAL_PAIRING', label: 'Delete Manual Pairing' },
    { value: 'RESOLVE_DISPUTE', label: 'Resolve Dispute' }
  ]

  return (
    <Card className={cn(compact && 'border-0 shadow-none')}>
      <CardHeader className={cn(compact && 'px-0')}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {matchId ? 'Match Audit Trail' : 'Tournament Audit Trail'}
            </CardTitle>
            {!compact && (
              <CardDescription>
                {data?.stats.totalEntries || 0} total entries
                {data?.stats.dateRange && (
                  <> • {formatDateShort(new Date(data.stats.dateRange.earliest))} - {formatDateShort(new Date(data.stats.dateRange.latest))}</>
                )}
              </CardDescription>
            )}
          </div>
          {!matchId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </Button>
          )}
        </div>

        {/* Filters */}
        {showFilters && !matchId && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelect
                label="Action Type"
                options={actionOptions}
                value={actionFilter}
                onValueChange={(value) => setActionFilter(value as TournamentAction | 'ALL')}
              />
            </div>
            
            {actionFilter !== 'ALL' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActionFilter('ALL')}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className={cn(compact && 'px-0')}>
        <div className="space-y-4">
          {displayedAuditTrail.map((entry, index) => {
            const isExpanded = expandedEntries.has(entry.id)
            const details = formatDetails(entry)
            const hasDetails = details.length > 0 || entry.details.previousValue || entry.details.newValue

            return (
              <div key={entry.id}>
                {index > 0 && <Separator className="my-4" />}
                
                <div className="space-y-2">
                  {/* Entry header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn(
                        "mt-1 p-2 rounded-lg",
                        getActionBadgeVariant(entry.action) === 'default' && "bg-primary/10 text-primary",
                        getActionBadgeVariant(entry.action) === 'destructive' && "bg-destructive/10 text-destructive",
                        getActionBadgeVariant(entry.action) === 'secondary' && "bg-secondary/10 text-secondary-foreground",
                        getActionBadgeVariant(entry.action) === 'outline' && "bg-muted"
                      )}>
                        {getActionIcon(entry.action)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={getActionBadgeVariant(entry.action)}>
                            {formatActionName(entry.action)}
                          </Badge>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatAuditTimestamp(new Date(entry.timestamp))}
                          </span>
                        </div>
                        
                        <div className="mt-1 text-sm text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>User ID: {entry.performedBy.slice(0, 8)}...</span>
                        </div>

                        {/* Quick details preview */}
                        {!isExpanded && details.length > 0 && (
                          <div className="mt-2 text-sm">
                            {details[0]}
                            {details.length > 1 && (
                              <span className="text-muted-foreground ml-2">
                                +{details.length - 1} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expand button */}
                    {hasDetails && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(entry.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Expanded details */}
                  {isExpanded && hasDetails && (
                    <div className="ml-14 p-4 bg-muted/50 rounded-lg space-y-3">
                      {details.map((detail, i) => (
                        <div key={i} className="text-sm">
                          {detail}
                        </div>
                      ))}
                      
                      {entry.details.previousValue && (
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Previous Value:</div>
                          <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                            {JSON.stringify(entry.details.previousValue, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {entry.details.newValue && (
                        <div className="space-y-1">
                          <div className="text-sm font-medium">New Value:</div>
                          <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                            {JSON.stringify(entry.details.newValue, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Load more button */}
          {auditTrail.length > displayLimit && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={() => setDisplayLimit(prev => prev + initialLimit)}
              >
                Load More ({auditTrail.length - displayLimit} remaining)
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
