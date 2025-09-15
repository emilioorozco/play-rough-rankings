"use client";

import { useState } from "react";
import {
  Users,
  Trophy,
  Calendar,
  TrendingUp,
  Plus,
  Filter,
  SortAsc,
  Gamepad2,
  Store,
  Activity,
  Award,
  Star,
  Target,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useSession } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/stats-card";
import { TournamentCard } from "@/components/dashboard/tournament-card";
import { PlayerCard } from "@/components/dashboard/player-card";
import { LeaderboardTable } from "@/components/dashboard/leaderboard-table";
import Link from "next/link";
import type { Tournament } from "@/components/dashboard/tournament-card";
import type { Player } from "@/components/dashboard/player-card";
import type { LeaderboardEntry } from "@/components/dashboard/leaderboard-table";

// Mock data - replace with real data from your API
const mockTournaments: Tournament[] = [];
const mockPlayers: Player[] = [];
const mockLeaderboardData: LeaderboardEntry[] = [];

export default function Home() {
  const { user } = useSession();
  const [activeTab, setActiveTab] = useState("overview");

  const healthQuery = trpc.health.useQuery();
  const gamesQuery = trpc.games.list.useQuery({ includeInactive: false });

  // Fetch data for authenticated users
  const gamesData = trpc.games.list.useQuery(
    { includeInactive: false },
    { enabled: !!user },
  );
  const storesData = trpc.stores.list.useQuery(
    { includeInactive: false },
    { enabled: !!user },
  );
  const tournamentsData = trpc.tournaments.list.useQuery(
    { limit: 5, offset: 0 },
    { enabled: !!user },
  );
  const upcomingTournaments = trpc.tournaments.getUpcoming.useQuery(
    { daysAhead: 30, limit: 5 },
    { enabled: !!user },
  );

  // Authentication-aware helper functions
  const getWelcomeMessage = () => {
    if (!user) {
      return "Track tournaments, view leaderboards, and connect with the fighting game community";
    }
    // For logged-in users, don't show any generic message - we have the personalized one below
    return "";
  };

  const getQuickActions = () => {
    if (!user) return [];

    const actions = [
      {
        href: "/profile",
        label: "View Profile",
        icon: "👤",
        description: "Manage your account settings",
      },
      {
        href: "/leaderboards",
        label: "Leaderboards",
        icon: "🏆",
        description: "See current rankings",
      },
      {
        href: "/tournaments",
        label: "Tournaments",
        icon: "🎯",
        description: "Browse tournaments",
      },
    ];

    if (user.role === "organizer" || user.role === "admin") {
      actions.push(
        {
          href: "/tournaments/manage",
          label: "Manage Tournaments",
          icon: "⚙️",
          description: "Organize tournaments",
        },
        {
          href: "/tournaments/create",
          label: "Create Tournament",
          icon: "➕",
          description: "Start a new tournament",
        },
      );
    }

    if (user.role === "admin") {
      actions.push(
        {
          href: "/admin",
          label: "Admin Panel",
          icon: "🛠️",
          description: "System administration",
        },
        {
          href: "/admin/users",
          label: "Manage Users",
          icon: "👥",
          description: "User management",
        },
        {
          href: "/admin/stores",
          label: "Manage Stores",
          icon: "🏪",
          description: "Store management",
        },
      );
    }

    return actions;
  };

  const getRoleSpecificStats = () => {
    if (!user) return null;

    switch (user.role) {
      case "admin":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">System Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatsCard
                title="Total Games"
                value={gamesData?.data?.length || 0}
                icon={Gamepad2}
                description="Active games in system"
                trend={[20, 25, 30, 35, 40, 45, 50]}
                isLoading={gamesData.isLoading}
              />
              <StatsCard
                title="Active Stores"
                value={storesData?.data?.stores?.length || 0}
                icon={Store}
                description="Registered venues"
                trend={[10, 12, 15, 18, 20, 22, 25]}
                isLoading={storesData.isLoading}
              />
              <StatsCard
                title="Total Tournaments"
                value={tournamentsData?.data?.total || 0}
                icon={Trophy}
                description="All time tournaments"
                change={{ value: 12, type: "increase" }}
                trend={[5, 8, 12, 15, 18, 22, 25]}
                isLoading={tournamentsData.isLoading}
              />
              <StatsCard
                title="Active Tournaments"
                value={
                  tournamentsData?.data?.tournaments?.filter(
                    (t) => t.status === "ACTIVE",
                  ).length || 0
                }
                icon={Activity}
                description="Currently running"
                trend={[2, 3, 4, 3, 5, 4, 6]}
                isLoading={tournamentsData.isLoading}
              />
            </div>
          </div>
        );

      case "organizer":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Your Tournament Activity</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatsCard
                title="Tournaments Organized"
                value="--"
                icon={Trophy}
                description="All time"
                trend={[1, 2, 3, 4, 5, 6, 7]}
              />
              <StatsCard
                title="Active Tournaments"
                value="--"
                icon={Activity}
                description="Currently running"
                trend={[0, 1, 1, 2, 1, 2, 3]}
              />
              <StatsCard
                title="Total Players"
                value="--"
                icon={Users}
                description="Across your events"
                trend={[10, 15, 20, 25, 30, 35, 40]}
              />
              <StatsCard
                title="Completion Rate"
                value="--%"
                icon={Target}
                description="Tournaments completed"
                change={{ value: 8, type: "increase" }}
                trend={[80, 82, 85, 87, 89, 91, 93]}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">Your Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatsCard
                title="Tournaments Played"
                value="--"
                icon={Trophy}
                description="All time"
                trend={[1, 2, 3, 4, 5, 6, 7]}
              />
              <StatsCard
                title="Win Rate"
                value="--%"
                icon={TrendingUp}
                description="Overall performance"
                change={{ value: 5, type: "increase" }}
                trend={[60, 62, 65, 67, 69, 71, 73]}
              />
              <StatsCard
                title="Current Ranking"
                value="--"
                icon={Award}
                description="This season"
                trend={[15, 12, 10, 8, 6, 4, 3]}
              />
              <StatsCard
                title="Championship Points"
                value="--"
                icon={Star}
                description="Season total"
                change={{ value: 15, type: "increase" }}
                trend={[10, 15, 20, 25, 30, 35, 40]}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="container">
      <div className="mb-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {user ? "Dashboard" : "Tournament Rankings Dashboard"}
          </h1>
          {!user && (
            <p className="text-muted-foreground">{getWelcomeMessage()}</p>
          )}
        </div>

        {/* Role-specific stats for authenticated users, or general stats for visitors */}
        {user ? (
          getRoleSpecificStats()
        ) : (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatsCard
                title="Active Tournaments"
                value={
                  mockTournaments.filter((t) => t.status === "active").length ||
                  0
                }
                change={{ value: 8, type: "increase" }}
                icon={Trophy}
                description="Currently running"
                trend={[20, 40, 60, 80, 100, 85, 90]}
                isLoading={healthQuery.isLoading}
              />
              <StatsCard
                title="Registered Players"
                value={mockPlayers.length || 0}
                change={{ value: 12, type: "increase" }}
                icon={Users}
                description="This month"
                trend={[30, 50, 45, 70, 85, 90, 100]}
                isLoading={healthQuery.isLoading}
              />
              <StatsCard
                title="Upcoming Events"
                value={
                  mockTournaments.filter((t) => t.status === "upcoming")
                    .length || 0
                }
                change={{ value: 3, type: "decrease" }}
                icon={Calendar}
                description="Next 30 days"
                trend={[60, 70, 50, 80, 90, 75, 85]}
                isLoading={healthQuery.isLoading}
              />
              <StatsCard
                title="Total Prize Pool"
                value={healthQuery.data ? "$45,250" : "$0"}
                change={{ value: 25, type: "increase" }}
                icon={TrendingUp}
                description="This month"
                trend={[40, 60, 80, 70, 90, 85, 100]}
                isLoading={healthQuery.isLoading}
              />
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions for authenticated users */}
      {user && getQuickActions().length > 0 && (
        <div className="space-y-4 mb-8">
          <h3 className="text-xl font-semibold">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {getQuickActions().map((action) => (
              // @ts-expect-error - Typed routes conflict with dynamic href values
              <Link key={action.href} href={action.href}>
                <Card className="hover:shadow-md hover:shadow-primary/10 transition-all duration-200 hover:-translate-y-1 cursor-pointer">
                  <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <div className="text-2xl">{action.icon}</div>
                    <CardTitle className="text-lg ml-3">
                      {action.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Tournaments for authenticated users */}
      {user &&
        upcomingTournaments?.data &&
        upcomingTournaments.data.length > 0 && (
          <div className="space-y-4 mb-8">
            <h3 className="text-xl font-semibold">Upcoming Tournaments</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {upcomingTournaments.data.slice(0, 3).map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={{
                    id: tournament.id,
                    name: tournament.name,
                    game: tournament.game.name,
                    status: tournament.status.toLowerCase() as
                      | "upcoming"
                      | "active"
                      | "completed",
                    date: tournament.date,
                    venue: tournament.store.name,
                    organizer: tournament.organizer.displayName || "Organizer",
                    participants: 0, // TODO: Get actual participant count from API
                    maxParticipants: tournament.maxPlayers || undefined,
                    prizePool:
                      typeof tournament.prizePool === "string"
                        ? parseFloat(
                            tournament.prizePool.replace(/[^0-9.]/g, ""),
                          ) || undefined
                        : tournament.prizePool || undefined,
                  }}
                />
              ))}
            </div>
          </div>
        )}

      {/* Role-specific tools for non-player authenticated users */}
      {user && user.role !== "player" && (
        <div className="space-y-4 mb-8">
          <h3 className="text-xl font-semibold">
            {user.role === "admin" ? "Administrative Tools" : "Organizer Tools"}
          </h3>
          <Card className="bg-accent/5 border-accent/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  {user.role === "admin" ? (
                    <Award className="h-5 w-5 text-accent" />
                  ) : (
                    <Target className="h-5 w-5 text-accent" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold mb-2">
                    {user.role === "admin"
                      ? "System Administration"
                      : "Tournament Management"}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {user.role === "admin"
                      ? "As an administrator, you have access to all system features including user management, store administration, and system configuration."
                      : "As a tournament organizer, you can create and manage tournaments, upload results, and track player participation in your events."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <div className="overflow-x-auto scrollbar-hide">
          <TabsList className="inline-flex w-full min-w-max md:w-fit md:grid md:grid-cols-4">
            <TabsTrigger 
              value="overview"
              className="flex-1 md:flex-none whitespace-nowrap text-sm"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="tournaments"
              className="flex-1 md:flex-none whitespace-nowrap text-sm"
            >
              Tournaments
            </TabsTrigger>
            <TabsTrigger 
              value="leaderboards"
              className="flex-1 md:flex-none whitespace-nowrap text-sm"
            >
              Leaderboards
            </TabsTrigger>
            <TabsTrigger 
              value="players"
              className="flex-1 md:flex-none whitespace-nowrap text-sm"
            >
              Players
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-4 h-9">
                <h2 className="text-xl font-semibold">Featured Tournaments</h2>
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200"
                >
                  {mockTournaments.filter((t) => t.status === "active").length}{" "}
                  Active
                </Badge>
              </div>
              <div className="grid gap-4">
                {mockTournaments.length > 0 ? (
                  mockTournaments
                    .slice(0, 2)
                    .map((tournament) => (
                      <TournamentCard
                        key={tournament.id}
                        tournament={tournament}
                      />
                    ))
                ) : (
                  <TournamentCard isLoading={gamesQuery.isLoading} />
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 h-9">
                <h2 className="text-xl font-semibold">Top Players</h2>
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  View All
                </Button>
              </div>
              <div className="grid gap-4">
                {mockPlayers.length > 0 ? (
                  mockPlayers
                    .slice(0, 2)
                    .map((player) => (
                      <PlayerCard key={player.id} player={player} />
                    ))
                ) : (
                  <PlayerCard isLoading={healthQuery.isLoading} />
                )}
              </div>
            </div>
          </div>

          {/* System Status Section */}
          <div className="card p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">
              System Status
            </h2>
            {healthQuery.data ? (
              <div className="flex items-start gap-2 text-green-600">
                <span className="text-lg flex-shrink-0 mt-0.5">✅</span>
                <div className="text-sm sm:text-base">
                  <p className="font-medium">System is healthy</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Last check: {new Date(healthQuery.data.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : healthQuery.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary flex-shrink-0"></div>
                <p className="text-sm sm:text-base">Checking system status...</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <span className="text-lg flex-shrink-0">❌</span>
                <p className="text-sm sm:text-base">System status unavailable</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tournaments" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">All Tournaments</h2>
            <div className="hidden md:flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <SortAsc className="h-4 w-4 mr-2" />
                Sort
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {mockTournaments.length > 0 ? (
              mockTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))
            ) : (
              <div className="col-span-full">
                <TournamentCard />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="leaderboards" className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-semibold">Global Leaderboard</h2>
              <Badge variant="outline" className="mt-1 sm:hidden">
                Overall Ranking
              </Badge>
            </div>
            <div className="flex gap-2 items-center">
              <Badge variant="outline" className="hidden sm:block">
                Overall Ranking
              </Badge>
              <Button variant="outline" size="sm" className="hidden sm:flex">
                Export
              </Button>
            </div>
          </div>
          <LeaderboardTable
            entries={mockLeaderboardData}
            isLoading={healthQuery.isLoading}
          />
        </TabsContent>

        <TabsContent value="players" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Player Directory</h2>
            <div className="hidden md:flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter by Tier
              </Button>
              <Button variant="outline" size="sm">
                <SortAsc className="h-4 w-4 mr-2" />
                Sort by Rating
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {mockPlayers.length > 0 ? (
              mockPlayers.map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))
            ) : (
              <div className="col-span-full">
                <PlayerCard />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
