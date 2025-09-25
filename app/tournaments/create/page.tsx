"use client";

import { useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { TournamentCreateModal } from "@/components/tournaments/tournament-create-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Users, MapPin, Trophy, Edit, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useSession } from "@/components/auth/session-provider";
import Link from "next/link";

export default function TournamentManagementPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useSession();

  // Fetch tournaments and filter by organizer on client side
  const { data: tournamentsData, isLoading, refetch } = trpc.tournaments.list.useQuery({
    limit: 100, // Get more tournaments to ensure we don't miss any
  });

  // Filter tournaments where the user is the organizer
  const tournaments =
    (tournamentsData?.tournaments as any[] | undefined)?.filter(
      (tournament: any) => tournament?.organizer?.id === user?.id
    );

  const handleCreateSuccess = () => {
    setIsModalOpen(false);
    refetch(); // Refresh the tournament list
  };

  return (
    <ProtectedRoute requiredRole="organizer">
      <main className="bg-background text-foreground min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Header with Create Button */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Tournament Management</h1>
              <p className="text-muted-foreground">
                Manage your tournaments and track registrations
              </p>
            </div>
            {tournaments && tournaments.length > 0 && (
              <Button
                onClick={() => setIsModalOpen(true)}
                size="lg"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Tournament
              </Button>
            )}
          </div>

          {/* Tournament List */}
          <div className="space-y-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading tournaments...</p>
              </div>
            ) : tournaments && tournaments.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tournaments.map((tournament) => (
                  <Card key={tournament.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-1 line-clamp-2">
                            {tournament.name}
                          </CardTitle>
                          <CardDescription className="line-clamp-2">
                            {tournament.description}
                          </CardDescription>
                        </div>
                        <Badge 
                          variant={tournament.status === 'active' ? 'default' : 'secondary'}
                          className="ml-2 flex-shrink-0"
                        >
                          {tournament.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(tournament.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>
                          {tournament.entryCount || 0} / {tournament.maxPlayers || '∞'} players
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">
                          {tournament.store?.name || 'Online'}
                        </span>
                      </div>
                      {tournament.prizePool && parseFloat(tournament.prizePool) > 0 && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Trophy className="h-4 w-4" />
                          <span>${tournament.prizePool} prize pool</span>
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
                            View Details
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-3"
                          title="Edit Tournament"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="px-3 text-destructive hover:text-destructive"
                          title="Delete Tournament"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
                  <Trophy className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No tournaments yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  You haven&apos;t created any tournaments yet. Create your first tournament to get started!
                </p>
                <Button
                  onClick={() => setIsModalOpen(true)}
                  size="lg"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Your First Tournament
                </Button>
              </div>
            )}
          </div>
        </div>

        <TournamentCreateModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      </main>
    </ProtectedRoute>
  );
}
