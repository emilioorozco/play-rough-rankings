"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Calendar,
  MapPin,
  Users,
  Trophy,
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
import { useActivity } from "@/components/activity-provider";
import { useViewTransitions } from "@/hooks/use-view-transitions";

import type { ApiTournament } from "@/lib/types/api";

type Tournament = ApiTournament;

interface TournamentCardProps {
  tournament: Tournament;
}

export function TournamentCard({ tournament }: TournamentCardProps) {
  const { setViewing } = useActivity();
  const { transitionToTournament } = useViewTransitions();
  const [isHovered, setIsHovered] = useState(false);
  const [viewerCount] = useState(Math.floor(Math.random() * 5) + 1); // Mock viewer count

  const tournamentDate = new Date(tournament.date);
  const isUpcoming = tournament.status === "UPCOMING";
  const isActive = tournament.status === "ACTIVE";
  const isCompleted = tournament.status === "COMPLETED";

  const handleMouseEnter = () => {
    setIsHovered(true);
    setViewing(`Tournament: ${tournament.name}`);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setViewing();
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    transitionToTournament(tournament.id);
  };

  const getStatusBadgeVariant = () => {
    switch (tournament.status) {
      case "UPCOMING":
        return "upcoming" as const;
      case "ACTIVE":
        return "active" as const;
      case "COMPLETED":
        return "completed" as const;
      default:
        return "outline" as const;
    }
  };

  const getLevelBadgeVariant = () => {
    if (!tournament.tournamentLevel) return "outline" as const;

    switch (tournament.tournamentLevel) {
      case "LOCAL":
        return "secondary" as const;
      case "REGIONAL":
        return "warning" as const;
      case "NATIONAL":
        return "error" as const;
      case "INTERNATIONAL":
        return "contrast" as const;
      default:
        return "outline" as const;
    }
  };

  const getParticipantCount = () => {
    return tournament.participants?.length || 0;
  };

  const getMaxParticipants = () => {
    return tournament.maxPlayers || 0;
  };

  const getPrizePool = () => {
    if (!tournament.prizePool) return 0;
    // Handle both string and number prize pools
    const prizePool =
      typeof tournament.prizePool === "string"
        ? parseFloat(tournament.prizePool.replace(/[^0-9.]/g, ""))
        : tournament.prizePool;
    return isNaN(prizePool) ? 0 : prizePool;
  };

  const getOrganizerInitials = () => {
    if (!tournament.organizer.displayName) return "O";
    return tournament.organizer.displayName
      .split(" ")
      .map((name) => name.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card
      className={`group hover:shadow-lg hover:shadow-primary-500/10 transition-all duration-300 hover:-translate-y-1 border-gray-200 bg-background-light ${
        isActive && viewerCount > 2 ? "ring-2 ring-accent-400/20" : ""
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant={getStatusBadgeVariant()} className="font-medium">
                {isActive && (
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse" />
                )}
                {tournament.status.charAt(0).toUpperCase() +
                  tournament.status.slice(1).toLowerCase()}
              </Badge>

              {tournament.tournamentLevel && (
                <Badge variant={getLevelBadgeVariant()} className="font-medium">
                  {tournament.tournamentLevel.charAt(0).toUpperCase() +
                    tournament.tournamentLevel.slice(1).toLowerCase()}
                </Badge>
              )}
            </div>

            <h3 className="font-semibold text-lg text-secondary-500 truncate group-hover:text-primary-500 transition-colors duration-200">
              <Link
                href={`/tournaments/${tournament.id}`}
                onClick={handleClick}
              >
                {tournament.name}
              </Link>
            </h3>

            <p className="text-sm text-gray-500 font-medium">
              {tournament.game.name} • {tournament.format}
            </p>
          </div>

          <Trophy className="h-6 w-6 text-accent-400 flex-shrink-0 ml-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{formatDate(tournamentDate)}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-500">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{formatDateTime(tournamentDate)}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-500">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{tournament.store.name}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-500">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span>
              {getParticipantCount()}
              {getMaxParticipants() > 0 && `/${getMaxParticipants()}`}
            </span>
          </div>
        </div>

        {/* Additional tournament details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {tournament.entryFee && (
            <div className="flex items-center gap-2 text-gray-500">
              <span className="font-medium">Entry:</span>
              <span>${tournament.entryFee}</span>
            </div>
          )}

          {tournament.matchCount > 0 && (
            <div className="flex items-center gap-2 text-gray-500">
              <span className="font-medium">Matches:</span>
              <span>{tournament.matchCount}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-gray-100 text-gray-600">
                {getOrganizerInitials()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-gray-500">
              by {tournament.organizer.displayName || "Organizer"}
            </span>
          </div>

          {getPrizePool() > 0 && (
            <div className="flex items-center gap-1 text-accent-500 font-semibold">
              <Star className="h-4 w-4 fill-current" />
              <span className="text-sm">
                ${getPrizePool().toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Live activity indicators for active tournaments */}
        {isActive && isHovered && viewerCount > 2 && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Eye className="h-4 w-4" />
              <span>{viewerCount} viewing</span>
            </div>
            <div className="flex items-center gap-1 text-red-500 text-sm font-medium">
              <Zap className="h-4 w-4" />
              <span>LIVE</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            className="flex-1 bg-primary-500 hover:bg-primary-600 text-white transition-colors duration-200"
            asChild
          >
            <Link href={`/tournaments/${tournament.id}`} onClick={handleClick}>
              {isUpcoming ? "Join Tournament" : "View Details"}
            </Link>
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="hover:bg-accent-50 hover:border-accent-400 transition-colors duration-200"
            title="Add to favorites"
          >
            <Star className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
