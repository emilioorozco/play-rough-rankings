"use client";

import { useSession } from "../auth/session-provider";
import { trpc } from "@/lib/trpc/client";
import { StatsCard } from "../ui/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Users,
  Trophy,
  Calendar,
  TrendingUp,
  Store,
  Gamepad2,
  Target,
  Award,
  Activity,
  Star,
} from "lucide-react";
import Link from "next/link";

export function EnhancedDashboard() {
  const { user } = useSession();

  // Fetch data for different user roles
  const { data: gamesData } = trpc.games.list.useQuery({
    includeInactive: false,
  });
  const { data: storesData } = trpc.stores.list.useQuery({
    includeInactive: false,
  });
  const { data: tournamentsData } = trpc.tournaments.list.useQuery({
    limit: 5,
    offset: 0,
  });
  const { data: upcomingTournaments } = trpc.tournaments.getUpcoming.useQuery({
    daysAhead: 30,
    limit: 5,
  });

  if (!user) {
    return null;
  }

  const getWelcomeMessage = () => {
    switch (user.role) {
      case "admin":
        return "Welcome back, Administrator! You have full system access.";
      case "organizer":
        return "Welcome back, Tournament Organizer! Ready to manage some tournaments?";
      default:
        return "Welcome back, Player! Check out your latest stats and upcoming tournaments.";
    }
  };

  const getQuickActions = () => {
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
    switch (user.role) {
      case "admin":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-secondary-500">
              System Overview
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Total Games"
                value={gamesData?.length || 0}
                icon={Gamepad2}
                description="Active games in system"
                trend={[20, 25, 30, 35, 40, 45, 50]}
              />
              <StatsCard
                title="Active Stores"
                value={storesData?.stores?.length || 0}
                icon={Store}
                description="Registered venues"
                trend={[10, 12, 15, 18, 20, 22, 25]}
              />
              <StatsCard
                title="Total Tournaments"
                value={tournamentsData?.total || 0}
                icon={Trophy}
                description="All time tournaments"
                change={{ value: 12, type: "increase" }}
                trend={[5, 8, 12, 15, 18, 22, 25]}
              />
              <StatsCard
                title="Active Tournaments"
                value={
                  tournamentsData?.tournaments?.filter(
                    (t) => t.status === "ACTIVE",
                  ).length || 0
                }
                icon={Activity}
                description="Currently running"
                trend={[2, 3, 4, 3, 5, 4, 6]}
              />
            </div>
          </div>
        );

      case "organizer":
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-secondary-500">
              Your Tournament Activity
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <h3 className="text-xl font-semibold text-secondary-500">
              Your Performance
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-secondary-500">
          Dashboard
        </h1>
        <p className="text-gray-500 text-sm sm:text-base">
          {getWelcomeMessage()}
        </p>
      </div>

      {/* Role-specific stats */}
      {getRoleSpecificStats()}

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-secondary-500">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {getQuickActions().map((action) => (
            <Link key={action.href} href={action.href as string}>
              <Card className="hover:shadow-md hover:shadow-primary-500/10 transition-all duration-200 hover:-translate-y-1 cursor-pointer">
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <div className="text-2xl">{action.icon}</div>
                  <CardTitle className="text-lg ml-3">{action.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">{action.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Upcoming Tournaments */}
      {upcomingTournaments && upcomingTournaments.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-secondary-500">
            Upcoming Tournaments
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingTournaments.slice(0, 3).map((tournament) => (
              <Card
                key={tournament.id}
                className="hover:shadow-md transition-shadow duration-200"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="badge-upcoming">
                      Upcoming
                    </Badge>
                    <Trophy className="h-5 w-5 text-accent-400" />
                  </div>
                  <CardTitle className="text-lg">{tournament.name}</CardTitle>
                  <p className="text-sm text-gray-500">
                    {tournament.game.name} • {tournament.format}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(tournament.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Store className="h-4 w-4" />
                    <span>{tournament.store.name}</span>
                  </div>
                  <Button asChild className="w-full mt-3">
                    <Link href={`/tournaments/${tournament.id}`}>
                      View Details
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Role-specific tools */}
      {user.role !== "player" && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-secondary-500">
            {user.role === "admin" ? "Administrative Tools" : "Organizer Tools"}
          </h3>
          <Card className="bg-accent-50 border-accent-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-accent-100 rounded-lg">
                  {user.role === "admin" ? (
                    <Award className="h-5 w-5 text-accent-600" />
                  ) : (
                    <Target className="h-5 w-5 text-accent-600" />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-secondary-500 mb-2">
                    {user.role === "admin"
                      ? "System Administration"
                      : "Tournament Management"}
                  </h4>
                  <p className="text-sm text-gray-600">
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
    </div>
  );
}
