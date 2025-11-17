'use client'

import { useState, useRef } from 'react'
import { useFilter } from '@/hooks/stores'
import { Search, Filter, MoreVertical, UserCheck, Trophy, Medal, Award, UserX } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { useConfirmationModal } from '@/stores/ui-store'
import type { ApiTournament } from '@/lib/types/api'

interface TournamentParticipantsProps {
  tournament: ApiTournament
  isOrganizer: boolean
  currentUser?: {
    id: string
    role: string
    displayName?: string | null
  } | null
  canManage?: boolean
  onUpdate?: () => void
}

export function TournamentParticipants({ tournament, isOrganizer: _isOrganizer, currentUser, canManage = false, onUpdate }: TournamentParticipantsProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'seed' | 'wins' | 'rating'>('seed')
  
  // Use store for filter state
  const { filters, setFilter } = useFilter('tournament-participants')
  const filterStatus = filters.status || 'all'
  const setFilterStatus = (status: 'all' | 'active' | 'dropped') => setFilter({ status })

  // Confirmation modal for player drop
  const { isOpen, config, close, open } = useConfirmationModal()

  // Store onUpdate in ref to avoid dependency array type inference issues
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  // Drop player mutation - use type assertion to avoid deep type inference
  const dropPlayerMutation = trpc.tournamentLifecycle.dropPlayer.useMutation({
    onSuccess: (data: { message: string }) => {
      console.log('Player dropped successfully:', data.message)
      // Refresh tournament data
      if (onUpdateRef.current) {
        onUpdateRef.current()
      }
    },
    onError: (error: { message: string }) => {
      console.error('Failed to drop player:', error.message)
    }
  } as any)

  const participants = tournament.participants || []

  // Get tournament entries to check dropped status
  const tournamentQuery = trpc.tournaments.getById.useQuery({
    id: tournament.id,
    includeParticipants: true
  })

  const entries = tournamentQuery.data?.entries || []

  // Create a map of player ID to entry for quick lookup
  const entryMap = new Map(entries.map((entry: any) => [entry.playerId, entry]))

  const filteredParticipants = participants
    .filter(participant => {
      const matchesSearch = participant.displayName.toLowerCase().includes(searchTerm.toLowerCase())
      const entry = entryMap.get(participant.id)
      const isDropped = entry?.dropped || false
      
      // Filter by status
      let matchesFilter = true
      if (filterStatus === 'active') {
        matchesFilter = !isDropped
      } else if (filterStatus === 'dropped') {
        matchesFilter = isDropped
      }
      
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      // For now, just sort by display name since we don't have detailed stats
      return a.displayName.localeCompare(b.displayName)
    })

  // Handle player drop
  const handleDropPlayer = (playerId: string, playerName: string) => {
    open({
      title: 'Drop from Tournament',
      message: `Are you sure you want to drop ${playerName} from this tournament?\n\nThis action will:\n• Remove the player from future pairings\n• Mark all pending matches as forfeited\n• Update tournament standings\n\nThis action cannot be undone.`,
      confirmLabel: 'Drop Player',
      cancelLabel: 'Cancel',
      variant: 'destructive',
      onConfirm: () => {
        dropPlayerMutation.mutate({
          tournamentId: tournament.id,
          playerId
        })
      }
    })
  }

  const getTierIcon = (rating?: number) => {
    if (!rating) return null
    
    if (rating >= 2400) return <Trophy className="h-4 w-4 text-primary" />
    if (rating >= 2000) return <Medal className="h-4 w-4 text-muted-foreground" />
    if (rating >= 1600) return <Award className="h-4 w-4 text-accent" />
    if (rating >= 1200) return <Medal className="h-4 w-4 text-muted-foreground" />
    return <Award className="h-4 w-4 text-primary" />
  }

  const getStatusColor = (isDropped: boolean) => {
    return isDropped ? 'destructive' : 'success'
  }

  const getStatusLabel = (isDropped: boolean) => {
    return isDropped ? 'Dropped' : 'Active'
  }

  const getStatusIcon = (isDropped: boolean) => {
    return isDropped ? UserX : UserCheck
  }

  const isCurrentUser = (participantId: string) => {
    return currentUser?.id === participantId
  }

  const canDropPlayer = (participantId: string) => {
    // Can drop if:
    // 1. User is the player themselves (and tournament is active)
    // 2. User is organizer or admin
    const isOwnPlayer = currentUser?.id === participantId
    return (isOwnPlayer && tournament.status === 'ACTIVE') || canManage
  }

  return (
    <Card className="dark:bg-muted dark:text-foreground border-border">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Tournament Participants</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredParticipants.length} of {participants.length} participants
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search participants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                    All Participants
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus('active')}>
                    Active Only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus('dropped')}>
                    Dropped Only
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Sort by {sortBy}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortBy('seed')}>
                    Sort by Name
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('wins')}>
                    Sort by Rating
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
                <TableHead>Record</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredParticipants.map((participant, index) => {
                const entry = entryMap.get(participant.id)
                const isDropped = entry?.dropped || false
                const StatusIcon = getStatusIcon(isDropped)
                
                return (
                  <TableRow 
                    key={participant.id}
                    className={`${isCurrentUser(participant.id) ? 'bg-primary/5' : ''} ${isDropped ? 'opacity-60' : ''}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="w-8 h-8 p-0 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {participant.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${isCurrentUser(participant.id) ? 'text-primary' : 'text-foreground'} ${isDropped ? 'line-through' : ''}`}>
                              {participant.displayName}
                            </span>
                            {isCurrentUser(participant.id) && (
                              <Badge variant="secondary" className="text-xs">You</Badge>
                            )}
                            {isDropped && (
                              <Badge variant="destructive" className="text-xs">Dropped</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-muted-foreground">Player</span>
                            {getTierIcon()}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          N/A
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <span className="font-mono">N/A</span>
                    </TableCell>
                    
                    <TableCell>
                      <Badge 
                        variant={getStatusColor(isDropped) as any}
                        className="text-xs"
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {getStatusLabel(isDropped)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      {(canManage || isCurrentUser(participant.id)) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Profile</DropdownMenuItem>
                            {canManage && (
                              <>
                                <DropdownMenuItem>Send Message</DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {!isDropped && canDropPlayer(participant.id) && (
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDropPlayer(participant.id, participant.displayName)}
                                disabled={dropPlayerMutation.isPending}
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Drop from Tournament
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        
        {filteredParticipants.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No participants found matching your criteria.</p>
          </div>
        )}

        {/* Confirmation Modal */}
        {config && (
          <ConfirmationModal
            isOpen={isOpen}
            onClose={close}
            onConfirm={config.onConfirm || (() => {})}
            title={config.title}
            message={config.message}
            confirmLabel={config.confirmLabel}
            cancelLabel={config.cancelLabel}
            variant={config.variant === 'destructive' ? 'destructive' : 'default'}
          />
        )}
      </CardContent>
    </Card>
  )
}
