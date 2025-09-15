'use client'

import { Trophy, TrendingUp, TrendingDown, Medal, Star, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { Progress } from '../ui/progress'
import Link from 'next/link'

interface PlayerCardProps {
  player: {
    id: string
    displayName: string
    userName?: string
    role: string
    gameStats?: Array<{
      gameId: string
      currentRating: number
      seasonalStats?: {
        wins: number
        losses: number
        tournaments: number
        points: number
      }
      game?: {
        name: string
        shortName: string
      }
    }>
    createdAt?: string
  }
  gameId?: string
  rank?: number
  showActions?: boolean
}

export function PlayerCard({ player, gameId, rank, showActions = true }: PlayerCardProps) {
  // Get the relevant game stats
  const gameStats = gameId 
    ? player.gameStats?.find(stat => stat.gameId === gameId)
    : player.gameStats?.[0] // Use first game if no specific game selected

  const rating = gameStats?.currentRating || 1200
  const seasonalStats = gameStats?.seasonalStats || { wins: 0, losses: 0, tournaments: 0, points: 0 }
  const totalGames = seasonalStats.wins + seasonalStats.losses
  const winRate = totalGames > 0 ? Math.round((seasonalStats.wins / totalGames) * 100) : 0

  // Mock data for features not yet implemented
  const ratingChange = Math.floor(Math.random() * 100) - 50 // Random change between -50 and +50
  const achievements = Math.floor(Math.random() * 10) // Random achievements 0-9
  const status = Math.random() > 0.5 ? 'online' : 'offline' // Random status

  // Determine tier based on rating
  const getTier = (rating: number) => {
    if (rating >= 2000) return 'diamond'
    if (rating >= 1800) return 'platinum'
    if (rating >= 1600) return 'gold'
    if (rating >= 1400) return 'silver'
    return 'bronze'
  }

  const tier = getTier(rating)

  const tierColors = {
    bronze: 'bg-amber-100 text-amber-800 border-amber-200',
    silver: 'bg-gray-100 text-gray-800 border-gray-200',
    gold: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    platinum: 'bg-blue-100 text-blue-800 border-blue-200',
    diamond: 'bg-purple-100 text-purple-800 border-purple-200'
  }

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    'in-game': 'bg-blue-500'
  }

  const getRankIcon = (rank?: number) => {
    if (!rank) return null
    if (rank === 1) return <Medal className="h-5 w-5 text-yellow-500 fill-current" />
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400 fill-current" />
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600 fill-current" />
    return <span className="font-bold text-lg text-muted-foreground">#{rank}</span>
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Card className="group hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {getInitials(player.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${statusColors[status]} rounded-full border-2 border-background`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-card-foreground truncate group-hover:text-primary transition-colors duration-200">
                <Link href={`/players/${player.id}`} className="hover:underline">
                  {player.displayName}
                </Link>
              </h3>
              <p className="text-sm text-muted-foreground">@{player.userName || 'player'}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {getRankIcon(rank)}
            <Badge 
              variant="outline" 
              className={`${tierColors[tier]} font-medium text-xs`}
            >
              {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Rating</p>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{rating}</span>
              <div className={`flex items-center gap-1 ${ratingChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {ratingChange >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span className="text-xs font-medium">
                  {ratingChange > 0 ? '+' : ''}{ratingChange}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Win Rate</p>
            <div className="space-y-1">
              <span className="font-bold text-lg">{winRate}%</span>
              <Progress value={winRate} className="h-2" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Trophy className="h-4 w-4" />
              <span>Games Played</span>
            </div>
            <span className="font-medium">{totalGames}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Star className="h-4 w-4" />
              <span>Achievements</span>
            </div>
            <span className="font-medium">{achievements}</span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">
              {gameStats?.game?.name || 'Multiple Games'}
            </span>
          </div>
        </div>

        {showActions && (
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button 
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground transition-colors duration-200"
              size="sm"
              disabled
            >
              Challenge
            </Button>
            <Button 
              variant="outline" 
              className="hover:bg-accent hover:border-accent transition-colors duration-200"
              size="sm"
              asChild
            >
              <Link href={`/players/${player.id}`}>
                View Profile
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
