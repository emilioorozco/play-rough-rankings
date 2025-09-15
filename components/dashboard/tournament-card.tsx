"use client";

import { Calendar, MapPin, Users, Trophy, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Tournament {
  id: string;
  name: string;
  game: string;
  status: "upcoming" | "active" | "completed";
  date: string;
  time?: string;
  venue: string;
  organizer: string;
  participants: number;
  maxParticipants?: number;
  prizePool?: number;
  level?: "beginner" | "intermediate" | "pro";
  isLive?: boolean;
}

interface TournamentCardProps {
  tournament?: Tournament;
  isLoading?: boolean;
  className?: string;
}

export function TournamentCard({
  tournament,
  isLoading = false,
  className,
}: TournamentCardProps) {
  // Empty state when no tournament data
  if (!isLoading && !tournament) {
    return (
      <div className={cn("card p-6", className)}>
        <div className="flex items-center justify-center h-32 text-center">
          <div className="space-y-2">
            <Trophy className="h-8 w-8 text-muted-foreground mx-auto" />
            <h3 className="font-medium text-muted-foreground">
              No tournaments available
            </h3>
            <p className="text-sm text-muted-foreground">
              Tournament data will appear here when available
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
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
            <div className="h-6 w-16 bg-muted animate-pulse rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-6 w-48 bg-muted animate-pulse rounded"></div>
            <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-36 bg-muted animate-pulse rounded"></div>
            <div className="h-4 w-28 bg-muted animate-pulse rounded"></div>
            <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!tournament) return null;

  const getStatusColor = (status: Tournament["status"]) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "upcoming":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getLevelColor = (level?: Tournament["level"]) => {
    switch (level) {
      case "beginner":
        return "bg-green-50 text-green-700 border-green-200";
      case "intermediate":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "pro":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className={cn("card p-6 card-hover", className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(tournament.status)}>
              {tournament.isLive && tournament.status === "active" && (
                <Circle className="h-2 w-2 mr-1 fill-current animate-pulse" />
              )}
              {tournament.status.toUpperCase()}
            </Badge>
            {tournament.level && (
              <Badge
                variant="outline"
                className={getLevelColor(tournament.level)}
              >
                {tournament.level}
              </Badge>
            )}
          </div>
        </div>

        {/* Tournament Name & Game */}
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground line-clamp-1">
            {tournament.name}
          </h3>
          <p className="text-sm text-muted-foreground">{tournament.game}</p>
        </div>

        {/* Tournament Details */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              {formatDate(tournament.date)}
              {tournament.time && ` • ${tournament.time}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">{tournament.venue}</span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>
              {tournament.participants}
              {tournament.maxParticipants &&
                ` / ${tournament.maxParticipants}`}{" "}
              players
            </span>
          </div>

          {tournament.prizePool && (
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span>${tournament.prizePool.toLocaleString()} prize pool</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">
            by {tournament.organizer}
          </span>
          {tournament.participants > 0 && tournament.maxParticipants && (
            <div className="w-16 bg-muted rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    (tournament.participants / tournament.maxParticipants) *
                      100,
                    100,
                  )}%`,
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
