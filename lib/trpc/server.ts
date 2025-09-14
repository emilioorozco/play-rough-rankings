import { initTRPC, TRPCError } from '@trpc/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { AuthUserSchema } from '@/lib/schemas'
import { 
  TournamentListQuerySchema,
  CreateTournamentSchema,
  UpdateTournamentSchema,
} from '@/lib/schemas'
import type {
  GameMetadata,
  GameUpdateData,
  DateFilterClause,
  TournamentWhereClause
} from '@/lib/types/backend'

// Enhanced context type for tRPC
export type TRPCContext = {
  prisma: typeof prisma
  headers: Headers | null
  user?: { id: string; email: string; name?: string; role: string }
  session?: { id: string; userId: string; expiresAt: Date }
}

// Create context for tRPC with enhanced error handling
export const createTRPCContext = async (opts?: { headers?: Headers }): Promise<TRPCContext> => {
  return {
    prisma,
    headers: opts?.headers || null,
  }
}

// Import router factory to avoid circular dependencies
import { router, publicProcedure, protectedProcedure, organizerProcedure, adminProcedure } from './router-factory'

// Import routers here to avoid circular dependencies
import { leaderboardsRouter } from './routers/leaderboards'
import { decksRouter } from './routers/decks'
import { tournamentEntriesRouter } from './routers/tournament-entries'

// Main app router with basic structure
export const appRouter = router({
  // Health check endpoint
  health: publicProcedure.query(() => {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    }
  }),

  // Basic auth router
  auth: router({
    getSession: publicProcedure.query(async ({ ctx }) => {
      return {
        user: null,
        session: null,
      }
    }),
  }),

  // Enhanced games router
  games: router({
    // List all available games (public)
    list: publicProcedure
      .input(z.object({
        includeInactive: z.boolean().default(false),
      }))
      .query(async ({ ctx, input }) => {
        const where = input.includeInactive ? {} : { isActive: true }
        
        const games = await ctx.prisma.game.findMany({
          where,
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: {
                tournaments: true,
                playerGameStats: true,
              },
            },
          },
        })

        return games.map(game => ({
          ...game,
          tournamentCount: game._count.tournaments,
          playerCount: game._count.playerGameStats,
        }))
      }),

    // Get specific game details (public)
    getById: publicProcedure
      .input(z.object({
        id: z.string().uuid(),
      }))
      .query(async ({ ctx, input }) => {
        const game = await ctx.prisma.game.findUnique({
          where: { id: input.id },
          include: {
            _count: {
              select: {
                tournaments: true,
                playerGameStats: true,
              },
            },
          },
        })

        if (!game) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Game not found'
          })
        }

        return {
          ...game,
          tournamentCount: game._count.tournaments,
          playerCount: game._count.playerGameStats,
        }
      }),

    // Create a new game (admin only)
    create: adminProcedure
      .input(z.object({
        name: z.enum(['POKEMON_TCG']),
        shortName: z.string().min(1).max(10),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if game with same name already exists
        const existingGame = await ctx.prisma.game.findFirst({
          where: { name: input.name },
        })

        if (existingGame) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A game with this name already exists'
          })
        }

        // Validate metadata if provided
        if (input.metadata) {
          try {
            JSON.stringify(input.metadata)
          } catch (error) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Invalid metadata format'
            })
          }
        }

        const game = await ctx.prisma.game.create({
          data: {
            name: input.name,
            shortName: input.shortName,
            metadata: input.metadata as GameMetadata,
            isActive: true,
          },
        })

        return game
      }),

    // Update game (admin only)
    update: adminProcedure
      .input(z.object({
        id: z.string().uuid(),
        shortName: z.string().min(1).max(10).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify game exists
        const existingGame = await ctx.prisma.game.findUnique({
          where: { id: input.id },
        })

        if (!existingGame) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Game not found'
          })
        }

        // Validate metadata if provided
        if (input.metadata) {
          try {
            JSON.stringify(input.metadata)
          } catch (error) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Invalid metadata format'
            })
          }
        }

        const { id, ...updateData } = input
        const updatedGame = await ctx.prisma.game.update({
          where: { id },
          data: {
            ...updateData,
            metadata: updateData.metadata as GameMetadata,
          },
        })

        return updatedGame
      }),

    // Toggle game active status (admin only)
    toggleActive: adminProcedure
      .input(z.object({
        id: z.string().uuid(),
      }))
      .mutation(async ({ ctx, input }) => {
        const game = await ctx.prisma.game.findUnique({
          where: { id: input.id },
        })

        if (!game) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Game not found'
          })
        }

        const updatedGame = await ctx.prisma.game.update({
          where: { id: input.id },
          data: { isActive: !game.isActive },
        })

        return updatedGame
      }),

    // Get game statistics (public)
    getStats: publicProcedure
      .input(z.object({
        id: z.string().uuid(),
      }))
      .query(async ({ ctx, input }) => {
        const game = await ctx.prisma.game.findUnique({
          where: { id: input.id },
        })

        if (!game) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Game not found'
          })
        }

        // Get comprehensive statistics
        const [
          totalPlayers,
          totalTournaments,
          activeTournaments,
          completedTournaments,
          topPlayers,
        ] = await Promise.all([
          ctx.prisma.playerGameStats.count({
            where: { gameId: input.id },
          }),
          ctx.prisma.tournament.count({
            where: { gameId: input.id },
          }),
          ctx.prisma.tournament.count({
            where: { 
              gameId: input.id,
              status: { in: ['UPCOMING', 'ACTIVE'] },
            },
          }),
          ctx.prisma.tournament.count({
            where: { 
              gameId: input.id,
              status: 'COMPLETED',
            },
          }),
          ctx.prisma.playerGameStats.findMany({
            where: { gameId: input.id },
            include: {
              player: {
                select: {
                  displayName: true,
                  profileVisibility: true,
                },
              },
            },
            orderBy: { currentRating: 'desc' },
            take: 10,
          }),
        ])

        return {
          game,
          stats: {
            totalPlayers,
            totalTournaments,
            activeTournaments,
            completedTournaments,
            topPlayers: topPlayers.map(stat => ({
              playerId: stat.playerId,
              displayName: stat.player.profileVisibility === 'PUBLIC' 
                ? stat.player.displayName 
                : 'Private Player',
              rating: stat.currentRating,
              seasonalStats: stat.seasonalStats,
            })),
          },
        }
      }),
  }),

  // Enhanced players router
  players: router({
    // Get player profile (requires authentication for own profile, public for others)
    getProfile: publicProcedure
      .input(z.object({
        playerId: z.string().uuid().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const targetPlayerId = input.playerId

        // If no playerId provided, this would get current user's profile (requires auth)
        // For now, we'll return a placeholder since auth is not fully implemented
        if (!targetPlayerId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Player ID is required. Authentication will be implemented in later tasks.'
          })
        }

        const player = await ctx.prisma.player.findUnique({
          where: { id: targetPlayerId },
          include: {
            gameStats: {
              include: {
                game: true,
              },
              orderBy: { currentRating: 'desc' },
            },
            user: {
              select: {
                email: true,
                name: true,
                role: true,
              },
            },
          },
        })

        if (!player) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Player not found'
          })
        }

        // Check privacy settings (simplified for now)
        const isPublic = player.profileVisibility === 'PUBLIC'

        if (!isPublic) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'This player profile is private'
          })
        }

        // Filter sensitive data for public profiles
        const profileData = {
          ...player,
          user: {
            name: player.user.name,
            role: player.user.role,
            // Hide email for public profiles
          },
          // Hide external player IDs for public profiles
          externalPlayerIds: undefined,
        }

        return profileData
      }),

    // Update player profile (authenticated users only, own profile)
    updateProfile: protectedProcedure
      .input(z.object({
        displayName: z.string().min(1).max(100).optional(),
        profileVisibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
        externalPlayerIds: z.record(z.string().uuid(), z.string()).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // For now, return not implemented since auth is not fully set up
        throw new TRPCError({
          code: 'NOT_IMPLEMENTED',
          message: 'Profile updates will be implemented once authentication is fully set up'
        })
      }),

    // Get game-specific statistics for a player
    getGameStats: publicProcedure
      .input(z.object({
        playerId: z.string().uuid().optional(),
        gameId: z.string().uuid(),
      }))
      .query(async ({ ctx, input }) => {
        const targetPlayerId = input.playerId

        // If no playerId provided, this would get current user's stats (requires auth)
        if (!targetPlayerId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Player ID is required. Authentication will be implemented in later tasks.'
          })
        }

        // Verify game exists
        const game = await ctx.prisma.game.findUnique({
          where: { id: input.gameId },
        })

        if (!game) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Game not found'
          })
        }

        // Get player and check privacy
        const player = await ctx.prisma.player.findUnique({
          where: { id: targetPlayerId },
        })

        if (!player) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Player not found'
          })
        }

        const isPublic = player.profileVisibility === 'PUBLIC'

        if (!isPublic) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'This player profile is private'
          })
        }

        // Get game stats
        const gameStats = await ctx.prisma.playerGameStats.findUnique({
          where: {
            playerId_gameId: {
              playerId: targetPlayerId,
              gameId: input.gameId,
            },
          },
          include: {
            game: true,
            player: {
              select: {
                displayName: true,
                profileVisibility: true,
              },
            },
          },
        })

        if (!gameStats) {
          // Return default stats if player hasn't played this game
          return {
            playerId: targetPlayerId,
            gameId: input.gameId,
            game,
            currentRating: 1200,
            seasonalStats: {
              wins: 0,
              losses: 0,
              tournaments: 0,
              points: 0,
            },
            bestFinish: null,
            totalEarnings: 0,
            metadata: null,
          }
        }

        return gameStats
      }),

    // Search for players
    searchPlayers: publicProcedure
      .input(z.object({
        query: z.string().min(1).max(100),
        gameId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(50).default(10),
      }))
      .query(async ({ ctx, input }) => {
        const whereClause: Record<string, unknown> = {
          profileVisibility: 'PUBLIC',
          OR: [
            {
              displayName: {
                contains: input.query,
                mode: 'insensitive',
              },
            },
            {
              user: {
                name: {
                  contains: input.query,
                  mode: 'insensitive',
                },
              },
            },
          ],
        }

        // Filter by game if specified
        if (input.gameId) {
          whereClause.gameStats = {
            some: {
              gameId: input.gameId,
            },
          }
        }

        const players = await ctx.prisma.player.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                name: true,
                role: true,
              },
            },
            gameStats: input.gameId ? {
              where: { gameId: input.gameId },
              include: { game: true },
            } : {
              include: { game: true },
              orderBy: { currentRating: 'desc' },
              take: 3, // Show top 3 games for general search
            },
          },
          orderBy: {
            gameStats: input.gameId ? {
              _count: 'desc',
            } : undefined,
          },
          take: input.limit,
        })

        return players.map(player => ({
          id: player.id,
          displayName: player.displayName,
          userName: player.user.name,
          role: player.user.role,
          gameStats: player.gameStats,
          createdAt: player.createdAt,
        }))
      }),

    // Manage external player IDs (authenticated users only)
    setExternalPlayerId: protectedProcedure
      .input(z.object({
        gameId: z.string().uuid(),
        externalId: z.string().min(1).max(50),
      }))
      .mutation(async ({ ctx, input }) => {
        // For now, return not implemented since auth is not fully set up
        throw new TRPCError({
          code: 'NOT_IMPLEMENTED',
          message: 'External player ID management will be implemented once authentication is fully set up'
        })
      }),

    // Remove external player ID (authenticated users only)
    removeExternalPlayerId: protectedProcedure
      .input(z.object({
        gameId: z.string().uuid(),
      }))
      .mutation(async ({ ctx, input }) => {
        // For now, return not implemented since auth is not fully set up
        throw new TRPCError({
          code: 'NOT_IMPLEMENTED',
          message: 'External player ID management will be implemented once authentication is fully set up'
        })
      }),
  }),

  // Enhanced tournaments router
  tournaments: router({
    // List tournaments with comprehensive filtering
    list: publicProcedure
      .input(TournamentListQuerySchema)
      .query(async ({ ctx, input }) => {
        const where: Record<string, unknown> = {}

        // Filter by game if specified
        if (input.gameId) {
          where.gameId = input.gameId
        }

        // Filter by store if specified
        if (input.storeId) {
          where.storeId = input.storeId
        }

        // Filter by status if specified
        if (input.status) {
          where.status = input.status
        }

        // Filter by date range if specified
        if (input.startDate || input.endDate) {
          where.date = {} as DateFilterClause
          if (input.startDate) {
            where.date.gte = input.startDate
          }
          if (input.endDate) {
            where.date.lte = input.endDate
          }
        }

        const [tournaments, total] = await Promise.all([
          ctx.prisma.tournament.findMany({
            where,
            orderBy: { date: 'desc' },
            take: input.limit,
            skip: input.offset,
            include: {
              game: {
                select: {
                  id: true,
                  name: true,
                  shortName: true,
                },
              },
              store: {
                select: {
                  id: true,
                  name: true,
                  city: true,
                  state: true,
                },
              },
              organizer: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
              _count: {
                select: {
                  matches: true,
                },
              },
            },
          }),
          ctx.prisma.tournament.count({ where }),
        ])

        return {
          tournaments: tournaments.map(tournament => ({
            ...tournament,
            matchCount: tournament._count.matches,
          })),
          total,
          hasMore: input.offset + input.limit < total,
        }
      }),

    // Get tournament details by ID
    getById: publicProcedure
      .input(z.object({
        id: z.string().uuid(),
        includeMatches: z.boolean().default(false),
        includeParticipants: z.boolean().default(false),
      }))
      .query(async ({ ctx, input }) => {
        const tournament = await ctx.prisma.tournament.findUnique({
          where: { id: input.id },
          include: {
            game: true,
            store: true,
            organizer: {
              select: {
                id: true,
                displayName: true,
                user: {
                  select: {
                    name: true,
                    role: true,
                  },
                },
              },
            },
            matches: input.includeMatches ? {
              include: {
                player1: {
                  select: {
                    id: true,
                    displayName: true,
                    profileVisibility: true,
                  },
                },
                player2: {
                  select: {
                    id: true,
                    displayName: true,
                    profileVisibility: true,
                  },
                },
                winner: {
                  select: {
                    id: true,
                    displayName: true,
                    profileVisibility: true,
                  },
                },
              },
              orderBy: [
                { round: 'asc' },
                { table: 'asc' },
              ],
            } : undefined,
            _count: {
              select: {
                matches: true,
              },
            },
          },
        })

        if (!tournament) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Tournament not found'
          })
        }

        // Get unique participants if requested
        let participants: Array<{
          id: string;
          displayName: string;
          isPublic: boolean;
          gameStats: unknown;
        }> = []
        if (input.includeParticipants) {
          const participantIds = new Set<string>()
          
          // Get all unique player IDs from matches
          const matches = await ctx.prisma.match.findMany({
            where: { tournamentId: input.id },
            select: {
              player1Id: true,
              player2Id: true,
            },
          })

          matches.forEach(match => {
            participantIds.add(match.player1Id)
            participantIds.add(match.player2Id)
          })

          if (participantIds.size > 0) {
            const rawParticipants = await ctx.prisma.player.findMany({
              where: {
                id: { in: Array.from(participantIds) },
              },
              select: {
                id: true,
                displayName: true,
                profileVisibility: true,
                gameStats: {
                  where: { gameId: tournament.gameId },
                  select: {
                    currentRating: true,
                    seasonalStats: true,
                  },
                },
              },
            })

            // Filter out private players for public view
            participants = rawParticipants.map(participant => ({
              id: participant.id,
              displayName: participant.profileVisibility === 'PUBLIC' 
                ? participant.displayName || 'Unknown Player'
                : 'Private Player',
              isPublic: participant.profileVisibility === 'PUBLIC',
              gameStats: participant.profileVisibility === 'PUBLIC' 
                ? (participant.gameStats[0] as Record<string, unknown> | null)
                : null,
            }))
          }
        }

        // Process matches if included
        let processedMatches: Array<{
          [key: string]: unknown;
          player1: { displayName: string; [key: string]: unknown };
          player2: { displayName: string; [key: string]: unknown };
          winner: { displayName: string; [key: string]: unknown } | null;
        }> | undefined = undefined
        if (input.includeMatches && tournament.matches) {
          processedMatches = tournament.matches.map((match: Record<string, unknown>) => ({
            ...match,
            player1: {
              ...match.player1,
              displayName: match.player1?.profileVisibility === 'PUBLIC' 
                ? match.player1?.displayName || 'Unknown Player'
                : 'Private Player',
            },
            player2: {
              ...match.player2,
              displayName: match.player2?.profileVisibility === 'PUBLIC' 
                ? match.player2?.displayName || 'Unknown Player'
                : 'Private Player',
            },
            winner: match.winner ? {
              ...match.winner,
              displayName: match.winner?.profileVisibility === 'PUBLIC' 
                ? match.winner?.displayName || 'Unknown Player'
                : 'Private Player',
            } : null,
          }))
        }

        return {
          ...tournament,
          matchCount: tournament._count.matches,
          participants: input.includeParticipants ? participants : undefined,
          matches: processedMatches,
        }
      }),

    // Create a new tournament (organizers and admins only)
    create: organizerProcedure
      .input(CreateTournamentSchema)
      .mutation(async ({ ctx, input }) => {
        // Verify game exists and is active
        const game = await ctx.prisma.game.findUnique({
          where: { id: input.gameId },
        })

        if (!game) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Game not found'
          })
        }

        if (!game.isActive) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot create tournament for inactive game'
          })
        }

        // Verify store exists and is active
        const store = await ctx.prisma.store.findUnique({
          where: { id: input.storeId },
        })

        if (!store) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Store not found'
          })
        }

        if (!store.isActive) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot create tournament for inactive store'
          })
        }

        // Verify organizer exists (this would be the current user in a real auth system)
        const organizer = await ctx.prisma.player.findUnique({
          where: { id: input.organizerId },
        })

        if (!organizer) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Organizer not found'
          })
        }

        // Validate tournament date is not in the past (unless it's being created as completed)
        if (input.status !== 'COMPLETED' && input.date < new Date()) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Tournament date cannot be in the past for upcoming or active tournaments'
          })
        }

        // Validate metadata if provided
        if (input.metadata) {
          try {
            JSON.stringify(input.metadata)
          } catch (error) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Invalid metadata format'
            })
          }
        }

        // Check for duplicate tournaments (same name, store, and date)
        const existingTournament = await ctx.prisma.tournament.findFirst({
          where: {
            name: input.name,
            storeId: input.storeId,
            date: {
              gte: new Date(input.date.getFullYear(), input.date.getMonth(), input.date.getDate()),
              lt: new Date(input.date.getFullYear(), input.date.getMonth(), input.date.getDate() + 1),
            },
          },
        })

        if (existingTournament) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A tournament with the same name already exists at this store on this date'
          })
        }

        const tournament = await ctx.prisma.tournament.create({
          data: input,
          include: {
            game: true,
            store: true,
            organizer: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        })

        return tournament
      }),

    // Update tournament status (organizers and admins only)
    updateStatus: organizerProcedure
      .input(z.object({
        id: z.string().uuid(),
        status: z.enum(['UPCOMING', 'ACTIVE', 'COMPLETED']),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify tournament exists
        const existingTournament = await ctx.prisma.tournament.findUnique({
          where: { id: input.id },
          include: {
            organizer: true,
          },
        })

        if (!existingTournament) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Tournament not found'
          })
        }

        // TODO: Add ownership check when auth is fully implemented
        // For now, we'll allow any organizer to update any tournament status

        // Validate status transitions
        const currentStatus = existingTournament.status
        const newStatus = input.status

        // Define valid status transitions
        const validTransitions: Record<string, string[]> = {
          'UPCOMING': ['ACTIVE', 'COMPLETED'], // Can skip to completed if needed
          'ACTIVE': ['COMPLETED'],
          'COMPLETED': [], // Cannot change from completed
        }

        if (!validTransitions[currentStatus].includes(newStatus)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invalid status transition from ${currentStatus} to ${newStatus}`
          })
        }

        const updatedTournament = await ctx.prisma.tournament.update({
          where: { id: input.id },
          data: { status: input.status },
          include: {
            game: true,
            store: true,
            organizer: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        })

        return updatedTournament
      }),

    // Get upcoming tournaments (public, useful for homepage)
    getUpcoming: publicProcedure
      .input(z.object({
        gameId: z.string().uuid().optional(),
        storeId: z.string().uuid().optional(),
        daysAhead: z.number().int().min(1).max(365).default(30),
        limit: z.number().int().min(1).max(50).default(10),
      }))
      .query(async ({ ctx, input }) => {
        const where: Record<string, unknown> = {
          status: 'UPCOMING',
          date: {
            gte: new Date(),
            lte: new Date(Date.now() + input.daysAhead * 24 * 60 * 60 * 1000),
          },
        }

        if (input.gameId) {
          where.gameId = input.gameId
        }

        if (input.storeId) {
          where.storeId = input.storeId
        }

        const tournaments = await ctx.prisma.tournament.findMany({
          where,
          orderBy: { date: 'asc' },
          take: input.limit,
          include: {
            game: {
              select: {
                id: true,
                name: true,
                shortName: true,
              },
            },
            store: {
              select: {
                id: true,
                name: true,
                city: true,
                state: true,
              },
            },
            organizer: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        })

        return tournaments
      }),

    // Process individual match result
    processMatchResult: organizerProcedure
      .input(z.object({
        matchId: z.string().uuid(),
        winnerId: z.string().uuid().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { processMatchResult } = await import('@/lib/tournament/match-processor')
        
        // Get match details
        const match = await ctx.prisma.match.findUnique({
          where: { id: input.matchId },
          include: {
            tournament: true,
          },
        })

        if (!match) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Match not found'
          })
        }

        // TODO: Add ownership check when auth is fully implemented
        // Verify user has permission to update this match

        const matchResult = {
          matchId: input.matchId,
          tournamentId: match.tournamentId,
          player1Id: match.player1Id,
          player2Id: match.player2Id,
          winnerId: input.winnerId || null,
          round: match.round,
          table: match.table || undefined,
        }

        const result = await processMatchResult(ctx.prisma, matchResult)

        return {
          success: true,
          message: 'Match result processed successfully',
          match: result.match,
          playerUpdates: result.playerUpdates,
        }
      }),

    // Complete tournament and calculate final standings
    completeTournament: organizerProcedure
      .input(z.object({
        tournamentId: z.string().uuid(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { processTournamentCompletion } = await import('@/lib/tournament/match-processor')
        
        // TODO: Add ownership check when auth is fully implemented
        // Verify user has permission to complete this tournament

        const result = await processTournamentCompletion(ctx.prisma, input.tournamentId)

        return {
          success: true,
          message: 'Tournament completed successfully',
          tournament: result.tournament,
          standings: result.standings,
          championshipPointsAwarded: result.championshipPointsAwarded,
        }
      }),

    // Batch process multiple match results
    batchProcessMatches: organizerProcedure
      .input(z.object({
        tournamentId: z.string().uuid(),
        matchResults: z.array(z.object({
          matchId: z.string().uuid(),
          winnerId: z.string().uuid().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const { batchProcessMatchResults } = await import('@/lib/tournament/match-processor')
        
        // Verify tournament exists and user has permission
        const tournament = await ctx.prisma.tournament.findUnique({
          where: { id: input.tournamentId },
        })

        if (!tournament) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Tournament not found'
          })
        }

        // TODO: Add ownership check when auth is fully implemented

        // Convert input to match results format
        const matchResults = await Promise.all(
          input.matchResults.map(async (mr) => {
            const match = await ctx.prisma.match.findUnique({
              where: { id: mr.matchId },
            })

            if (!match) {
              throw new TRPCError({
                code: 'NOT_FOUND',
                message: `Match not found: ${mr.matchId}`
              })
            }

            if (match.tournamentId !== input.tournamentId) {
              throw new TRPCError({
                code: 'BAD_REQUEST',
                message: `Match ${mr.matchId} does not belong to tournament ${input.tournamentId}`
              })
            }

            return {
              matchId: mr.matchId,
              tournamentId: match.tournamentId,
              player1Id: match.player1Id,
              player2Id: match.player2Id,
              winnerId: mr.winnerId || null,
              round: match.round,
              table: match.table || undefined,
            }
          })
        )

        const result = await batchProcessMatchResults(ctx.prisma, matchResults)

        return {
          success: true,
          message: `Processed ${result.processedMatches.length} matches with ${result.errors.length} errors`,
          processedMatches: result.processedMatches,
          playerUpdates: result.playerUpdates,
          errors: result.errors,
        }
      }),
  }),



  // Basic stores router
  stores: router({
    list: publicProcedure
      .input(z.object({
        includeInactive: z.boolean().default(false),
        city: z.string().optional(),
        state: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }))
      .query(async ({ ctx, input }) => {
        const where: Record<string, unknown> = {}
        
        if (!input.includeInactive) {
          where.isActive = true
        }
        
        if (input.city) {
          where.city = {
            contains: input.city,
            mode: 'insensitive',
          }
        }
        
        if (input.state) {
          where.state = {
            contains: input.state,
            mode: 'insensitive',
          }
        }

        const [stores, total] = await Promise.all([
          ctx.prisma.store.findMany({
            where,
            orderBy: { name: 'asc' },
            take: input.limit,
            skip: input.offset,
            include: {
              _count: {
                select: {
                  tournaments: true,
                },
              },
            },
          }),
          ctx.prisma.store.count({ where }),
        ])

        return {
          stores: stores.map(store => ({
            ...store,
            tournamentCount: store._count.tournaments,
          })),
          total,
          hasMore: input.offset + input.limit < total,
        }
      }),
  }),

  // Enhanced matches router
  matches: router({
    // Get match by ID
    getById: publicProcedure
      .input(z.object({
        id: z.string().uuid(),
      }))
      .query(async ({ ctx, input }) => {
        const match = await ctx.prisma.match.findUnique({
          where: { id: input.id },
          include: {
            tournament: {
              include: {
                game: true,
                store: true,
              },
            },
            player1: {
              select: {
                id: true,
                displayName: true,
                profileVisibility: true,
              },
            },
            player2: {
              select: {
                id: true,
                displayName: true,
                profileVisibility: true,
              },
            },
            winner: {
              select: {
                id: true,
                displayName: true,
                profileVisibility: true,
              },
            },
          },
        })

        if (!match) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Match not found'
          })
        }

        // Filter private player information
        return {
          ...match,
          player1: {
            ...match.player1,
            displayName: match.player1.profileVisibility === 'PUBLIC' 
              ? match.player1.displayName 
              : 'Private Player',
          },
          player2: {
            ...match.player2,
            displayName: match.player2.profileVisibility === 'PUBLIC' 
              ? match.player2.displayName 
              : 'Private Player',
          },
          winner: match.winner ? {
            ...match.winner,
            displayName: match.winner.profileVisibility === 'PUBLIC' 
              ? match.winner.displayName 
              : 'Private Player',
          } : null,
        }
      }),

    // Create a new match (organizers only)
    create: organizerProcedure
      .input(z.object({
        tournamentId: z.string().uuid(),
        player1Id: z.string().uuid(),
        player2Id: z.string().uuid(),
        round: z.number().int().min(1),
        table: z.number().int().min(1).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify tournament exists
        const tournament = await ctx.prisma.tournament.findUnique({
          where: { id: input.tournamentId },
        })

        if (!tournament) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Tournament not found'
          })
        }

        // Verify players exist
        const [player1, player2] = await Promise.all([
          ctx.prisma.player.findUnique({ where: { id: input.player1Id } }),
          ctx.prisma.player.findUnique({ where: { id: input.player2Id } }),
        ])

        if (!player1 || !player2) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'One or both players not found'
          })
        }

        if (input.player1Id === input.player2Id) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Player cannot play against themselves'
          })
        }

        // Check for duplicate match in same round
        const existingMatch = await ctx.prisma.match.findFirst({
          where: {
            tournamentId: input.tournamentId,
            round: input.round,
            OR: [
              {
                AND: [
                  { player1Id: input.player1Id },
                  { player2Id: input.player2Id },
                ],
              },
              {
                AND: [
                  { player1Id: input.player2Id },
                  { player2Id: input.player1Id },
                ],
              },
            ],
          },
        })

        if (existingMatch) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Match between these players already exists in this round'
          })
        }

        const match = await ctx.prisma.match.create({
          data: {
            tournamentId: input.tournamentId,
            player1Id: input.player1Id,
            player2Id: input.player2Id,
            round: input.round,
            table: input.table,
            status: 'PENDING',
          },
          include: {
            tournament: true,
            player1: {
              select: {
                id: true,
                displayName: true,
              },
            },
            player2: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        })

        return match
      }),

    // Update match result (organizers only)
    updateResult: organizerProcedure
      .input(z.object({
        id: z.string().uuid(),
        winnerId: z.string().uuid().optional(),
        status: z.enum(['PENDING', 'ACTIVE', 'COMPLETED']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existingMatch = await ctx.prisma.match.findUnique({
          where: { id: input.id },
          include: {
            tournament: true,
          },
        })

        if (!existingMatch) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Match not found'
          })
        }

        // Validate winner if provided
        if (input.winnerId && 
            input.winnerId !== existingMatch.player1Id && 
            input.winnerId !== existingMatch.player2Id) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Winner must be one of the match players'
          })
        }

        const updatedMatch = await ctx.prisma.match.update({
          where: { id: input.id },
          data: {
            winnerId: input.winnerId,
            status: input.status,
          },
          include: {
            tournament: true,
            player1: {
              select: {
                id: true,
                displayName: true,
              },
            },
            player2: {
              select: {
                id: true,
                displayName: true,
              },
            },
            winner: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        })

        return updatedMatch
      }),

    // Delete match (organizers only, with restrictions)
    delete: organizerProcedure
      .input(z.object({
        id: z.string().uuid(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existingMatch = await ctx.prisma.match.findUnique({
          where: { id: input.id },
          include: {
            tournament: true,
          },
        })

        if (!existingMatch) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Match not found'
          })
        }

        // Prevent deletion of completed matches (data integrity)
        if (existingMatch.status === 'COMPLETED') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot delete completed matches to preserve data integrity'
          })
        }

        await ctx.prisma.match.delete({
          where: { id: input.id },
        })

        return { success: true, message: 'Match deleted successfully' }
      }),

    // Get matches by tournament
    getByTournament: publicProcedure
      .input(z.object({
        tournamentId: z.string().uuid(),
        round: z.number().int().min(1).optional(),
        status: z.enum(['PENDING', 'ACTIVE', 'COMPLETED']).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const where: Record<string, unknown> = { tournamentId: input.tournamentId }

        if (input.round) {
          where.round = input.round
        }

        if (input.status) {
          where.status = input.status
        }

        const matches = await ctx.prisma.match.findMany({
          where,
          orderBy: [
            { round: 'asc' },
            { table: 'asc' },
          ],
          include: {
            player1: {
              select: {
                id: true,
                displayName: true,
                profileVisibility: true,
              },
            },
            player2: {
              select: {
                id: true,
                displayName: true,
                profileVisibility: true,
              },
            },
            winner: {
              select: {
                id: true,
                displayName: true,
                profileVisibility: true,
              },
            },
          },
        })

        // Filter private player information
        return matches.map(match => ({
          ...match,
          player1: {
            ...match.player1,
            displayName: match.player1.profileVisibility === 'PUBLIC' 
              ? match.player1.displayName 
              : 'Private Player',
          },
          player2: {
            ...match.player2,
            displayName: match.player2.profileVisibility === 'PUBLIC' 
              ? match.player2.displayName 
              : 'Private Player',
          },
          winner: match.winner ? {
            ...match.winner,
            displayName: match.winner.profileVisibility === 'PUBLIC' 
              ? match.winner.displayName 
              : 'Private Player',
          } : null,
        }))
      }),
  }),

  // Enhanced uploads router
  uploads: router({
    // Process tournament file upload
    processTournament: organizerProcedure
      .input(z.object({
        tournamentId: z.string().uuid(),
        fileData: z.string(), // Base64 encoded file data
        fileName: z.string().min(1),
        fileSize: z.number().max(10 * 1024 * 1024), // 10MB max
      }))
      .mutation(async ({ ctx, input }) => {
        // Import the parsing functions
        const { parseTournamentFile, validateTournamentData } = await import('@/lib/upload/parsers')
        const { validateUploadedFile, getFileType } = await import('@/lib/upload/config')
        
        try {
          // Verify tournament exists and user has permission
          const tournament = await ctx.prisma.tournament.findUnique({
            where: { id: input.tournamentId },
            include: {
              game: true,
              store: true,
              organizer: true,
            },
          })

          if (!tournament) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Tournament not found'
            })
          }

          // TODO: Add ownership check when auth is fully implemented
          // For now, we'll allow any organizer to upload to any tournament

          // Validate file
          if (input.fileSize > 10 * 1024 * 1024) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'File too large. Maximum size: 10MB'
            })
          }

          // Decode base64 file data
          let fileBuffer: Buffer
          try {
            fileBuffer = Buffer.from(input.fileData, 'base64')
          } catch (error) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Invalid file data encoding'
            })
          }

          // Get file type
          const fileType = getFileType(input.fileName)

          // Parse tournament data
          const tournamentData = await parseTournamentFile(fileBuffer, input.fileName)

          // Validate parsed data
          validateTournamentData(tournamentData)

          // Check for duplicate tournament data
          const existingMatches = await ctx.prisma.match.count({
            where: { tournamentId: input.tournamentId },
          })

          if (existingMatches > 0) {
            throw new TRPCError({
              code: 'CONFLICT',
              message: 'Tournament already has match data. Cannot overwrite existing results.'
            })
          }

          // Process the tournament data in a transaction
          const result = await ctx.prisma.$transaction(async (tx) => {
            const processedPlayers: Array<{
              playerId: string;
              externalPlayerId: string;
              playerName: string;
            }> = []
            const processedMatches: Array<Record<string, unknown>> = []

            // Process players - create or link to existing players
            for (const playerData of tournamentData.players) {
              // Try to find existing player by external ID for this game
              let existingPlayer = await tx.player.findFirst({
                where: {
                  gameStats: {
                    some: {
                      gameId: tournament.gameId,
                    },
                  },
                },
                include: {
                  gameStats: {
                    where: { gameId: tournament.gameId },
                  },
                },
              })

              // Check if external player ID matches
              if (existingPlayer?.externalPlayerIds) {
                const externalIds = existingPlayer.externalPlayerIds as Record<string, string>
                const hasMatchingId = Object.entries(externalIds).some(
                  ([gameId, externalId]) => 
                    gameId === tournament.gameId && externalId === playerData.externalPlayerId
                )
                if (!hasMatchingId) {
                  existingPlayer = null
                }
              } else {
                existingPlayer = null
              }

              if (!existingPlayer) {
                // Create new player (simplified for now without full auth integration)
                // In a real system, this would create a user account or link to existing one
                throw new TRPCError({
                  code: 'NOT_IMPLEMENTED',
                  message: `Player creation not yet implemented. Unknown player: ${playerData.externalPlayerId} (${playerData.playerName}). Please ensure all players are registered in the system first.`
                })
              }

              processedPlayers.push({
                playerId: existingPlayer.id,
                externalPlayerId: playerData.externalPlayerId,
                playerName: playerData.playerName,
              })
            }

            // Create player ID mapping
            const playerIdMap = new Map<string, string>()
            processedPlayers.forEach(p => {
              playerIdMap.set(p.externalPlayerId, p.playerId)
            })

            // Process matches
            for (const matchData of tournamentData.matches) {
              const player1Id = playerIdMap.get(matchData.player1ExternalId)
              const player2Id = playerIdMap.get(matchData.player2ExternalId)
              const winnerId = matchData.winnerExternalId 
                ? playerIdMap.get(matchData.winnerExternalId) 
                : null

              if (!player1Id || !player2Id) {
                throw new TRPCError({
                  code: 'BAD_REQUEST',
                  message: `Match references unknown players: ${matchData.player1ExternalId}, ${matchData.player2ExternalId}`
                })
              }

              if (matchData.winnerExternalId && !winnerId) {
                throw new TRPCError({
                  code: 'BAD_REQUEST',
                  message: `Match references unknown winner: ${matchData.winnerExternalId}`
                })
              }

              const match = await tx.match.create({
                data: {
                  tournamentId: input.tournamentId,
                  player1Id,
                  player2Id,
                  winnerId,
                  round: matchData.round,
                  table: matchData.table,
                  status: matchData.status,
                },
              })

              processedMatches.push(match)
            }

            // Update tournament status if it was uploaded with results
            if (processedMatches.length > 0) {
              await tx.tournament.update({
                where: { id: input.tournamentId },
                data: { 
                  status: 'COMPLETED',
                  // Update tournament details from file if provided
                  name: tournamentData.tournament.name !== 'Imported Tournament' 
                    ? tournamentData.tournament.name 
                    : tournament.name,
                  format: tournamentData.tournament.format !== 'Standard' 
                    ? tournamentData.tournament.format 
                    : tournament.format,
                },
              })
            }

            return {
              playersProcessed: processedPlayers.length,
              matchesCreated: processedMatches.length,
              tournamentUpdated: true,
            }
          })

          return {
            success: true,
            message: `Successfully processed tournament file: ${result.playersProcessed} players, ${result.matchesCreated} matches`,
            data: result,
            fileType,
            parsedData: {
              tournament: tournamentData.tournament,
              playerCount: tournamentData.players.length,
              matchCount: tournamentData.matches.length,
            },
          }
        } catch (error) {
          // Re-throw TRPCError as-is
          if (error instanceof TRPCError) {
            throw error
          }
          
          // Wrap other errors
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `File processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
        }
      }),

    // Validate tournament file without processing
    validateTournament: organizerProcedure
      .input(z.object({
        fileData: z.string(), // Base64 encoded file data
        fileName: z.string().min(1),
        fileSize: z.number().max(10 * 1024 * 1024), // 10MB max
      }))
      .mutation(async ({ ctx, input }) => {
        const { parseTournamentFile, validateTournamentData } = await import('@/lib/upload/parsers')
        const { getFileType } = await import('@/lib/upload/config')
        
        try {
          // Validate file size
          if (input.fileSize > 10 * 1024 * 1024) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'File too large. Maximum size: 10MB'
            })
          }

          // Decode base64 file data
          let fileBuffer: Buffer
          try {
            fileBuffer = Buffer.from(input.fileData, 'base64')
          } catch (error) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Invalid file data encoding'
            })
          }

          // Get file type
          const fileType = getFileType(input.fileName)

          // Parse tournament data
          const tournamentData = await parseTournamentFile(fileBuffer, input.fileName)

          // Validate parsed data
          validateTournamentData(tournamentData)

          return {
            success: true,
            message: 'File validation successful',
            fileType,
            data: {
              tournament: tournamentData.tournament,
              playerCount: tournamentData.players.length,
              matchCount: tournamentData.matches.length,
              players: tournamentData.players.slice(0, 5), // Preview first 5 players
              matches: tournamentData.matches.slice(0, 5), // Preview first 5 matches
            },
          }
        } catch (error) {
          // Re-throw TRPCError as-is
          if (error instanceof TRPCError) {
            throw error
          }
          
          // Wrap other errors
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `File validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          })
        }
      }),
  }),

  // Leaderboards router
  leaderboards: leaderboardsRouter,

  // Decks router
  decks: decksRouter,

  // Tournament entries router
  tournamentEntries: tournamentEntriesRouter,
})

export type AppRouter = typeof appRouter