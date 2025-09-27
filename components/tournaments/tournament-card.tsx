"use client";

import Link from "next/link";
import { useState, useCallback, useMemo } from "react";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Star,
  Eye,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { formatDate, formatDateTime } from "@/lib/utils/date-formatting";
import { useActivity } from "@/stores/app-store";

import type { ApiTournament } from "@/lib/types/api";

type Tournament = ApiTournament;

interface TournamentCardProps {
  tournament: Tournament;
}

export function TournamentCard({ tournament }: TournamentCardProps) {
  const { setViewing } = useActivity();
  const [isHovered, setIsHovered] = useState(false);
  const [viewerCount] = useState(Math.floor(Math.random() * 5) + 1); // Mock viewer count

  const tournamentDate = useMemo(() => new Date(tournament.date), [tournament.date]);
  const isUpcoming = useMemo(() => tournament.status === "UPCOMING", [tournament.status]);
  const isActive = useMemo(() => tournament.status === "ACTIVE", [tournament.status]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    setViewing(`Tournament: ${tournament.name}`);
  }, [setViewing, tournament.name]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setViewing();
  }, [setViewing]);

  const handleClick = useCallback(() => {
    // Let the Link handle navigation naturally
  }, []);

  const statusBadgeVariant = useMemo(() => {
    switch (tournament.status) {
      case "UPCOMING":
        return "default" as const;
      case "ACTIVE":
        return "default" as const;
      case "COMPLETED":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  }, [tournament.status]);

  const levelBadgeVariant = useMemo(() => {
    if (!tournament.tournamentLevel) return "outline" as const;

    switch (tournament.tournamentLevel) {
      case "LOCAL":
        return "outline" as const;
      case "REGIONAL":
        return "secondary" as const;
      case "NATIONAL":
        return "default" as const;
      case "INTERNATIONAL":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  }, [tournament.tournamentLevel]);

  const participantCount = useMemo(() => {
    return tournament.participants?.length || 0;
  }, [tournament.participants]);

  const maxParticipants = useMemo(() => {
    return tournament.maxPlayers || 0;
  }, [tournament.maxPlayers]);

  const prizePool = useMemo(() => {
    if (!tournament.prizePool) return 0;
    // Handle both string and number prize pools
    const prizePoolValue =
      typeof tournament.prizePool === "string"
        ? parseFloat(tournament.prizePool.replace(/[^0-9.]/g, ""))
        : tournament.prizePool;
    return isNaN(prizePoolValue) ? 0 : prizePoolValue;
  }, [tournament.prizePool]);

  const organizerInitials = useMemo(() => {
    if (!tournament.organizer.name) return "O";
    return tournament.organizer.name
      .split(" ")
      .map((name) => name.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [tournament.organizer.name]);

  return (
    <Card
      className={`group hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 border-border bg-card ${
        isActive && viewerCount > 2 ? "ring-2 ring-accent/20" : ""
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant={statusBadgeVariant} className="font-medium">
                {isActive && (
                  <div className="w-2 h-2 bg-destructive rounded-full mr-1 animate-pulse" />
                )}
                {tournament.status.charAt(0).toUpperCase() +
                  tournament.status.slice(1).toLowerCase()}
              </Badge>

              {tournament.tournamentLevel && (
                <Badge 
                  variant={levelBadgeVariant} 
                  className="font-medium dark:bg-accent dark:text-white dark:border-transparent"
                >
                  {tournament.tournamentLevel.charAt(0).toUpperCase() +
                    tournament.tournamentLevel.slice(1).toLowerCase()}
                </Badge>
              )}
            </div>

            <h3 className="font-semibold text-lg text-card-foreground truncate group-hover:text-primary transition-colors duration-200">
              <Link
                href={`/tournaments/${tournament.id}`}
                onClick={handleClick}
              >
                {tournament.name}
              </Link>
            </h3>

            <p className="text-sm text-muted-foreground font-medium">
              {tournament.game.name} • {tournament.format}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{formatDate(tournamentDate)}</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{formatDateTime(tournamentDate)}</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{tournament.store.name}</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span>
              {participantCount}
              {maxParticipants > 0 && `/${maxParticipants}`}
            </span>
          </div>
        </div>

        {/* Additional tournament details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-medium">Entry:</span>
            <span>${tournament.entryFee || 0}</span>
          </div>

          {tournament.matchCount > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="font-medium">Matches:</span>
              <span>{tournament.matchCount}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                {organizerInitials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              by {tournament.organizer.name || "Organizer"}
            </span>
          </div>

          {prizePool > 0 && (
            <div className="flex items-center gap-1 text-accent font-semibold">
              <Star className="h-4 w-4 fill-current" />
              <span className="text-sm">
                ${prizePool.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Live activity indicators for active tournaments */}
        {isActive && isHovered && viewerCount > 2 && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span>{viewerCount} viewing</span>
            </div>
            <div className="flex items-center gap-1 text-destructive text-sm font-medium">
              <Zap className="h-4 w-4" />
              <span>LIVE</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground transition-colors duration-200"
            asChild
          >
            <Link href={`/tournaments/${tournament.id}`} onClick={handleClick}>
              {isUpcoming ? "Join Tournament" : "View Details"}
            </Link>
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="hover:bg-accent hover:border-accent transition-colors duration-200"
            title="Add to favorites"
          >
            <Star className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
