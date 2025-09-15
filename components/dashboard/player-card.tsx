"use client";

import {
  TrendingUp,
  TrendingDown,
  User,
  MapPin,
  Trophy,
  Circle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface Player {
  id: string;
  name: string;
  username: string;
  rank: number;
  rating: number;
  ratingChange: number;
  gamesPlayed: number;
  winRate: number;
  location?: string;
  achievements: number;
  status: "online" | "in-game" | "offline";
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond";
}

interface PlayerCardProps {
  player?: Player;
  isLoading?: boolean;
  className?: string;
}

export function PlayerCard({
  player,
  isLoading = false,
  className,
}: PlayerCardProps) {
  // Empty state when no player data
  if (!isLoading && !player) {
    return (
      <div className={cn("card p-6", className)}>
        <div className="flex items-center justify-center h-32 text-center">
          <div className="space-y-2">
            <User className="h-8 w-8 text-muted-foreground mx-auto" />
            <h3 className="font-medium text-muted-foreground">
              No players available
            </h3>
            <p className="text-sm text-muted-foreground">
              Player data will appear here when available
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("card p-6", className)}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-muted animate-pulse rounded-full"></div>
            <div className="space-y-2">
              <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
              <div className="h-3 w-24 bg-muted animate-pulse rounded"></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-28 bg-muted animate-pulse rounded"></div>
            <div className="h-4 w-36 bg-muted animate-pulse rounded"></div>
            <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!player) return null;

  const getTierColor = (tier: Player["tier"]) => {
    switch (tier) {
      case "bronze":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "silver":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "gold":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "platinum":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "diamond":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusColor = (status: Player["status"]) => {
    switch (status) {
      case "online":
        return "text-green-600";
      case "in-game":
        return "text-blue-600";
      case "offline":
        return "text-gray-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: Player["status"]) => {
    return (
      <Circle className={cn("h-2 w-2 fill-current", getStatusColor(status))} />
    );
  };

  return (
    <div className={cn("card p-6 card-hover", className)}>
      <div className="space-y-4">
        {/* Header with Avatar and Basic Info */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {player.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1">
              {getStatusIcon(player.status)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate">
                {player.name}
              </h3>
              <Badge className={getTierColor(player.tier)} variant="outline">
                {player.tier}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">@{player.username}</p>
          </div>
        </div>

        {/* Rank and Rating */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              #{player.rank}
            </div>
            <div className="text-xs text-muted-foreground">Rank</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl font-bold text-foreground">
                {player.rating}
              </span>
              {player.ratingChange !== 0 && (
                <div className="flex items-center">
                  {player.ratingChange > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span
                    className={cn(
                      "text-xs font-medium ml-1",
                      player.ratingChange > 0
                        ? "text-green-600"
                        : "text-red-600",
                    )}
                  >
                    {player.ratingChange > 0 ? "+" : ""}
                    {player.ratingChange}
                  </span>
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground">Rating</div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Games Played</span>
            <span className="font-medium">{player.gamesPlayed}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Win Rate</span>
            <span className="font-medium">{player.winRate}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Achievements</span>
            <div className="flex items-center gap-1">
              <Trophy className="h-3 w-3 text-yellow-600" />
              <span className="font-medium">{player.achievements}</span>
            </div>
          </div>
        </div>

        {/* Location */}
        {player.location && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {player.location}
            </span>
          </div>
        )}

        {/* Win Rate Progress Bar */}
        <div className="space-y-1">
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(player.winRate, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
