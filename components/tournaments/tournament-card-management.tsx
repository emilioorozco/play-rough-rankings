"use client";

import Link from "next/link";
import { Calendar, Users, MapPin, Trophy, Edit, Trash2, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ApiTournament } from "@/lib/types/api";

type Tournament = ApiTournament;

interface TournamentCardManagementProps {
  tournament: Tournament;
  showManagementActions?: boolean;
  onEdit?: (tournament: Tournament) => void;
  onDelete?: (tournament: Tournament) => void;
}

export function TournamentCardManagement({ 
  tournament, 
  showManagementActions = false,
  onEdit,
  onDelete 
}: TournamentCardManagementProps) {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString();
  };

  const formatPrizePool = (prizePool: string | number) => {
    if (typeof prizePool === 'string') {
      return parseFloat(prizePool.replace(/[^0-9.]/g, "")) || 0;
    }
    return prizePool || 0;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1 line-clamp-2">
              {tournament.name}
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {tournament.description || "No description available"}
            </CardDescription>
          </div>
          <Badge 
            variant={tournament.status === 'UPCOMING' ? 'default' : 
                    tournament.status === 'ACTIVE' ? 'default' : 
                    tournament.status === 'COMPLETED' ? 'secondary' : 'outline'}
            className="ml-2 flex-shrink-0 font-medium"
          >
            {tournament.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {formatDate(tournament.date)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>
            {tournament.participants?.length || 0} / {tournament.maxPlayers || '∞'} players
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="truncate">
            {tournament.store?.name || 'Online'}
          </span>
        </div>
        {tournament.prizePool && formatPrizePool(tournament.prizePool) > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trophy className="h-4 w-4" />
            <span>${formatPrizePool(tournament.prizePool)} prize pool</span>
          </div>
        )}
        
        <div className="flex gap-2 pt-3 border-t">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Link href={`/tournaments/${tournament.id}`}>
              <Eye className="h-4 w-4 mr-1" />
              View Details
            </Link>
          </Button>
          {showManagementActions && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="px-3"
                title="Edit Tournament"
                onClick={() => onEdit?.(tournament)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="px-3 text-destructive hover:text-destructive"
                title="Delete Tournament"
                onClick={() => onDelete?.(tournament)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
