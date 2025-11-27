import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, organizerProcedure } from '../router-factory'
import {
  CreateDeckSchema,
  UpdateDeckSchema,
  DeckStatsQuerySchema,
  DeckUsageQuerySchema,
  DeckListQuerySchema,
  DeckByIdQuerySchema,
  DeckArchetypesQuerySchema
} from '@/lib/schemas'
import type {
  DateFilterClause,
  DeckStatsResult,
  TournamentWhereClause
} from '@/lib/types/backend'
import { getPublicDisplayName, userPublicSelectWithPrefs } from '@/lib/utils/user'

export const decksRouter = router({
  // List all decks for a game
  list: publicProcedure
    .input(DeckListQuerySchema)
    .query(async ({ ctx, input }): Promise<{
      game: unknown;
      decks: Array<unknown & { usageCount: number }>;
      totalDecks: number;
    }> => {
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

      const where: Record<string, unknown> = {
        gameId: input.gameId,
      }

      if (input.format) {
        where.format = input.format
      }

      if (input.archetype) {
        where.archetype = input.archetype
      }

      if (!input.includeInactive) {
        where.isActive = true
      }

      const decks = await ctx.prisma.deck.findMany({
        where,
        include: {
          _count: {
            select: {
              tournamentEntries: true,
            },
          },
        },
        orderBy: [
          { name: 'asc' },
        ],
        take: input.limit,
      })

      return {
        game,
        decks: decks.map(deck => ({
          ...deck,
          usageCount: deck._count.tournamentEntries,
        })),
        totalDecks: decks.length,
      }
    }),

  // Get deck by ID with usage statistics
  getById: publicProcedure
    .input(DeckByIdQuerySchema)
    .query(async ({ ctx, input }): Promise<unknown & {
      usageCount: number;
      stats: {
        totalUsage: number;
        totalTournaments: number;
        uniquePlayers: number;
        winRate: number;
        totalGames: number;
        record: {
          wins: number;
          losses: number;
          draws: number;
        };
      } | null;
    }> => {
      const deck = await ctx.prisma.deck.findUnique({
        where: { id: input.id },
        include: {
          game: true,
          _count: {
            select: {
              tournamentEntries: true,
            },
          },
        },
      })

      if (!deck) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deck not found'
        })
      }

      let stats = null
      if (input.includeStats) {
        // Get usage statistics
        const entries = await ctx.prisma.tournamentEntry.findMany({
          where: { deckId: input.id },
          include: {
            tournament: {
              select: {
                date: true,
                format: true,
                status: true,
              },
            },
            player: {
              select: {
                user: { select: userPublicSelectWithPrefs },
              },
            },
          },
        })

        // Calculate win rate from tournament records
        let totalWins = 0
        let totalLosses = 0
        let totalDraws = 0
        let totalTournaments = 0
        const uniquePlayers = new Set<string>()

        entries.forEach(entry => {
          if (entry.tournament.status === 'COMPLETED') {
            totalTournaments++
            uniquePlayers.add(entry.playerId)

            if (entry.record) {
              const record = entry.record as Record<string, unknown>
              totalWins += (record.wins as number) || 0
              totalLosses += (record.losses as number) || 0
              totalDraws += (record.draws as number) || 0
            }
          }
        })

        const totalGames = totalWins + totalLosses + totalDraws
        const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0

        stats = {
          totalUsage: deck._count.tournamentEntries,
          totalTournaments,
          uniquePlayers: uniquePlayers.size,
          winRate: Math.round(winRate * 100) / 100,
          totalGames,
          record: {
            wins: totalWins,
            losses: totalLosses,
            draws: totalDraws,
          },
        }
      }

      return {
        ...deck,
        usageCount: deck._count.tournamentEntries,
        stats,
      }
    }),

  // Create a new deck (organizers and admins)
  create: organizerProcedure
    .input(CreateDeckSchema)
    .mutation(async ({ ctx, input }): Promise<unknown> => {
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

      // Check for duplicate deck name in same game/format
      const existingDeck = await ctx.prisma.deck.findFirst({
        where: {
          name: input.name,
          gameId: input.gameId,
          format: input.format,
        },
      })

      if (existingDeck) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A deck with this name already exists for this game and format'
        })
      }

      const deck = await ctx.prisma.deck.create({
        data: input,
        include: {
          game: true,
        },
      })

      return deck
    }),

  // Update deck (organizers and admins)
  update: organizerProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: UpdateDeckSchema,
    }))
    .mutation(async ({ ctx, input }): Promise<unknown> => {
      // Verify deck exists
      const existingDeck = await ctx.prisma.deck.findUnique({
        where: { id: input.id },
      })

      if (!existingDeck) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deck not found'
        })
      }

      // Check for name conflicts if name is being updated
      if (input.data.name) {
        const conflictingDeck = await ctx.prisma.deck.findFirst({
          where: {
            name: input.data.name,
            gameId: existingDeck.gameId,
            format: input.data.format || existingDeck.format,
            id: { not: input.id },
          },
        })

        if (conflictingDeck) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'A deck with this name already exists for this game and format'
          })
        }
      }

      const updatedDeck = await ctx.prisma.deck.update({
        where: { id: input.id },
        data: input.data,
        include: {
          game: true,
        },
      })

      return updatedDeck
    }),

  // Get deck statistics and usage trends
  getStats: publicProcedure
    .input(DeckStatsQuerySchema)
    .query(async ({ ctx, input }): Promise<{
      game: unknown;
      format?: string;
      dateRange: {
        start?: Date;
        end?: Date;
      };
      deckStats: Array<DeckStatsResult>;
      totalDecks: number;
      totalEntries: number;
    }> => {
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

      // Build tournament filter
      const tournamentWhere: TournamentWhereClause = {
        gameId: input.gameId,
        status: 'COMPLETED',
      }

      if (input.format) {
        tournamentWhere.format = input.format
      }

      if (input.startDate || input.endDate) {
        tournamentWhere.date = {} as DateFilterClause
        if (input.startDate) {
          tournamentWhere.date.gte = input.startDate
        }
        if (input.endDate) {
          tournamentWhere.date.lte = input.endDate
        }
      }

      // Get tournament entries with deck information
      const entries = await ctx.prisma.tournamentEntry.findMany({
        where: {
          tournament: tournamentWhere,
          deckId: { not: null },
        },
        include: {
          deck: true,
          tournament: {
            select: {
              date: true,
              format: true,
            },
          },
        },
      })

      // Calculate deck statistics
      const deckStats = new Map<string, Omit<DeckStatsResult, 'uniquePlayers' | 'tournaments'> & {
        uniquePlayers: Set<string>
        tournaments: Set<string>
      }>()

      entries.forEach(entry => {
        if (!entry.deck) return

        const deckId = entry.deck.id
        if (!deckStats.has(deckId)) {
          deckStats.set(deckId, {
            deckId,
            deckName: entry.deck.name,
            archetype: entry.deck.archetype,
            format: entry.deck.format,
            usage: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            totalGames: 0,
            winRate: 0,
            uniquePlayers: new Set(),
            tournaments: new Set(),
          })
        }

        const stats = deckStats.get(deckId)!
        stats.usage++
        stats.uniquePlayers.add(entry.playerId)
        stats.tournaments.add(entry.tournamentId)

        if (entry.record) {
          const record = entry.record as { wins?: number; losses?: number; draws?: number }
          stats.wins += record.wins || 0
          stats.losses += record.losses || 0
          stats.draws += record.draws || 0
        }
      })

      // Calculate win rates and filter by minimum usage
      const filteredStats = Array.from(deckStats.values())
        .filter(stats => stats.usage >= input.minUsage)
        .map(stats => {
          stats.totalGames = stats.wins + stats.losses + stats.draws
          stats.winRate = stats.totalGames > 0 ? (stats.wins / stats.totalGames) * 100 : 0

          return {
            ...stats,
            uniquePlayers: stats.uniquePlayers.size,
            tournaments: stats.tournaments.size,
            winRate: Math.round(stats.winRate * 100) / 100,
          }
        })
        .sort((a, b) => b.usage - a.usage)
        .slice(0, input.limit)

      return {
        game,
        format: input.format,
        dateRange: {
          start: input.startDate,
          end: input.endDate,
        },
        deckStats: filteredStats,
        totalDecks: filteredStats.length,
        totalEntries: entries.length,
      }
    }),

  // Get deck usage by specific players
  getUsage: publicProcedure
    .input(DeckUsageQuerySchema)
    .query(async ({ ctx, input }): Promise<{
      deck: unknown;
      usage: unknown[];
      totalUsage: number;
    }> => {
      // Verify deck exists
      const deck = await ctx.prisma.deck.findUnique({
        where: { id: input.deckId },
        include: { game: true },
      })

      if (!deck) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Deck not found'
        })
      }

      // Build where clause
      const where: Record<string, unknown> = {
        deckId: input.deckId,
        tournament: {
          status: 'COMPLETED',
        },
      }

      if (input.playerId) {
        where.playerId = input.playerId
      }

      if (input.startDate || input.endDate) {
        (where.tournament as TournamentWhereClause).date = {} as DateFilterClause
        if (input.startDate) {
          (where.tournament as TournamentWhereClause).date!.gte = input.startDate
        }
        if (input.endDate) {
          (where.tournament as TournamentWhereClause).date!.lte = input.endDate
        }
      }

      const entries = await ctx.prisma.tournamentEntry.findMany({
        where,
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              date: true,
              format: true,
            },
          },
          player: {
            select: {
              id: true,
              user: { select: userPublicSelectWithPrefs },
            },
          },
        },
        orderBy: {
          tournament: { date: 'desc' },
        },
        take: input.limit,
      })

      // Filter out private players for public view
      const filteredEntries = entries.map(entry => ({
        ...entry,
        player: {
          id: entry.player.id,
          displayName: getPublicDisplayName(entry.player.user),
          isPublic: entry.player.user?.userPreferences?.profileVisibility === 'PUBLIC',
        },
      }))

      return {
        deck,
        usage: filteredEntries,
        totalUsage: entries.length,
      }
    }),

  // Get popular archetypes for a game/format
  getArchetypes: publicProcedure
    .input(DeckArchetypesQuerySchema)
    .query(async ({ ctx, input }): Promise<{
      game: unknown;
      format?: string;
      season?: string;
      archetypes: Array<{
        archetype: string;
        usage: number;
        uniqueDecks: number;
        wins: number;
        losses: number;
        draws: number;
        winRate: number;
        totalGames: number;
      }>;
      totalArchetypes: number;
    }> => {
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

      // Build tournament filter
      const tournamentWhere: Record<string, unknown> = {
        gameId: input.gameId,
        status: 'COMPLETED',
      }

      if (input.format) {
        tournamentWhere.format = input.format
      }

      // Get tournament entries grouped by archetype
      const entries = await ctx.prisma.tournamentEntry.findMany({
        where: {
          tournament: tournamentWhere,
          deckId: { not: null },
        },
        include: {
          deck: {
            select: {
              archetype: true,
              name: true,
            },
          },
        },
      })

      // Group by archetype
      const archetypeStats = new Map<string, {
        archetype: string
        usage: number
        uniqueDecks: Set<string>
        wins: number
        losses: number
        draws: number
        winRate: number
      }>()

      entries.forEach(entry => {
        if (!entry.deck) return

        const archetype = entry.deck.archetype
        if (!archetypeStats.has(archetype)) {
          archetypeStats.set(archetype, {
            archetype,
            usage: 0,
            uniqueDecks: new Set(),
            wins: 0,
            losses: 0,
            draws: 0,
            winRate: 0,
          })
        }

        const stats = archetypeStats.get(archetype)!
        stats.usage++
        stats.uniqueDecks.add(entry.deck.name)

        if (entry.record) {
          const record = entry.record as { wins?: number; losses?: number; draws?: number }
          stats.wins += record.wins || 0
          stats.losses += record.losses || 0
          stats.draws += record.draws || 0
        }
      })

      // Calculate win rates and sort
      const archetypes = Array.from(archetypeStats.values())
        .map(stats => {
          const totalGames = stats.wins + stats.losses + stats.draws
          stats.winRate = totalGames > 0 ? (stats.wins / totalGames) * 100 : 0

          return {
            ...stats,
            uniqueDecks: stats.uniqueDecks.size,
            winRate: Math.round(stats.winRate * 100) / 100,
            totalGames,
          }
        })
        .sort((a, b) => b.usage - a.usage)
        .slice(0, input.limit)

      return {
        game,
        format: input.format,
        season: input.season,
        archetypes,
        totalArchetypes: archetypes.length,
      }
    }),
})
