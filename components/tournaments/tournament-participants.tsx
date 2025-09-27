'use client'

import { useState } from 'react'
import { useFilter } from '@/hooks/stores'
import { Search, Filter, MoreVertical, UserCheck, Trophy, Medal, Award } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import type { ApiTournament } from '@/lib/types/api'

interface TournamentParticipantsProps {
  tournament: ApiTournament
  isOrganizer: boolean
  currentUser?: {
    id: string
    role: string
    displayName?: string | null
  } | null
}

export function TournamentParticipants({ tournament, isOrganizer, currentUser }: TournamentParticipantsProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'seed' | 'wins' | 'rating'>('seed')
  
  // Use store for filter state
  const { filters, setFilter } = useFilter('tournament-participants')
  const filterStatus = filters.status || 'all'
  const setFilterStatus = (status: 'all' | 'active' | 'eliminated') => setFilter({ status })

  const participants = tournament.participants || []

  const filteredParticipants = participants
    .filter(participant => {
      const matchesSearch = participant.displayName.toLowerCase().includes(searchTerm.toLowerCase())
      // For now, all participants are considered active since we don't have elimination data
      const matchesFilter = filterStatus === 'all' || filterStatus === 'active'
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      // For now, just sort by display name since we don't have detailed stats
      return a.displayName.localeCompare(b.displayName)
    })

  const getTierIcon = (rating?: number) => {
    if (!rating) return null
    
    if (rating >= 2400) return <Trophy className="h-4 w-4 text-primary" />
    if (rating >= 2000) return <Medal className="h-4 w-4 text-muted-foreground" />
    if (rating >= 1600) return <Award className="h-4 w-4 text-accent" />
    if (rating >= 1200) return <Medal className="h-4 w-4 text-muted-foreground" />
    return <Award className="h-4 w-4 text-primary" />
  }

  const getStatusColor = () => {
    return 'success' // All participants are active for now
  }

  const isCurrentUser = (participantId: string) => {
    return currentUser?.id === participantId
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
              {filteredParticipants.map((participant, index) => (
                <TableRow 
                  key={participant.id}
                  className={isCurrentUser(participant.id) ? 'bg-primary/5' : ''}
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
                          <span className={`font-medium ${isCurrentUser(participant.id) ? 'text-primary' : 'text-foreground'}`}>
                            {participant.displayName}
                          </span>
                          {isCurrentUser(participant.id) && (
                            <Badge variant="secondary" className="text-xs">You</Badge>
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
                      variant={getStatusColor() as any}
                      className="text-xs"
                    >
                      <UserCheck className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    {isOrganizer && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Profile</DropdownMenuItem>
                          <DropdownMenuItem>Send Message</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {filteredParticipants.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No participants found matching your criteria.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
