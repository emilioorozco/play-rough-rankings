"use client";

import {
  TrendingUp,
  TrendingDown,
  Trophy,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";

export interface LeaderboardEntry {
  rank: number;
  player: {
    name: string;
    username: string;
  };
  rating: number;
  ratingChange: number;
  gamesPlayed: number;
  winRate: number;
  tier: "bronze" | "silver" | "gold" | "platinum" | "diamond";
}

interface LeaderboardTableProps {
  entries?: LeaderboardEntry[];
  isLoading?: boolean;
  className?: string;
}

type SortField = "rank" | "rating" | "gamesPlayed" | "winRate";
type SortDirection = "asc" | "desc";

export function LeaderboardTable({
  entries = [],
  isLoading = false,
  className,
}: LeaderboardTableProps) {
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Empty state when no data
  if (!isLoading && entries.length === 0) {
    return (
      <div className={cn("card", className)}>
        <div className="p-8 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            No leaderboard data available
          </h3>
          <p className="text-sm text-muted-foreground">
            Rankings will appear here when players start competing
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("card", className)}>
        <div className="overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border">
            <div className="h-5 w-32 bg-muted animate-pulse rounded"></div>
          </div>

          {/* Loading rows */}
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="h-4 w-8 bg-muted animate-pulse rounded"></div>
                  <div className="h-10 w-10 bg-muted animate-pulse rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
                    <div className="h-3 w-24 bg-muted animate-pulse rounded"></div>
                  </div>
                  <div className="ml-auto flex gap-4">
                    <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
                    <div className="h-4 w-12 bg-muted animate-pulse rounded"></div>
                    <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedEntries = [...entries].sort((a, b) => {
    let aValue: number;
    let bValue: number;

    switch (sortField) {
      case "rank":
        aValue = a.rank;
        bValue = b.rank;
        break;
      case "rating":
        aValue = a.rating;
        bValue = b.rating;
        break;
      case "gamesPlayed":
        aValue = a.gamesPlayed;
        bValue = b.gamesPlayed;
        break;
      case "winRate":
        aValue = a.winRate;
        bValue = b.winRate;
        break;
      default:
        aValue = a.rank;
        bValue = b.rank;
    }

    return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
  });

  const getTierColor = (tier: LeaderboardEntry["tier"]) => {
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

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      {children}
      {sortField === field &&
        (sortDirection === "asc" ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        ))}
    </button>
  );

  return (
    <div className={cn("card", className)}>
      <div className="overflow-x-auto">
        {/* Header - Desktop */}
        <div className="hidden md:block px-6 py-4 border-b border-border bg-muted/30">
          <div className="grid grid-cols-12 gap-4 items-center text-sm font-medium text-muted-foreground">
            <div className="col-span-1">
              <SortButton field="rank">Rank</SortButton>
            </div>
            <div className="col-span-4">Player</div>
            <div className="col-span-2">
              <SortButton field="rating">Rating</SortButton>
            </div>
            <div className="col-span-2">
              <SortButton field="gamesPlayed">Games</SortButton>
            </div>
            <div className="col-span-2">
              <SortButton field="winRate">Win Rate</SortButton>
            </div>
            <div className="col-span-1">Tier</div>
          </div>
        </div>

        {/* Entries - Desktop */}
        <div className="hidden md:block divide-y divide-border">
          {sortedEntries.map((entry, index) => (
            <div
              key={`${entry.player.username}-${index}`}
              className="px-6 py-4 hover:bg-muted/20 transition-colors"
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Rank */}
                <div className="col-span-1">
                  <div className="flex items-center gap-2">
                    {entry.rank <= 3 && (
                      <Trophy
                        className={cn(
                          "h-4 w-4",
                          entry.rank === 1 && "text-yellow-600",
                          entry.rank === 2 && "text-gray-500",
                          entry.rank === 3 && "text-amber-600",
                        )}
                      />
                    )}
                    <span className="font-semibold">#{entry.rank}</span>
                  </div>
                </div>

                {/* Player */}
                <div className="col-span-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {entry.player.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-foreground">
                        {entry.player.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        @{entry.player.username}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rating */}
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{entry.rating}</span>
                    {entry.ratingChange !== 0 && (
                      <div className="flex items-center gap-1">
                        {entry.ratingChange > 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        )}
                        <span
                          className={cn(
                            "text-xs font-medium",
                            entry.ratingChange > 0
                              ? "text-green-600"
                              : "text-red-600",
                          )}
                        >
                          {entry.ratingChange > 0 ? "+" : ""}
                          {entry.ratingChange}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Games Played */}
                <div className="col-span-2">
                  <span className="font-medium">{entry.gamesPlayed}</span>
                </div>

                {/* Win Rate */}
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{entry.winRate}%</span>
                    <div className="flex-1 bg-muted rounded-full h-1 max-w-16">
                      <div
                        className="bg-primary h-1 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(entry.winRate, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Tier */}
                <div className="col-span-1">
                  <Badge
                    className={getTierColor(entry.tier)}
                    variant="outline"
                  >
                    {entry.tier.charAt(0).toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          {sortedEntries.map((entry, index) => (
            <div
              key={`${entry.player.username}-${index}-mobile`}
              className="px-4 py-4 border-b border-border hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Rank & Avatar */}
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1">
                    {entry.rank <= 3 && (
                      <Trophy
                        className={cn(
                          "h-3 w-3",
                          entry.rank === 1 && "text-yellow-600",
                          entry.rank === 2 && "text-gray-500",
                          entry.rank === 3 && "text-amber-600",
                        )}
                      />
                    )}
                    <span className="text-xs font-bold">#{entry.rank}</span>
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {entry.player.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Player Info & Stats */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-sm text-foreground">
                        {entry.player.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        @{entry.player.username}
                      </div>
                    </div>
                    <Badge
                      className={getTierColor(entry.tier)}
                      variant="outline"
                    >
                      {entry.tier.charAt(0).toUpperCase()}
                    </Badge>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-semibold text-foreground">
                        {entry.rating}
                      </div>
                      <div className="text-muted-foreground">Rating</div>
                      {entry.ratingChange !== 0 && (
                        <div className="flex items-center justify-center gap-1 mt-1">
                          {entry.ratingChange > 0 ? (
                            <TrendingUp className="h-2 w-2 text-green-600" />
                          ) : (
                            <TrendingDown className="h-2 w-2 text-red-600" />
                          )}
                          <span
                            className={cn(
                              "text-xs font-medium",
                              entry.ratingChange > 0
                                ? "text-green-600"
                                : "text-red-600",
                            )}
                          >
                            {entry.ratingChange > 0 ? "+" : ""}
                            {entry.ratingChange}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-center">
                      <div className="font-semibold text-foreground">
                        {entry.gamesPlayed}
                      </div>
                      <div className="text-muted-foreground">Games</div>
                    </div>

                    <div className="text-center">
                      <div className="font-semibold text-foreground">
                        {entry.winRate}%
                      </div>
                      <div className="text-muted-foreground">Win Rate</div>
                      <div className="w-full bg-muted rounded-full h-1 mt-1">
                        <div
                          className="bg-primary h-1 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(entry.winRate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
